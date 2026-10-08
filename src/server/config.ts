import { resolve } from 'node:path';
import { validateMalwareScanEnvironment } from './malwareScanner.js';

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Nieprawidłowa wartość ${name}.`);
  return parsed;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  throw new Error(`Nieprawidłowa wartość ${name}.`);
}

// Decode provider-generated keys without changing the established hex key contract.
function protectedKey(name:string,override:string|null|undefined):string|null {
  const hex=override??process.env[name]??null,encoded=process.env[`${name}_BASE64`];
  if(encoded!==undefined&&(override===undefined||override===null)) {
    if(hex!==null)throw new Error(`${name}: skonfiguruj tylko jeden format klucza.`);
    const bytes=Buffer.from(encoded,'base64');
    if(bytes.length!==32||bytes.toString('base64')!==encoded)throw new Error(`${name}_BASE64 wymaga 32 bajtów w kanonicznym Base64.`);
    return bytes.toString('hex');
  }
  if(hex!==null&&!/^[a-fA-F0-9]{64}$/.test(hex))throw new Error(`${name} wymaga 32 bajtów zapisanych szesnastkowo.`);
  return hex;
}

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databasePath: string;
  dataDir: string;
  appOrigin: string;
  trustProxy: boolean;
  sessionDays: number;
  /** Compatibility field only. Public registration must never derive ADMIN from an asserted e-mail address. */
  adminEmails: Set<string>;
  aiBaseUrl: string | null;
  aiApiKey: string | null;
  aiModel: string | null;
  aiTimeoutMs: number;
  joobleApiKeyPl: string | null;
  joobleTimeoutMs: number;
  pdfRendererBin: string;
  maxUploadBytes: number;
  faroWorkerEnabled: boolean;
  faroWorkerIntervalMs: number;
  faroMfaEncryptionKey:string|null;
  faroRateLimitKey:string|null;
  faroRequirePrivilegedMfa:boolean;
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  validateMalwareScanEnvironment();
  const nodeEnvRaw = overrides.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const nodeEnv: AppConfig['nodeEnv'] = nodeEnvRaw === 'production' || nodeEnvRaw === 'test' ? nodeEnvRaw : 'development';
  const faroRateLimitKey=protectedKey('FARO_RATE_LIMIT_KEY',overrides.faroRateLimitKey);
  const faroMfaEncryptionKey=protectedKey('FARO_MFA_ENCRYPTION_KEY',overrides.faroMfaEncryptionKey);
  const dataDir = overrides.dataDir ?? resolve(process.env.DATA_DIR ?? './data');
  const explicitOrigin = overrides.appOrigin ?? process.env.APP_ORIGIN?.trim();
  const platformOrigin = process.env.RENDER_EXTERNAL_URL?.trim() || null;
  return {
    nodeEnv,
    faroMfaEncryptionKey,
    faroRateLimitKey,
    faroRequirePrivilegedMfa:nodeEnv==='production'||(overrides.faroRequirePrivilegedMfa??boolEnv('FARO_REQUIRE_PRIVILEGED_MFA',false)),
    port: overrides.port ?? intEnv('PORT', 3000),
    databasePath: overrides.databasePath ?? resolve(process.env.DATABASE_PATH ?? `${dataDir}/job.sqlite`),
    dataDir,
    appOrigin: explicitOrigin || platformOrigin || 'http://localhost:3000',
    trustProxy: overrides.trustProxy ?? boolEnv('TRUST_PROXY', false),
    sessionDays: overrides.sessionDays ?? intEnv('SESSION_DAYS', 30),
    // Deliberately ignore ADMIN_EMAILS and any override here. E-mail ownership is not
    // verified in MVP, so an asserted address is not an authorization factor.
    adminEmails: new Set<string>(),
    aiBaseUrl: overrides.aiBaseUrl ?? (process.env.AI_BASE_URL?.trim() || null),
    aiApiKey: overrides.aiApiKey ?? (process.env.AI_API_KEY?.trim() || null),
    aiModel: overrides.aiModel ?? (process.env.AI_MODEL?.trim() || null),
    aiTimeoutMs: overrides.aiTimeoutMs ?? intEnv('AI_TIMEOUT_MS', 15000),
    joobleApiKeyPl: overrides.joobleApiKeyPl ?? (process.env.JOOBLE_API_KEY_PL?.trim() || null),
    joobleTimeoutMs: overrides.joobleTimeoutMs ?? intEnv('JOOBLE_TIMEOUT_MS', 8000),
    pdfRendererBin: overrides.pdfRendererBin ?? (process.env.PDF_RENDERER_BIN?.trim() || (process.platform === 'win32' ? 'python' : 'python3')),
    maxUploadBytes: overrides.maxUploadBytes ?? intEnv('MAX_UPLOAD_BYTES', 5 * 1024 * 1024),
    faroWorkerEnabled: nodeEnv !== 'production' && (overrides.faroWorkerEnabled ?? boolEnv('FARO_WORKER_ENABLED', nodeEnv === 'development')),
    faroWorkerIntervalMs: overrides.faroWorkerIntervalMs ?? intEnv('FARO_WORKER_INTERVAL_MS', 60000)
  };
}
