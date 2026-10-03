import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from '../config.js';
import type { JobDatabase } from '../db.js';
import type { AppStore } from '../store.js';
import { requireExtendedUser, enforceExtendedOrigin } from '../extendedAuth.js';
import { HttpError, readJson, sendJson } from '../http.js';
import { ProfileService } from './profileService.js';
import { SKILL_CATALOG } from '../../domain/faro/skills.js';
import { text } from './validation.js';
import { OfferService } from './offerService.js';
import { RecruitmentService } from './recruitmentService.js';
import { AssessmentService } from './assessmentService.js';
import { EconomicsService } from './economicsService.js';
import { TrustService } from './trustService.js';
import { PrivacyService } from './privacyService.js';
import { InterviewService } from './interviewService.js';
import { verifyPassword, MAX_PASSWORD_LENGTH } from '../auth.js';

export function createFaroApi(db: JobDatabase, store: AppStore, config: AppConfig) {
  const profiles = new ProfileService(db);
  const offers = new OfferService(db), recruitment = new RecruitmentService(db);
  const assessments = new AssessmentService(db), economics = new EconomicsService(db), trust = new TrustService(db);
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
    if (path === '/api/faro/profile/preview-confirmation' && method === 'GET') return ok(profiles.previewConfirmation(user.id));
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
    const members = path.match(/^\/api\/faro\/organizations\/([^/]+)\/members$/);
    if (members && method === 'GET') {
      profiles.member(user.id,members[1]!,['OWNER','ADMIN']);
      return ok({ members: db.db.prepare('SELECT m.user_id,m.role,m.active,u.email FROM faro_members m JOIN users u ON u.id=m.user_id WHERE m.organization_id=?').all(members[1]!) });
    }
    const ownership = path.match(/^\/api\/faro\/organizations\/([^/]+)\/owner$/);
    if (ownership && method === 'POST') {
      const password = text(body.password, MAX_PASSWORD_LENGTH);
      if (!verifyPassword(password,user.passwordHash)) throw new HttpError(401,'Potwierdź operację aktualnym hasłem.','REAUTH_FAILED');
      return ok(new PrivacyService(db).transferOwner(user.id,ownership[1]!,text(body.successorId,100)));
    }
    const url = new URL(req.url ?? path, config.appOrigin);
    if (path === '/api/faro/offers' && method === 'GET') return ok({ offers: offers.list(user.id, url.searchParams.get('organizationId') ?? undefined) });
    const orgOffers = path.match(/^\/api\/faro\/organizations\/([^/]+)\/offers$/);
    if (orgOffers && method === 'POST') return ok(offers.create(user.id, orgOffers[1]!, body), 201);
    const offerPath = path.match(/^\/api\/faro\/offers\/([^/]+)$/);
    if (offerPath && method === 'GET') return ok(offers.detail(user.id, offerPath[1]!));
    if (offerPath && method === 'PUT') return ok(offers.edit(user.id, offerPath[1]!, body));
    const lifecycle = path.match(/^\/api\/faro\/offers\/([^/]+)\/lifecycle$/);
    if (lifecycle && method === 'POST') return ok(offers.lifecycle(user.id, lifecycle[1]!, body));
    const interest = path.match(/^\/api\/faro\/offers\/([^/]+)\/interest$/);
    if (interest && method === 'POST') return ok(recruitment.interest(user.id, interest[1]!, body), 201);
    const watch = path.match(/^\/api\/faro\/offers\/([^/]+)\/watch$/);
    if (watch && ['POST','DELETE'].includes(method)) return ok(recruitment.watch(user.id, watch[1]!, method === 'POST'));
    if (path === '/api/faro/watches' && method === 'GET') return ok({ offers: recruitment.watches(user.id) });
    if (path === '/api/faro/processes' && method === 'GET') return ok({ processes: recruitment.list(user.id, url.searchParams.get('offerId') ?? undefined) });
    const processPath = path.match(/^\/api\/faro\/processes\/([^/]+)$/);
    if (processPath && method === 'GET') return ok(recruitment.view(user.id, processPath[1]!));
    const interviews = path.match(/^\/api\/faro\/processes\/([^/]+)\/interviews$/);
    if (interviews && method === 'GET') return ok({ interviews:new InterviewService(db).list(user.id,interviews[1]!) });
    if (interviews && method === 'POST') return ok(new InterviewService(db).propose(user.id,interviews[1]!,body),201);
    const interview = path.match(/^\/api\/faro\/interviews\/([^/]+)$/);
    if (interview && method === 'POST') return ok(new InterviewService(db).change(user.id,interview[1]!,body));
    const calendar = path.match(/^\/api\/faro\/interviews\/([^/]+)\/calendar$/);
    if (calendar && method === 'GET') return ok(new InterviewService(db).calendar(user.id,calendar[1]!));
    const command = path.match(/^\/api\/faro\/processes\/([^/]+)\/commands$/);
    if (command && method === 'POST') return ok(recruitment.change(user.id, command[1]!, body));
    const grant = path.match(/^\/api\/faro\/processes\/([^/]+)\/phone-grant$/);
    if (grant && ['POST','DELETE'].includes(method)) return ok(recruitment.grant(user.id, grant[1]!, method === 'POST'));
    const phone = path.match(/^\/api\/faro\/processes\/([^/]+)\/phone$/);
    if (phone && method === 'GET') return ok(recruitment.phone(user.id, phone[1]!));
    if (path === '/api/faro/notifications' && method === 'GET') {
      recruitment.deliverOutbox();
      return ok({ notifications: db.db.prepare('SELECT id,message,entity_type,entity_id,read_at,created_at FROM notifications WHERE user_id=? AND dedupe_key LIKE ? ORDER BY created_at DESC LIMIT 100').all(user.id, 'faro:%') });
    }
    if (path === '/api/faro/worker/tick' && method === 'POST') {
      if (user.role !== 'ADMIN') throw new HttpError(403, 'Wymagany moderator.', 'FORBIDDEN');
      trust.tick();
      return ok({ ok: true });
    }
    const report = path.match(/^\/api\/faro\/processes\/([^/]+)\/reports$/);
    if (report && method === 'POST') return ok(trust.report(user.id, report[1]!, body), 201);
    if (path === '/api/faro/cases' && method === 'GET') return ok({ cases: trust.list(user.id, user.role === 'ADMIN') });
    const caseReview = path.match(/^\/api\/faro\/cases\/([^/]+)\/review$/);
    if (caseReview && method === 'POST') return ok(trust.review(user.id, caseReview[1]!, body));
    const caseAppeal = path.match(/^\/api\/faro\/cases\/([^/]+)\/appeal$/);
    if (caseAppeal && method === 'POST') return ok(trust.appeal(user.id, caseAppeal[1]!, body));
    const orgAssessments = path.match(/^\/api\/faro\/offers\/([^/]+)\/assessments$/);
    if (orgAssessments && method === 'GET') return ok({ assessments: assessments.list(user.id, orgAssessments[1]!) });
    if (orgAssessments && method === 'POST') return ok(assessments.create(user.id, orgAssessments[1]!, body), 201);
    const assessmentVersion = path.match(/^\/api\/faro\/assessments\/([^/]+)\/versions\/([^/]+)$/);
    if (assessmentVersion && method === 'POST') return ok(assessments.approve(user.id, assessmentVersion[1]!, { ...body, version: Number(assessmentVersion[2]) }));
    const processAssessment = path.match(/^\/api\/faro\/processes\/([^/]+)\/assessment$/);
    if (processAssessment && method === 'GET') return ok({ attempts: assessments.attempts(user.id, processAssessment[1]!) });
    if (processAssessment && method === 'POST') return ok(assessments.assign(user.id, processAssessment[1]!, body), 201);
    if (path === '/api/faro/attempts' && method === 'GET') return ok({ attempts: assessments.attempts(user.id) });
    const attempt = path.match(/^\/api\/faro\/attempts\/([^/]+)$/);
    if (attempt && method === 'GET') return ok(assessments.overview(user.id, attempt[1]!));
    if (attempt && method === 'POST') return ok(assessments.start(user.id, attempt[1]!));
    const attemptAnswers = path.match(/^\/api\/faro\/attempts\/([^/]+)\/answers$/);
    if (attemptAnswers && method === 'PUT') return ok(assessments.save(user.id, attemptAnswers[1]!, body, false));
    const attemptSubmit = path.match(/^\/api\/faro\/attempts\/([^/]+)\/submit$/);
    if (attemptSubmit && method === 'POST') return ok(assessments.save(user.id, attemptSubmit[1]!, body, true));
    const attemptReview = path.match(/^\/api\/faro\/attempts\/([^/]+)\/review$/);
    if (attemptReview && method === 'POST') return ok(assessments.finalize(user.id, attemptReview[1]!, body));
    const offerEconomics = path.match(/^\/api\/faro\/offers\/([^/]+)\/economics$/);
    if (offerEconomics && method === 'GET') return ok(economics.get(user.id, offerEconomics[1]!));
    if (offerEconomics && method === 'PUT') return ok(economics.save(user.id, offerEconomics[1]!, body));
    throw new HttpError(404, 'Nie znaleziono endpointu Faro.', 'NOT_FOUND');
  };
}
