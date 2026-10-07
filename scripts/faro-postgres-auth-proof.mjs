import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { registerAccount,loginAccount,logoutAccount,readConsents,changeAnalyticsConsent } from '../dist/server/faro/authWriteModel.js';
import { readIdentity } from '../dist/server/faro/identityAccessModel.js';
import { hashSessionToken } from '../dist/server/auth.js';
import { clientFromEnvironment,identifier } from './faro-postgres-rehearsal.mjs';

export async function proveNativeAuth(db,schema,asOf){
 const email=`${randomUUID()}@example.invalid`,version='synthetic-native-auth-v1',config={adminEmails:new Set(),sessionDays:2},body={email:` ${email.toUpperCase()} `,name:' Native Account ',password:'Bezpieczne123',acceptTerms:true,acceptPrivacy:true,analyticsConsent:false,role:'ADMIN'};
 const read=async(text,values=[])=>(await db.readBatch([{text,values}]))[0]??[];
 await assert.rejects(()=>registerAccount(db,{...body,acceptTerms:'true'},config,version,asOf),error=>error.code==='REQUIRED_CONSENT_MISSING');
 await assert.rejects(()=>registerAccount(db,{...body,password:'short'},config,version,asOf),error=>error.code==='WEAK_PASSWORD');
 const counts=async()=>read("SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM sessions) sessions,(SELECT COUNT(*) FROM consents) consents,(SELECT COUNT(*) FROM career_profiles) profiles,(SELECT COUNT(*) FROM subscriptions) subscriptions,(SELECT COUNT(*) FROM audit_logs) audits,(SELECT COUNT(*) FROM analytics_events) analytics");
 const before=await counts();
 await db.query("ALTER TABLE audit_logs ADD CONSTRAINT pg_register_guard CHECK(action<>'ACCOUNT_CREATED') NOT VALID");
 await assert.rejects(()=>registerAccount(db,body,config,version,asOf),error=>error.code==='23514');assert.deepEqual(await counts(),before);
 await db.query('ALTER TABLE audit_logs DROP CONSTRAINT pg_register_guard');
 const account=await registerAccount(db,body,config,version,asOf);assert.equal(account.user.role,'USER');assert.equal(account.user.email,email);assert.equal(account.user.name,'Native Account');assert.equal(hashSessionToken(account.token.raw),account.token.hash);
 assert.equal((await read('SELECT expires_at FROM sessions WHERE token_hash=$1',[account.token.hash]))[0].expires_at,new Date(Date.parse(asOf)+2*86400000).toISOString());
 assert.equal((await read('SELECT plan,status FROM subscriptions WHERE user_id=$1',[account.user.id]))[0].plan,'FREE');
 assert.equal((await read('SELECT user_id FROM career_profiles WHERE user_id=$1',[account.user.id])).length,1);
 const consent=await readConsents(db,account.token.hash,asOf);assert.equal(consent.length,3);assert.equal(consent.find(row=>row.type==='ANALYTICS').granted,false);
 await assert.rejects(()=>registerAccount(db,body,config,version,asOf),error=>error.code==='EMAIL_EXISTS');
 for(const input of [{email,password:'WrongPassword123'},{email:`${randomUUID()}@example.invalid`,password:'WrongPassword123'}])await assert.rejects(()=>loginAccount(db,input,2,asOf),error=>error.code==='INVALID_CREDENTIALS');
 const sessions=await read('SELECT token_hash FROM sessions WHERE user_id=$1 ORDER BY token_hash',[account.user.id]);
 await db.query("ALTER TABLE audit_logs ADD CONSTRAINT pg_login_guard CHECK(action<>'LOGIN') NOT VALID");await assert.rejects(()=>loginAccount(db,body,2,asOf),error=>error.code==='23514');assert.deepEqual(await read('SELECT token_hash FROM sessions WHERE user_id=$1 ORDER BY token_hash',[account.user.id]),sessions);await db.query('ALTER TABLE audit_logs DROP CONSTRAINT pg_login_guard');
 const login=await loginAccount(db,body,2,asOf);assert.notEqual(login.token.hash,account.token.hash);assert.equal((await readIdentity(db,login.token.hash,asOf,false,true)).user.id,account.user.id);
 await db.query("INSERT INTO faro_mfa(user_id,active_cipher,activated_at) VALUES($1,'synthetic-encrypted-state',$2)",[account.user.id,asOf]);
 await assert.rejects(()=>changeAnalyticsConsent(db,login.token.hash,{granted:true},version,asOf,false,true),error=>error.code==='MFA_REQUIRED');
 await db.query('DELETE FROM faro_mfa WHERE user_id=$1',[account.user.id]);
 await assert.rejects(()=>changeAnalyticsConsent(db,login.token.hash,{granted:'true'},version,asOf,false,true),error=>error.code==='INVALID_CONSENT_VALUE');
 await changeAnalyticsConsent(db,login.token.hash,{granted:true},version,asOf,false,true);
 assert.equal((await readConsents(db,login.token.hash,asOf)).find(row=>row.type==='ANALYTICS').granted,true);
 const analyticsId=randomUUID();await db.query("INSERT INTO analytics_events(id,user_id,event_name,properties,created_at) VALUES($1,$2,'FARO_MUTUAL_STAGE_COMPLETED','{}',$3)",[analyticsId,account.user.id,asOf]);
 const priorConsents=await read('SELECT id FROM consents WHERE user_id=$1 ORDER BY id',[account.user.id]);
 await db.query("ALTER TABLE audit_logs ADD CONSTRAINT pg_consent_guard CHECK(action<>'CONSENT_RECORDED') NOT VALID");
 await assert.rejects(()=>changeAnalyticsConsent(db,login.token.hash,{granted:false},version,asOf,false,true),error=>error.code==='23514');assert.deepEqual(await read('SELECT id FROM consents WHERE user_id=$1 ORDER BY id',[account.user.id]),priorConsents);assert.equal((await read('SELECT id FROM analytics_events WHERE id=$1',[analyticsId])).length,1);await db.query('ALTER TABLE audit_logs DROP CONSTRAINT pg_consent_guard');
 await changeAnalyticsConsent(db,login.token.hash,{granted:false},version,asOf,false,true);assert.equal((await read('SELECT id FROM analytics_events WHERE id=$1',[analyticsId])).length,0);assert.equal((await readConsents(db,login.token.hash,asOf)).find(row=>row.type==='ANALYTICS').granted,false);
 assert.deepEqual(await logoutAccount(db,login.token.hash),{ok:true});assert.deepEqual(await logoutAccount(db,login.token.hash),{ok:true});await assert.rejects(()=>readIdentity(db,login.token.hash,asOf,false,true),error=>error.code==='UNAUTHENTICATED');assert.equal((await readIdentity(db,account.token.hash,asOf,false,true)).user.id,account.user.id);
 const audit=JSON.stringify(await read('SELECT metadata FROM audit_logs WHERE user_id=$1',[account.user.id]));for(const secret of [body.password,account.user.passwordHash,account.token.raw,account.token.hash,login.token.raw,login.token.hash])assert.equal(audit.includes(secret),false);
 const privileged=await registerAccount(db,{...body,email:`${randomUUID()}@example.invalid`},{...config,adminEmails:new Set([email])},version,asOf);assert.equal(privileged.user.role,'USER');
 const adminEmail=`${randomUUID()}@example.invalid`,admin=await registerAccount(db,{...body,email:adminEmail},{...config,adminEmails:new Set([adminEmail])},version,asOf);assert.equal(admin.user.role,'ADMIN');await assert.rejects(()=>readIdentity(db,admin.token.hash,asOf,true,true),error=>error.code==='MFA_REQUIRED');
 const concurrentEmail=`${randomUUID()}@example.invalid`,second=clientFromEnvironment();await second.connect();try{
  await second.query(`SET search_path TO ${identifier(schema)}`);
  const results=await Promise.allSettled([registerAccount(db,{...body,email:concurrentEmail},config,version,asOf),registerAccount(second,{...body,email:concurrentEmail},config,version,asOf)]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.find(result=>result.status==='rejected').reason.code,'EMAIL_EXISTS');assert.equal((await read('SELECT COUNT(*) n FROM users WHERE email=$1',[concurrentEmail]))[0].n,1);
 }finally{await second.end();}
}
