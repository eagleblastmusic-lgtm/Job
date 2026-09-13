import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from './config.js';
import type { JobDatabase } from './db.js';
import type { AppStore } from './store.js';
import { boundedStringField, HttpError, readJson, sendJson } from './http.js';
import { requireExtendedUser, enforceExtendedOrigin } from './extendedAuth.js';
import { FeatureFlagService } from './featureFlagService.js';
import { JobFeedService } from './jobFeedService.js';
import { BrowserAssistedJobConnector, type JobSourceInput } from '../domain/jobSources.js';

const SOURCE_LABELS = {
  pracuj: 'Pracuj.pl',
  linkedin: 'LinkedIn Jobs',
  olx: 'OLX Praca',
  indeed: 'Indeed',
  rocketjobs: 'RocketJobs',
  justjoinit: 'Just Join IT'
} as const;

type BrowserSourceKey = keyof typeof SOURCE_LABELS;

function sourceKey(value: string | null): BrowserSourceKey {
  if (value && Object.prototype.hasOwnProperty.call(SOURCE_LABELS, value)) return value as BrowserSourceKey;
  throw new HttpError(400, 'Nieobsługiwane źródło importu przeglądarkowego.', 'INVALID_BROWSER_SOURCE');
}

function parseItems(body: Record<string, unknown>): JobSourceInput[] {
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
    throw new HttpError(400, 'Przekaż od 1 do 100 ofert z widocznej strony.', 'INVALID_BROWSER_ITEMS');
  }
  return body.items.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new HttpError(400, `Nieprawidłowa oferta przeglądarkowa nr ${index + 1}.`, 'INVALID_BROWSER_ITEM');
    }
    const item = value as Record<string, unknown>;
    return {
      rawText: boundedStringField(item, 'rawText', 50_000, true, 20) ?? '',
      sourceUrl: boundedStringField(item, 'sourceUrl', 2_000, false),
      externalId: boundedStringField(item, 'externalId', 500, false),
      publishedAt: boundedStringField(item, 'publishedAt', 100, false)
    };
  });
}

export async function handleBrowserImportApi(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  store: AppStore,
  db: JobDatabase,
  config: AppConfig
): Promise<boolean> {
  if (pathname !== '/api/job-feed/import-browser-batch') return false;
  if ((req.method ?? 'GET') !== 'POST') {
    sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Nie znaleziono endpointu.' } });
    return true;
  }

  enforceExtendedOrigin(req, config);
  const user = requireExtendedUser(req, store);
  const flags = new FeatureFlagService(db);
  if (!flags.isEnabled('job_feed', { userId: user.id, role: user.role })) {
    throw new HttpError(404, 'Feed ofert nie jest obecnie dostępny.', 'FEATURE_DISABLED');
  }

  const body = await readJson(req);
  const key = sourceKey(boundedStringField(body, 'sourceKey', 30, true));
  const pageUrl = boundedStringField(body, 'pageUrl', 2_000, true) ?? '';
  const items = parseItems(body);
  const connector = new BrowserAssistedJobConnector(key, SOURCE_LABELS[key], pageUrl, items);
  const feed = new JobFeedService(db, store);

  let results;
  try {
    results = await feed.importFromConnector(user.id, connector);
  } catch (error) {
    if (error instanceof Error && error.message === 'Źródło ofert jest wyłączone.') {
      throw new HttpError(503, error.message, 'JOB_SOURCE_DISABLED');
    }
    throw error;
  }

  const canonicalCount = results.filter(result => result.createdCanonicalJob).length;
  store.analytics(user.id, 'browser_assisted_job_import', {
    sourceKey: key,
    receivedCount: items.length,
    canonicalCount
  });
  sendJson(res, 201, {
    sourceKey: key,
    receivedCount: items.length,
    canonicalCount,
    results,
    jobs: feed.list(user.id, 50, 0)
  });
  return true;
}
