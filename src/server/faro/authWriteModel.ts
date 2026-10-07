import { randomUUID } from 'node:crypto';
import { assertEmail,assertPassword,hashPassword,normalizeEmail,verifyLoginPassword,newSessionToken,MAX_EMAIL_LENGTH,MAX_PASSWORD_LENGTH } from '../auth.js';
import { HttpError,stringField,boundedStringField } from '../http.js';
import type { UserRecord,ConsentRecord } from '../store.js';
import { identityUser,requireIdentityOwned } from './identityAccessModel.js';

export function userEmailQuery(email:string){return {text:'SELECT id,email,password_hash,name,locale,timezone,role,created_at,updated_at FROM users WHERE email=$1',values:[email]};}
export function registrationInput(body:Record<string,unknown>){
 const email=normalizeEmail(stringField(body,'email')??''),password=stringField(body,'password')??'',name=boundedStringField(body,'name',80,true,2)??'';
 assertEmail(email);assertPassword(password);
 if(body.acceptTerms!==true||body.acceptPrivacy!==true)throw new HttpError(400,'Aby utworzyć konto, zaakceptuj warunki i informację o prywatności.','REQUIRED_CONSENT_MISSING');
 return {email,password,name,analyticsConsent:body.analyticsConsent===true};
}
export function userCreatePlan(input:{email:string;passwordHash:string;name:string;role:'USER'|'ADMIN'},asOf:string){
 const id=randomUUID(),user:UserRecord={id,...input,locale:'pl-PL',timezone:'Europe/Warsaw',createdAt:asOf,updatedAt:asOf};
 return {user,queries:[
 {text:'INSERT INTO users(id,email,password_hash,name,locale,timezone,role,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8)',values:[id,user.email,user.passwordHash,user.name,user.locale,user.timezone,user.role,asOf]},
 {text:'INSERT INTO career_profiles(user_id,created_at,updated_at) VALUES($1,$2,$2)',values:[id,asOf]},
 {text:"INSERT INTO subscriptions(id,user_id,plan,status,trial_ends_at,created_at,updated_at) VALUES($1,$2,'FREE','ACTIVE',NULL,$3,$3)",values:[randomUUID(),id,asOf]}
 ]};
}
export function consentWriteQueries(userId:string,type:'TERMS'|'PRIVACY'|'ANALYTICS',granted:boolean,version:string,asOf:string){return [
 {text:'INSERT INTO consents(id,user_id,consent_type,granted,version,created_at) VALUES($1,$2,$3,$4,$5,$6)',values:[randomUUID(),userId,type,granted?1:0,version,asOf]},
 ...(type==='ANALYTICS'&&!granted?[{text:"DELETE FROM analytics_events WHERE user_id=$1 AND event_name='FARO_MUTUAL_STAGE_COMPLETED'",values:[userId]}]:[]),
 {text:"INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,'CONSENT_RECORDED','consent',$3,$4,$5)",values:[randomUUID(),userId,type,JSON.stringify({granted,version}),asOf]}
 ];}
