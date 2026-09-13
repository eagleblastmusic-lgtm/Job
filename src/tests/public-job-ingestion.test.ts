import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createExtendedJobApp } from '../server/extendedApp.js';
import { PublicJobIngestionService } from '../server/publicJobIngestionService.js';
import { JobFeedService } from '../server/jobFeedService.js';

async function register(base: string, email: string): Promise<void> {
  const response = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Live Source Tester', email, password: 'Bezpieczne123', acceptTerms: true, acceptPrivacy: true, analyticsConsent: false })
  });
  assert.equal(response.status, 201);
}

const allowedRobots = `User-agent: *\nDisallow: /konto/\nSitemap: https://www.pracuj.pl/SiteMaps/CurrentOffers/SiteMapIndexJobOffers.xml\n`;

const searchHtml = `<!doctype html><html><body>
<a href="https://www.pracuj.pl/praca/magazynier-puck,oferta,10001">Magazynier</a>
</body></html>`;

const detailHtml = `<!doctype html><html><head><title>Magazynier - Port Logistics</title>
<script type="application/ld+json">{
  "@context":"https://schema.org",
  "@type":"JobPosting",
  "title":"Magazynier",
  "datePosted":"2026-09-13",
  "description":"Obsługa magazynu i kompletowanie zamówień. Wymagane uprawnienia UDT.",
  "employmentType":"FULL_TIME",
  "hiringOrganization":{"@type":"Organization","name":"Port Logistics"},
  "jobLocation":{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":"Puck","addressCountry":"PL"}},
  "baseSalary":{"@type":"MonetaryAmount","currency":"PLN","value":{"@type":"QuantitativeValue","minValue":6000,"maxValue":7000,"unitText":"MONTH"}},
  "url":"https://www.pracuj.pl/praca/magazynier-puck,oferta,10001",
  "identifier":{"@type":"PropertyValue","name":"Pracuj.pl","value":"10001"}
}</script></head><body>Oferta pracy</body></html>`;

