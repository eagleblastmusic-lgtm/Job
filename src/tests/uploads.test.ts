import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { storeCvUpload } from '../server/files.js';
import { HttpError } from '../server/http.js';

const encoded = (text: string): string => Buffer.from(text, 'utf8').toString('base64');

async function expectUploadError(run: () => Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(run, error => error instanceof HttpError && error.status >= 400 && error.code === code);
}

test('text CV is stored privately and extracted', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-upload-'));
  try {
    const result = await storeCvUpload({ dataDir: dir, userId: 'user-1', filename: 'cv.txt', mimeType: 'text/plain', base64: encoded('Excel\nUDT\nPrawo jazdy B'), maxBytes: 1024 * 1024 });
    assert.equal(result.originalName, 'cv.txt');
    assert.match(result.extractedText ?? '', /Excel/);
    assert.equal(result.sha256.length, 64);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('upload rejects MIME/extension mismatch and spoofed PDF signature', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'job-upload-'));
  try {
    await expectUploadError(() => storeCvUpload({ dataDir: dir, userId: 'user-1', filename: 'cv.exe', mimeType: 'text/plain', base64: encoded('hello'), maxBytes: 1024 }), 'UPLOAD_EXTENSION_MISMATCH');
    await expectUploadError(() => storeCvUpload({ dataDir: dir, userId: 'user-1', filename: 'cv.pdf', mimeType: 'application/pdf', base64: encoded('not really a pdf'), maxBytes: 1024 }), 'UPLOAD_SIGNATURE_MISMATCH');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
