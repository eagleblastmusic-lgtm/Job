import { createHash,randomUUID } from 'node:crypto';
import { MfaCodec } from './mfaCrypto.js';
import { HttpError } from '../http.js';
export const mfaRotationReadQuery={text:'SELECT user_id,active_cipher,pending_cipher FROM faro_mfa ORDER BY user_id',values:[]};
export function mfaRotationPlan(rows:Record<string,unknown>[],currentKey:string,nextKey:string,asOf:string){
 if(!/^[a-fA-F0-9]{64}$/.test(currentKey)||!/^[a-fA-F0-9]{64}$/.test(nextKey)||currentKey.toLowerCase()===nextKey.toLowerCase())throw new HttpError(400,'Podaj dwa różne prawidłowe klucze MFA.','MFA_ROTATION_KEYS_INVALID');
 const current=new MfaCodec({faroMfaEncryptionKey:currentKey}),next=new MfaCodec({faroMfaEncryptionKey:nextKey}),queries=[];
 for(const row of rows){const id=row.user_id as string,rewrap=(value:unknown)=>{if(value===null)return null;const secret=current.decrypt(id,value as string);try{return next.encrypt(id,secret);}finally{secret.fill(0);}};queries.push({text:'UPDATE faro_mfa SET active_cipher=$1,pending_cipher=$2 WHERE user_id=$3',values:[rewrap(row.active_cipher),rewrap(row.pending_cipher),id]});}
 const keyId=(value:string)=>createHash('sha256').update(Buffer.from(value,'hex')).digest('hex').slice(0,16);
 queries.push({text:'DELETE FROM faro_mfa_sessions',values:[]});queries.push({text:"INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,NULL,'MFA_KEY_ROTATED','security','mfa',$2,$3)",values:[randomUUID(),JSON.stringify({accounts:rows.length,previousKeyId:keyId(currentKey),keyId:keyId(nextKey)}),asOf]});
 return {queries,ack:{rotatedAccounts:rows.length,keyId:keyId(nextKey),sessionStepUpInvalidated:true}};
}
interface RotationDatabase {readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;query(text:string,values:readonly unknown[]):Promise<unknown>;transaction<T>(work:()=>T|Promise<T>):Promise<T>;}
/** Offline maintenance only: caller owns runtime stop/config switch and protected historical keys. */
export async function rotateMfaKey(database:RotationDatabase,currentKey:string,nextKey:string,asOf:string,authorizeOperator:()=>void|Promise<void>){return database.transaction(async()=>{await authorizeOperator();await database.query('LOCK TABLE faro_mfa IN SHARE ROW EXCLUSIVE MODE',[]);const plan=mfaRotationPlan((await database.readBatch([mfaRotationReadQuery]))[0]??[],currentKey,nextKey,asOf);for(const query of plan.queries)await database.query(query.text,query.values);return plan.ack;});}
