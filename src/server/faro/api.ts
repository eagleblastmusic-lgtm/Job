import { fileDisposalStatusQuery } from './fileDisposalModel.js';
import { clearSessionCookie } from '../app.js';
import { revokeSessionsQueries } from './identityAccessModel.js';
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
import { verifyPassword, MAX_PASSWORD_LENGTH,hashSessionToken,parseCookies } from '../auth.js';
import { MfaService } from './mfaService.js';
import type { FaroWorker } from './worker.js';

export function createFaroApi(db: JobDatabase, store: AppStore, config: AppConfig, worker: FaroWorker) {
  const profiles = new ProfileService(db);
  const offers = new OfferService(db), recruitment = new RecruitmentService(db);
  const assessments = new AssessmentService(db), economics = new EconomicsService(db), trust = new TrustService(db);
  const rates = new Map<string, { count: number; expires: number }>();
  const services = { profiles, offers, recruitment, assessments, economics, trust,
    revokeSessions:(user:ReturnType<typeof requireExtendedUser>,body:Record<string,unknown>)=>profiles.transaction(()=>{for(const query of revokeSessionsQueries(user,body,profiles.now()))db.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));}),
    members:(userId:string,id:string)=>{profiles.member(userId,id,['OWNER','ADMIN']);return db.db.prepare('SELECT m.user_id,m.role,m.active,u.email FROM faro_members m JOIN users u ON u.id=m.user_id WHERE m.organization_id=?').all(id);},
    transferOwner:(user:ReturnType<typeof requireExtendedUser>,id:string,body:Record<string,unknown>)=>{if(!verifyPassword(text(body.password,MAX_PASSWORD_LENGTH),user.passwordHash))throw new HttpError(401,'Potwierdź operację aktualnym hasłem.','REAUTH_FAILED');return new PrivacyService(db).transferOwner(user.id,id,text(body.successorId,100));},
    interviews:new InterviewService(db),
    runWorker:()=>worker.run(),
    notifications:()=>{recruitment.deliverOutbox();},
    notificationRows:(userId:string)=>db.db.prepare('SELECT id,message,entity_type,entity_id,read_at,created_at FROM notifications WHERE user_id=? AND dedupe_key LIKE ? ORDER BY created_at DESC LIMIT 100').all(userId,'faro:%'),
    workerRows:()=>{const query=fileDisposalStatusQuery(new Date().toISOString());return {fileDisposals:db.db.prepare(query.text).get({$1:query.values[0]!}),outbox:db.db.prepare('SELECT status,COUNT(*) count FROM faro_outbox GROUP BY status').all(),leases:db.db.prepare("SELECT COUNT(*) active FROM faro_outbox WHERE status='PENDING' AND lease_until>?").get(new Date().toISOString())};}
  };
  return async (req: IncomingMessage, res: ServerResponse, path: string) => {
    if (!path.startsWith('/api/faro/')) return false;
    enforceExtendedOrigin(req, config);
    let user = requireExtendedUser(req, store);const method = req.method ?? 'GET';
    const mfaPath=path.match(/^\/api\/faro\/security\/mfa(?:\/(setup|confirm|verify|recover))?$/);
    if (config.nodeEnv === 'production'&&!mfaPath) throw new HttpError(503, 'Faro oczekuje na zamknięcie bramek uruchomienia usługi.', 'RELEASE_GATES_OPEN');
    if (method !== 'GET') {
      const now = Date.now();
      for (const [key, value] of rates) if (value.expires <= now) rates.delete(key);
      const rate = rates.get(user.id) ?? { count: 0, expires: now + 60000 };
      rate.count++; rates.set(user.id, rate);
      if (rate.count > 90) throw new HttpError(429, 'Zbyt wiele zmian. Spróbuj za chwilę.', 'RATE_LIMITED');
    }
    const body = method === 'GET' ? {} : await readJson(req);
    user=requireExtendedUser(req,store);
    if(!mfaPath)new MfaService(db,config).assertAccess(user,hashSessionToken(parseCookies(req.headers.cookie).job_session!));
    const ok = (data: unknown, status = 200) => { sendJson(res, status, data); return true; };
    if(mfaPath){const mfa=new MfaService(db,config),tokenHash=hashSessionToken(parseCookies(req.headers.cookie).job_session!);if(!mfaPath[1]&&method==='GET')return ok(mfa.status(user,tokenHash));if(method==='POST'){const command=mfaPath[1];if(command==='setup')return ok(mfa.setup(user,tokenHash,body));if(command==='confirm')return ok(mfa.confirm(user,tokenHash,body));if(command==='verify')return ok(mfa.verify(user,tokenHash,body));if(command==='recover')return ok(mfa.recover(user,tokenHash,body));}}
    return routeFaroApi(req,res,path,config,user,body,services,worker);
  };
}

