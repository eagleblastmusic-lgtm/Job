import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createJobApp } from './app.js';
import type { AppConfig } from './config.js';
import { HttpError, sendJson } from './http.js';
import { handleExtendedApi } from './extendedApi.js';
import { handleBottleneckApi } from './bottleneckApi.js';
import { handleLocalLabourApi } from './localLabourApi.js';
import { handleEffectiveWageApi } from './effectiveWageApi.js';

function securityHeaders(res: ServerResponse, config: AppConfig): void {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('cross-origin-opener-policy', 'same-origin');
  res.setHeader('cross-origin-resource-policy', 'same-origin');
  res.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  if (config.nodeEnv === 'production') res.setHeader('strict-transport-security', 'max-age=31536000');
}

function isExtendedPath(pathname: string): boolean {
  return pathname === '/api/features' || pathname === '/api/export' || pathname === '/api/bottleneck' || pathname === '/api/local-labour' || pathname.startsWith('/api/admin/local-labour/') || pathname.startsWith('/api/effective-wage') || pathname.startsWith('/api/today') || pathname.startsWith('/api/notifications') || pathname.startsWith('/api/job-feed') || pathname.startsWith('/api/admin/job-sources') || /^\/api\/applications\/[^/]+\/interview-pack$/.test(pathname);
}

export function createExtendedJobApp(overrides: Partial<AppConfig> = {}) {
  const app = createJobApp(overrides);
  const original = app.server.listeners('request')[0] as ((req: IncomingMessage, res: ServerResponse) => void) | undefined;
  if (!original) throw new Error('Brak bazowego listenera HTTP.');
  app.server.removeAllListeners('request');

  app.server.on('request', async (req, res) => {
    const url = new URL(req.url ?? '/', app.config.appOrigin);
    if (!isExtendedPath(url.pathname)) { original(req, res); return; }
    const requestId = randomUUID();
    securityHeaders(res, app.config);
    res.setHeader('x-request-id', requestId);
    res.setHeader('cache-control', 'no-store');
    res.setHeader('pragma', 'no-cache');
    try {
      if (await handleLocalLabourApi(req, res, url.pathname, app.store, app.db, app.config)) return;
      if (await handleEffectiveWageApi(req, res, url.pathname, app.store, app.db, app.config)) return;
      if (handleBottleneckApi(req, res, url.pathname, app.store, app.db)) return;
      if (await handleExtendedApi(req, res, url.pathname, app.store, app.db, app.config)) return;
      original(req, res);
    } catch (error) {
      const http = error instanceof HttpError ? error : new HttpError(500, 'Wystąpił błąd serwera.', 'INTERNAL_ERROR');
      if (!(error instanceof HttpError)) console.error(`[${requestId}]`, error);
      if (!res.headersSent) sendJson(res, http.status, { error: { code: http.code, message: http.message, requestId } }); else res.end();
    }
  });
  return app;
}
