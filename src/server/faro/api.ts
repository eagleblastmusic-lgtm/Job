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
import type { FaroWorker } from './worker.js';

export function createFaroApi(db: JobDatabase, store: AppStore, config: AppConfig, worker: FaroWorker) {
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
    if(path==='/api/faro/sessions/revoke-all'&&method==='POST') {
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź wylogowanie wszystkich sesji.','CONFIRMATION_REQUIRED');
      if(typeof body.password!=='string'||!body.password||body.password.length>MAX_PASSWORD_LENGTH)throw new HttpError(400,'Podaj aktualne hasło.','VALIDATION_ERROR');
      const password=body.password;
      if(!verifyPassword(password,user.passwordHash))throw new HttpError(401,'Podaj poprawne aktualne hasło.','REAUTH_FAILED');
      profiles.transaction(()=>{
        db.db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
        store.audit(user.id,'SESSIONS_REVOKED','user',user.id);
      });
      res.setHeader('set-cookie','job_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
      return ok({ok:true});
    }
    if (path === '/api/faro/catalog' && method === 'GET') return ok({ skills: SKILL_CATALOG });
    if (path === '/api/faro/profile' && method === 'GET') return ok(profiles.profile(user.id));
    if (path === '/api/faro/profile' && method === 'PUT') return ok(profiles.save(user.id, body));
    if(path==='/api/faro/profile/constraints'&&method==='PUT')return ok(profiles.saveConstraints(user.id,body));
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
    const restrictions=path.match(/^\/api\/faro\/organizations\/([^/]+)\/restrictions$/);
    if(restrictions&&method==='GET')return ok({restrictions:trust.restrictions(user.id,restrictions[1]!)});
    const restrictionCommand=path.match(/^\/api\/faro\/restrictions\/([^/]+)\/(appeal|restore)$/);
    if(restrictionCommand&&method==='POST')return ok(restrictionCommand[2]==='appeal'?trust.appealRestriction(user.id,restrictionCommand[1]!,body):trust.restoreRestriction(user.id,restrictionCommand[1]!,body));
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
    const reliability=path.match(/^\/api\/faro\/organizations\/([^/]+)\/reliability$/);
    if(reliability&&method==='GET')return ok(trust.reliability(user.id,reliability[1]!,url.searchParams.get('from')??'',url.searchParams.get('to')??''));
    if (path === '/api/faro/offers' && method === 'GET') {
      const includeUnknown=url.searchParams.get('includeUnknown')??'false';
      if(!['true','false'].includes(includeUnknown))throw new HttpError(400,'Wybierz jawnie sposób pokazywania nieznanych warunków.');
      return ok({ offers: offers.list(user.id, url.searchParams.get('organizationId') ?? undefined,includeUnknown==='true') });
    }
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
    if(watch&&method==='PUT')return ok(recruitment.watchSettings(user.id,watch[1]!,body));
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
    const phonePreview=path.match(/^\/api\/faro\/processes\/([^/]+)\/phone-preview$/);
    if(phonePreview&&method==='GET')return ok(recruitment.phonePreview(user.id,phonePreview[1]!));
    const grant = path.match(/^\/api\/faro\/processes\/([^/]+)\/phone-grant$/);
    if (grant && ['POST','DELETE'].includes(method)) return ok(recruitment.grant(user.id, grant[1]!, method === 'POST',body));
    const phone = path.match(/^\/api\/faro\/processes\/([^/]+)\/phone$/);
    if (phone && method === 'GET') return ok(recruitment.phone(user.id, phone[1]!));
    if (path === '/api/faro/notifications' && method === 'GET') {
      recruitment.deliverOutbox();
      return ok({ notifications: db.db.prepare('SELECT id,message,entity_type,entity_id,read_at,created_at FROM notifications WHERE user_id=? AND dedupe_key LIKE ? ORDER BY created_at DESC LIMIT 100').all(user.id, 'faro:%') });
    }
    if (path === '/api/faro/worker/tick' && method === 'POST') {
      if (user.role !== 'ADMIN') throw new HttpError(403, 'Wymagany moderator.', 'FORBIDDEN');
      if (!worker.run()) throw new HttpError(503, 'Cykl powiadomień nie został ukończony. Sprawdź diagnostykę.', 'WORKER_TICK_FAILED');
      return ok({ ok: true });
    }
    if (path === '/api/faro/worker/status' && method === 'GET') {
      if (user.role !== 'ADMIN') throw new HttpError(403, 'Wymagany administrator.', 'FORBIDDEN');
      return ok({ ...worker.status(), outbox: db.db.prepare('SELECT status,COUNT(*) count FROM faro_outbox GROUP BY status').all(), leases:db.db.prepare("SELECT COUNT(*) active FROM faro_outbox WHERE status='PENDING' AND lease_until>?").get(new Date().toISOString()) });
    }
    const outboxRetry=path.match(/^\/api\/faro\/worker\/outbox\/([^/]+)\/retry$/);
    if(outboxRetry&&method==='POST')return ok(recruitment.retryDeadLetter(user.id,outboxRetry[1]!,body));
    const report = path.match(/^\/api\/faro\/processes\/([^/]+)\/reports$/);
    if (report && method === 'POST') return ok(trust.report(user.id, report[1]!, body), 201);
    if (path === '/api/faro/cases' && method === 'GET') return ok({ cases: trust.list(user.id) });
    const explanation = path.match(/^\/api\/faro\/cases\/([^/]+)\/explanations$/);
    if(explanation&&method==='POST')return ok(trust.explain(user.id,explanation[1]!,body),201);
    const caseReview = path.match(/^\/api\/faro\/cases\/([^/]+)\/review$/);
    if (caseReview && method === 'POST') return ok(trust.review(user.id, caseReview[1]!, body));
    const caseAppeal = path.match(/^\/api\/faro\/cases\/([^/]+)\/appeal$/);
    if (caseAppeal && method === 'POST') return ok(trust.appeal(user.id, caseAppeal[1]!, body));
    const orgAssessments = path.match(/^\/api\/faro\/offers\/([^/]+)\/assessments$/);
    if (orgAssessments && method === 'GET') return ok({ assessments: assessments.list(user.id, orgAssessments[1]!) });
    if (orgAssessments && method === 'POST') return ok(assessments.create(user.id, orgAssessments[1]!, body), 201);
    const assessmentVersion = path.match(/^\/api\/faro\/assessments\/([^/]+)\/versions\/([^/]+)$/);
    const cohortCorrection=path.match(/^\/api\/faro\/assessments\/([^/]+)\/versions\/(\d+)\/key-correction(?:\/(preview))?$/);
    if(cohortCorrection&&method==='POST')return ok(cohortCorrection[3]?assessments.keyCorrectionPreview(user.id,cohortCorrection[1]!,Number(cohortCorrection[2]),body):assessments.correctCohortKey(user.id,cohortCorrection[1]!,Number(cohortCorrection[2]),body));
    if (assessmentVersion && method === 'GET') return ok(assessments.read(user.id,assessmentVersion[1]!,Number(assessmentVersion[2])));
    if (assessmentVersion && method === 'PUT') return ok(assessments.edit(user.id,assessmentVersion[1]!,Number(assessmentVersion[2]),body),201);
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
    const resultInvalidation=path.match(/^\/api\/faro\/attempts\/([^/]+)\/invalidate-result$/);
    if(resultInvalidation&&method==='POST')return ok(assessments.invalidateResult(user.id,resultInvalidation[1]!,body));
    const resultAmendment=path.match(/^\/api\/faro\/attempts\/([^/]+)\/amend-result$/);
    if(resultAmendment&&method==='POST')return ok(assessments.amendResult(user.id,resultAmendment[1]!,body));
    const attemptIncident=path.match(/^\/api\/faro\/attempts\/([^/]+)\/incident$/);
    if(attemptIncident&&method==='POST')return ok(assessments.reportIncident(user.id,attemptIncident[1]!,body),201);
    const incidentResolution=path.match(/^\/api\/faro\/attempts\/([^/]+)\/incident\/resolve$/);
    if(incidentResolution&&method==='POST')return ok(assessments.resolveIncident(user.id,incidentResolution[1]!,body));
    const attemptRetry=path.match(/^\/api\/faro\/attempts\/([^/]+)\/retry$/);
    if(attemptRetry&&method==='POST')return ok(assessments.retry(user.id,attemptRetry[1]!,body),201);
    const offerEconomics = path.match(/^\/api\/faro\/offers\/([^/]+)\/economics$/);
    if (offerEconomics && method === 'GET') return ok(economics.get(user.id, offerEconomics[1]!));
    if (offerEconomics && method === 'PUT') return ok(economics.save(user.id, offerEconomics[1]!, body));
    throw new HttpError(404, 'Nie znaleziono endpointu Faro.', 'NOT_FOUND');
  };
}
