import { enforceNativeRate } from './requestLimitModel.js';
import { disposeFiles,fileDisposalStatusQuery } from './fileDisposalModel.js';
import type { IncomingMessage,ServerResponse } from 'node:http';
import type { AppConfig } from '../config.js';
import type { PgJobDatabase } from '../postgresDb.js';
import { enforceExtendedOrigin } from '../extendedAuth.js';
import { hashSessionToken,parseCookies,verifyPassword,MAX_PASSWORD_LENGTH } from '../auth.js';
import { HttpError,readJson,sendJson } from '../http.js';
import { text } from './validation.js';
import { routeFaroApi,type FaroRouteServices } from './api.js';
import { tickNativeWorker } from './trustTickModel.js';
import type { FaroWorker } from './worker.js';
import { readProfile,profileProjection,profilePreview } from './profileReadModel.js';
import { saveProfile,saveProfileConstraints,addProfileClaim,revokeProfileClaim,saveProfileLearning,removeProfileLearning,recordProfileActivity,decideProfileProposal } from './profileWriteModel.js';
import { readOrganizations,readMembership } from './organizationReadModel.js';
import { createOrganization,verifyOrganization,inviteOrganizationMember,acceptOrganizationInvite,revokeOrganizationMember } from './organizationWriteModel.js';
import { readOfferList,readOfferDetail } from './offerReadModel.js';
import { createOfferDraft,editOfferDraft,changeOfferLifecycle } from './offerWriteModel.js';
import { parseOffer } from './offerService.js';
import { submitInterest } from './interestWriteModel.js';
import { readProcessView,readProcessList } from './processReadModel.js';
import { changeProcess } from './processWriteModel.js';
import { recordAcceptedStageOwned } from './stageAnalytics.js';
import { setWatch,setWatchAlerts,readWatches } from './watchModel.js';
import { readContactPreview,setContactGrant,readGrantedContact } from './contactModel.js';
import { readInterviews,readInterviewCalendar } from './interviewReadModel.js';
import { proposeInterview } from './interviewProposalModel.js';
import { changeInterviewSchedule } from './interviewScheduleModel.js';
import { changeInterviewOutcome } from './interviewOutcomeModel.js';
import { readAssessment,readAssessments,createAssessment,approveAssessment,editAssessment } from './assessmentDefinitionModel.js';
import { readAttempt,readAttempts } from './assessmentAttemptReadModel.js';
import { assignAssessment } from './assessmentAssignmentModel.js';
import { startAttempt } from './assessmentStartModel.js';
import { saveAttempt } from './assessmentAnswerModel.js';
import { finalizeAssessment } from './assessmentReviewModel.js';
import { invalidateAssessment } from './assessmentInvalidationModel.js';
import { amendAssessment } from './assessmentAmendmentModel.js';
import { reportAttemptIncident,resolveAttemptIncident } from './assessmentIncidentModel.js';
import { retryAssessment } from './assessmentRetryModel.js';
import { previewCohortCorrection } from './assessmentCohortReadModel.js';
import { correctCohortKey } from './assessmentCohortWriteModel.js';
import { readEconomics,saveEconomics } from './economicsModel.js';
import { readModerationCases,readRestrictions } from './trustReadModel.js';
import { appealOrganizationRestriction,restoreOrganizationRestriction } from './restrictionWriteModel.js';
import { reportPrivateCase,explainPrivateCase,reviewPrivateCase,appealPrivateCase } from './caseWriteModel.js';
import { readReliability } from './reliabilityReadModel.js';
import { transferOrganizationOwner } from './privacyReadModel.js';
import { claimOutbox,deliverClaimedOutbox,retryDeadLetter } from './outboxModel.js';
import { readIdentity,requireIdentityOwned,revokeAllSessions } from './identityAccessModel.js';
import { mutateMfa } from './mfaWriteModel.js';

