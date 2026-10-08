import {createHmac} from 'node:crypto';
import {HttpError} from '../http.js';
export function requestLimitPlan(key:string|null,bucket:string,limit:number,windowMs:number,asOf:number){
 if(!key||!/^[a-fA-F0-9]{64}$/.test(key))throw new HttpError(503,'Ochrona dostępu jest niedostępna.','RATE_LIMIT_UNAVAILABLE');
 if(!bucket||bucket.length>256||!Number.isSafeInteger(limit)||limit<1||limit>100000||!Number.isSafeInteger(windowMs)||windowMs<1||!Number.isSafeInteger(asOf)||asOf<1||!Number.isSafeInteger(asOf+windowMs))throw new Error('Invalid request limit policy.');
 const hash=createHmac('sha256',Buffer.from(key,'hex')).update('FARO_REQUEST_LIMIT_V1\0').update(bucket).digest('hex');
 return {hash,queries:[{text:'DELETE FROM faro_request_limits WHERE expires_at<=$1',values:[asOf]},{text:'INSERT INTO faro_request_limits(bucket_hash,request_count,expires_at) VALUES($1,1,$2) ON CONFLICT(bucket_hash) DO UPDATE SET request_count=CASE WHEN faro_request_limits.request_count<$3 THEN faro_request_limits.request_count+1 ELSE faro_request_limits.request_count END RETURNING request_count',values:[hash,asOf+windowMs,limit+1]}]};
}
interface LimitDatabase{query(text:string,values:readonly unknown[]):Promise<{rows:Record<string,unknown>[]}>;transaction<T>(work:()=>T|Promise<T>):Promise<T>;}
/** Charge commits before returning429, shared across restarts and connections. */
export async function enforceNativeRate(database:LimitDatabase,key:string|null,bucket:string,limit:number,windowMs:number,asOf=Date.now()){
 const plan=requestLimitPlan(key,bucket,limit,windowMs,asOf);let count=0;
 for(let retry=0;;retry++)try{count=await database.transaction(async()=>{await database.query(plan.queries[0]!.text,plan.queries[0]!.values);return Number((await database.query(plan.queries[1]!.text,plan.queries[1]!.values)).rows[0]?.request_count);});break;}catch(error){const code=(error as {code?:string}).code;if(retry<2&&(code==='40001'||code==='40P01'))continue;throw new HttpError(503,'Ochrona dostępu jest niedostępna.','RATE_LIMIT_UNAVAILABLE');}
 if(!Number.isSafeInteger(count)||count<1)throw new HttpError(503,'Ochrona dostępu jest niedostępna.','RATE_LIMIT_UNAVAILABLE');
 if(count>limit)throw new HttpError(429,'Zbyt wiele prób. Spróbuj za chwilę.','RATE_LIMITED');
}
