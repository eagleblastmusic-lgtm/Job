import type { IncomingMessage, ServerResponse } from 'node:http';
import { createJobApp, securityHeaders } from './app.js';
import type { AppConfig } from './config.js';
import { enforceExtendedOrigin } from './extendedAuth.js';
import { HttpError, sendJson } from './http.js';
import { createFaroApi } from './faro/api.js';
import { TrustService } from './faro/trustService.js';
import { FaroWorker } from './faro/worker.js';

/** Canonical runtime has an explicit API allowlist. Historical modules are not mounted. */
export function createFaroApp(overrides: Partial<AppConfig> = {}) {
  const app = createJobApp(overrides);
  const original = app.server.listeners('request')[0] as (req: IncomingMessage, res: ServerResponse) => void;
  const worker = new FaroWorker(() => new TrustService(app.db).tick(), app.config.faroWorkerEnabled, app.config.faroWorkerIntervalMs);
  const handleFaro = createFaroApi(app.db, app.store, app.config, worker);
  worker.start();
  app.server.removeAllListeners('request');
  app.server.on('request', async (req, res) => {
    const path = new URL(req.url ?? '/', app.config.appOrigin).pathname;
    const allowed = /^\/api\/auth\/(register|login|logout)$/.test(path)
      || ['/api/health', '/api/legal', '/api/me', '/api/consents', '/api/consents/analytics', '/api/account', '/api/export', '/api/admin/diagnostics'].includes(path);
    if (!path.startsWith('/api/') || allowed) { original(req, res); return; }
    securityHeaders(res, app.config);
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    try {
      enforceExtendedOrigin(req, app.config);
      if (await handleFaro(req, res, path)) return;
      throw new HttpError(410, 'Ta funkcja nie należy do aktualnego Faro.', 'RETIRED_FEATURE');
    } catch (error) {
      const failure = error instanceof HttpError ? error : new HttpError(500, 'Nie udało się obsłużyć żądania.');
      sendJson(res, failure.status, { error: { code: failure.code, message: failure.message } });
    }
  });
  return { ...app, worker, close: async () => { worker.stop(); await app.close(); } };
}
