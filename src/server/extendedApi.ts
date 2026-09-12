import type { IncomingMessage, ServerResponse } from 'node:http';
import type { JobDatabase } from './db.js';
import type { AppConfig } from './config.js';
import { AppStore, type UserRecord } from './store.js';
import { hashSessionToken, parseCookies } from './auth.js';
import { boundedStringField, HttpError, readJson, sendJson } from './http.js';
import { FeatureFlagService } from './featureFlagService.js';
import { TodayService } from './todayService.js';
import { NotificationService, type NotificationPreferences } from './notificationService.js';
import type { FeatureFlagKey } from '../domain/featureFlags.js';

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
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') throw new HttpError(403, 'Nieprawidłowe źródło żądania.', 'ORIGIN_REJECTED');
  const origin = req.headers.origin;
  if (origin && origin !== config.appOrigin) throw new HttpError(403, 'Nieprawidłowe źródło żądania.', 'ORIGIN_REJECTED');
}

function requireFeature(flags: FeatureFlagService, user: UserRecord, key: FeatureFlagKey, message: string): void {
  if (!flags.isEnabled(key, { userId: user.id, role: user.role })) throw new HttpError(404, message, 'FEATURE_DISABLED');
}

function knownNotFound<T>(operation: () => T, message: string): T {
  try { return operation(); }
  catch (error) {
    if (error instanceof Error && error.message === message) throw new HttpError(404, message, 'NOT_FOUND');
    throw error;
  }
}

function booleanSetting(body: Record<string, unknown>, key: keyof NotificationPreferences): boolean {
  const value = body[key];
  if (typeof value !== 'boolean') throw new HttpError(400, `Pole ${key} musi być wartością true albo false.`, 'INVALID_NOTIFICATION_PREFERENCE');
  return value;
}

export async function handleExtendedApi(req: IncomingMessage, res: ServerResponse, pathname: string, store: AppStore, db: JobDatabase, config: AppConfig): Promise<boolean> {
  const method = req.method ?? 'GET';
  if (pathname !== '/api/features' && !pathname.startsWith('/api/today') && !pathname.startsWith('/api/notifications')) return false;
  enforceOrigin(req, config);
  const user = requireUser(req, store);
  const flags = new FeatureFlagService(db);

  if (method === 'GET' && pathname === '/api/features') {
    sendJson(res, 200, { features: flags.effective({ userId: user.id, role: user.role }) });
    return true;
  }

  if (pathname.startsWith('/api/notifications')) {
    requireFeature(flags, user, 'notifications', 'Powiadomienia nie są obecnie dostępne.');
    const notifications = new NotificationService(db);

    if (method === 'GET' && pathname === '/api/notifications/preferences') {
      sendJson(res, 200, { preferences: notifications.getPreferences(user.id) }); return true;
    }
    if (method === 'PUT' && pathname === '/api/notifications/preferences') {
      const body = await readJson(req);
      const preferences = notifications.setPreferences(user.id, {
        followUp: booleanSetting(body, 'followUp'), deadlines: booleanSetting(body, 'deadlines'),
        interviews: booleanSetting(body, 'interviews'), matchedJobs: booleanSetting(body, 'matchedJobs')
      });
      store.analytics(user.id, 'notification_preferences_updated');
      sendJson(res, 200, { preferences }); return true;
    }
    if (method === 'GET' && pathname === '/api/notifications') {
      const items = notifications.list(user.id, user.timezone);
      sendJson(res, 200, { notifications: items, unreadCount: items.filter(item => !item.readAt).length }); return true;
    }
    const readMatch = pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
    if (method === 'PATCH' && readMatch) {
      const notification = knownNotFound(() => notifications.markRead(user.id, readMatch[1] ?? ''), 'Nie znaleziono powiadomienia.');
      sendJson(res, 200, { notification }); return true;
    }
    const dismissMatch = pathname.match(/^\/api\/notifications\/([^/]+)\/dismiss$/);
    if (method === 'PATCH' && dismissMatch) {
      const notification = knownNotFound(() => notifications.dismiss(user.id, dismissMatch[1] ?? ''), 'Nie znaleziono powiadomienia.');
      sendJson(res, 200, { notification }); return true;
    }
    sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Nie znaleziono endpointu.' } }); return true;
  }

  requireFeature(flags, user, 'today', 'Funkcja DZISIAJ nie jest obecnie dostępna.');
  const today = new TodayService(db);

  if (method === 'GET' && pathname === '/api/today') {
    sendJson(res, 200, { actions: today.listToday(user.id, user.timezone) }); return true;
  }
  if (method === 'POST' && pathname === '/api/today/recommendations') {
    const body = await readJson(req);
    const rawBudget = body.timeBudgetMinutes;
    if (typeof rawBudget !== 'number' || ![10, 30, 60, 120].includes(rawBudget)) throw new HttpError(400, 'Wybierz dostępny budżet czasu: 10, 30, 60 albo 120 minut.', 'INVALID_TIME_BUDGET');
    const actions = today.recommend(user.id, user.timezone, rawBudget);
    store.analytics(user.id, 'today_opened', { timeBudgetMinutes: rawBudget, actionCount: actions.length });
    sendJson(res, 200, { actions, timeBudgetMinutes: rawBudget }); return true;
  }
  const acceptMatch = pathname.match(/^\/api\/today\/actions\/([^/]+)\/accept$/);
  if (method === 'PATCH' && acceptMatch) {
    const action = knownNotFound(() => today.accept(user.id, acceptMatch[1] ?? ''), 'Nie znaleziono działania na dziś.');
    store.analytics(user.id, 'today_action_accepted', { actionType: action.type }); sendJson(res, 200, { action }); return true;
  }
  const completeMatch = pathname.match(/^\/api\/today\/actions\/([^/]+)\/complete$/);
  if (method === 'PATCH' && completeMatch) {
    const body = await readJson(req); const outcome = boundedStringField(body, 'outcome', 500, false);
    const action = knownNotFound(() => today.complete(user.id, completeMatch[1] ?? '', outcome), 'Nie znaleziono działania na dziś.');
    store.analytics(user.id, 'today_action_completed', { actionType: action.type }); sendJson(res, 200, { action }); return true;
  }

  sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Nie znaleziono endpointu.' } }); return true;
}
