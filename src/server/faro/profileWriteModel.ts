import { randomUUID } from 'node:crypto';
import type { Availability } from '../../domain/faro/skills.js';
import { HttpError } from '../http.js';
import { object,text,choice,integer } from './validation.js';
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
