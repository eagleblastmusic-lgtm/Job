import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HttpError, serveStatic, sendJson } from '../server/http.js';

test('static HTTP boundary rejects traversal, invalid escapes and external linked assets while retaining public files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'faro-static-')), publicDir = join(root, 'public'), privateDir = join(root, 'private');
  await mkdir(publicDir); await mkdir(privateDir);
  await writeFile(join(publicDir, 'index.html'), 'PUBLIC_SENTINEL'); await writeFile(join(privateDir, 'sentinel.txt'), 'PRIVATE_SENTINEL');
  await symlink(privateDir, join(publicDir, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  const server = createServer(async (req, res) => {
    try { if (await serveStatic(res, publicDir, req.url ?? '/')) return; sendJson(res, 404, { code: 'NOT_FOUND' }); }
    catch (error) { assert.ok(error instanceof HttpError); sendJson(res, error.status, { code: error.code }); }
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal(await fetch(base + '/').then(response => response.text()), 'PUBLIC_SENTINEL');
    for (const path of ['/linked/sentinel.txt', '/%2e%2e%2fprivate/sentinel.txt', '/%5cprivate%5csentinel.txt', '/%00private.txt', '/C%3Aprivate.txt']) {
      const response = await fetch(base + path); assert.equal(response.status, 404, path); assert.doesNotMatch(await response.text(), /PRIVATE_SENTINEL/);
    }
    const invalid = await fetch(base + '/bad%ZZ'); assert.equal(invalid.status, 400); assert.equal((await invalid.json() as { code: string }).code, 'INVALID_URL');
    assert.equal(await fetch(base + '/index.html').then(response => response.text()), 'PUBLIC_SENTINEL');
  } finally { server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); await rm(root, { recursive: true, force: true }); }
});
