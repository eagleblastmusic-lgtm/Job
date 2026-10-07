import { type MfaRow,type MfaQuery,mfaRowQuery,mfaSetupQuery,mfaGrantQuery,mfaEnableQueries,mfaVerifyQuery,mfaRecoverQuery,mfaFailureQueries } from './mfaWriteModel.js';
import { privilegedMemberQuery,verifiedMfaQuery,mfaAccessQueries,mfaAccessState,requireMfaAccess } from './identityAccessModel.js';
import { randomBytes } from 'node:crypto';
import { MfaCodec,base32,mfaCounter,mfaRecoveryHash,mfaRecoveryCodes } from './mfaCrypto.js';
export { base32,totp } from './mfaCrypto.js';
import type { AppConfig } from '../config.js';
import type { UserRecord } from '../store.js';
import { verifyPassword,MAX_PASSWORD_LENGTH } from '../auth.js';
import { HttpError } from '../http.js';
import { FaroStore } from './base.js';
import type { JobDatabase } from '../db.js';
export class MfaService extends FaroStore {
  constructor(db:JobDatabase,readonly config:AppConfig,clock:()=>Date=()=>new Date()){super(db,clock);}
  private write(query:MfaQuery){return this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));}
  row(userId:string){return this.db.prepare(mfaRowQuery(userId).text).get({$1:userId}) as unknown as MfaRow|undefined;}
  privileged(user:UserRecord){const query=privilegedMemberQuery(user.id);return user.role==='ADMIN'||Boolean(this.db.prepare(query.text).get({$1:user.id}));}
  verified(tokenHash:string){const query=verifiedMfaQuery(tokenHash,this.now());return Boolean(this.db.prepare(query.text).get({$1:tokenHash,$2:query.values[1]!}));}
  required(user:UserRecord){return Boolean(this.row(user.id)?.active_cipher)||(this.config.faroRequirePrivilegedMfa&&this.privileged(user));}
  status(user:UserRecord,tokenHash:string){const asOf=this.now(),rows=mfaAccessQueries(user.id,tokenHash,asOf).map(query=>this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value]))));return mfaAccessState(user,rows,this.config.faroRequirePrivilegedMfa,Boolean(this.config.faroMfaEncryptionKey),asOf);}
  assertAccess(user:UserRecord,tokenHash:string){requireMfaAccess({required:this.required(user),verified:this.verified(tokenHash)});}
  private actor(user:UserRecord,tokenHash:string){if(!this.db.prepare('SELECT 1 FROM sessions WHERE user_id=? AND token_hash=? AND expires_at>?').get(user.id,tokenHash,this.now()))throw new HttpError(401,'Zaloguj się, aby kontynuować.','UNAUTHENTICATED');}
  private key(){return new MfaCodec(this.config).key();}
  private encrypt(userId:string,secret:Buffer){return new MfaCodec(this.config).encrypt(userId,secret);}
  private limit(userId:string){const row=this.db.prepare('SELECT failures,window_start FROM faro_mfa_limits WHERE user_id=?').get(userId) as {failures:number;window_start:string}|undefined;if(row&&row.failures>=5&&Date.parse(row.window_start)+600000>this.clock().getTime())throw new HttpError(429,'Zbyt wiele nieudanych potwierdzeń. Spróbuj po 10 minutach.','MFA_RATE_LIMITED');}
  private fail(userId:string):never {
    this.transaction(()=>{for(const query of mfaFailureQueries(userId,this.now()))this.write(query);});
    throw new HttpError(401,'Nieprawidłowe potwierdzenie dostępu.','REAUTH_FAILED');
  }
  private password(user:UserRecord,password:unknown){this.limit(user.id);if(typeof password!=='string'||password.length>MAX_PASSWORD_LENGTH||!verifyPassword(password,user.passwordHash))this.fail(user.id);}
  private counter(userId:string,cipher:string,code:unknown,last=-1){this.limit(userId);const counter=mfaCounter(new MfaCodec(this.config),userId,cipher,code,this.now(),last);return counter===null?this.fail(userId):counter;}
  private grant(tokenHash:string){this.write(mfaGrantQuery(tokenHash,this.now()));}
  private success(userId:string){this.db.prepare('DELETE FROM faro_mfa_limits WHERE user_id=?').run(userId);}
  setup(user:UserRecord,tokenHash:string,body:Record<string,unknown>){this.actor(user,tokenHash);this.key();this.password(user,body.password);if(this.row(user.id)?.active_cipher&&!this.verified(tokenHash))throw new HttpError(403,'Najpierw potwierdź dotychczasowy drugi składnik.','MFA_REQUIRED');const secret=randomBytes(20),cipher=this.encrypt(user.id,secret),until=new Date(this.clock().getTime()+300000).toISOString();this.transaction(()=>{this.write(mfaSetupQuery(user.id,cipher,until));this.audit(user.id,'MFA_SETUP_STARTED',user.id);});return {secret:base32(secret),expiresAt:until,algorithm:'SHA1',digits:6,period:30};}
  confirm(user:UserRecord,tokenHash:string,body:Record<string,unknown>){this.actor(user,tokenHash);const row=this.row(user.id);if(!row?.pending_cipher||!row.pending_until||row.pending_until<=this.now())throw new HttpError(409,'Rozpocznij ponownie konfigurację MFA.','MFA_SETUP_EXPIRED');const counter=this.counter(user.id,row.pending_cipher,body.code),codes=mfaRecoveryCodes();this.transaction(()=>{this.limit(user.id);const current=this.row(user.id);if(current?.pending_cipher!==row.pending_cipher)throw new HttpError(409,'Konfiguracja zmieniła się.');for(const query of mfaEnableQueries(user.id,tokenHash,counter,codes,this.now()))this.write(query);});return {recoveryCodes:codes};}
  verify(user:UserRecord,tokenHash:string,body:Record<string,unknown>){this.actor(user,tokenHash);const row=this.row(user.id);if(!row?.active_cipher)throw new HttpError(409,'Najpierw skonfiguruj MFA.','MFA_ENROLLMENT_REQUIRED');const counter=this.counter(user.id,row.active_cipher,body.code,row.last_counter);this.transaction(()=>{this.limit(user.id);const changed=this.write(mfaVerifyQuery(user.id,row.active_cipher!,counter));if(changed.changes!==1)throw new HttpError(409,'Kod został już wykorzystany.','MFA_CODE_REPLAY');this.grant(tokenHash);this.success(user.id);this.audit(user.id,'MFA_VERIFIED',user.id);});return {ok:true};}
  private recoveryHash(userId:string,code:string){return mfaRecoveryHash(userId,code);}
  recover(user:UserRecord,tokenHash:string,body:Record<string,unknown>){this.actor(user,tokenHash);this.password(user,body.password);if(typeof body.code!=='string'||!/^\w{32}$/.test(body.code))return this.fail(user.id);const hash=this.recoveryHash(user.id,body.code),row=this.db.prepare('SELECT used_at FROM faro_mfa_recovery WHERE user_id=? AND code_hash=?').get(user.id,hash);if(!row||row.used_at!==null)return this.fail(user.id);this.transaction(()=>{this.limit(user.id);const changed=this.write(mfaRecoverQuery(user.id,hash,this.now()));if(changed.changes!==1)throw new HttpError(409,'Kod odzyskiwania został już wykorzystany.');this.db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>?').run(user.id,tokenHash);this.grant(tokenHash);this.success(user.id);this.audit(user.id,'MFA_RECOVERY_USED',user.id);});return {ok:true};}
}