function pracujDetail(id: string, title: string, company: string, location: string): string {
  return `<!doctype html><html><head><title>${title} - ${company}</title>
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    datePosted: '2026-09-13',
    description: 'Pełna publiczna treść oferty. Wymagania: dokładność i gotowość do pracy.',
    employmentType: 'FULL_TIME',
    hiringOrganization: { '@type': 'Organization', name: company },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: location, addressCountry: 'PL' } },
    url: `https://www.pracuj.pl/praca/${id},oferta,${id}`,
    identifier: { '@type': 'PropertyValue', name: 'Pracuj.pl', value: id }
  })}</script></head><body>Oferta pracy</body></html>`;
}

test('public source ingestion fetches a listing, parses JobPosting JSON-LD and sends it through canonical dedup', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-live-source-'));
  const app = createExtendedJobApp({ nodeEnv: 'test', port: 0, appOrigin: 'http://127.0.0.1', dataDir: dir, databasePath: join(dir, 'test.sqlite'), adminEmails: new Set() });
  await new Promise<void>((resolve, reject) => app.server.listen(0, '127.0.0.1', () => resolve()).once('error', reject));
  const address = app.server.address() as AddressInfo;
  const base = `http://127.0.0.1:${address.port}`;
  try {
    await register(base, 'live-source@example.pl');
    const user = app.db.db.prepare('SELECT id FROM users WHERE email=?').get('live-source@example.pl') as { id: string } | undefined;
    assert.ok(user);
    app.db.db.prepare("UPDATE job_source_registry SET enabled=CASE WHEN key='pracuj' THEN 1 ELSE 0 END WHERE key IN ('pracuj','linkedin','olx','indeed','rocketjobs','justjoinit')").run();

    const fakeFetch = async (input: string | URL | Request): Promise<Response> => {
      const url = String(input);
      if (url.endsWith('/robots.txt')) return new Response(allowedRobots, { status: 200, headers: { 'content-type': 'text/plain' } });
      if (url.includes(',oferta,10001')) return new Response(detailHtml, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
      if (url.includes('pracuj.pl/praca/')) return new Response(searchHtml, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
      return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    };

    const ingestion = new PublicJobIngestionService(app.db, app.store, fakeFetch);
    const first = await ingestion.refresh(user.id, { query: 'magazynier', location: 'Puck', radiusKm: 30 });
    const pracuj = first.find(source => source.sourceKey === 'pracuj');
    assert.equal(pracuj?.status, 'IMPORTED');
    assert.equal(pracuj?.fetchedCount, 1);
    assert.equal(pracuj?.canonicalCount, 1);

    const feed = new JobFeedService(app.db, app.store).list(user.id, 25, 0);
    assert.equal(feed.length, 1);
    assert.equal(feed[0]?.title, 'Magazynier');
    assert.equal(feed[0]?.company, 'Port Logistics');
    assert.equal(feed[0]?.location, 'Puck, PL');
    assert.deepEqual(feed[0]?.sourceKeys, ['pracuj']);

    const second = await ingestion.refresh(user.id, { query: 'magazynier', location: 'Puck', radiusKm: 30 });
    const pracujSecond = second.find(source => source.sourceKey === 'pracuj');
    assert.equal(pracujSecond?.fetchedCount, 1);
    assert.equal(pracujSecond?.canonicalCount, 0, 'Repeated refresh should update the same source observation instead of duplicating the job.');
    assert.equal(new JobFeedService(app.db, app.store).list(user.id, 25, 0).length, 1);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('Pracuj.pl importer follows public result pagination and imports detail pages into the canonical feed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-pracuj-pages-'));
  const app = createExtendedJobApp({ nodeEnv: 'test', port: 0, appOrigin: 'http://127.0.0.1', dataDir: dir, databasePath: join(dir, 'test.sqlite'), adminEmails: new Set() });
  await new Promise<void>((resolve, reject) => app.server.listen(0, '127.0.0.1', () => resolve()).once('error', reject));
  const address = app.server.address() as AddressInfo;
  const base = `http://127.0.0.1:${address.port}`;
  const requested: string[] = [];
  try {
    await register(base, 'pracuj-pages@example.pl');
    const user = app.db.db.prepare('SELECT id FROM users WHERE email=?').get('pracuj-pages@example.pl') as { id: string } | undefined;
    assert.ok(user);
    app.db.db.prepare("UPDATE job_source_registry SET enabled=CASE WHEN key='pracuj' THEN 1 ELSE 0 END WHERE key IN ('pracuj','linkedin','olx','indeed','rocketjobs','justjoinit')").run();

    const fakeFetch = async (input: string | URL | Request): Promise<Response> => {
      const url = String(input);
      requested.push(url);
      if (url.endsWith('/robots.txt')) return new Response(allowedRobots, { status: 200, headers: { 'content-type': 'text/plain' } });
      if (url.includes(',oferta,20001')) return new Response(pracujDetail('20001', 'Magazynier', 'Firma A', 'Puck'), { status: 200, headers: { 'content-type': 'text/html' } });
      if (url.includes(',oferta,20002')) return new Response(pracujDetail('20002', 'Magazynier UDT', 'Firma B', 'Gdynia'), { status: 200, headers: { 'content-type': 'text/html' } });
      if (url.includes(',oferta,20003')) return new Response(pracujDetail('20003', 'Magazynier', 'Firma C', 'Rumia'), { status: 200, headers: { 'content-type': 'text/html' } });
      if (url.includes('pn=2')) {
        return new Response('<html><body>Strona 2 z 2<a href="https://www.pracuj.pl/praca/magazynier-rumia,oferta,20003">Trzecia oferta</a></body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
      }
      if (url.includes('pracuj.pl/praca/')) {
        return new Response('<html><body>Strona 1 z 2<a href="https://www.pracuj.pl/praca/magazynier-puck,oferta,20001">Pierwsza oferta</a><a href="https://www.pracuj.pl/praca/magazynier-gdynia,oferta,20002">Druga oferta</a></body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
      }
      return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    };

    const results = await new PublicJobIngestionService(app.db, app.store, fakeFetch).refresh(user.id, { query: 'magazynier', location: 'Puck', radiusKm: 30 });
    const pracuj = results.find(source => source.sourceKey === 'pracuj');
    assert.equal(pracuj?.status, 'IMPORTED');
    assert.equal(pracuj?.fetchedCount, 3);
    assert.equal(pracuj?.canonicalCount, 3);
    assert.ok(requested.some(url => url.includes('pn=2')), 'Pracuj importer should follow the public pagination parameter.');

    const feed = new JobFeedService(app.db, app.store).list(user.id, 25, 0);
    assert.equal(feed.length, 3);
    assert.deepEqual(new Set(feed.map(job => job.company)), new Set(['Firma A', 'Firma B', 'Firma C']));
    assert.ok(feed.every(job => job.sourceKeys.includes('pracuj')));
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('Pracuj.pl importer respects robots.txt and stops before reading job pages when /praca/ becomes disallowed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-pracuj-robots-'));
  const app = createExtendedJobApp({ nodeEnv: 'test', port: 0, appOrigin: 'http://127.0.0.1', dataDir: dir, databasePath: join(dir, 'test.sqlite'), adminEmails: new Set() });
  await new Promise<void>((resolve, reject) => app.server.listen(0, '127.0.0.1', () => resolve()).once('error', reject));
  const address = app.server.address() as AddressInfo;
  const base = `http://127.0.0.1:${address.port}`;
  let jobPageRequests = 0;
  try {
    await register(base, 'pracuj-robots@example.pl');
    const user = app.db.db.prepare('SELECT id FROM users WHERE email=?').get('pracuj-robots@example.pl') as { id: string } | undefined;
    assert.ok(user);
    app.db.db.prepare("UPDATE job_source_registry SET enabled=CASE WHEN key='pracuj' THEN 1 ELSE 0 END WHERE key IN ('pracuj','linkedin','olx','indeed','rocketjobs','justjoinit')").run();

    const fakeFetch = async (input: string | URL | Request): Promise<Response> => {
      const url = String(input);
      if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nDisallow: /praca/\n', { status: 200, headers: { 'content-type': 'text/plain' } });
      jobPageRequests += 1;
      return new Response(searchHtml, { status: 200, headers: { 'content-type': 'text/html' } });
    };

    const results = await new PublicJobIngestionService(app.db, app.store, fakeFetch).refresh(user.id, { query: 'magazynier', location: 'Puck', radiusKm: 30 });
    const pracuj = results.find(source => source.sourceKey === 'pracuj');
    assert.equal(pracuj?.status, 'BLOCKED');
    assert.match(pracuj?.message ?? '', /robots\.txt/i);
    assert.equal(jobPageRequests, 0);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('public source ingestion fails closed on access blocks and leaves other sources independent', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-live-block-'));
  const app = createExtendedJobApp({ nodeEnv: 'test', port: 0, appOrigin: 'http://127.0.0.1', dataDir: dir, databasePath: join(dir, 'test.sqlite'), adminEmails: new Set() });
  await new Promise<void>((resolve, reject) => app.server.listen(0, '127.0.0.1', () => resolve()).once('error', reject));
  const address = app.server.address() as AddressInfo;
  const base = `http://127.0.0.1:${address.port}`;
  try {
    await register(base, 'blocked-source@example.pl');
    const user = app.db.db.prepare('SELECT id FROM users WHERE email=?').get('blocked-source@example.pl') as { id: string } | undefined;
    assert.ok(user);
    app.db.db.prepare("UPDATE job_source_registry SET enabled=CASE WHEN key IN ('linkedin','pracuj') THEN 1 ELSE 0 END WHERE key IN ('pracuj','linkedin','olx','indeed','rocketjobs','justjoinit')").run();

    const fakeFetch = async (input: string | URL | Request): Promise<Response> => {
      const url = String(input);
      if (url.endsWith('/robots.txt')) return new Response(allowedRobots, { status: 200, headers: { 'content-type': 'text/plain' } });
      if (url.includes('linkedin.com')) return new Response('Access denied', { status: 403, headers: { 'content-type': 'text/html' } });
      if (url.includes('pracuj.pl')) return new Response('<html><body>Brak pasujących ofert</body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
      return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    };

    const results = await new PublicJobIngestionService(app.db, app.store, fakeFetch).refresh(user.id, { query: 'tester', location: 'Puck', radiusKm: 30 });
    assert.equal(results.find(source => source.sourceKey === 'linkedin')?.status, 'BLOCKED');
    assert.equal(results.find(source => source.sourceKey === 'pracuj')?.status, 'NO_RESULTS');
    assert.ok(results.filter(source => source.status === 'DISABLED').length >= 4);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
