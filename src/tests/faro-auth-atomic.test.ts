import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture } from './faro-fixture.js';

test('registration audit failure rolls back account defaults, consents, sessions and analytics before retry',async()=>{
 const f=await faroFixture();try{
  const body={email:'atomic-registration@example.pl',name:'Atomic Registration',password:'Bezpieczne123',acceptTerms:true,acceptPrivacy:true,analyticsConsent:false,role:'ADMIN'};
  f.app.db.db.exec("CREATE TRIGGER registration_guard BEFORE INSERT ON audit_logs WHEN NEW.action='ACCOUNT_CREATED' BEGIN SELECT RAISE(ABORT,'registration audit failed'); END");
  await f.request('/api/auth/register','','POST',body,500);
  for(const table of ['users','career_profiles','subscriptions','consents','sessions','analytics_events','audit_logs'])assert.equal(f.app.db.db.prepare(`SELECT COUNT(*) n FROM ${table}`).get()?.n,0,table);
  f.app.db.db.exec('DROP TRIGGER registration_guard');
  const result=await f.request<{user:{id:string;role:string}}>('/api/auth/register','','POST',body,201);
  assert.equal(result.user.role,'USER');assert.equal(f.app.store.listConsents(result.user.id).length,3);
  assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM sessions WHERE user_id=?').get(result.user.id)?.n,1);
 }finally{await f.close();}
});

test('login and analytics consent audit failure leave sessions and verified product evidence unchanged',async()=>{
 const f=await faroFixture();try{
  const account=await f.user('AtomicLogin'),sessions=f.app.db.db.prepare('SELECT token_hash FROM sessions WHERE user_id=?').all(account.id);
  f.app.db.db.exec("CREATE TRIGGER login_guard BEFORE INSERT ON audit_logs WHEN NEW.action='LOGIN' BEGIN SELECT RAISE(ABORT,'login audit failed'); END");
  await f.request('/api/auth/login','','POST',{email:account.email,password:'Bezpieczne123'},500);
  assert.deepEqual(f.app.db.db.prepare('SELECT token_hash FROM sessions WHERE user_id=?').all(account.id),sessions);
  f.app.db.db.exec('DROP TRIGGER login_guard');await f.request('/api/auth/login','','POST',{email:account.email,password:'Bezpieczne123'});
  assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM sessions WHERE user_id=?').get(account.id)?.n,2);
  f.app.store.recordConsent(account.id,'ANALYTICS',true,'synthetic-atomic-test');
  f.app.db.db.prepare("INSERT INTO analytics_events(id,user_id,event_name,properties,created_at) VALUES('atomic-proof',?,'FARO_MUTUAL_STAGE_COMPLETED','{}',?)").run(account.id,new Date().toISOString());
  const consents=f.app.db.db.prepare('SELECT id FROM consents WHERE user_id=?').all(account.id);
  f.app.db.db.exec("CREATE TRIGGER consent_guard BEFORE INSERT ON audit_logs WHEN NEW.action='CONSENT_RECORDED' BEGIN SELECT RAISE(ABORT,'consent audit failed'); END");
  await f.request('/api/consents/analytics',account.cookie,'PUT',{granted:false},500);
  assert.deepEqual(f.app.db.db.prepare('SELECT id FROM consents WHERE user_id=?').all(account.id),consents);
  assert.ok(f.app.db.db.prepare("SELECT id FROM analytics_events WHERE id='atomic-proof'").get());
  f.app.db.db.exec('DROP TRIGGER consent_guard');await f.request('/api/consents/analytics',account.cookie,'PUT',{granted:false});
  assert.equal(f.app.store.listConsents(account.id).find(consent=>consent.type==='ANALYTICS')?.granted,false);
  assert.equal(f.app.db.db.prepare("SELECT id FROM analytics_events WHERE id='atomic-proof'").get(),undefined);
 }finally{await f.close();}
});
