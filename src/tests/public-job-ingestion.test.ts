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
