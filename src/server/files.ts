import { createHash, randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ALLOWED = new Set(['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

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

async function extractText(path: string, mimeType: string): Promise<string | null> {
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') return (await readFile(path, 'utf8')).slice(0, 200_000);
  if (mimeType === 'application/pdf') {
    try {
      const { stdout } = await execFileAsync('pdftotext', ['-layout', path, '-'], { timeout: 15000, maxBuffer: 2_000_000 });
      return stdout.trim().slice(0, 200_000) || null;
    } catch {
      return null;
    }
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const { stdout } = await execFileAsync('unzip', ['-p', path, 'word/document.xml'], { timeout: 10000, maxBuffer: 2_000_000 });
      return stdout.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim().slice(0, 200_000) || null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function storeCvUpload(input: { dataDir: string; userId: string; filename: string; mimeType: string; base64: string; maxBytes: number }): Promise<StoredUpload> {
  if (!ALLOWED.has(input.mimeType)) throw new Error('Obsługiwane formaty CV: PDF, DOCX, TXT i Markdown.');
  const buffer = Buffer.from(input.base64, 'base64');
  if (buffer.byteLength === 0) throw new Error('Plik jest pusty.');
  if (buffer.byteLength > input.maxBytes) throw new Error(`Plik przekracza limit ${Math.floor(input.maxBytes / 1024 / 1024)} MB.`);
  const id = randomUUID();
  const userDir = resolve(input.dataDir, 'uploads', input.userId);
  await mkdir(userDir, { recursive: true, mode: 0o700 });
  const filename = `${id}${extname(safeName(input.filename)).toLowerCase()}`;
  const fullPath = join(userDir, filename);
  await writeFile(fullPath, buffer, { mode: 0o600 });
  await chmod(fullPath, 0o600);
  const extractedText = await extractText(fullPath, input.mimeType);
  return {
    id,
    originalName: safeName(input.filename),
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
