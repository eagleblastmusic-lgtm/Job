import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from '../config.js';
import type { JobDatabase } from '../db.js';
import type { AppStore } from '../store.js';
import { requireExtendedUser, enforceExtendedOrigin } from '../extendedAuth.js';
import { HttpError, readJson, sendJson } from '../http.js';
import { ProfileService } from './profileService.js';
import { SKILL_CATALOG } from '../../domain/faro/skills.js';
import { text } from './validation.js';

export function createFaroApi(db: JobDatabase, store: AppStore, config: AppConfig) {
  const profiles = new ProfileService(db);
  const rates = new Map<string, { count: number; expires: number }>();
  return async (req: IncomingMessage, res: ServerResponse, path: string) => {
    if (!path.startsWith('/api/faro/')) return false;
    enforceExtendedOrigin(req, config);
    const user = requireExtendedUser(req, store), method = req.method ?? 'GET';
    if (config.nodeEnv === 'production') throw new HttpError(503, 'Faro oczekuje na zamknięcie bramek uruchomienia usługi.', 'RELEASE_GATES_OPEN');
    if (method !== 'GET') {
      const now = Date.now();
      for (const [key, value] of rates) if (value.expires <= now) rates.delete(key);
      const rate = rates.get(user.id) ?? { count: 0, expires: now + 60000 };
      rate.count++; rates.set(user.id, rate);
      if (rate.count > 90) throw new HttpError(429, 'Zbyt wiele zmian. Spróbuj za chwilę.', 'RATE_LIMITED');
    }
    const body = method === 'GET' ? {} : await readJson(req);
    const ok = (data: unknown, status = 200) => { sendJson(res, status, data); return true; };
    if (path === '/api/faro/catalog' && method === 'GET') return ok({ skills: SKILL_CATALOG });
    if (path === '/api/faro/profile' && method === 'GET') return ok(profiles.profile(user.id));
    if (path === '/api/faro/profile' && method === 'PUT') return ok(profiles.save(user.id, body));
    if (path === '/api/faro/profile/preview' && method === 'GET') return ok(profiles.projection(user.id));
    if (path === '/api/faro/claims' && method === 'POST') return ok(profiles.addClaim(user.id, body), 201);
    const claim = path.match(/^\/api\/faro\/claims\/([^/]+)$/);
    if (claim && method === 'DELETE') { profiles.revoke(user.id, claim[1]!); return ok({ ok: true }); }
    if (path === '/api/faro/learning' && method === 'POST') return ok(profiles.learn(user.id, body), 201);
    if (path === '/api/faro/activities' && method === 'POST') return ok(profiles.activity(user.id, body), 201);
    const proposal = path.match(/^\/api\/faro\/proposals\/([^/]+)$/);
    if (proposal && method === 'POST') return ok(profiles.decideProposal(user.id, proposal[1]!, body));
    if (path === '/api/faro/organizations' && method === 'GET') return ok({ organizations: profiles.organizations(user.id) });
    if (path === '/api/faro/organizations' && method === 'POST') return ok(profiles.organization(user.id, body), 201);
    const verify = path.match(/^\/api\/faro\/organizations\/([^/]+)\/verify$/);
    if (verify && method === 'POST') { profiles.verify(user.id, verify[1]!, text(body.note, 1000, 10)); return ok({ ok: true }); }
    const invites = path.match(/^\/api\/faro\/organizations\/([^/]+)\/invites$/);
    if (invites && method === 'POST') return ok(profiles.invite(user.id, invites[1]!, body), 201);
    if (path === '/api/faro/invites/accept' && method === 'POST') return ok(profiles.acceptInvite(user.id, user.email, text(body.token, 100)));
    const member = path.match(/^\/api\/faro\/organizations\/([^/]+)\/members\/([^/]+)$/);
    if (member && method === 'DELETE') { profiles.revokeMember(user.id, member[1]!, member[2]!); return ok({ ok: true }); }
    throw new HttpError(404, 'Nie znaleziono endpointu Faro.', 'NOT_FOUND');
  };
}
