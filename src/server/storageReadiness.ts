import { constants } from 'node:fs';
import { lstat, mkdir, open, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';

const pending = new Map<string, Promise<boolean>>();

/** Only touches an exclusively created synthetic probe; never opens retained files. */
async function probe(dataDir: string): Promise<boolean> {
  let path: string | undefined;
  let owned = false;
  try {
    await mkdir(dataDir, { recursive: true });
    const root = await lstat(dataDir);
    if (!root.isDirectory() || root.isSymbolicLink()) return false;
    const uploads = join(dataDir, 'uploads');
    await mkdir(uploads, { recursive: true });
    const directory = await lstat(uploads);
    if (!directory.isDirectory() || directory.isSymbolicLink()) return false;
    path = join(uploads, `.faro-readiness-${randomUUID()}`);
    const handle = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0), 0o600);
    owned = true;
    try { await handle.writeFile('FARO_STORAGE_PROBE_V1'); await handle.sync(); }
    finally { await handle.close(); }
    await unlink(path);
    owned = false;
    return true;
  } catch { return false; }
  finally { if (owned && path) try { await unlink(path); } catch { /* Neutral readiness failure; never expose filesystem details. */ } }
}

/** Coalesce overlapping health requests; no stale success cache after storage loss. */
export function privateStorageReady(dataDir: string): Promise<boolean> {
  const key = resolve(dataDir);
  const existing = pending.get(key);
  if (existing) return existing;
  const work = probe(key).finally(() => pending.delete(key));
  pending.set(key, work);
  return work;
}
