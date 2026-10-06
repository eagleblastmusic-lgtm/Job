import { DEFAULT_CONSTRAINTS,type CandidateConstraints,type SalaryMinimum } from '../../domain/faro/offers.js';
import { randomUUID } from 'node:crypto';
import type { Availability } from '../../domain/faro/skills.js';
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
  const availability=profileAvailability(body.availability,asOf),phone=body.phone?text(body.phone,20):null;
  if(phone&&!/^\+?[0-9 ()-]{7,20}$/.test(phone))throw new HttpError(400,'Nieprawidłowy telefon.');
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
