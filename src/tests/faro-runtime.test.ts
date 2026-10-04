import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createFaroApp } from '../server/faroApp.js';

test('canonical runtime retires CV, EHV, candidate billing and external import while preserving authentication', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'faro-runtime-'));
  const app = createFaroApp({ nodeEnv: 'test', databasePath: join(dir, 'db.sqlite'), dataDir: dir });
  await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  try {
    const response = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Jan', email: 'faro@example.pl', password: 'Bezpieczne123', acceptTerms: true, acceptPrivacy: true }) });
    assert.equal(response.status, 201);
    const cookie = response.headers.get('set-cookie')?.split(';')[0] ?? '';
    const me = await fetch(`${base}/api/me`, { headers: { cookie } }).then(r => r.json()) as { subscription: { plan: string; status: string } };
    assert.equal(me.subscription.plan, 'FREE');
    assert.equal(me.subscription.status, 'ACTIVE');
    for (const path of ['/api/cv/base.pdf', '/api/cv/upload', '/api/jobs/x/application-package', '/api/effective-wage', '/api/billing', '/api/job-search', '/api/job-feed/import-user']) {
      const denied = await fetch(`${base}${path}`, { method: 'POST', headers: { cookie } });
      assert.equal(denied.status, 410, path);
      assert.equal(denied.headers.get('cache-control'), 'no-store');
    }
  } finally { await app.close(); await rm(dir, { recursive: true, force: true }); }
});
