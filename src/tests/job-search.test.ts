import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { buildJobSearchProviders } from '../domain/jobSearch.js';
import { createExtendedJobApp } from '../server/extendedApp.js';
import { FeatureFlagService } from '../server/featureFlagService.js';

async function register(base: string): Promise<string> {
  const response = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Search Tester', email: 'search@example.pl', password: 'Bezpieczne123', acceptTerms: true, acceptPrivacy: true, analyticsConsent: false })
  });
  assert.equal(response.status, 201);
  return response.headers.get('set-cookie')?.split(';')[0] ?? '';
}

async function request(base: string, path: string, cookie: string, method = 'GET', body?: Record<string, unknown>): Promise<Response> {
  const init: RequestInit = { method, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) } };
  if (body) init.body = JSON.stringify(body);
  return fetch(`${base}${path}`, init);
}

test('provider catalog includes all agreed sources and never claims automatic ingestion without access', () => {
  const providers = buildJobSearchProviders({ query: 'magazynier', location: 'Puck', radiusKm: 30 });
  assert.deepEqual(providers.map(provider => provider.key), ['pracuj', 'linkedin', 'olx', 'indeed', 'rocketjobs', 'justjoinit', 'employer_careers']);
  assert.equal(providers.filter(provider => provider.canIngestAutomatically).length, 0);
  assert.equal(providers.filter(provider => provider.searchUrl !== null).length, 6);
  const linkedin = providers.find(provider => provider.key === 'linkedin');
  assert.ok(linkedin?.searchUrl?.includes('keywords=magazynier'));
  assert.ok(linkedin?.searchUrl?.includes('location=Puck'));
  assert.ok(linkedin?.searchUrl?.includes('distance=30'));
  const olx = providers.find(provider => provider.key === 'olx');
  assert.ok(olx?.notes.includes('nie służy do pobierania ogłoszeń innych użytkowników'));
});

test('federated job search is feature-gated, returns providers and filters jobs already known to Job', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-search-'));
  const app = createExtendedJobApp({ nodeEnv: 'test', port: 0, appOrigin: 'http://127.0.0.1', dataDir: dir, databasePath: join(dir, 'test.sqlite'), adminEmails: new Set() });
  await new Promise<void>((resolve, reject) => app.server.listen(0, '127.0.0.1', () => resolve()).once('error', reject));
  const address = app.server.address() as AddressInfo;
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const cookie = await register(base);
    const disabled = await request(base, '/api/job-search?q=magazynier&location=Puck&radiusKm=30', cookie);
    assert.equal(disabled.status, 404);
    assert.equal(((await disabled.json()) as { error: { code: string } }).error.code, 'FEATURE_DISABLED');

    new FeatureFlagService(app.db).set('job_feed', true, 100);
    const importResponse = await request(base, '/api/job-feed/import-user', cookie, 'POST', {
      rawText: 'Magazynier\nFirma: Port Logistics\nMiejsce pracy: Puck\nUmowa o pracę\nWynagrodzenie: 6200 PLN brutto\nWymagania: UDT',
      sourceUrl: 'https://jobs.example.pl/puck-magazynier'
    });
    assert.equal(importResponse.status, 201);

    const response = await request(base, '/api/job-search?q=magazynier&location=Puck&radiusKm=30', cookie);
    assert.equal(response.status, 200);
    const body = await response.json() as {
      providers: Array<{ key: string; searchUrl: string | null; canIngestAutomatically: boolean }>;
      localJobs: Array<{ title: string | null; company: string | null; location: string | null }>;
      externalSearchCount: number;
      automaticIngestionCount: number;
      boundary: string;
    };
    assert.equal(body.providers.length, 7);
    assert.equal(body.externalSearchCount, 6);
    assert.equal(body.automaticIngestionCount, 0);
    assert.equal(body.localJobs.length, 1);
    assert.equal(body.localJobs[0]?.company, 'Port Logistics');
    assert.equal(body.localJobs[0]?.location, 'Puck');
    assert.match(body.boundary, /automatyczne pobieranie/i);

    const registryKeys = (app.db.db.prepare("SELECT key FROM job_source_registry WHERE key IN ('pracuj','linkedin','olx','indeed','rocketjobs','justjoinit','employer_careers') ORDER BY key").all() as unknown as Array<{ key: string }>).map(row => row.key);
    assert.deepEqual(registryKeys, ['employer_careers', 'indeed', 'justjoinit', 'linkedin', 'olx', 'pracuj', 'rocketjobs']);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
