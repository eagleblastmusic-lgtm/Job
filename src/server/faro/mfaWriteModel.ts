import { randomBytes,randomUUID } from 'node:crypto';
import type { AppConfig } from '../config.js';
import { HttpError } from '../http.js';
import { verifyPassword,MAX_PASSWORD_LENGTH } from '../auth.js';
import { requireIdentityOwned } from './identityAccessModel.js';
import { MfaCodec,base32,mfaCounter,mfaRecoveryHash,mfaRecoveryCodes } from './mfaCrypto.js';
export interface MfaRow {active_cipher:string|null;pending_cipher:string|null;pending_until:string|null;last_counter:number;activated_at:string|null;}
export interface MfaQuery {text:string;values:(string|number|null)[];}
export function mfaRowQuery(userId:string){return {text:'SELECT active_cipher,pending_cipher,pending_until,last_counter,activated_at FROM faro_mfa WHERE user_id=$1',values:[userId]};}
export function mfaAuditQuery(userId:string,action:string,asOf:string):MfaQuery{return {text:"INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,'faro',$2,'{}',$4)",values:[randomUUID(),userId,action,asOf]};}
export function mfaSetupQuery(userId:string,cipher:string,until:string):MfaQuery{return {text:'INSERT INTO faro_mfa(user_id,pending_cipher,pending_until) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET pending_cipher=excluded.pending_cipher,pending_until=excluded.pending_until',values:[userId,cipher,until]};}
export function mfaGrantQuery(tokenHash:string,asOf:string):MfaQuery{return {text:'INSERT INTO faro_mfa_sessions(token_hash,verified_until) VALUES($1,$2) ON CONFLICT(token_hash) DO UPDATE SET verified_until=excluded.verified_until',values:[tokenHash,new Date(Date.parse(asOf)+300000).toISOString()]};}
export function mfaEnableQueries(userId:string,tokenHash:string,counter:number,codes:string[],asOf:string):MfaQuery[]{return [
 {text:'UPDATE faro_mfa SET active_cipher=pending_cipher,pending_cipher=NULL,pending_until=NULL,last_counter=$1,activated_at=$2 WHERE user_id=$3',values:[counter,asOf,userId]},
 {text:'DELETE FROM faro_mfa_recovery WHERE user_id=$1',values:[userId]},
 ...codes.map(code=>({text:'INSERT INTO faro_mfa_recovery(user_id,code_hash) VALUES($1,$2)',values:[userId,mfaRecoveryHash(userId,code)]})),
 {text:'DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2',values:[userId,tokenHash]},mfaGrantQuery(tokenHash,asOf),
 {text:'DELETE FROM faro_mfa_limits WHERE user_id=$1',values:[userId]},mfaAuditQuery(userId,'MFA_ENABLED',asOf)];}
