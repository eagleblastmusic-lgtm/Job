import { resolve } from 'node:path';

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Nieprawidłowa wartość ${name}.`);
  return parsed;
}

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databasePath: string;
  dataDir: string;
  appOrigin: string;
  sessionDays: number;
  adminEmails: Set<string>;
  aiBaseUrl: string | null;
  aiApiKey: string | null;
  aiModel: string | null;
  aiTimeoutMs: number;
  pdfRendererBin: string;
  maxUploadBytes: number;
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const nodeEnvRaw = process.env.NODE_ENV ?? 'development';
  const nodeEnv: AppConfig['nodeEnv'] = nodeEnvRaw === 'production' || nodeEnvRaw === 'test' ? nodeEnvRaw : 'development';
  const dataDir = overrides.dataDir ?? resolve(process.env.DATA_DIR ?? './data');
  const adminEmails = new Set((process.env.ADMIN_EMAILS ?? '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean));
  const explicitOrigin = overrides.appOrigin ?? process.env.APP_ORIGIN?.trim();
  const platformOrigin = process.env.RENDER_EXTERNAL_URL?.trim() || null;
  return {
    nodeEnv,
    port: overrides.port ?? intEnv('PORT', 3000),
    databasePath: overrides.databasePath ?? resolve(process.env.DATABASE_PATH ?? `${dataDir}/job.sqlite`),
    dataDir,
    appOrigin: explicitOrigin || platformOrigin || 'http://localhost:3000',
    sessionDays: overrides.sessionDays ?? intEnv('SESSION_DAYS', 30),
    adminEmails: overrides.adminEmails ?? adminEmails,
    aiBaseUrl: overrides.aiBaseUrl ?? (process.env.AI_BASE_URL?.trim() || null),
    aiApiKey: overrides.aiApiKey ?? (process.env.AI_API_KEY?.trim() || null),
    aiModel: overrides.aiModel ?? (process.env.AI_MODEL?.trim() || null),
    aiTimeoutMs: overrides.aiTimeoutMs ?? intEnv('AI_TIMEOUT_MS', 15000),
    pdfRendererBin: overrides.pdfRendererBin ?? (process.env.PDF_RENDERER_BIN?.trim() || 'python3'),
    maxUploadBytes: overrides.maxUploadBytes ?? intEnv('MAX_UPLOAD_BYTES', 5 * 1024 * 1024)
  };
}
