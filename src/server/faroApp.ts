import { FileDisposalService } from './faro/fileDisposalService.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createJobApp, securityHeaders } from './app.js';
import type { AppConfig } from './config.js';
import { enforceExtendedOrigin } from './extendedAuth.js';
import { HttpError, sendJson } from './http.js';
import { createFaroApi } from './faro/api.js';
import { TrustService } from './faro/trustService.js';
import { FaroWorker } from './faro/worker.js';
import { MfaService } from './faro/mfaService.js';
import { requireExtendedUser } from './extendedAuth.js';
import { hashSessionToken,parseCookies } from './auth.js';

/** Canonical runtime has an explicit API allowlist. Historical modules are not mounted. */
export function createFaroApp(overrides: Partial<AppConfig> = {}) {
  const app = createJobApp(overrides);
  const original = app.server.listeners('request')[0] as (req: IncomingMessage, res: ServerResponse) => void;
  const worker = new FaroWorker(async() => {new TrustService(app.db).tick();await new FileDisposalService(app.db,app.config.dataDir).run();}, app.config.faroWorkerEnabled, app.config.faroWorkerIntervalMs);
  const handleFaro = createFaroApi(app.db, app.store, app.config, worker);
  worker.start();
  app.server.removeAllListeners('request');
  app.server.on('request', async (req, res) => {
    securityHeaders(res, app.config);
    res.setHeader('cache-control', 'no-store');
    try {
      let path:string;
      try {path=new URL(req.url ?? '/', app.config.appOrigin).pathname;}
      catch {throw new HttpError(400,'Nieprawidłowy adres żądania.','INVALID_URL');}
      const allowed = /^\/api\/auth\/(register|login|logout)$/.test(path)
        || ['/api/health', '/api/legal', '/api/me', '/api/consents', '/api/consents/analytics', '/api/account', '/api/export', '/api/admin/diagnostics'].includes(path);
      if((allowed||path.startsWith('/api/faro/'))&&path.startsWith('/api/')&&!/^\/api\/(auth\/|health$|legal$|faro\/security\/mfa(?:\/|$))/.test(path)){
        const user=requireExtendedUser(req,app.store),mfa=new MfaService(app.db,app.config),tokenHash=hashSessionToken(parseCookies(req.headers.cookie).job_session!);
        if(path==='/api/me'&&mfa.required(user)&&!mfa.verified(tokenHash)){sendJson(res,200,{user:{id:user.id,email:user.email,name:user.name,role:user.role,locale:user.locale,timezone:user.timezone},mfaRequired:true});return;}
        mfa.assertAccess(user,tokenHash);
      }
      if (!path.startsWith('/api/') || allowed) { original(req, res); return; }
      enforceExtendedOrigin(req, app.config);
      if (await handleFaro(req, res, path)) return;
      throw new HttpError(410, 'Ta funkcja nie należy do aktualnego Faro.', 'RETIRED_FEATURE');
    } catch (error) {
      const failure = error instanceof HttpError ? error : new HttpError(500, 'Nie udało się obsłużyć żądania.');
      sendJson(res, failure.status, { error: { code: failure.code, message: failure.message } });
    }
  });
  return { ...app, worker, close: async () => { worker.stop(); await worker.idle(); await app.close(); } };
}
