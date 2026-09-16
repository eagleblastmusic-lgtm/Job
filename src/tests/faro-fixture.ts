import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createFaroApp } from '../server/faroApp.js';
export async function faroFixture() {
  const dir = await mkdtemp(join(tmpdir(), 'faro-contract-'));
  const app = createFaroApp({ nodeEnv: 'test', databasePath: join(dir, 'db.sqlite'), dataDir: dir });
  await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  async function request<T = Record<string, unknown>>(path: string, cookie = '', method = 'GET', body?: unknown, status = 200): Promise<T> {
    const response = await fetch(`${base}${path}`, { method, headers: { cookie, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json() as T;
    assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`);
    return result;
  }
  async function user(name: string) {
    const response = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, email: `${name.toLowerCase()}@example.pl`, password: 'Bezpieczne123', acceptTerms: true, acceptPrivacy: true }) });
    assert.equal(response.status, 201);
    const data = await response.json() as { user: { id: string } };
    return { id: data.user.id, cookie: response.headers.get('set-cookie')!.split(';')[0]!, email: `${name.toLowerCase()}@example.pl` };
  }
  return { app, base, request, user, close: async () => { await app.close(); await rm(dir, { recursive: true, force: true }); } };
}
