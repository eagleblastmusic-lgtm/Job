import type { IncomingMessage, ServerResponse } from 'node:http';
import type { JobDatabase } from './db.js';
import type { AppConfig } from './config.js';
import { AppStore, type UserRecord } from './store.js';
import { hashSessionToken, parseCookies } from './auth.js';
import { boundedStringField, HttpError, readJson, sendJson } from './http.js';
import { FeatureFlagService } from './featureFlagService.js';
import { TodayService } from './todayService.js';

function requireUser(req: IncomingMessage, store: AppStore): UserRecord {
  const raw = parseCookies(req.headers.cookie).job_session;
  if (!raw) throw new HttpError(401, 'Zaloguj się, aby kontynuować.', 'UNAUTHENTICATED');
  const user = store.getUserBySession(hashSessionToken(raw));
  if (!user) throw new HttpError(401, 'Zaloguj się, aby kontynuować.', 'UNAUTHENTICATED');
  return user;
}

function enforceOrigin(req: IncomingMessage, config: AppConfig): void {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method ?? 'GET')) return;
  const fetchSite = req.headers['sec-fetch-site'];
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    throw new HttpError(403, 'Nieprawidłowe źródło żądania.', 'ORIGIN_REJECTED');
  }
  const origin = req.headers.origin;
  if (origin && origin !== config.appOrigin) throw new HttpError(403, 'Nieprawidłowe źródło żądania.', 'ORIGIN_REJECTED');
}

function requireToday(flags: FeatureFlagService, user: UserRecord): void {
  if (!flags.isEnabled('today', { userId: user.id, role: user.role })) {
    throw new HttpError(404, 'Funkcja DZISIAJ nie jest obecnie dostępna.', 'FEATURE_DISABLED');
  }
}

function todayNotFound<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof Error && error.message === 'Nie znaleziono działania na dziś.') {
      throw new HttpError(404, 'Nie znaleziono działania na dziś.', 'NOT_FOUND');
    }
    throw error;
  }
}

export async function handleExtendedApi(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  store: AppStore,
  db: JobDatabase,
  config: AppConfig
): Promise<boolean> {
  const method = req.method ?? 'GET';
  if (pathname !== '/api/features' && !pathname.startsWith('/api/today')) return false;
  enforceOrigin(req, config);
  const user = requireUser(req, store);
  const flags = new FeatureFlagService(db);

  if (method === 'GET' && pathname === '/api/features') {
    sendJson(res, 200, { features: flags.effective({ userId: user.id, role: user.role }) });
    return true;
  }

  requireToday(flags, user);
  const today = new TodayService(db);

  if (method === 'GET' && pathname === '/api/today') {
    sendJson(res, 200, { actions: today.listToday(user.id, user.timezone) });
    return true;
  }

  if (method === 'POST' && pathname === '/api/today/recommendations') {
    const body = await readJson(req);
    const rawBudget = body.timeBudgetMinutes;
    if (typeof rawBudget !== 'number' || ![10, 30, 60, 120].includes(rawBudget)) {
      throw new HttpError(400, 'Wybierz dostępny budżet czasu: 10, 30, 60 albo 120 minut.', 'INVALID_TIME_BUDGET');
    }
    const actions = today.recommend(user.id, user.timezone, rawBudget);
    store.analytics(user.id, 'today_opened', { timeBudgetMinutes: rawBudget, actionCount: actions.length });
    sendJson(res, 200, { actions, timeBudgetMinutes: rawBudget });
    return true;
  }

  const acceptMatch = pathname.match(/^\/api\/today\/actions\/([^/]+)\/accept$/);
  if (method === 'PATCH' && acceptMatch) {
    const action = todayNotFound(() => today.accept(user.id, acceptMatch[1] ?? ''));
    store.analytics(user.id, 'today_action_accepted', { actionType: action.type });
    sendJson(res, 200, { action });
    return true;
  }

  const completeMatch = pathname.match(/^\/api\/today\/actions\/([^/]+)\/complete$/);
  if (method === 'PATCH' && completeMatch) {
    const body = await readJson(req);
    const outcome = boundedStringField(body, 'outcome', 500, false);
    const action = todayNotFound(() => today.complete(user.id, completeMatch[1] ?? '', outcome));
    store.analytics(user.id, 'today_action_completed', { actionType: action.type });
    sendJson(res, 200, { action });
    return true;
  }

  sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Nie znaleziono endpointu.' } });
  return true;
}