type AsyncMethods<T> = { [K in keyof T]: T[K] extends (...args:infer A)=>infer R ? (...args:A)=>R|Promise<R> : never };
export interface FaroRouteServices {
 profiles:AsyncMethods<Pick<ProfileService,'profile'|'save'|'saveConstraints'|'projection'|'previewConfirmation'|'addClaim'|'revoke'|'learn'|'activity'|'decideProposal'|'organization'|'verify'|'invite'|'acceptInvite'|'revokeMember'>>&{organizations(userId:string):Record<string,unknown>[]|Promise<Record<string,unknown>[]>};
 offers:AsyncMethods<Pick<OfferService,'list'|'create'|'detail'|'edit'|'lifecycle'>>;
 recruitment:AsyncMethods<Pick<RecruitmentService,'interest'|'watchSettings'|'watch'|'watches'|'list'|'view'|'change'|'phonePreview'|'grant'|'phone'|'retryDeadLetter'>>;
 assessments:AsyncMethods<Pick<AssessmentService,'create'|'keyCorrectionPreview'|'correctCohortKey'|'read'|'edit'|'approve'|'attempts'|'assign'|'overview'|'start'|'save'|'finalize'|'invalidateResult'|'amendResult'|'reportIncident'|'resolveIncident'|'retry'>>&{list(userId:string,offerId:string):Record<string,unknown>[]|Promise<Record<string,unknown>[]>};
 economics:AsyncMethods<Pick<EconomicsService,'get'|'save'>>;
 trust:AsyncMethods<Pick<TrustService,'restrictions'|'appealRestriction'|'restoreRestriction'|'reliability'|'report'|'list'|'explain'|'review'|'appeal'>>;
 interviews:AsyncMethods<Pick<InterviewService,'list'|'propose'|'change'|'calendar'>>;
 revokeSessions(user:ReturnType<typeof requireExtendedUser>,body:Record<string,unknown>):unknown|Promise<unknown>;
 members(userId:string,id:string):unknown|Promise<unknown>;
 transferOwner(user:ReturnType<typeof requireExtendedUser>,id:string,body:Record<string,unknown>):unknown|Promise<unknown>;
 runWorker():boolean|Promise<boolean>;
 notifications():unknown|Promise<unknown>;
 notificationRows(userId:string):unknown|Promise<unknown>;
 workerRows():{outbox:unknown;leases:unknown;fileDisposals:unknown}|Promise<{outbox:unknown;leases:unknown;fileDisposals:unknown}>;
}
/** One canonical route contract shared by SQLite and PostgreSQL adapters. */
export async function routeFaroApi(req:IncomingMessage,res:ServerResponse,path:string,config:AppConfig,user:ReturnType<typeof requireExtendedUser>,body:Record<string,unknown>,services:FaroRouteServices,worker:FaroWorker){
 const {profiles,offers,recruitment,assessments,economics,trust}=services,method=req.method??'GET';
 const ok=(data:unknown,status=200)=>{sendJson(res,status,data);return true;};
    if(path==='/api/faro/sessions/revoke-all'&&method==='POST') {
      await services.revokeSessions(user,body);
      res.setHeader('set-cookie',clearSessionCookie(config));
      return ok({ok:true});
    }
    if (path === '/api/faro/catalog' && method === 'GET') return ok({ skills: SKILL_CATALOG });
    if (path === '/api/faro/profile' && method === 'GET') return ok(await profiles.profile(user.id));
    if (path === '/api/faro/profile' && method === 'PUT') return ok(await profiles.save(user.id, body));
    if(path==='/api/faro/profile/constraints'&&method==='PUT')return ok(await profiles.saveConstraints(user.id,body));
    if (path === '/api/faro/profile/preview' && method === 'GET') return ok(await profiles.projection(user.id));
    if (path === '/api/faro/profile/preview-confirmation' && method === 'GET') return ok(await profiles.previewConfirmation(user.id));
    if (path === '/api/faro/claims' && method === 'POST') return ok(await profiles.addClaim(user.id, body), 201);
    const claim = path.match(/^\/api\/faro\/claims\/([^/]+)$/);
    if (claim && method === 'DELETE') { await profiles.revoke(user.id, claim[1]!); return ok({ ok: true }); }
    if (path === '/api/faro/learning' && method === 'POST') return ok(await profiles.learn(user.id, body), 201);
    if (path === '/api/faro/activities' && method === 'POST') return ok(await profiles.activity(user.id, body), 201);
    const proposal = path.match(/^\/api\/faro\/proposals\/([^/]+)$/);
    if (proposal && method === 'POST') return ok(await profiles.decideProposal(user.id, proposal[1]!, body));
    if (path === '/api/faro/organizations' && method === 'GET') return ok({ organizations: await profiles.organizations(user.id) });
    if (path === '/api/faro/organizations' && method === 'POST') return ok(await profiles.organization(user.id, body), 201);
    const restrictions=path.match(/^\/api\/faro\/organizations\/([^/]+)\/restrictions$/);
    if(restrictions&&method==='GET')return ok({restrictions:await trust.restrictions(user.id,restrictions[1]!)});
    const restrictionCommand=path.match(/^\/api\/faro\/restrictions\/([^/]+)\/(appeal|restore)$/);
    if(restrictionCommand&&method==='POST')return ok(restrictionCommand[2]==='appeal'?await trust.appealRestriction(user.id,restrictionCommand[1]!,body):await trust.restoreRestriction(user.id,restrictionCommand[1]!,body));
    const verify = path.match(/^\/api\/faro\/organizations\/([^/]+)\/verify$/);
    if (verify && method === 'POST') { await profiles.verify(user.id, verify[1]!, text(body.note, 1000, 10)); return ok({ ok: true }); }
    const invites = path.match(/^\/api\/faro\/organizations\/([^/]+)\/invites$/);
    if (invites && method === 'POST') return ok(await profiles.invite(user.id, invites[1]!, body), 201);
    if (path === '/api/faro/invites/accept' && method === 'POST') return ok(await profiles.acceptInvite(user.id, user.email, text(body.token, 100)));
    const member = path.match(/^\/api\/faro\/organizations\/([^/]+)\/members\/([^/]+)$/);
    if (member && method === 'DELETE') { await profiles.revokeMember(user.id, member[1]!, member[2]!); return ok({ ok: true }); }
    const members = path.match(/^\/api\/faro\/organizations\/([^/]+)\/members$/);
    if (members && method === 'GET') {
      return ok({members:await services.members(user.id,members[1]!)});
    }
    const ownership = path.match(/^\/api\/faro\/organizations\/([^/]+)\/owner$/);
    if (ownership && method === 'POST') {
      return ok(await services.transferOwner(user,ownership[1]!,body));
    }
    const url = new URL(req.url ?? path, config.appOrigin);
    const reliability=path.match(/^\/api\/faro\/organizations\/([^/]+)\/reliability$/);
    if(reliability&&method==='GET')return ok(await trust.reliability(user.id,reliability[1]!,url.searchParams.get('from')??'',url.searchParams.get('to')??''));
    if (path === '/api/faro/offers' && method === 'GET') {
      const includeUnknown=url.searchParams.get('includeUnknown')??'false';
      if(!['true','false'].includes(includeUnknown))throw new HttpError(400,'Wybierz jawnie sposób pokazywania nieznanych warunków.');
      return ok({ offers: await offers.list(user.id, url.searchParams.get('organizationId') ?? undefined,includeUnknown==='true') });
    }
    const orgOffers = path.match(/^\/api\/faro\/organizations\/([^/]+)\/offers$/);
    if (orgOffers && method === 'POST') return ok(await offers.create(user.id, orgOffers[1]!, body), 201);
    const offerPath = path.match(/^\/api\/faro\/offers\/([^/]+)$/);
    if (offerPath && method === 'GET') return ok(await offers.detail(user.id, offerPath[1]!));
    if (offerPath && method === 'PUT') return ok(await offers.edit(user.id, offerPath[1]!, body));
    const lifecycle = path.match(/^\/api\/faro\/offers\/([^/]+)\/lifecycle$/);
    if (lifecycle && method === 'POST') return ok(await offers.lifecycle(user.id, lifecycle[1]!, body));
    const interest = path.match(/^\/api\/faro\/offers\/([^/]+)\/interest$/);
    if (interest && method === 'POST') return ok(await recruitment.interest(user.id, interest[1]!, body), 201);
    const watch = path.match(/^\/api\/faro\/offers\/([^/]+)\/watch$/);
    if(watch&&method==='PUT')return ok(await recruitment.watchSettings(user.id,watch[1]!,body));
    if (watch && ['POST','DELETE'].includes(method)) return ok(await recruitment.watch(user.id, watch[1]!, method === 'POST'));
    if (path === '/api/faro/watches' && method === 'GET') return ok({ offers: await recruitment.watches(user.id) });
    if (path === '/api/faro/processes' && method === 'GET') return ok({ processes: await recruitment.list(user.id, url.searchParams.get('offerId') ?? undefined) });
    const processPath = path.match(/^\/api\/faro\/processes\/([^/]+)$/);
    if (processPath && method === 'GET') return ok(await recruitment.view(user.id, processPath[1]!));
    const interviews = path.match(/^\/api\/faro\/processes\/([^/]+)\/interviews$/);
    if (interviews && method === 'GET') return ok({ interviews:await services.interviews.list(user.id,interviews[1]!) });
    if (interviews && method === 'POST') return ok(await services.interviews.propose(user.id,interviews[1]!,body),201);
    const interview = path.match(/^\/api\/faro\/interviews\/([^/]+)$/);
    if (interview && method === 'POST') return ok(await services.interviews.change(user.id,interview[1]!,body));
    const calendar = path.match(/^\/api\/faro\/interviews\/([^/]+)\/calendar$/);
    if (calendar && method === 'GET') return ok(await services.interviews.calendar(user.id,calendar[1]!));
    const command = path.match(/^\/api\/faro\/processes\/([^/]+)\/commands$/);
    if (command && method === 'POST') return ok(await recruitment.change(user.id, command[1]!, body));
    const phonePreview=path.match(/^\/api\/faro\/processes\/([^/]+)\/phone-preview$/);
    if(phonePreview&&method==='GET')return ok(await recruitment.phonePreview(user.id,phonePreview[1]!));
    const grant = path.match(/^\/api\/faro\/processes\/([^/]+)\/phone-grant$/);
    if (grant && ['POST','DELETE'].includes(method)) return ok(await recruitment.grant(user.id, grant[1]!, method === 'POST',body));
    const phone = path.match(/^\/api\/faro\/processes\/([^/]+)\/phone$/);
    if (phone && method === 'GET') return ok(await recruitment.phone(user.id, phone[1]!));
    if (path === '/api/faro/notifications' && method === 'GET') {
      await services.notifications();
      return ok({notifications:await services.notificationRows(user.id)});
    }
    if (path === '/api/faro/worker/tick' && method === 'POST') {
      if (user.role !== 'ADMIN') throw new HttpError(403, 'Wymagany moderator.', 'FORBIDDEN');
      if (!await services.runWorker()) throw new HttpError(503, 'Cykl powiadomień nie został ukończony. Sprawdź diagnostykę.', 'WORKER_TICK_FAILED');
      return ok({ ok: true });
    }
    if (path === '/api/faro/worker/status' && method === 'GET') {
      if (user.role !== 'ADMIN') throw new HttpError(403, 'Wymagany administrator.', 'FORBIDDEN');
      return ok({...worker.status(),...await services.workerRows()});
    }
    const outboxRetry=path.match(/^\/api\/faro\/worker\/outbox\/([^/]+)\/retry$/);
    if(outboxRetry&&method==='POST')return ok(await recruitment.retryDeadLetter(user.id,outboxRetry[1]!,body));
    const report = path.match(/^\/api\/faro\/processes\/([^/]+)\/reports$/);
    if (report && method === 'POST') return ok(await trust.report(user.id, report[1]!, body), 201);
    if (path === '/api/faro/cases' && method === 'GET') return ok({ cases: await trust.list(user.id) });
    const explanation = path.match(/^\/api\/faro\/cases\/([^/]+)\/explanations$/);
    if(explanation&&method==='POST')return ok(await trust.explain(user.id,explanation[1]!,body),201);
    const caseReview = path.match(/^\/api\/faro\/cases\/([^/]+)\/review$/);
    if (caseReview && method === 'POST') return ok(await trust.review(user.id, caseReview[1]!, body));
    const caseAppeal = path.match(/^\/api\/faro\/cases\/([^/]+)\/appeal$/);
    if (caseAppeal && method === 'POST') return ok(await trust.appeal(user.id, caseAppeal[1]!, body));
    const orgAssessments = path.match(/^\/api\/faro\/offers\/([^/]+)\/assessments$/);
    if (orgAssessments && method === 'GET') return ok({ assessments: await assessments.list(user.id, orgAssessments[1]!) });
    if (orgAssessments && method === 'POST') return ok(await assessments.create(user.id, orgAssessments[1]!, body), 201);
    const assessmentVersion = path.match(/^\/api\/faro\/assessments\/([^/]+)\/versions\/([^/]+)$/);
    const cohortCorrection=path.match(/^\/api\/faro\/assessments\/([^/]+)\/versions\/(\d+)\/key-correction(?:\/(preview))?$/);
    if(cohortCorrection&&method==='POST')return ok(cohortCorrection[3]?await assessments.keyCorrectionPreview(user.id,cohortCorrection[1]!,Number(cohortCorrection[2]),body):await assessments.correctCohortKey(user.id,cohortCorrection[1]!,Number(cohortCorrection[2]),body));
    if (assessmentVersion && method === 'GET') return ok(await assessments.read(user.id,assessmentVersion[1]!,Number(assessmentVersion[2])));
    if (assessmentVersion && method === 'PUT') return ok(await assessments.edit(user.id,assessmentVersion[1]!,Number(assessmentVersion[2]),body),201);
    if (assessmentVersion && method === 'POST') return ok(await assessments.approve(user.id, assessmentVersion[1]!, { ...body, version: Number(assessmentVersion[2]) }));
    const processAssessment = path.match(/^\/api\/faro\/processes\/([^/]+)\/assessment$/);
    if (processAssessment && method === 'GET') return ok({ attempts: await assessments.attempts(user.id, processAssessment[1]!) });
    if (processAssessment && method === 'POST') return ok(await assessments.assign(user.id, processAssessment[1]!, body), 201);
    if (path === '/api/faro/attempts' && method === 'GET') return ok({ attempts: await assessments.attempts(user.id) });
    const attempt = path.match(/^\/api\/faro\/attempts\/([^/]+)$/);
    if (attempt && method === 'GET') return ok(await assessments.overview(user.id, attempt[1]!));
    if (attempt && method === 'POST') return ok(await assessments.start(user.id, attempt[1]!));
    const attemptAnswers = path.match(/^\/api\/faro\/attempts\/([^/]+)\/answers$/);
    if (attemptAnswers && method === 'PUT') return ok(await assessments.save(user.id, attemptAnswers[1]!, body, false));
    const attemptSubmit = path.match(/^\/api\/faro\/attempts\/([^/]+)\/submit$/);
    if (attemptSubmit && method === 'POST') return ok(await assessments.save(user.id, attemptSubmit[1]!, body, true));
    const attemptReview = path.match(/^\/api\/faro\/attempts\/([^/]+)\/review$/);
    if (attemptReview && method === 'POST') return ok(await assessments.finalize(user.id, attemptReview[1]!, body));
    const resultInvalidation=path.match(/^\/api\/faro\/attempts\/([^/]+)\/invalidate-result$/);
    if(resultInvalidation&&method==='POST')return ok(await assessments.invalidateResult(user.id,resultInvalidation[1]!,body));
    const resultAmendment=path.match(/^\/api\/faro\/attempts\/([^/]+)\/amend-result$/);
    if(resultAmendment&&method==='POST')return ok(await assessments.amendResult(user.id,resultAmendment[1]!,body));
    const attemptIncident=path.match(/^\/api\/faro\/attempts\/([^/]+)\/incident$/);
    if(attemptIncident&&method==='POST')return ok(await assessments.reportIncident(user.id,attemptIncident[1]!,body),201);
    const incidentResolution=path.match(/^\/api\/faro\/attempts\/([^/]+)\/incident\/resolve$/);
    if(incidentResolution&&method==='POST')return ok(await assessments.resolveIncident(user.id,incidentResolution[1]!,body));
    const attemptRetry=path.match(/^\/api\/faro\/attempts\/([^/]+)\/retry$/);
    if(attemptRetry&&method==='POST')return ok(await assessments.retry(user.id,attemptRetry[1]!,body),201);
    const offerEconomics = path.match(/^\/api\/faro\/offers\/([^/]+)\/economics$/);
    if (offerEconomics && method === 'GET') return ok(await economics.get(user.id, offerEconomics[1]!));
    if (offerEconomics && method === 'PUT') return ok(await economics.save(user.id, offerEconomics[1]!, body));
    throw new HttpError(404, 'Nie znaleziono endpointu Faro.', 'NOT_FOUND');
}
