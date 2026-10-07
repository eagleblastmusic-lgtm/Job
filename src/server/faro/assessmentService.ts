import { assignmentRequest,assignmentCorrectionQuery,assignmentExistingQuery,assessmentAssignmentPlan } from './assessmentAssignmentModel.js';
import { parseAssessment,assessmentEditInput,assessmentDefinitionQuery,assessmentDefinitionFromRows,assessmentListQuery,assessmentLatestQuery,assessmentCreatePlan,assessmentApprovalPlan,type Definition } from './assessmentDefinitionModel.js';
import { randomUUID, createHash } from 'node:crypto';
import { FaroStore } from './base.js';
import { RecruitmentService } from './recruitmentService.js';
import { OfferService } from './offerService.js';
import { HttpError } from '../http.js';
import { text, integer, array, object, choice, date } from './validation.js';
import { TERMINAL } from '../../domain/faro/recruitment.js';
interface AttemptRow { id: string; process_id: string; assessment_id: string; assessment_version: number; state: string; deadline: string; started_at: string | null; expires_at: string | null; answers: string; revision: number; result: string | null; attempt_number:number;retry_of:string|null;retry_reason:string|null;retry_authorized_at:string|null; }
interface IncidentRow { id:string; category:string; statement:string; reportedAt:string; observedState:string; observedRevision:number; originalDeadline:string; originalStartedAt:string|null; originalExpiresAt:string|null; state:string; revision:number; resolution:string|null; reason:string|null; resolvedAt:string|null; }
export class AssessmentService extends FaroStore {
  get recruitment() { return new RecruitmentService(this.database, this.clock); }
  definition(id: string, version: number) {
    const query=assessmentDefinitionQuery(id,version);return assessmentDefinitionFromRows(this.db.prepare(query.text).all({$1:id,$2:version}));
  }
  private correctedKey(id:string,version:number) {
    return this.db.prepare('SELECT id,revision,accepted_options FROM faro_key_corrections WHERE assessment_id=? AND assessment_version=? ORDER BY revision DESC LIMIT 1').get(id,version) as {id:string;revision:number;accepted_options:string}|undefined;
  }
  previewKeyCorrection(userId:string,id:string,version:number,body:Record<string,unknown>) {
    const definition=this.read(userId,id,version),content=JSON.parse(definition.content) as Definition;
    if(content.type!=='QUIZ')throw new HttpError(409,'Odpowiedzi otwarte wymagają indywidualnego ręcznego przeglądu, bez klucza quizu.','NO_OBJECTIVE_KEY');
    if(definition.state!=='APPROVED')throw new HttpError(409,'Korekta dotyczy zatwierdzonej przypisanej wersji.');
    const reason=text(body.reason,1000,10),raw=object(body.acceptedOptions),key:Record<string,number[]>={};
    if(Object.keys(raw).length!==content.tasks.length||Object.keys(raw).some(k=>!content.tasks.some(t=>t.id===k)))throw new HttpError(400,'Podaj wspólny klucz wszystkich zadań.');
    for(const task of content.tasks) {const options=array(raw[task.id],task.options.length).map(v=>integer(v,0,task.options.length-1));if(!options.length||new Set(options).size!==options.length)throw new HttpError(400,'Wybierz poprawne odpowiedzi bez duplikatów.');key[task.id]=options.sort((a,b)=>a-b);}
    const previous=this.correctedKey(id,version),original=Object.fromEntries(content.tasks.map(t=>[t.id,[t.answer]]));
    if(JSON.stringify(key)===JSON.stringify(previous?JSON.parse(previous.accepted_options):original))throw new HttpError(409,'Wspólny klucz nie zmienił się.');
    const rows=this.db.prepare('SELECT a.id FROM faro_attempts a WHERE a.assessment_id=? AND a.assessment_version=? ORDER BY a.id').all(id,version) as Array<{id:string}>;
    if(rows.length>500)throw new HttpError(409,'Grupa wymaga osobnego kontrolowanego przeglądu operacyjnego.');
    const effects=rows.map(({id:attemptId})=>{
      const attempt=this.row(attemptId),process=this.recruitment.row(attempt.process_id),history=this.resultHistory(attemptId).at(-1),answers=JSON.parse(attempt.answers) as Record<string,number>;
      this.recruitment.offers.assigned(userId,process.offer_id);
      const breakdown=content.tasks.map(t=>({taskId:t.id,earned:answers[t.id]===undefined?null:key[t.id]!.includes(answers[t.id]!)?t.points:0,possible:t.points}));
      return {attemptId,state:attempt.state,validity:history?.validity??null,manual:history?.result.review==='AMENDED',before:history?.result.earned??null,after:attempt.state==='FINALIZED'&&history?.validity==='VALID'?breakdown.reduce((sum,t)=>sum+(t.earned??0),0):null,attempt,processRevision:process.revision,history,breakdown};
    });
    const blocked=effects.some(e=>['INVITED','STARTED','SCORED_PENDING_REVIEW'].includes(e.state)),manualCount=effects.filter(e=>e.manual&&e.validity==='VALID').length;
    const token=createHash('sha256').update(JSON.stringify({userId,id,version,definition,previous,key,reason,effects})).digest('hex');
    return {token,key,reason,blocked,manualCount,effects};
  }
  keyCorrectionPreview(userId:string,id:string,version:number,body:Record<string,unknown>) {
    const p=this.previewKeyCorrection(userId,id,version,body);
    return {token:p.token,blocked:p.blocked,manualCount:p.manualCount,affected:p.effects.filter(e=>e.after!==null).length,attempts:p.effects.map(e=>({id:e.attemptId,state:e.state,validity:e.validity,individualAmendment:e.manual,before:e.before,after:e.after}))};
  }
  correctCohortKey(userId:string,id:string,version:number,body:Record<string,unknown>) {
    this.read(userId,id,version);
    const ack=this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,version,operation:'ASSESSMENT_COHORT_KEY_CORRECTION'},()=>{
      const p=this.previewKeyCorrection(userId,id,version,body);
      if(p.token!==body.previewToken)throw new HttpError(409,'Grupa lub klucz zmieniły się. Ponów podgląd.','VERSION_CONFLICT');
      if(p.blocked)throw new HttpError(409,'Najpierw zakończ lub rozpatrz aktywne próby. Nie zmieniamy ich klucza w trakcie.');
      if(body.confirmed!==true||p.manualCount>0&&body.replaceIndividualAmendments!==true)throw new HttpError(400,'Potwierdź wspólną korektę i świadome zastąpienie indywidualnych korekt.');
      if(!p.effects.some(e=>e.after!==null))throw new HttpError(409,'Brak aktualnych zatwierdzonych wyników do korekty.');
      const correctionId=randomUUID(),revision=(this.correctedKey(id,version)?.revision??0)+1;
      this.db.prepare('INSERT INTO faro_key_corrections VALUES(?,?,?,?,?,?,?,?)').run(correctionId,id,version,revision,JSON.stringify(p.key),p.reason,this.now(),userId);
      for(const effect of p.effects) {
        if(effect.after===null)continue;
        const result={...effect.history!.result,breakdown:effect.breakdown,earned:effect.after,possible:effect.breakdown.reduce((sum,t)=>sum+t.possible,0),unanswered:effect.breakdown.filter(t=>t.earned===null).length,review:'COHORT_CORRECTED',reviewNote:p.reason,comparisonStatus:'COHORT_KEY_CORRECTION',scoringRevision:correctionId};
        this.db.prepare("INSERT INTO faro_result_history(attempt_id,revision,validity,result,reason_code,reason,created_at) VALUES(?,?,'VALID',?,'HUMAN_AMENDMENT',?,?)").run(effect.attemptId,effect.history!.revision+1,JSON.stringify(result),p.reason,this.now());
        this.db.prepare('UPDATE faro_attempts SET revision=revision+1 WHERE id=?').run(effect.attemptId);
        this.recruitment.event(this.recruitment.row(effect.attempt.process_id),userId,'ASSESSMENT_COHORT_CORRECTED',{attemptId:effect.attemptId,scoringRevision:correctionId});
      }
      return {correctionId,affected:p.effects.filter(e=>e.after!==null).length};
    });
    this.read(userId,id,version);return ack;
  }
  list(userId: string, offerId: string) {
    new OfferService(this.database, this.clock).assigned(userId, offerId);
    const query=assessmentListQuery(offerId);return this.db.prepare(query.text).all({$1:offerId});
  }
  read(userId:string,id:string,version:number) {
    const row=this.definition(id,version);
    new OfferService(this.database,this.clock).assigned(userId,row.offer_id);
    return row;
  }
  edit(userId:string,id:string,version:number,body:Record<string,unknown>) {
    this.read(userId,id,version);
    return this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,version,operation:'ASSESSMENT_EDIT'},()=>{
      const prior=this.read(userId,id,version);
      const latest=this.db.prepare('SELECT MAX(version) version FROM faro_assessments WHERE id=?').get(id) as {version:number};
      return this.createOwned(userId,prior.offer_id,assessmentEditInput(prior,latest.version,body),id);
    },()=>{this.read(userId,id,version);});
  }
  parse(body:Record<string,unknown>):Definition {return parseAssessment(body);}
  create(userId:string,offerId:string,body:Record<string,unknown>,previousId?:string) {
    return this.transaction(()=>this.createOwned(userId,offerId,body,previousId));
  }
  private createOwned(userId:string,offerId:string,body:Record<string,unknown>,previousId?:string) {
    const offer=new OfferService(this.database,this.clock).assigned(userId,offerId);this.member(userId,offer.organizationId,['OWNER','ADMIN','RECRUITER','HIRING_MANAGER']);
    const id=previousId??randomUUID(),read=assessmentLatestQuery(id,offerId),prior=this.db.prepare(read.text).get({$1:id,$2:offerId}) as {version:number|null},plan=assessmentCreatePlan(userId,offerId,body,prior.version,id,Boolean(previousId),this.now());
    for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
    return plan.ack;
  }
  approve(userId:string,id:string,body:Record<string,unknown>) {
    return this.transaction(()=>{
      const row=this.read(userId,id,integer(body.version,1)),read=assessmentLatestQuery(id),latest=this.db.prepare(read.text).get({$1:id}) as {version:number},plan=assessmentApprovalPlan(userId,row,body,latest.version,this.now());
      for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      return plan.ack;
    });
  }
  assign(userId: string, processId: string, body: Record<string, unknown>) {
    this.recruitment.authorize(userId,processId);
    return this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,processId,operation:'ASSESSMENT_ASSIGN'},()=>{
    const process = this.recruitment.row(processId);
    const offer = new OfferService(this.database, this.clock).assigned(userId, process.offer_id);
    this.member(userId, offer.organizationId, ['OWNER','ADMIN','RECRUITER']);
    const request=assignmentRequest(body),definition=this.definition(request.definitionId,request.version),latestQuery=assessmentLatestQuery(request.definitionId),latest=this.db.prepare(latestQuery.text).get({$1:request.definitionId}) as {version:number},correction=assignmentCorrectionQuery(request.definitionId,request.version),existing=assignmentExistingQuery(processId,request.definitionId,request.version);
    const plan=assessmentAssignmentPlan(process,definition,latest.version,Boolean(this.db.prepare(correction.text).get({$1:request.definitionId,$2:request.version})),Boolean(this.db.prepare(existing.text).get({$1:processId,$2:request.definitionId,$3:request.version})),body,this.now());
    for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
    this.recruitment.event(process,userId,'ASSESSMENT_ASSIGNED',plan.event);
    return plan.ack;
    },()=>{this.recruitment.offers.assigned(userId,this.recruitment.row(processId).offer_id);});
  }
  expire(id?:string) {
    this.transaction(()=>{
      const due=this.db.prepare("SELECT id FROM faro_attempts WHERE state IN ('INVITED','STARTED') AND (deadline<=? OR (state='STARTED' AND expires_at<=?))"+(id?' AND id=?':'')).all(...(id?[this.now(),this.now(),id]:[this.now(),this.now()])) as Array<{id:string}>;
      for(const item of due) {
        const attempt=this.row(item.id),process=this.recruitment.row(attempt.process_id);
        this.db.prepare("UPDATE faro_attempts SET state='EXPIRED',revision=revision+1 WHERE id=?").run(item.id);
        if(!TERMINAL.includes(process.status)&&process.stage==='ASSESSMENT_REQUESTED') {
          const offer=this.recruitment.offers.version(process.offer_id,process.offer_version);
          const dueAt=new Date(this.clock().getTime()+offer.decisionHours*3600000).toISOString();
          this.db.prepare("UPDATE faro_interests SET stage='ACCEPTED_TO_NEXT_STAGE',stage_due_at=?,next_action=?,revision=revision+1 WHERE id=?").run(dueAt,'Termin assessmentu upłynął. Ustal kolejny krok; brak automatycznej odmowy.',process.id);
        }
        this.recruitment.event(process,null,'ATTEMPT_EXPIRED',{attemptId:item.id});
      }
    });
  }
  row(id: string) {
    const row = this.db.prepare('SELECT * FROM faro_attempts WHERE id=?').get(id) as unknown as AttemptRow | undefined;
    if (!row) throw new HttpError(404, 'Nie znaleziono próby.'); return row;
  }
  resultHistory(id:string) {
    return this.db.prepare('SELECT revision,validity,result,reason_code reasonCode,reason,created_at createdAt FROM faro_result_history WHERE attempt_id=? ORDER BY revision').all(id).map(row=>({revision:Number(row.revision),validity:row.validity as 'VALID'|'INVALIDATED',reasonCode:row.reasonCode as string|null,reason:row.reason as string|null,createdAt:row.createdAt as string|null,result:JSON.parse(row.result as string) as Record<string,unknown>}));
  }
  incident(id:string) {
    return this.db.prepare('SELECT id,category,statement,reported_at reportedAt,observed_state observedState,observed_revision observedRevision,original_deadline originalDeadline,original_started_at originalStartedAt,original_expires_at originalExpiresAt,state,revision,resolution,reason,resolved_at resolvedAt FROM faro_attempt_incidents WHERE attempt_id=?').get(id) as unknown as IncidentRow|undefined;
  }
  reportIncident(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>{
      const row=this.row(id),process=this.recruitment.row(row.process_id);
      if(process.candidate_id!==userId)throw new HttpError(404,'Nie znaleziono próby.');
      return {row,process};
    };
    authorize();
    const acknowledgement=this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'ATTEMPT_INCIDENT_REPORT'},()=>{
      const {row,process}=authorize();
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==process.revision)throw new HttpError(409,'Próba lub proces zmieniły się.','VERSION_CONFLICT');
      if(!['INVITED','STARTED','EXPIRED','SCORED_PENDING_REVIEW'].includes(row.state)||this.incident(id))throw new HttpError(409,'Ta próba nie przyjmuje nowego zgłoszenia technicznego.','INCIDENT_NOT_AVAILABLE');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź zakres udostępnienia zgłoszenia.','CONFIRMATION_REQUIRED');
      const category=choice(body.category,['ACCESS','CONNECTION','ANSWER_SAVE','OTHER_TECHNICAL'] as const),statement=text(body.statement,1000,10);
      this.db.prepare('INSERT INTO faro_attempt_incidents(id,attempt_id,reporter_id,category,statement,reported_at,observed_state,observed_revision,original_deadline,original_started_at,original_expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),id,userId,category,statement,this.now(),row.state,row.revision,row.deadline,row.started_at,row.expires_at);
      this.db.prepare('UPDATE faro_attempts SET revision=revision+1 WHERE id=?').run(id);
      // An allegation does not pause/reset time, erase answers or make a negative fact.
      this.recruitment.event(process,userId,'ATTEMPT_INCIDENT_REPORTED',{attemptId:id,category});
      return {id};
    });
    return this.overview(userId,acknowledgement.id);
  }
  resolveIncident(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>{
      const row=this.row(id),process=this.recruitment.row(row.process_id);
      if(process.candidate_id===userId)throw new HttpError(404,'Nie znaleziono przeglądu.');
      const offer=this.recruitment.offers.assigned(userId,process.offer_id);
      this.member(userId,offer.organizationId,['OWNER','ADMIN','RECRUITER','HIRING_MANAGER']);
      return {row,process};
    };
    authorize();
    const acknowledgement=this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'ATTEMPT_INCIDENT_RESOLVE'},()=>{
      const {row,process}=authorize(),incident=this.incident(id);
      if(!incident)throw new HttpError(404,'Nie znaleziono zgłoszenia.');
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==process.revision||integer(body.incidentVersion,1)!==incident.revision)throw new HttpError(409,'Próba, proces lub zgłoszenie zmieniły się.','VERSION_CONFLICT');
      if(incident.state!=='OPEN')throw new HttpError(409,'Zgłoszenie ma już rozstrzygnięcie.','INCIDENT_RESOLVED');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź ręczny przegląd zgłoszenia.','CONFIRMATION_REQUIRED');
      const resolution=choice(body.resolution,['ISSUE_CONFIRMED','NOT_ESTABLISHED'] as const),reason=text(body.reason,1000,10);
      const neutralize=resolution==='ISSUE_CONFIRMED'&&['INVITED','STARTED','EXPIRED','SCORED_PENDING_REVIEW'].includes(row.state);
      this.db.prepare("UPDATE faro_attempt_incidents SET state='RESOLVED',revision=2,resolution=?,reason=?,resolved_at=?,reviewer_id=? WHERE attempt_id=?").run(resolution,reason,this.now(),userId,id);
      this.db.prepare('UPDATE faro_attempts SET state=?,revision=revision+1 WHERE id=?').run(neutralize?'TECHNICAL_ISSUE':row.state,id);
      const anotherActive=this.db.prepare("SELECT id FROM faro_attempts WHERE process_id=? AND id<>? AND state IN ('INVITED','STARTED','SCORED_PENDING_REVIEW')").get(process.id,id);
      if(neutralize&&!TERMINAL.includes(process.status)&&!anotherActive&&['ASSESSMENT_REQUESTED','ASSESSMENT_COMPLETED'].includes(process.stage)) {
        const offer=this.recruitment.offers.version(process.offer_id,process.offer_version);
        this.db.prepare("UPDATE faro_interests SET stage='ACCEPTED_TO_NEXT_STAGE',stage_due_at=?,next_action=?,revision=revision+1 WHERE id=?").run(new Date(this.clock().getTime()+offer.decisionHours*3600000).toISOString(),'Problem techniczny potwierdzony. Ustal ręcznie dalszy krok; brak automatycznej oceny lub odmowy.',process.id);
      }
      this.recruitment.event(process,userId,'ATTEMPT_INCIDENT_RESOLVED',{attemptId:id,resolution});
      // Do not retain the candidate statement in another user's command replay cache after erasure.
      return {id};
    });
    return this.overview(userId,acknowledgement.id);
  }
  retry(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>{
      const row=this.row(id),process=this.recruitment.row(row.process_id);
      if(process.candidate_id===userId)throw new HttpError(404,'Nie znaleziono próby do ponowienia.');
      const offer=this.recruitment.offers.assigned(userId,process.offer_id);
      this.member(userId,offer.organizationId,['OWNER','ADMIN','RECRUITER']);
      return {row,process};
    };
    authorize();
    const acknowledgement=this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'ATTEMPT_RETRY'},()=>{
      const {row,process}=authorize(),incident=this.incident(id);
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==process.revision)throw new HttpError(409,'Próba lub proces zmieniły się.','VERSION_CONFLICT');
      if(row.state!=='TECHNICAL_ISSUE'||incident?.state!=='RESOLVED'||incident.resolution!=='ISSUE_CONFIRMED')throw new HttpError(409,'Ponowienie wymaga potwierdzonego problemu technicznego.','RETRY_NOT_ELIGIBLE');
      if(process.status!=='ACTIVE'||process.stage!=='ACCEPTED_TO_NEXT_STAGE')throw new HttpError(409,'Proces nie pozwala teraz na ponowienie.');
      if(this.db.prepare('SELECT id FROM faro_attempts WHERE retry_of=?').get(id)||this.db.prepare("SELECT id FROM faro_attempts WHERE process_id=? AND state IN ('INVITED','STARTED','SCORED_PENDING_REVIEW')").get(process.id))throw new HttpError(409,'Istnieje już ponowienie lub aktywna próba.','RETRY_ALREADY_EXISTS');
      if(this.definition(row.assessment_id,row.assessment_version).state!=='APPROVED')throw new HttpError(409,'Wersja próby nie jest zatwierdzona.');
      if(this.correctedKey(row.assessment_id,row.assessment_version))throw new HttpError(409,'Skorygowana wersja nie przyjmuje nowych prób. Przygotuj nową zatwierdzoną wersję.','CORRECTED_VERSION_CLOSED');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź ponowienie tej samej wersji.','CONFIRMATION_REQUIRED');
      const reason=text(body.reason,1000,10),deadline=date(body.deadline);
      if(deadline<=this.now())throw new HttpError(400,'Deadline musi być w przyszłości.');
      const nextId=randomUUID();
      this.db.prepare("INSERT INTO faro_attempts(id,process_id,assessment_id,assessment_version,state,deadline,attempt_number,retry_of,retry_reason,retry_authorized_at,retry_authorized_by) VALUES(?,?,?,?,'INVITED',?,?,?,?,?,?)").run(nextId,process.id,row.assessment_id,row.assessment_version,deadline,row.attempt_number+1,id,reason,this.now(),userId);
      this.db.prepare("UPDATE faro_interests SET stage='ASSESSMENT_REQUESTED',stage_due_at=?,revision=revision+1 WHERE id=?").run(deadline,process.id);
      this.recruitment.event(process,userId,'ATTEMPT_RETRY_AUTHORIZED',{attemptId:nextId,previousAttemptId:id});
      return {id:nextId};
    });
    return this.overview(userId,acknowledgement.id);
  }
  overview(userId: string, id: string) {
    const row = this.row(id), process = this.recruitment.authorize(userId, row.process_id), content = JSON.parse(this.definition(row.assessment_id, row.assessment_version).content) as Definition;
    const candidate = process.candidate_id === userId;
    const history=row.state==='FINALIZED'?this.resultHistory(id):[];
    const submitted=['SCORED_PENDING_REVIEW','FINALIZED'].includes(row.state);
    const savedAnswers=JSON.parse(row.answers) as Record<string,number|string>;
    const retryAttempt=this.db.prepare('SELECT id FROM faro_attempts WHERE retry_of=?').get(id) as {id:string}|undefined;
    const retryRole=candidate?null:this.member(userId,this.recruitment.offers.get(process.offer_id).organizationId).role;
    return { id, attemptNumber:row.attempt_number,retryOf:row.retry_of,retryReason:row.retry_reason,retryAuthorizedAt:row.retry_authorized_at,retryAttemptId:retryAttempt?.id??null,canRetry:retryRole!==null&&retryRole!=='HIRING_MANAGER'&&row.state==='TECHNICAL_ISSUE'&&this.incident(id)?.resolution==='ISSUE_CONFIRMED'&&process.status==='ACTIVE'&&process.stage==='ACCEPTED_TO_NEXT_STAGE'&&!retryAttempt&&!this.correctedKey(row.assessment_id,row.assessment_version)&&!this.db.prepare("SELECT id FROM faro_attempts WHERE process_id=? AND state IN ('INVITED','STARTED','SCORED_PENDING_REVIEW')").get(process.id), incident:this.incident(id)??null,resultValidity:history.at(-1)?.validity??null,resultHistory:history, viewer:candidate?'CANDIDATE':'EMPLOYER', processId: row.process_id, processVersion:process.revision, state: row.state, title: content.title, type: content.type, taskCount: content.tasks.length, timeLimitMinutes: content.timeLimitMinutes, expectedMinutes: content.expectedMinutes, deadline: row.deadline, startedAt: row.started_at, expiresAt: row.expires_at, serverNow: this.now(), revision: row.revision, rubricVersion: content.rubricVersion, scoringMode: content.scoringMode,
      tasks: candidate && row.started_at ? content.tasks.map(task => ({ id: task.id, prompt: task.prompt, options: task.options, points: task.points,evaluationCriteria:task.evaluationCriteria })) : [],
      reviewTasks:!candidate&&submitted?content.tasks.map(t=>({id:t.id,prompt:t.prompt,options:t.options,points:t.points,correctOption:content.type==='QUIZ'?t.answer:null,chosenOption:typeof savedAnswers[t.id]==='number'?savedAnswers[t.id]:null,chosenText:typeof savedAnswers[t.id]==='string'?savedAnswers[t.id]:null,evaluationCriteria:t.evaluationCriteria})):[],
      answers: candidate ? savedAnswers : {}, result: submitted && row.result && (row.state!=='FINALIZED'||history.at(-1)?.validity==='VALID') && (row.state === 'FINALIZED' || !candidate) ? (row.state==='FINALIZED'?history.at(-1)!.result:JSON.parse(row.result) as Record<string, unknown>) : null };
  }
  attempts(userId: string, processId?: string) {
    if (processId) this.recruitment.authorize(userId, processId);
    const rows = (processId ? this.db.prepare('SELECT id FROM faro_attempts WHERE process_id=?').all(processId) : this.db.prepare('SELECT a.id FROM faro_attempts a JOIN faro_interests p ON p.id=a.process_id WHERE p.candidate_id=?').all(userId)) as Array<{ id: string }>;
    return rows.map(row => this.overview(userId, row.id));
  }
  candidate(userId: string, row: AttemptRow) {
    const process = this.recruitment.row(row.process_id);
    if (process.candidate_id !== userId) throw new HttpError(404, 'Nie znaleziono próby.');
    if (TERMINAL.includes(process.status)) throw new HttpError(409, 'Proces został zakończony.');
    return process;
  }
  start(userId: string, id: string) {
    this.candidate(userId,this.row(id));
    this.expire(id);
    return this.transaction(() => {
      const row = this.row(id); this.candidate(userId, row);
      if (row.state==='STARTED') return this.overview(userId, id);
      if (row.state !== 'INVITED' || row.deadline <= this.now()) throw new HttpError(409, 'Zaproszenie nie jest już aktywne.', 'ATTEMPT_EXPIRED');
      const definition = JSON.parse(this.definition(row.assessment_id, row.assessment_version).content) as Definition;
      const expires = new Date(Math.min(Date.parse(row.deadline), this.clock().getTime() + definition.timeLimitMinutes * 60000)).toISOString();
      this.db.prepare("UPDATE faro_attempts SET state='STARTED',started_at=?,expires_at=?,revision=revision+1 WHERE id=?").run(this.now(), expires, id);
      this.audit(userId, 'ATTEMPT_STARTED', id); return this.overview(userId, id);
    });
  }
  save(userId: string, id: string, body: Record<string, unknown>, submit: boolean) {
    this.candidate(userId,this.row(id));
    this.expire(id);
    return this.transaction(()=>{
    const row = this.row(id), process = this.candidate(userId, row);
    if(row.state==='EXPIRED')throw new HttpError(409,'Czas próby upłynął.','ATTEMPT_EXPIRED');
    if (row.state !== 'STARTED') throw new HttpError(409, 'Próba nie jest aktywna.');
    if (!row.expires_at || row.expires_at <= this.now()) {
      throw new HttpError(409, 'Czas próby upłynął.', 'ATTEMPT_EXPIRED');
    }
    if (integer(body.expectedVersion, 1) !== row.revision) throw new HttpError(409, 'Odpowiedzi zmieniły się.', 'VERSION_CONFLICT');
    const definition = JSON.parse(this.definition(row.assessment_id, row.assessment_version).content) as Definition;
    const raw = object(body.answers), answers: Record<string, number|string> = {};
    for (const [key, value] of Object.entries(raw)) {
      const task = definition.tasks.find(t => t.id === key); if (!task) throw new HttpError(400, 'Nieznane zadanie.');
      answers[key] = definition.type==='OPEN_ANSWER'?text(value,5000):integer(value, 0, task.options.length - 1);
    }
    const breakdown = definition.tasks.map(task => ({ taskId: task.id, earned: answers[task.id] === undefined||definition.type==='OPEN_ANSWER' ? null : answers[task.id] === task.answer ? task.points : 0, possible: task.points }));
    const result = { breakdown, earned: definition.type==='OPEN_ANSWER'?null:breakdown.reduce((sum, task) => sum + (task.earned ?? 0), 0), possible: breakdown.reduce((sum, task) => sum + task.possible, 0), unanswered:definition.tasks.filter(t=>answers[t.id]===undefined).length, assessmentVersion: row.assessment_version, rubricVersion: definition.rubricVersion, review: 'PENDING' };
      this.db.prepare('UPDATE faro_attempts SET answers=?,revision=revision+1,state=?,result=? WHERE id=?').run(JSON.stringify(answers), submit ? 'SCORED_PENDING_REVIEW' : 'STARTED', submit ? JSON.stringify(result) : null, id);
      if (submit) {
        const offer=this.recruitment.offers.version(process.offer_id,process.offer_version);
        this.db.prepare("UPDATE faro_interests SET stage='ASSESSMENT_COMPLETED',stage_due_at=?,revision=revision+1 WHERE id=?").run(new Date(this.clock().getTime()+offer.decisionHours*3600000).toISOString(),row.process_id);
        this.recruitment.event(process, userId, 'ATTEMPT_SUBMITTED', { attemptId: id });
      }
    return this.overview(userId, id);
    });
  }
  finalize(userId: string, id: string, body: Record<string, unknown>) {
    const initial=this.row(id);
    this.recruitment.offers.assigned(userId,this.recruitment.row(initial.process_id).offer_id);
    return this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'ASSESSMENT_FINALIZE'},()=>{
      const row=this.row(id),process=this.recruitment.row(row.process_id);
      this.recruitment.offers.assigned(userId,process.offer_id);
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==process.revision)throw new HttpError(409,'Próba lub proces zmieniły się. Odśwież wynik.','VERSION_CONFLICT');
      if(TERMINAL.includes(process.status))throw new HttpError(409,'Proces został zakończony.','PROCESS_TERMINAL');
      if(this.incident(id)?.state==='OPEN')throw new HttpError(409,'Najpierw rozpatrz zgłoszenie techniczne.','INCIDENT_REVIEW_REQUIRED');
      if(row.state!=='SCORED_PENDING_REVIEW'||!row.result||body.confirmed!==true)throw new HttpError(409,'Wynik wymaga świadomego review.');
      const note=text(body.note,1000,10),result={...JSON.parse(row.result) as Record<string,unknown>,review:'FINALIZED',reviewNote:note};
      const definition=JSON.parse(this.definition(row.assessment_id,row.assessment_version).content) as Definition;
      if(definition.type==='OPEN_ANSWER') {
        const scores=object(body.scores),answers=JSON.parse(row.answers) as Record<string,string>;
        if(Object.keys(scores).length!==definition.tasks.length||Object.keys(scores).some(k=>!definition.tasks.some(t=>t.id===k)))throw new HttpError(400,'Oceń każde zadanie przypisanej rubryki.');
        const breakdown=definition.tasks.map(t=>{if(answers[t.id]===undefined){if(scores[t.id]!==null)throw new HttpError(400,'Brak odpowiedzi pozostaje odrębny od zera.');return {taskId:t.id,earned:null,possible:t.points};}return {taskId:t.id,earned:integer(scores[t.id],0,t.points),possible:t.points};});
        Object.assign(result,{breakdown,earned:breakdown.reduce((sum,t)=>sum+(t.earned??0),0),comparisonStatus:'HUMAN_RUBRIC_REVIEW'});
      }
      this.db.prepare("UPDATE faro_attempts SET state='FINALIZED',result=?,reviewer_id=?,reviewed_at=?,revision=revision+1 WHERE id=?").run(JSON.stringify(result),userId,this.now(),id);
      this.db.prepare("INSERT INTO faro_result_history(attempt_id,revision,validity,result,created_at) VALUES(?,1,'VALID',?,?)").run(id,JSON.stringify(result),this.now());
      this.audit(userId,'ASSESSMENT_RESULT_REVIEWED',id);
      this.recruitment.event(process,userId,'ASSESSMENT_FINALIZED',{attemptId:id});
      return this.overview(userId,id);
    });
  }
  invalidateResult(userId:string,id:string,body:Record<string,unknown>) {
    this.recruitment.offers.assigned(userId,this.recruitment.row(this.row(id).process_id).offer_id);
    return this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'ASSESSMENT_INVALIDATE'},()=>{
      const row=this.row(id),process=this.recruitment.row(row.process_id);
      this.recruitment.offers.assigned(userId,process.offer_id);
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==process.revision)throw new HttpError(409,'Próba lub proces zmieniły się.','VERSION_CONFLICT');
      const previous=this.resultHistory(id).at(-1);
      if(row.state!=='FINALIZED'||!previous||previous.validity!=='VALID')throw new HttpError(409,'Tylko aktualny zatwierdzony wynik można oznaczyć jako nieważny.','RESULT_NOT_VALID');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź wycofanie ważności wyniku.','CONFIRMATION_REQUIRED');
      const reasonCode=choice(body.reasonCode,['KEY_ERROR','AMBIGUOUS_TASK','TECHNICAL_INCIDENT'] as const),reason=text(body.reason,1000,10);
      this.db.prepare("INSERT INTO faro_result_history(attempt_id,revision,validity,result,reason_code,reason,created_at) VALUES(?,?,'INVALIDATED',?,?,?,?)").run(id,Number(previous.revision)+1,JSON.stringify(previous.result),reasonCode,reason,this.now());
      this.db.prepare('UPDATE faro_attempts SET revision=revision+1 WHERE id=?').run(id);
      this.recruitment.event(process,userId,'ASSESSMENT_RESULT_INVALIDATED',{attemptId:id,reasonCode});
      return this.overview(userId,id);
    });
  }
  amendResult(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>this.recruitment.offers.assigned(userId,this.recruitment.row(this.row(id).process_id).offer_id);
    authorize();
    const ack=this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'ASSESSMENT_AMEND'},()=>{
      authorize();const row=this.row(id),process=this.recruitment.row(row.process_id),previous=this.resultHistory(id).at(-1);
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==process.revision)throw new HttpError(409,'Próba lub proces zmieniły się.','VERSION_CONFLICT');
      if(row.state!=='FINALIZED'||previous?.validity!=='VALID')throw new HttpError(409,'Korekta wymaga aktualnego zatwierdzonego wyniku.','RESULT_NOT_VALID');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź indywidualną korektę z zachowaniem historii.','CONFIRMATION_REQUIRED');
      const reason=text(body.reason,1000,10),definition=JSON.parse(this.definition(row.assessment_id,row.assessment_version).content) as Definition,answers=JSON.parse(row.answers) as Record<string,number>,scores=object(body.scores);
      if(Object.keys(scores).length!==definition.tasks.length||Object.keys(scores).some(key=>!definition.tasks.some(t=>t.id===key)))throw new HttpError(400,'Podaj ocenę każdego zadania przypisanej wersji.');
      const breakdown=definition.tasks.map(task=>{
        if(answers[task.id]===undefined) {if(scores[task.id]!==null)throw new HttpError(400,'Brak odpowiedzi pozostaje odrębny od zera punktów.');return {taskId:task.id,earned:null,possible:task.points};}
        return {taskId:task.id,earned:integer(scores[task.id],0,task.points),possible:task.points};
      });
      const result={...previous.result,breakdown,earned:breakdown.reduce((sum,t)=>sum+(t.earned??0),0),possible:breakdown.reduce((sum,t)=>sum+t.possible,0),unanswered:breakdown.filter(t=>t.earned===null).length,assessmentVersion:row.assessment_version,rubricVersion:definition.rubricVersion,review:'AMENDED',reviewNote:reason,comparisonStatus:'INDIVIDUAL_HUMAN_AMENDMENT',scoringRevision:null};
      if(JSON.stringify(previous.result.breakdown)===JSON.stringify(breakdown))throw new HttpError(409,'Punkty nie zmieniły się.');
      this.db.prepare("INSERT INTO faro_result_history(attempt_id,revision,validity,result,reason_code,reason,created_at) VALUES(?,?,'VALID',?,'HUMAN_AMENDMENT',?,?)").run(id,previous.revision+1,JSON.stringify(result),reason,this.now());
      this.db.prepare('UPDATE faro_attempts SET revision=revision+1 WHERE id=?').run(id);
      this.recruitment.event(process,userId,'ASSESSMENT_RESULT_AMENDED',{attemptId:id,resultRevision:previous.revision+1});
      return {id};
    });
    return this.overview(userId,ack.id);
  }

}
