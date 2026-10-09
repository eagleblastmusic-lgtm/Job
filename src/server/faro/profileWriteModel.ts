import { DEFAULT_CONSTRAINTS,type CandidateConstraints,type SalaryMinimum } from '../../domain/faro/offers.js';
import { randomUUID } from 'node:crypto';
import { LEVELS,SOURCES,skillById,suggestSkills,type Practice,type Availability } from '../../domain/faro/skills.js';
import { HttpError } from '../http.js';
import { object,text,choice,integer,array } from './validation.js';
import { readProfile } from './profileReadModel.js';
export function profileAvailability(input:unknown,asOf:string):Availability {
  const raw=object(input),kind=choice(raw.kind,['UNKNOWN','IMMEDIATE','AFTER_PERIOD','ON_DATE'] as const);
  const value=kind==='ON_DATE'?text(raw.value,10):kind==='AFTER_PERIOD'?String(integer(raw.value,1,365)):null;
  if(kind==='ON_DATE'&&(!/^\d{4}-\d\d-\d\d$/.test(value!)||!Number.isFinite(Date.parse(value!))||new Date(value!).toISOString().slice(0,10)!==value))throw new HttpError(400,'Nieprawidłowa data dostępności.');
  return {kind,value,updatedAt:asOf};
}
export function parseProfileSave(body:Record<string,unknown>,asOf:string) {
  const name=text(body.firstName,60);
  if(!/^[\p{L}][\p{L}\p{M}'’-]*$/u.test(name))throw new HttpError(400,'Wpisz tylko imię, bez nazwiska.','FIRST_NAME_ONLY');
  const availability=profileAvailability(body.availability,asOf),phone=body.phone===undefined||body.phone===null||body.phone===''?null:text(body.phone,20);
  if(phone&&(!/^\+?[0-9 ()-]{7,20}$/.test(phone)||phone.replace(/\D/g,'').length<7))throw new HttpError(400,'Nieprawidłowy telefon.');
  return {name,availability,phone};
}
export function profileSaveQueries(userId:string,body:Record<string,unknown>,current:{version:number;phone:string|null},parsed:ReturnType<typeof parseProfileSave>,asOf:string) {
  if(integer(body.expectedVersion)!==current.version)throw new HttpError(409,'Profil zmienił się. Odśwież dane.','VERSION_CONFLICT');
  const queries:Array<{text:string;values:readonly unknown[]}>=[];
  if(current.phone!==parsed.phone){
    queries.push({text:'UPDATE faro_contact_grants SET revoked_at=$1 WHERE candidate_id=$2 AND revoked_at IS NULL',values:[asOf,userId]});
    queries.push({text:'INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),userId,'PHONE_CHANGED_GRANTS_REVOKED','faro',userId,'{}',asOf]});
  }
  queries.push({text:'INSERT INTO faro_profiles(user_id,first_name,availability,phone,version,updated_at) VALUES($1,$2,$3,$4,1,$5) ON CONFLICT(user_id) DO UPDATE SET first_name=excluded.first_name,availability=excluded.availability,phone=excluded.phone,version=faro_profiles.version+1,updated_at=excluded.updated_at',values:[userId,parsed.name,JSON.stringify(parsed.availability),parsed.phone,asOf]});
  return queries;
}
interface ProfileWriteDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  query(text:string,values:readonly unknown[]):Promise<unknown>;
  transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
export async function saveProfile(database:ProfileWriteDatabase,userId:string,body:Record<string,unknown>,asOf:string) {
  const parsed=parseProfileSave(body,asOf);
  return database.transaction(async()=>{
    const current=await readProfile(database,userId,asOf);
    for(const query of profileSaveQueries(userId,body,current,parsed,asOf))await database.query(query.text,query.values);
    return readProfile(database,userId,asOf);
  });
}

export function parseProfileConstraints(body:Record<string,unknown>) {
  const raw=object(body.constraints);
  for(const key of ['active','noNights','noWeekends'])if(typeof raw[key]!=='boolean')throw new HttpError(400,'Wybierz jawnie granice warunków.');
  const constraints:CandidateConstraints={active:raw.active as boolean,noNights:raw.noNights as boolean,noWeekends:raw.noWeekends as boolean,workModels:[...new Set(array(raw.workModels,3).map(value=>choice(value,['ONSITE','HYBRID','REMOTE'] as const)))],contracts:[...new Set(array(raw.contracts,3).map(value=>choice(value,['UOP','CIVIL','B2B'] as const)))]};
  return {raw,constraints};
}
export function profileConstraintsQuery(userId:string,body:Record<string,unknown>,current:{version:number;preferences:Record<string,unknown>},parsed:ReturnType<typeof parseProfileConstraints>,asOf:string) {
  if(!current.version)throw new HttpError(409,'Najpierw zapisz swój profil.','PROFILE_REQUIRED');
  if(integer(body.expectedVersion,1)!==current.version)throw new HttpError(409,'Odśwież profil.','VERSION_CONFLICT');
  const {raw}=parsed,constraints={...parsed.constraints},previous={...DEFAULT_CONSTRAINTS,...current.preferences} as CandidateConstraints;
  const salaryRaw=raw.salaryMinimum===undefined?previous.salaryMinimum:raw.salaryMinimum,commuteRaw=raw.maxCommuteMinutes===undefined?previous.maxCommuteMinutes:raw.maxCommuteMinutes;
  constraints.maxCommuteMinutes=commuteRaw===null||commuteRaw===undefined?null:integer(commuteRaw,0,1440);
  if(salaryRaw===null||salaryRaw===undefined)constraints.salaryMinimum=null;
  else {
    const salary=object(salaryRaw);
    constraints.salaryMinimum={amount:integer(salary.amount,1),currency:choice(salary.currency,['PLN'] as const),basis:choice(salary.basis,['GROSS_EMPLOYMENT','GROSS_CIVIL','B2B_NET_INVOICE_EXCL_VAT'] as const),period:choice(salary.period,['HOUR','DAY','MONTH','YEAR'] as const),hoursPerPeriod:integer(salary.hoursPerPeriod,1,9000),ftePercent:integer(salary.ftePercent,1,100)} satisfies SalaryMinimum;
  }
  return {text:'UPDATE faro_profiles SET preferences=$1,version=version+1,updated_at=$2 WHERE user_id=$3',values:[JSON.stringify(constraints),asOf,userId]};
}
export async function saveProfileConstraints(database:ProfileWriteDatabase,userId:string,body:Record<string,unknown>,asOf:string) {
  const parsed=parseProfileConstraints(body);
  return database.transaction(async()=>{
    const current=await readProfile(database,userId,asOf),query=profileConstraintsQuery(userId,body,current,parsed,asOf);
    await database.query(query.text,query.values);
    return readProfile(database,userId,asOf);
  });
}

function profileAuditQuery(userId:string,action:string,entityId:string,asOf:string) {
  return {text:'INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),userId,action,'faro',entityId,'{}',asOf]};
}
export function profilePractice(input:unknown,privateContext=false):Practice {
  const practice=object(input);
  const context=privateContext&&practice.context!==undefined?text(practice.context,500,0):'';
  return {quantity:practice.quantity===null?null:integer(practice.quantity,0,10000),unit:choice(practice.unit,['MONTHS','PROJECTS','TASKS'] as const),...(context?{context}:{})};
}
export function profileClaimQueries(userId:string,body:Record<string,unknown>,asOf:string) {
  const skillId=text(body.skillId,100);
  if(!skillById(skillId))throw new HttpError(400,'Wybierz znaną kompetencję.');
  const level=choice(body.level,LEVELS),source=choice(body.source,SOURCES),practice=profilePractice(body.practice,true);
  if(body.confirmed!==true)throw new HttpError(400,'Potwierdź własną deklarację.','CONFIRMATION_REQUIRED');
  return [
    {text:'UPDATE faro_claims SET revoked_at=$1 WHERE user_id=$2 AND skill_id=$3 AND revoked_at IS NULL',values:[asOf,userId,skillId]},
    {text:'INSERT INTO faro_claims(id,user_id,skill_id,level,source,practice,version,confirmed_at) SELECT $1,$2,$3,$4,$5,$6,COALESCE(MAX(version),0)+1,$7 FROM faro_claims WHERE user_id=$2 AND skill_id=$3',values:[randomUUID(),userId,skillId,level,source,JSON.stringify(practice),asOf]},
    profileAuditQuery(userId,'SKILL_DECLARED',skillId,asOf)
  ];
}
export function profileRevokeQuery(userId:string,id:string,asOf:string) {
  return {text:'UPDATE faro_claims SET revoked_at=$1 WHERE id=$2 AND user_id=$3 AND revoked_at IS NULL RETURNING id',values:[asOf,id,userId]};
}
export function profileRevokeAuditQuery(userId:string,id:string,asOf:string) {return profileAuditQuery(userId,'SKILL_WITHDRAWN',id,asOf);}
export function profileLearningQuery(userId:string,body:Record<string,unknown>) {
  const skillId=text(body.skillId,100);if(!skillById(skillId))throw new HttpError(400,'Nieznana kompetencja.');
  return {text:'INSERT INTO faro_learning(user_id,skill_id,mode,practice) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,skill_id,mode) DO UPDATE SET practice=excluded.practice',values:[userId,skillId,choice(body.mode,['SELF_DEVELOPING','WANTS_TO_LEARN'] as const),JSON.stringify(profilePractice(body.practice,true))]};
}
export function profileLearningEntryQuery(userId:string,body:Record<string,unknown>) {
  const skillId=text(body.skillId,100);if(!skillById(skillId))throw new HttpError(400,'Nieznana kompetencja.');
  const mode=choice(body.mode,['SELF_DEVELOPING','WANTS_TO_LEARN'] as const);
  if(body.confirmed!==true)throw new HttpError(400,'Potwierdź usunięcie kierunku nauki.','CONFIRMATION_REQUIRED');
  profilePractice(body.expectedPractice,true);
  return {text:'SELECT practice FROM faro_learning WHERE user_id=$1 AND skill_id=$2 AND mode=$3',values:[userId,skillId,mode]};
}
export function profileLearningRemovalQueries(userId:string,body:Record<string,unknown>,row:Record<string,unknown>|undefined,asOf:string) {
  const query=profileLearningEntryQuery(userId,body),expected=profilePractice(body.expectedPractice,true);
  if(!row)return [];
  const current=profilePractice(JSON.parse(row.practice as string),true);
  if(current.quantity!==expected.quantity||current.unit!==expected.unit||current.context!==expected.context)throw new HttpError(409,'Kierunek nauki zmienił się. Odśwież profil.','VERSION_CONFLICT');
  return [{text:'DELETE FROM faro_learning WHERE user_id=$1 AND skill_id=$2 AND mode=$3',values:query.values},profileAuditQuery(userId,'LEARNING_REMOVED',query.values[1]!,asOf)];
}
export function profileActivityQueries(userId:string,body:Record<string,unknown>,asOf:string) {
  const description=text(body.description,3000),source=choice(body.source,SOURCES),id=randomUUID();
  return [
    {text:'INSERT INTO faro_activities(id,user_id,description,source,created_at) VALUES($1,$2,$3,$4,$5)',values:[id,userId,description,source,asOf]},
    ...suggestSkills(description).map(proposal=>({text:'INSERT INTO faro_proposals(id,user_id,activity_id,skill_id,rationale,model_version,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),userId,id,proposal.skillId,proposal.rationale,proposal.modelVersion,asOf]})),
    profileAuditQuery(userId,'ACTIVITY_RECORDED',id,asOf)
  ];
}
export function profileProposalQuery(userId:string,id:string) {return {text:'SELECT skill_id,status FROM faro_proposals WHERE id=$1 AND user_id=$2',values:[id,userId]};}
export function profileActivityRemovalQueries(userId:string,id:string,body:Record<string,unknown>,asOf:string) {
  if(body.confirmed!==true)throw new HttpError(400,'Potwierdź usunięcie prywatnego opisu i jego propozycji.','CONFIRMATION_REQUIRED');
  return {remove:{text:'DELETE FROM faro_activities WHERE id=$1 AND user_id=$2 RETURNING id',values:[id,userId]},audit:profileAuditQuery(userId,'ACTIVITY_REMOVED',id,asOf)};
}
export async function removeProfileActivity(database:ProfileWriteDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string) {
  const plan=profileActivityRemovalQueries(userId,id,body,asOf);
  return database.transaction(async()=>{
    const rows=await database.readBatch([plan.remove]);
    if(!rows[0]?.length)throw new HttpError(404,'Nie znaleziono opisu.');
    await database.query(plan.audit.text,plan.audit.values);
    return readProfile(database,userId,asOf);
  });
}
export function profileProposalDecisionQueries(userId:string,id:string,body:Record<string,unknown>,row:Record<string,unknown>|undefined,asOf:string) {
  if(!row)throw new HttpError(404,'Nie znaleziono propozycji.');
  if(row.status!=='PENDING')throw new HttpError(409,'Propozycja została już rozpatrzona.');
  const status=choice(body.status,['ACCEPTED','REJECTED'] as const);
  return [...(status==='ACCEPTED'?profileClaimQueries(userId,{...body,skillId:row.skill_id},asOf):[]),{text:"UPDATE faro_proposals SET status=$1,decided_at=$2 WHERE id=$3 AND user_id=$4 AND status='PENDING'",values:[status,asOf,id,userId]}];
}
export async function addProfileClaim(database:ProfileWriteDatabase,userId:string,body:Record<string,unknown>,asOf:string) {
  const queries=profileClaimQueries(userId,body,asOf);
  return database.transaction(async()=>{for(const query of queries)await database.query(query.text,query.values);return readProfile(database,userId,asOf);});
}
export async function revokeProfileClaim(database:ProfileWriteDatabase,userId:string,id:string,asOf:string) {
  return database.transaction(async()=>{const query=profileRevokeQuery(userId,id,asOf);const rows=await database.readBatch([query]);if(!rows[0]?.length)throw new HttpError(404,'Nie znaleziono deklaracji.');const audit=profileRevokeAuditQuery(userId,id,asOf);await database.query(audit.text,audit.values);});
}
export async function saveProfileLearning(database:ProfileWriteDatabase,userId:string,body:Record<string,unknown>,asOf:string) {
  const query=profileLearningQuery(userId,body);
  return database.transaction(async()=>{await database.query(query.text,query.values);return readProfile(database,userId,asOf);});
}
export async function removeProfileLearning(database:ProfileWriteDatabase,userId:string,body:Record<string,unknown>,asOf:string) {
  const query=profileLearningEntryQuery(userId,body);
  return database.transaction(async()=>{
    const rows=await database.readBatch([query]);
    for(const command of profileLearningRemovalQueries(userId,body,rows[0]?.[0],asOf))await database.query(command.text,command.values);
    return readProfile(database,userId,asOf);
  });
}
export async function recordProfileActivity(database:ProfileWriteDatabase,userId:string,body:Record<string,unknown>,asOf:string) {
  const queries=profileActivityQueries(userId,body,asOf);
  return database.transaction(async()=>{for(const query of queries)await database.query(query.text,query.values);return readProfile(database,userId,asOf);});
}
export async function decideProfileProposal(database:ProfileWriteDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string) {
  return database.transaction(async()=>{
    const query=profileProposalQuery(userId,id),rows=await database.readBatch([query]);
    for(const command of profileProposalDecisionQueries(userId,id,body,rows[0]?.[0],asOf))await database.query(command.text,command.values);
    return readProfile(database,userId,asOf);
  });
}