/** Authenticated operation boundaries always recheck session/MFA in the model transaction. */
export function createPgFaroApi(database:PgJobDatabase,config:AppConfig,worker:FaroWorker){
 return async(req:IncomingMessage,res:ServerResponse,path:string)=>{
  if(!path.startsWith('/api/faro/'))return false;
  enforceExtendedOrigin(req,config);
  const tokenHash=hashSessionToken(parseCookies(req.headers.cookie).job_session??''),asOf=new Date().toISOString(),method=req.method??'GET';
  const mfaPath=path.match(/^\/api\/faro\/security\/mfa(?:\/(setup|confirm|verify|recover))?$/),configured=Boolean(config.faroMfaEncryptionKey);
  const identity=await readIdentity(database,tokenHash,asOf,config.faroRequirePrivilegedMfa,configured,!mfaPath),user=identity.user;
  if(config.nodeEnv==='production'&&!mfaPath)throw new HttpError(503,'Faro oczekuje na zamknięcie bramek uruchomienia usługi.','RELEASE_GATES_OPEN');
  if(method!=='GET')await enforceNativeRate(database,config.faroRateLimitKey,`faro-change:${user.id}`,90,60000);
  const body=method==='GET'?{}:await readJson(req);
  const authorize=async()=>{const current=await requireIdentityOwned(database,tokenHash,new Date().toISOString(),config.faroRequirePrivilegedMfa,configured);if(current.user.id!==user.id)throw new HttpError(401,'Zaloguj się, aby kontynuować.','UNAUTHENTICATED');};
  const owned={query:database.query.bind(database),readBatch:database.readBatch.bind(database),transaction:<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean})=>database.transaction(async()=>{await authorize();return work();},options)};
  const read=<T>(work:()=>T|Promise<T>)=>owned.transaction(work,{readOnly:true});
  if(mfaPath){if(!mfaPath[1]&&method==='GET'){const state=await readIdentity(database,tokenHash,new Date().toISOString(),config.faroRequirePrivilegedMfa,configured,false);sendJson(res,200,state.mfa);return true;}if(method==='POST'){const command=mfaPath[1];if(command==='setup'||command==='confirm'||command==='verify'||command==='recover'){sendJson(res,200,await mutateMfa(database,config,tokenHash,command,body,new Date().toISOString()));return true;}}}
  const adminAuthority=async()=>{await authorize();const current=await requireIdentityOwned(database,tokenHash,new Date().toISOString(),config.faroRequirePrivilegedMfa,configured);if(current.user.role!=='ADMIN')throw new HttpError(403,'Wymagany administrator.','FORBIDDEN');};
  const services:FaroRouteServices={
profiles:{
profile:(u)=>read(()=>readProfile(database,u,asOf)),
save:(u,b)=>saveProfile(owned,u,b,asOf),
saveConstraints:(u,b)=>saveProfileConstraints(owned,u,b,asOf),
projection:(u)=>read(async()=>profileProjection(await readProfile(database,u,asOf))),
previewConfirmation:(u)=>read(async()=>profilePreview(u,await readProfile(database,u,asOf))),
addClaim:(u,b)=>addProfileClaim(owned,u,b,asOf),
revoke:(u,id)=>revokeProfileClaim(owned,u,id,asOf),
learn:(u,b)=>saveProfileLearning(owned,u,b,asOf),
removeLearning:(u,b)=>removeProfileLearning(owned,u,b,asOf),
activity:(u,b)=>recordProfileActivity(owned,u,b,asOf),
decideProposal:(u,id,b)=>decideProfileProposal(owned,u,id,b,asOf),
organizations:(u)=>read(()=>readOrganizations(database,u)),
organization:(u,b)=>createOrganization(owned,u,b,asOf),
verify:(u,id,n)=>verifyOrganization(owned,u,id,n,asOf),
invite:(u,id,b)=>inviteOrganizationMember(owned,u,id,b,asOf),
acceptInvite:(u,email,token)=>acceptOrganizationInvite(owned,u,email,token,asOf),
revokeMember:(u,id,member)=>revokeOrganizationMember(owned,u,id,member,asOf)
},
offers:{
list:(u,id,unknown)=>readOfferList(owned,u,asOf,id,unknown),
create:(u,id,b)=>createOfferDraft(owned,u,id,b,asOf,parseOffer),
detail:(u,id)=>readOfferDetail(owned,u,id,asOf),
edit:(u,id,b)=>editOfferDraft(owned,u,id,b,asOf,parseOffer),
lifecycle:(u,id,b)=>changeOfferLifecycle(owned,u,id,b,asOf)
},
recruitment:{
interest:(u,id,b)=>submitInterest(database,u,id,b,asOf,authorize),
watchSettings:(u,id,b)=>setWatchAlerts(database,u,id,b,authorize),
watch:(u,id,on)=>setWatch(database,u,id,on,asOf,authorize),
watches:(u)=>readWatches(owned,u,asOf),
list:(u,id)=>readProcessList(owned,u,id,asOf),
view:(u,id)=>readProcessView(owned,u,id,asOf),
change:(u,id,b)=>changeProcess(database,u,id,b,asOf,authorize,async(process)=>{await recordAcceptedStageOwned(database,process);}),
phonePreview:(u,id)=>readContactPreview(database,u,id,authorize),
grant:(u,id,on,b)=>setContactGrant(database,u,id,on,b??{},asOf,authorize),
phone:(u,id)=>readGrantedContact(database,u,id,asOf,authorize),
retryDeadLetter:(u,id,b)=>retryDeadLetter(database,u,id,b,asOf,authorize)
},
interviews:{
list:(u,id)=>readInterviews(database,u,id,authorize),
propose:(u,id,b)=>proposeInterview(database,u,id,b,asOf,authorize),
change:(u,id,b)=>!['CONFIRM','CANCEL'].includes(String(b.command))?changeInterviewOutcome(database,u,id,b,asOf,authorize):changeInterviewSchedule(database,u,id,b,asOf,authorize),
calendar:(u,id)=>readInterviewCalendar(database,u,id,asOf,authorize)
},
economics:{
get:(u,id)=>readEconomics(database,u,id,asOf,authorize),
save:(u,id,b)=>saveEconomics(database,u,id,b,asOf,authorize)
},
trust:{
restrictions:(u,id)=>readRestrictions(database,u,id,asOf,authorize),
appealRestriction:(u,id,b)=>appealOrganizationRestriction(database,u,id,b,asOf,authorize),
restoreRestriction:(u,id,b)=>restoreOrganizationRestriction(database,u,id,b,asOf,authorize),
reliability:(u,id,from,to)=>readReliability(database,u,id,from,to,asOf,authorize),
report:(u,id,b)=>reportPrivateCase(database,u,id,b,asOf,authorize),
list:(u)=>readModerationCases(database,u,asOf,authorize),
explain:(u,id,b)=>explainPrivateCase(database,u,id,b,asOf,authorize),
review:(u,id,b)=>reviewPrivateCase(database,u,id,b,asOf,authorize),
appeal:(u,id,b)=>appealPrivateCase(database,u,id,b,asOf,authorize)
},
assessments:{
list:(u,id)=>readAssessments(owned,u,id),
create:(u,id,b)=>createAssessment(database,u,id,b,asOf,authorize),
keyCorrectionPreview:(u,id,v,b)=>previewCohortCorrection(database,u,id,v,b,authorize),
correctCohortKey:(u,id,v,b)=>correctCohortKey(database,u,id,v,b,asOf,authorize),
read:(u,id,v)=>readAssessment(owned,u,id,v),
edit:(u,id,v,b)=>editAssessment(database,u,id,v,b,asOf,authorize),
approve:(u,id,b)=>approveAssessment(database,u,id,b,asOf,authorize),
attempts:(u,id)=>readAttempts(database,u,asOf,authorize,id),
assign:(u,id,b)=>assignAssessment(database,u,id,b,asOf,authorize),
overview:(u,id)=>readAttempt(database,u,id,asOf,authorize),
start:(u,id)=>startAttempt(database,u,id,asOf,authorize),
save:(u,id,b,submit)=>saveAttempt(database,u,id,b,submit,asOf,authorize),
finalize:(u,id,b)=>finalizeAssessment(database,u,id,b,asOf,authorize),
invalidateResult:(u,id,b)=>invalidateAssessment(database,u,id,b,asOf,authorize),
amendResult:(u,id,b)=>amendAssessment(database,u,id,b,asOf,authorize),
reportIncident:(u,id,b)=>reportAttemptIncident(database,u,id,b,asOf,authorize),
resolveIncident:(u,id,b)=>resolveAttemptIncident(database,u,id,b,asOf,authorize),
retry:(u,id,b)=>retryAssessment(database,u,id,b,asOf,authorize)
},
revokeSessions:(_u,b)=>revokeAllSessions(database,tokenHash,b,new Date().toISOString(),config.faroRequirePrivilegedMfa,configured),
 members:(u,id)=>read(async()=>{await readMembership(database,u,id,['OWNER','ADMIN']);return (await database.readBatch([{text:'SELECT m.user_id,m.role,m.active,u.email FROM faro_members m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1',values:[id]}]))[0]??[];}),
 transferOwner:(u,id,b)=>transferOrganizationOwner(database,u.id,id,text(b.successorId,100),asOf,async()=>{await authorize();const current=await requireIdentityOwned(database,tokenHash,new Date().toISOString(),config.faroRequirePrivilegedMfa,configured);if(!verifyPassword(text(b.password,MAX_PASSWORD_LENGTH),current.user.passwordHash))throw new HttpError(401,'Potwierdź operację aktualnym hasłem.','REAUTH_FAILED');}),
 runWorker:()=>worker.run(async()=>{await tickNativeWorker(database,new Date().toISOString(),adminAuthority);await disposeFiles(database,config.dataDir,new Date().toISOString(),adminAuthority);}),
 notifications:async()=>{for(const claim of await claimOutbox(database,new Date().toISOString(),authorize))await deliverClaimedOutbox(database,claim.id,claim.claimToken,new Date().toISOString(),authorize);},
 notificationRows:(u)=>read(async()=>(await database.readBatch([{text:"SELECT id,message,entity_type,entity_id,read_at,created_at FROM notifications WHERE user_id=$1 AND dedupe_key LIKE 'faro:%' ORDER BY created_at DESC LIMIT 100",values:[u]}]))[0]??[]),
 workerRows:()=>read(async()=>{await adminAuthority();const rows=await database.readBatch([{text:'SELECT status,COUNT(*) count FROM faro_outbox GROUP BY status',values:[]},{text:"SELECT COUNT(*) active FROM faro_outbox WHERE status='PENDING' AND lease_until>$1",values:[new Date().toISOString()]},fileDisposalStatusQuery(new Date().toISOString())]);return {outbox:rows[0]??[],leases:rows[1]?.[0],fileDisposals:rows[2]?.[0]};})
 };
 return routeFaroApi(req,res,path,config,user,body,services,worker);
 };
}
