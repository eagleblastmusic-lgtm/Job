import test from 'node:test';
import assert from 'node:assert/strict';
import { NominatimGeocoder, OsrmRouter, type GeographyProviderConfig } from '../server/faro/geographyProviders.js';
const config = (): GeographyProviderConfig => ({ endpoint: 'https://synthetic.invalid', provider: 'SYNTHETIC_TEST_ONLY', datasetVersion: 'TEST_ONLY',
  userAgent: 'Faro-Contract-Test/1.0', timeoutMs: 1000, minIntervalMs: 1000, maxDailyRequests: 2 });
const signal = () => new AbortController().signal;
const searchBody = () => [{ display_name: 'Łódź, Polska', lat: '51.75', lon: '19.46', private_field: 'PRIVATE_SENTINEL', importance: 0.9 }];

test('geocoder pins Polish submitted search, minimal result, provenance and bounded failed-call budget', async () => {
  let time = Date.UTC(2026, 9, 9), hits = 0;
  const geocoder = new NominatimGeocoder(config(), async (url, options) => {
    hits++; assert.equal(url.origin, 'https://synthetic.invalid'); assert.equal(url.pathname, '/search');
    assert.equal(url.searchParams.get('q'), 'Łódź'); assert.equal(url.searchParams.get('countrycodes'), 'pl');
    assert.equal(url.searchParams.get('limit'), '5'); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
    return Response.json(searchBody());
  }, () => time);
  const result = await geocoder.search(' Łódź ', signal());
  assert.deepEqual(result[0]?.point, { latitude: 51.75, longitude: 19.46 });
  assert.equal(result[0]?.provenance.datasetVersion, 'TEST_ONLY'); assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|importance/);
  await assert.rejects(geocoder.search('Łódź', signal()), /GEO_RATE_LIMIT/); assert.equal(hits, 1);
  time += 1000; await geocoder.search('Łódź', signal()); time += 1000;
  await assert.rejects(geocoder.search('Łódź', signal()), /GEO_DAILY_BUDGET/); assert.equal(hits, 2);
  time += 86400000; await geocoder.search('Łódź', signal()); assert.equal(hits, 3);
});
test('routing honors explicit profiles and coordinate order; no route never becomes zero', async () => {
  let time = 1760000000000, hits = 0;
  const router = new OsrmRouter(config(), { CAR: 'driving' }, async url => {
    hits++; assert.equal(url.pathname, '/route/v1/driving/21,52;19,51'); assert.equal(url.searchParams.get('steps'), 'false');
    return hits===1?Response.json({ code: 'Ok', routes: [{ distance: 12345.6, duration: 1500, geometry: 'PRIVATE_SENTINEL' }] }):Response.json({code:'NoRoute'},{status:400});
  }, () => time);
  const a = { latitude: 52, longitude: 21 }, b = { latitude: 51, longitude: 19 };
  await assert.rejects(router.route(a, b, 'WALK', signal()), /GEO_MODE_UNSUPPORTED/); assert.equal(hits, 0);
  const result = await router.route(a, b, 'CAR', signal()); assert.equal(result?.distanceMeters, 12345.6);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|transitFare/);
  time += 1000; assert.equal(await router.route(a, b, 'CAR', signal()), null);
});
test('FARO-AUDIT-004: OSRM HTTP400 NoRoute alone is unknown; status/body errors retain bounds and Nominatim semantics',async()=>{
  const a={latitude:52,longitude:21},b={latitude:51,longitude:19};
  const route=(response:()=>Response,timeoutMs=1000)=>new OsrmRouter({...config(),timeoutMs},{CAR:'driving'},async()=>response()).route(a,b,'CAR',signal());
  assert.equal(await route(()=>Response.json({code:'NoRoute',message:'PRIVATE_SENTINEL'},{status:400})),null);
  for(const [status,body,code] of [
    [400,JSON.stringify({code:'InvalidQuery',message:'PRIVATE_SENTINEL'}),'GEO_INVALID_RESPONSE'],
    [400,JSON.stringify({code:'Ok',routes:[{distance:1,duration:1}]}),'GEO_INVALID_RESPONSE'],
    [400,'{malformed PRIVATE_SENTINEL','GEO_INVALID_RESPONSE'],
    [400,JSON.stringify([]),'GEO_INVALID_RESPONSE'],
    [200,JSON.stringify({code:'NoRoute'}),'GEO_INVALID_RESPONSE'],
    [429,JSON.stringify({code:'NoRoute',message:'PRIVATE_SENTINEL'}),'GEO_PROVIDER_RATE_LIMIT'],
    [500,JSON.stringify({code:'NoRoute',message:'PRIVATE_SENTINEL'}),'GEO_PROVIDER_UNAVAILABLE'],
    [503,'PRIVATE_SENTINEL','GEO_PROVIDER_UNAVAILABLE'],
    [400,'x'.repeat(65537),'GEO_RESPONSE_TOO_LARGE']
  ] as const)await assert.rejects(route(()=>new Response(body,{status})),error=>String(error)===`Error: ${code}`);
  await assert.rejects(route(()=>new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));}}),{status:400}),40),/^Error: GEO_TIMEOUT$/);
  const geocoder=new NominatimGeocoder(config(),async()=>Response.json({code:'NoRoute'},{status:400}));
  await assert.rejects(geocoder.search('Łódź',signal()),/^Error: GEO_PROVIDER_UNAVAILABLE$/);
});
test('unapproved public endpoints, malformed input/results and private transport errors refuse safely', async () => {
  for (const endpoint of ['http://synthetic.invalid', 'https://user:secret@synthetic.invalid', 'https://synthetic.invalid?q=secret', 'https://synthetic.invalid/private', 'https://nominatim.openstreetmap.org', 'https://router.project-osrm.org', 'https://nominatim.openstreetmap.org.', 'https://router.project-osrm.org.']) {
    assert.throws(() => new NominatimGeocoder({ ...config(), endpoint }), /GEO_CONFIGURATION/);
  }
  let hits = 0;
  const malformed = new NominatimGeocoder(config(), async () => { hits++; return Response.json([{ ...searchBody()[0], lat: '91' }]); });
  await assert.rejects(malformed.search('x', signal()), /GEO_INVALID_QUERY/); assert.equal(hits, 0);
  await assert.rejects(malformed.search('Łódź', signal()), /GEO_INVALID_RESPONSE/);
  const failed = new NominatimGeocoder(config(), async () => { throw new Error('PRIVATE_SENTINEL credentials'); });
  await assert.rejects(failed.search('Łódź', signal()), /^Error: GEO_TRANSPORT$/);
  const router = new OsrmRouter(config(), { CAR: 'driving' }, async () => Response.json({ code: 'Ok', routes: [{ distance: -1, duration: 1 }] }));
  await assert.rejects(router.route({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }, 'CAR', signal()), /GEO_INVALID_RESPONSE/);
});
test('response deadline includes headers/body, cancellation and bytes; overlapping requests never egress', async () => {
  let hits = 0;
  const geocoder = new NominatimGeocoder({ ...config(), timeoutMs: 40 }, async () => {
    hits++; return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('[')); } }));
  });
  const first = assert.rejects(geocoder.search('Łódź', signal()), /^Error: GEO_TIMEOUT$/);
  await assert.rejects(geocoder.search('Warszawa', signal()), /GEO_RATE_LIMIT/); await first; assert.equal(hits, 1);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(geocoder.search('Warszawa', controller.signal), /GEO_CANCELLED/); assert.equal(hits, 1);
  const oversized = new NominatimGeocoder(config(), async () => new Response('x'.repeat(65537)));
  await assert.rejects(oversized.search('Łódź', signal()), /GEO_RESPONSE_TOO_LARGE/);
  const limited = new NominatimGeocoder(config(), async () => new Response('PRIVATE_SENTINEL', { status: 429 }));
  await assert.rejects(limited.search('Łódź', signal()), /^Error: GEO_PROVIDER_RATE_LIMIT$/);
});
