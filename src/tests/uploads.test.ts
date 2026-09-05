import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { deleteStoredFile, resolveStoredFilePath, storeCvUpload } from '../server/files.js';
import { HttpError } from '../server/http.js';

const encoded = (text: string): string => Buffer.from(text, 'utf8').toString('base64');

async function expectUploadError(run: () => Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(run, error => error instanceof HttpError && error.status >= 400 && error.code === code);
}

test('text CV uses a portable storage key and is stored privately', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-upload-'));
  try {
    const result = await storeCvUpload({ dataDir: dir, userId: 'user-1', filename: 'cv.txt', mimeType: 'text/plain', base64: encoded('Excel\nUDT\nPrawo jazdy B'), maxBytes: 1024 * 1024 });
    assert.equal(result.originalName, 'cv.txt');
    assert.match(result.extractedText ?? '', /Excel/);
    assert.equal(result.sha256.length, 64);
    assert.match(result.storageKey, /^uploads\/user-1\/[a-f0-9-]+\.txt$/);
    assert.equal(result.storageKey.includes(dir), false);
    assert.equal(await readFile(resolveStoredFilePath(dir, result.storageKey), 'utf8'), 'Excel\nUDT\nPrawo jazdy B');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('stored file deletion resolves the key under DATA_DIR only', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-upload-delete-'));
  try {
    const result = await storeCvUpload({ dataDir: dir, userId: 'user-1', filename: 'cv.txt', mimeType: 'text/plain', base64: encoded('portable'), maxBytes: 1024 });
    const path = resolveStoredFilePath(dir, result.storageKey);
    await deleteStoredFile(dir, result.storageKey);
    await assert.rejects(readFile(path), error => (error as NodeJS.ErrnoException).code === 'ENOENT');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('storage key resolver rejects traversal and absolute paths', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-upload-path-'));
  const sentinel = resolve(dir, 'outside.txt');
  try {
    await writeFile(sentinel, 'keep me');
    assert.throws(() => resolveStoredFilePath(dir, 'uploads/user-1/../../outside.txt'), /Invalid upload storage key|escapes/);
    assert.throws(() => resolveStoredFilePath(dir, sentinel), /Absolute upload storage keys/);
    await assert.rejects(deleteStoredFile(dir, 'uploads/user-1/../../outside.txt'));
    assert.equal(await readFile(sentinel, 'utf8'), 'keep me');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('upload rejects MIME/extension mismatch and spoofed PDF signature', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-upload-'));
  try {
    await expectUploadError(() => storeCvUpload({ dataDir: dir, userId: 'user-1', filename: 'cv.exe', mimeType: 'text/plain', base64: encoded('hello'), maxBytes: 1024 }), 'UPLOAD_EXTENSION_MISMATCH');
    await expectUploadError(() => storeCvUpload({ dataDir: dir, userId: 'user-1', filename: 'cv.pdf', mimeType: 'application/pdf', base64: encoded('not really a pdf'), maxBytes: 1024 }), 'UPLOAD_SIGNATURE_MISMATCH');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
