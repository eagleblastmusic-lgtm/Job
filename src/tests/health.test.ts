import { privateStorageReady } from '../server/storageReadiness.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, rename, writeFile, readdir, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createJobApp } from '../server/app.js';

interface HealthPayload {
  ok: boolean;
  service: string;
  version: string;
  database: string;
  storage: string;
  now: string;
}

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
    const healthyPayload = await healthy.json() as HealthPayload;
    assert.equal(healthyPayload.ok, true);
    assert.equal(healthyPayload.service, 'job');
    assert.equal(healthyPayload.version, '0.1.0');
    assert.equal(healthyPayload.database, 'ok');
    assert.equal(healthyPayload.storage, 'ok');
    assert.deepEqual(await readdir(join(dir, 'uploads')), []);
    assert.match(healthyPayload.now, /^\d{4}-\d{2}-\d{2}T/);

    await rename(join(dir, 'uploads'), join(dir, 'uploads-held'));
    await writeFile(join(dir, 'uploads'), 'synthetic obstruction');
    const blocked = await fetch(`${base}/api/health`);
    assert.equal(blocked.status, 503);
    const blockedPayload = await blocked.json() as HealthPayload;
    assert.equal(blockedPayload.database, 'ok');
    assert.equal(blockedPayload.storage, 'unavailable');
    assert.equal(JSON.stringify(blockedPayload).includes(dir), false);
    await rm(join(dir, 'uploads'));
    await rename(join(dir, 'uploads-held'), join(dir, 'uploads'));
    assert.equal((await fetch(`${base}/api/health`)).status, 200);

    app.db.db.exec('DROP TABLE feature_flags;');

    const degraded = await fetch(`${base}/api/health`);
    assert.equal(degraded.status, 503);
    const degradedPayload = await degraded.json() as HealthPayload;
    assert.equal(degradedPayload.ok, false);
    assert.equal(degradedPayload.service, 'job');
    assert.equal(degradedPayload.version, '0.1.0');
    assert.equal(degradedPayload.database, 'unavailable');
    assert.match(degradedPayload.now, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});


test('storage readiness preserves private files, coalesces probes and refuses redirected upload directories', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-storage-health-'));
  const dataDir = join(dir, 'data'), external = join(dir, 'external');
  try {
    await mkdir(join(dataDir, 'uploads'), { recursive: true });
    await writeFile(join(dataDir, 'uploads', 'private-sentinel'), 'retained private fixture');
    const first = privateStorageReady(dataDir);
    assert.equal(privateStorageReady(dataDir), first);
    assert.equal(await first, true);
    assert.deepEqual(await readdir(join(dataDir, 'uploads')), ['private-sentinel']);
    await rename(join(dataDir, 'uploads'), join(dataDir, 'uploads-held'));
    await mkdir(external);
    await symlink(external, join(dataDir, 'uploads'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal(await privateStorageReady(dataDir), false);
    assert.deepEqual(await readdir(external), []);
    await rm(join(dataDir, 'uploads'));
    await rename(join(dataDir, 'uploads-held'), join(dataDir, 'uploads'));
    assert.equal(await privateStorageReady(dataDir), true);
    await symlink(dataDir, join(dir, 'redirected-root'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal(await privateStorageReady(join(dir, 'redirected-root')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
