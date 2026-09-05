import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createJobApp } from '../server/app.js';

test('health reports database readiness and degrades to 503 when application schema is unavailable', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-health-'));
  const app = createJobApp({
    nodeEnv: 'test',
    port: 0,
    appOrigin: 'http://127.0.0.1',
    dataDir: dir,
    databasePath: join(dir, 'test.sqlite'),
    adminEmails: new Set()
  });
  await new Promise<void>((resolve, reject) => app.server.listen(0, '127.0.0.1', () => resolve()).once('error', reject));
  const address = app.server.address() as AddressInfo;
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const healthy = await fetch(`${base}/api/health`);
    assert.equal(healthy.status, 200);
    assert.deepEqual(await healthy.json(), {
      ok: true,
      service: 'job',
      version: '0.1.0',
      database: 'ok',
      now: assert.match.string
    });

    app.db.db.exec('DROP TABLE feature_flags;');

    const degraded = await fetch(`${base}/api/health`);
    assert.equal(degraded.status, 503);
    const payload = await degraded.json() as { ok: boolean; service: string; version: string; database: string; now: string };
    assert.equal(payload.ok, false);
    assert.equal(payload.service, 'job');
    assert.equal(payload.version, '0.1.0');
    assert.equal(payload.database, 'unavailable');
    assert.match(payload.now, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
