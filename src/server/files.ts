import { createHash, randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { HttpError } from './http.js';

const execFileAsync = promisify(execFile);
const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TEXT = 'text/plain';
const MARKDOWN = 'text/markdown';
const ALLOWED = new Set([PDF, TEXT, MARKDOWN, DOCX]);
const EXTENSIONS: Record<string, Set<string>> = {
  [PDF]: new Set(['.pdf']),
  [DOCX]: new Set(['.docx']),
  [TEXT]: new Set(['.txt', '.md']),
  [MARKDOWN]: new Set(['.md'])
};

export interface StoredUpload {
  id: string;
  originalName: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;
  sha256: string;
  extractedText: string | null;
}

function safeName(name: string): string {
  return basename(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'cv';
}

function decodeBase64(value: string): Buffer {
  const compact = value.replace(/\s+/g, '');
  if (!compact || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) {
    throw new HttpError(400, 'Nieprawidłowa zawartość pliku.', 'INVALID_UPLOAD_ENCODING');
  }
  return Buffer.from(compact, 'base64');
}

function validateSignature(buffer: Buffer, mimeType: string): void {
  if (mimeType === PDF && buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new HttpError(400, 'Plik nie jest prawidłowym dokumentem PDF.', 'UPLOAD_SIGNATURE_MISMATCH');
  }
  if (mimeType === DOCX) {
    const zipHeader = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && [0x03, 0x05, 0x07].includes(buffer[2] ?? -1) && [0x04, 0x06, 0x08].includes(buffer[3] ?? -1);
    if (!zipHeader) throw new HttpError(400, 'Plik nie jest prawidłowym dokumentem DOCX.', 'UPLOAD_SIGNATURE_MISMATCH');
  }
  if ((mimeType === TEXT || mimeType === MARKDOWN) && buffer.includes(0)) {
    throw new HttpError(400, 'Plik tekstowy zawiera dane binarne.', 'UPLOAD_SIGNATURE_MISMATCH');
  }
}

async function extractText(path: string, mimeType: string): Promise<string | null> {
  if (mimeType === TEXT || mimeType === MARKDOWN) return (await readFile(path, 'utf8')).slice(0, 200_000);
  if (mimeType === PDF) {
    try {
      const { stdout } = await execFileAsync('pdftotext', ['-layout', path, '-'], { timeout: 15000, maxBuffer: 2_000_000 });
      return stdout.trim().slice(0, 200_000) || null;
    } catch {
      return null;
    }
  }
  if (mimeType === DOCX) {
    try {
      const { stdout } = await execFileAsync('unzip', ['-p', path, 'word/document.xml'], { timeout: 10000, maxBuffer: 2_000_000 });
      return stdout.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim().slice(0, 200_000) || null;
    } catch {
      return null;
    }
  }
  return null;
}

async function validateStoredDocx(path: string): Promise<void> {
  try {
    const { stdout } = await execFileAsync('unzip', ['-Z1', path], { timeout: 5000, maxBuffer: 500_000 });
    const names = new Set(stdout.split(/\r?\n/).filter(Boolean));
    if (!names.has('[Content_Types].xml') || !names.has('word/document.xml')) throw new Error('missing DOCX entries');
  } catch {
    await unlink(path).catch(() => undefined);
    throw new HttpError(400, 'Struktura pliku DOCX jest nieprawidłowa.', 'INVALID_DOCX');
  }
}

export async function storeCvUpload(input: { dataDir: string; userId: string; filename: string; mimeType: string; base64: string; maxBytes: number }): Promise<StoredUpload> {
  if (!ALLOWED.has(input.mimeType)) throw new HttpError(400, 'Obsługiwane formaty CV: PDF, DOCX, TXT i Markdown.', 'UNSUPPORTED_UPLOAD_TYPE');
  const originalName = safeName(input.filename);
  const extension = extname(originalName).toLowerCase();
  if (!EXTENSIONS[input.mimeType]?.has(extension)) throw new HttpError(400, 'Rozszerzenie pliku nie pasuje do jego typu.', 'UPLOAD_EXTENSION_MISMATCH');

  const buffer = decodeBase64(input.base64);
  if (buffer.byteLength === 0) throw new HttpError(400, 'Plik jest pusty.', 'EMPTY_UPLOAD');
  if (buffer.byteLength > input.maxBytes) throw new HttpError(413, `Plik przekracza limit ${Math.floor(input.maxBytes / 1024 / 1024)} MB.`, 'UPLOAD_TOO_LARGE');
  validateSignature(buffer, input.mimeType);

  const id = randomUUID();
  const userDir = resolve(input.dataDir, 'uploads', input.userId);
  await mkdir(userDir, { recursive: true, mode: 0o700 });
  const filename = `${id}${extension}`;
  const fullPath = join(userDir, filename);
  await writeFile(fullPath, buffer, { mode: 0o600 });
  await chmod(fullPath, 0o600);
  if (input.mimeType === DOCX) await validateStoredDocx(fullPath);
  const extractedText = await extractText(fullPath, input.mimeType);
  return {
    id,
    originalName,
    mimeType: input.mimeType,
    storageKey: fullPath,
    sizeBytes: buffer.byteLength,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    extractedText
  };
}

export async function deleteStoredFile(path: string): Promise<void> {
  try { await unlink(path); } catch { /* already absent */ }
}
