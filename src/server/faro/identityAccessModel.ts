import { randomUUID } from 'node:crypto';
import type { UserRecord } from '../store.js';
import { HttpError } from '../http.js';
import { verifyPassword,MAX_PASSWORD_LENGTH } from '../auth.js';

export function sessionUserQuery(tokenHash:string,asOf:string) {return {text:'SELECT u.id,u.email,u.password_hash,u.name,u.locale,u.timezone,u.role,u.created_at,u.updated_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>$2',values:[tokenHash,asOf]};}
export function identityUser(rows:Record<string,unknown>[]):UserRecord|null {const row=rows[0];return row?{id:row.id as string,email:row.email as string,passwordHash:row.password_hash as string,name:row.name as string,locale:row.locale as string,timezone:row.timezone as string,role:row.role as UserRecord['role'],createdAt:row.created_at as string,updatedAt:row.updated_at as string}:null;}
export function privilegedMemberQuery(userId:string){return {text:"SELECT 1 FROM faro_members WHERE user_id=$1 AND active=1 AND role IN ('OWNER','ADMIN','RECRUITER','HIRING_MANAGER') LIMIT 1",values:[userId]};}
export function verifiedMfaQuery(tokenHash:string,asOf:string){return {text:'SELECT 1 FROM faro_mfa_sessions v JOIN sessions s ON s.token_hash=v.token_hash WHERE v.token_hash=$1 AND v.verified_until>$2 AND s.expires_at>$2',values:[tokenHash,asOf]};}
export function mfaAccessQueries(userId:string,tokenHash:string,asOf:string){return [{text:'SELECT activated_at,pending_until,active_cipher IS NOT NULL AS enabled FROM faro_mfa WHERE user_id=$1',values:[userId]},privilegedMemberQuery(userId),verifiedMfaQuery(tokenHash,asOf),{text:'SELECT COUNT(*) n FROM faro_mfa_recovery WHERE user_id=$1 AND used_at IS NULL',values:[userId]}];}
export function mfaAccessState(user:UserRecord,rows:Record<string,unknown>[][],requirePrivileged:boolean,configured:boolean,asOf:string){const row=rows[0]?.[0],enabled=Boolean(row?.enabled),required=enabled||(requirePrivileged&&(user.role==='ADMIN'||Boolean(rows[1]?.length)));return {configured,enabled,required,verified:Boolean(rows[2]?.length),pending:Boolean(row?.pending_until&&(row.pending_until as string)>asOf),recoveryRemaining:Number(rows[3]?.[0]?.n??0)};}
export function requireMfaAccess(state:{required:boolean;verified:boolean}){if(state.required&&!state.verified)throw new HttpError(403,'Potwierdź dostęp drugim składnikiem.','MFA_REQUIRED');}
export function revokeSessionsQueries(user:UserRecord,body:Record<string,unknown>,asOf:string){
 if(body.confirmed!==true)throw new HttpError(400,'Potwierdź wylogowanie wszystkich sesji.','CONFIRMATION_REQUIRED');
 if(typeof body.password!=='string'||!body.password||body.password.length>MAX_PASSWORD_LENGTH)throw new HttpError(400,'Podaj aktualne hasło.','VALIDATION_ERROR');
 if(!verifyPassword(body.password,user.passwordHash))throw new HttpError(401,'Podaj poprawne aktualne hasło.','REAUTH_FAILED');
 return [{text:'DELETE FROM sessions WHERE user_id=$1',values:[user.id]},{text:'INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),user.id,'SESSIONS_REVOKED','user',user.id,'{}',asOf]}];
}
interface IdentityDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function requireIdentityOwned(database:IdentityDatabase,tokenHash:string,asOf:string,requirePrivileged:boolean,configured:boolean,enforceMfa=true){
 const user=identityUser((await database.readBatch([sessionUserQuery(tokenHash,asOf)]))[0]??[]);if(!user)throw new HttpError(401,'Zaloguj się, aby kontynuować.','UNAUTHENTICATED');
 const mfa=mfaAccessState(user,await database.readBatch(mfaAccessQueries(user.id,tokenHash,asOf)),requirePrivileged,configured,asOf);if(enforceMfa)requireMfaAccess(mfa);return {user,mfa};
}
export async function readIdentity(database:IdentityDatabase,tokenHash:string,asOf:string,requirePrivileged:boolean,configured:boolean,enforceMfa=true){return database.transaction(()=>requireIdentityOwned(database,tokenHash,asOf,requirePrivileged,configured,enforceMfa),{readOnly:true});}
export async function revokeAllSessions(database:IdentityDatabase,tokenHash:string,body:Record<string,unknown>,asOf:string,requirePrivileged:boolean,configured:boolean){return database.transaction(async()=>{const {user}=await requireIdentityOwned(database,tokenHash,asOf,requirePrivileged,configured);for(const query of revokeSessionsQueries(user,body,asOf))await database.query(query.text,query.values);return {ok:true};});}