export function mfaVerifyQuery(userId:string,cipher:string,counter:number):MfaQuery{return {text:'UPDATE faro_mfa SET last_counter=$1 WHERE user_id=$2 AND active_cipher=$3 AND last_counter<$1',values:[counter,userId,cipher]};}
export function mfaRecoverQuery(userId:string,hash:string,asOf:string):MfaQuery{return {text:'UPDATE faro_mfa_recovery SET used_at=$1 WHERE user_id=$2 AND code_hash=$3 AND used_at IS NULL',values:[asOf,userId,hash]};}
export function mfaFailureQueries(userId:string,asOf:string):MfaQuery[]{const cutoff=new Date(Date.parse(asOf)-600000).toISOString();return [{text:'INSERT INTO faro_mfa_limits(user_id,failures,window_start) VALUES($1,1,$2) ON CONFLICT(user_id) DO UPDATE SET failures=CASE WHEN faro_mfa_limits.window_start<=$3 THEN 1 ELSE faro_mfa_limits.failures+1 END,window_start=CASE WHEN faro_mfa_limits.window_start<=$3 THEN excluded.window_start ELSE faro_mfa_limits.window_start END',values:[userId,asOf,cutoff]},mfaAuditQuery(userId,'MFA_CONFIRMATION_FAILED',asOf)];}
interface MfaDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
/** Invalid credential attempts commit their minimized rate evidence; infrastructure failures roll back. */
export async function mutateMfa(database:MfaDatabase,config:Pick<AppConfig,'faroMfaEncryptionKey'|'faroRequirePrivilegedMfa'>,tokenHash:string,command:'setup'|'confirm'|'verify'|'recover',body:Record<string,unknown>,asOf:string) {
 const result=await database.transaction(async()=>{
  const {user,mfa}=await requireIdentityOwned(database,tokenHash,asOf,config.faroRequirePrivilegedMfa,Boolean(config.faroMfaEncryptionKey),false),userId=user.id;
  const rows=await database.readBatch([mfaRowQuery(userId),{text:'SELECT failures,window_start FROM faro_mfa_limits WHERE user_id=$1',values:[userId]}]),row=rows[0]?.[0] as unknown as MfaRow|undefined,limit=rows[1]?.[0];
  if(limit&&Number(limit.failures)>=5&&Date.parse(limit.window_start as string)+600000>Date.parse(asOf))throw new HttpError(429,'Zbyt wiele nieudanych potwierdzeń. Spróbuj po 10 minutach.','MFA_RATE_LIMITED');
  const apply=async(queries:MfaQuery[])=>{for(const query of queries)await database.query(query.text,query.values);},codec=new MfaCodec(config);
  const invalid=()=>new HttpError(401,'Nieprawidłowe potwierdzenie dostępu.','REAUTH_FAILED');
  const password=()=>{if(typeof body.password!=='string'||body.password.length>MAX_PASSWORD_LENGTH||!verifyPassword(body.password,user.passwordHash))throw invalid();};
  const counter=(cipher:string,last=-1)=>{const value=mfaCounter(codec,userId,cipher,body.code,asOf,last);if(value===null)throw invalid();return value;};
  try {
   if(command==='setup') {
    codec.key();password();if(row?.active_cipher&&!mfa.verified)throw new HttpError(403,'Najpierw potwierdź dotychczasowy drugi składnik.','MFA_REQUIRED');
    const secret=randomBytes(20),until=new Date(Date.parse(asOf)+300000).toISOString();await apply([mfaSetupQuery(userId,codec.encrypt(userId,secret),until),mfaAuditQuery(userId,'MFA_SETUP_STARTED',asOf)]);return {value:{secret:base32(secret),expiresAt:until,algorithm:'SHA1',digits:6,period:30}};
   }
   if(command==='confirm') {
    if(!row?.pending_cipher||!row.pending_until||row.pending_until<=asOf)throw new HttpError(409,'Rozpocznij ponownie konfigurację MFA.','MFA_SETUP_EXPIRED');
    const value=counter(row.pending_cipher),codes=mfaRecoveryCodes();await apply(mfaEnableQueries(userId,tokenHash,value,codes,asOf));return {value:{recoveryCodes:codes}};
   }
   if(command==='verify') {
    if(!row?.active_cipher)throw new HttpError(409,'Najpierw skonfiguruj MFA.','MFA_ENROLLMENT_REQUIRED');
    const query=mfaVerifyQuery(userId,row.active_cipher,counter(row.active_cipher,row.last_counter)),changed=await database.query(query.text,query.values) as {rowCount:number|null};if(changed.rowCount!==1)throw new HttpError(409,'Kod został już wykorzystany.','MFA_CODE_REPLAY');
    await apply([mfaGrantQuery(tokenHash,asOf),{text:'DELETE FROM faro_mfa_limits WHERE user_id=$1',values:[userId]},mfaAuditQuery(userId,'MFA_VERIFIED',asOf)]);return {value:{ok:true}};
   }
   password();if(typeof body.code!=='string'||!/^\w{32}$/.test(body.code))throw invalid();const hash=mfaRecoveryHash(userId,body.code),recovery=(await database.readBatch([{text:'SELECT used_at FROM faro_mfa_recovery WHERE user_id=$1 AND code_hash=$2',values:[userId,hash]}]))[0]?.[0];if(!recovery||recovery.used_at!==null)throw invalid();
   const query=mfaRecoverQuery(userId,hash,asOf),changed=await database.query(query.text,query.values) as {rowCount:number|null};if(changed.rowCount!==1)throw new HttpError(409,'Kod odzyskiwania został już wykorzystany.');
   await apply([{text:'DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2',values:[userId,tokenHash]},mfaGrantQuery(tokenHash,asOf),{text:'DELETE FROM faro_mfa_limits WHERE user_id=$1',values:[userId]},mfaAuditQuery(userId,'MFA_RECOVERY_USED',asOf)]);return {value:{ok:true}};
  }catch(error){if(error instanceof HttpError&&error.code==='REAUTH_FAILED'){await apply(mfaFailureQueries(userId,asOf));return {failure:error};}throw error;}
 });
 if('failure' in result)throw result.failure;return result.value;
}