export function sessionCreatePlan(userId:string,sessionDays:number,asOf:string,action:'LOGIN'|'ACCOUNT_CREATED'){
 const token=newSessionToken();return {token,queries:[
 {text:'INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES($1,$2,$3,$4)',values:[token.hash,userId,new Date(Date.parse(asOf)+sessionDays*86400000).toISOString(),asOf]},
 {text:"INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,'user',$2,'{}',$4)",values:[randomUUID(),userId,action,asOf]}
 ]};
}
export function registrationPlan(input:ReturnType<typeof registrationInput>,adminEmails:Set<string>,sessionDays:number,legalVersion:string,asOf:string){
 const created=userCreatePlan({email:input.email,passwordHash:hashPassword(input.password),name:input.name,role:adminEmails.has(input.email)?'ADMIN':'USER'},asOf),session=sessionCreatePlan(created.user.id,sessionDays,asOf,'ACCOUNT_CREATED');
 return {user:created.user,token:session.token,queries:[...created.queries,...consentWriteQueries(created.user.id,'TERMS',true,legalVersion,asOf),...consentWriteQueries(created.user.id,'PRIVACY',true,legalVersion,asOf),...consentWriteQueries(created.user.id,'ANALYTICS',input.analyticsConsent,legalVersion,asOf),...session.queries,{text:"INSERT INTO analytics_events(id,user_id,event_name,properties,created_at) VALUES($1,$2,'signup_completed','{}',$3)",values:[randomUUID(),created.user.id,asOf]}]};
}
export function loginInput(body:Record<string,unknown>){
 const email=normalizeEmail(stringField(body,'email')??''),password=stringField(body,'password')??'';
 if(!email||email.length>MAX_EMAIL_LENGTH||!password||password.length>MAX_PASSWORD_LENGTH)throw new HttpError(401,'Nieprawidłowy e-mail lub hasło.','INVALID_CREDENTIALS');return {email,password};
}
export function requireLoginUser(password:string,user:UserRecord|null){if(!verifyLoginPassword(password,user?.passwordHash)||!user)throw new HttpError(401,'Nieprawidłowy e-mail lub hasło.','INVALID_CREDENTIALS');return user;}
export function consentReadQuery(userId:string,postgres=false){return {text:`SELECT consent_type,granted,version,created_at FROM consents WHERE user_id=$1 ORDER BY created_at DESC,${postgres?'__faro_source_rowid':'rowid'} DESC`,values:[userId]};}
export function consentsFromRows(rows:Record<string,unknown>[]){const latest=new Map<string,ConsentRecord>();for(const row of rows){const type=row.consent_type as string;if(!latest.has(type))latest.set(type,{type,granted:row.granted===1,version:row.version as string,createdAt:row.created_at as string});}return [...latest.values()];}
interface AuthDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function registerAccount(database:AuthDatabase,body:Record<string,unknown>,config:{adminEmails:Set<string>;sessionDays:number},legalVersion:string,asOf:string){
 const input=registrationInput(body);
 // Concurrent same-email registration must return a controlled duplicate after serialization retry.
 for(let retry=0;;retry++)try{return await database.transaction(async()=>{
  if((await database.readBatch([userEmailQuery(input.email)]))[0]?.length)throw new HttpError(409,'Konto z tym adresem już istnieje.','EMAIL_EXISTS');
  const plan=registrationPlan(input,config.adminEmails,config.sessionDays,legalVersion,asOf);for(const query of plan.queries)await database.query(query.text,query.values);return {user:plan.user,token:plan.token};
 });}catch(error){const code=(error as {code?:string}).code;if(retry<2&&['40001','40P01','23505'].includes(code??''))continue;throw error;}
}
export async function loginAccount(database:AuthDatabase,body:Record<string,unknown>,sessionDays:number,asOf:string){const input=loginInput(body);return database.transaction(async()=>{const user=requireLoginUser(input.password,identityUser((await database.readBatch([userEmailQuery(input.email)]))[0]??[])),plan=sessionCreatePlan(user.id,sessionDays,asOf,'LOGIN');for(const query of plan.queries)await database.query(query.text,query.values);return {user,token:plan.token};});}
export async function logoutAccount(database:AuthDatabase,tokenHash:string){return database.transaction(async()=>{await database.query('DELETE FROM sessions WHERE token_hash=$1',[tokenHash]);return {ok:true};});}
export async function readConsents(database:AuthDatabase,tokenHash:string,asOf:string){return database.transaction(async()=>{const {user}=await requireIdentityOwned(database,tokenHash,asOf,false,true,false);return consentsFromRows((await database.readBatch([consentReadQuery(user.id,true)]))[0]??[]);},{readOnly:true});}
export async function changeAnalyticsConsent(database:AuthDatabase,tokenHash:string,body:Record<string,unknown>,legalVersion:string,asOf:string,requirePrivileged:boolean,configured:boolean){return database.transaction(async()=>{const {user}=await requireIdentityOwned(database,tokenHash,asOf,requirePrivileged,configured);if(typeof body.granted!=='boolean')throw new HttpError(400,'Pole granted musi być wartością true albo false.','INVALID_CONSENT_VALUE');for(const query of consentWriteQueries(user.id,'ANALYTICS',body.granted,legalVersion,asOf))await database.query(query.text,query.values);return {type:'ANALYTICS',granted:body.granted,version:legalVersion,createdAt:asOf};});}
