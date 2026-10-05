import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture } from './faro-fixture.js';
import { MfaService,totp } from '../server/faro/mfaService.js';
import { hashSessionToken } from '../server/auth.js';
import { loadConfig } from '../server/config.js';
import { ProfileService } from '../server/faro/profileService.js';
import { request as httpRequest } from 'node:http';
export function decodeSecret(value:string){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,acc=0;const bytes:number[]=[];for(const letter of value){acc=(acc<<5)|alphabet.indexOf(letter);bits+=5;if(bits>=8){bits-=8;bytes.push((acc>>>bits)&255);}}return Buffer.from(bytes);}
test('TOTP matches RFC6238 SHA1 published vectors with counter beyond2038',()=>{
  const key=Buffer.from('12345678901234567890');
  for(const [seconds,expected] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']] as const)assert.equal(totp(key,Math.floor(seconds/30),8),expected);
});
test('production privileged MFA cannot be disabled and current active staff roles require enrollment',async()=>{
  assert.equal(loadConfig({nodeEnv:'production',faroRequirePrivilegedMfa:false}).faroRequirePrivilegedMfa,true);
  assert.throws(()=>loadConfig({faroMfaEncryptionKey:'weak'}),/32 bajtów/);
  const f=await faroFixture({faroRequirePrivilegedMfa:true});try {
    const u=await f.user('MfaRole'),user=f.app.store.getUserById(u.id)!,mfa=new MfaService(f.app.db,f.app.config);
    assert.equal(mfa.required(user),false);const org=new ProfileService(f.app.db).organization(u.id,{name:'Role MFA'});
    for(const role of ['OWNER','ADMIN','RECRUITER','HIRING_MANAGER']) {f.app.db.db.prepare('UPDATE faro_members SET role=? WHERE organization_id=? AND user_id=?').run(role,org.id,u.id);assert.equal(mfa.required(user),true);await f.request('/api/faro/profile',u.cookie,'GET',undefined,403);}
    await f.request('/api/faro/security/mfa/setup',u.cookie,'POST',{password:'Bezpieczne123'},503);
    f.app.db.db.prepare('UPDATE faro_members SET active=0 WHERE organization_id=? AND user_id=?').run(org.id,u.id);assert.equal(mfa.required(user),false);
    assert.equal(mfa.required({...user,role:'ADMIN'}),true);
  }finally{await f.close();}
});
test('encrypted MFA gates private APIs, fences OTP replay, recovers once and revokes other sessions without exposing credentials',async()=>{
  const f=await faroFixture({faroMfaEncryptionKey:'11'.repeat(32)});try {
    const user=await f.user('MfaUser'),other=await f.user('MfaOther');
    const login=async()=>{const response=await fetch(`${f.base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:user.email,password:'Bezpieczne123'})});assert.equal(response.status,200);return response.headers.get('set-cookie')!.split(';')[0]!;};
    const old=await login(),path='/api/faro/security/mfa';
    await f.request(path+'/setup',user.cookie,'POST',{password:'WrongPassword123'},401);
    const setup=await f.request<{secret:string}>(path+'/setup',user.cookie,'POST',{password:'Bezpieczne123'}),secret=decodeSecret(setup.secret);
    const stored=f.app.db.db.prepare('SELECT pending_cipher FROM faro_mfa WHERE user_id=?').get(user.id)!;
    assert.equal(String(stored.pending_cipher).includes(setup.secret),false);assert.equal(String(stored.pending_cipher).includes(secret.toString('hex')),false);
    const enrolledCounter=Math.floor(Date.now()/30000);
    const confirmed=await f.request<{recoveryCodes:string[]}>(path+'/confirm',user.cookie,'POST',{code:totp(secret,enrolledCounter)});assert.equal(confirmed.recoveryCodes.length,8);
    await f.request('/api/me',old,'GET',undefined,401);
    const second=await login();
    const me=await f.request<{mfaRequired:boolean;profile?:unknown}>('/api/me',second);assert.equal(me.mfaRequired,true);assert.equal(me.profile,undefined);
    for(const url of ['/api/faro/profile','/api/export','/api/consents','/api/admin/diagnostics'])await f.request(url,second,'GET',undefined,403);
    await f.request('/api/faro/profile',other.cookie);
    await f.request(path+'/verify',second,'POST',{code:totp(secret,enrolledCounter)},401);
    const nextCounter=Math.max(enrolledCounter+1,Math.floor(Date.now()/30000));
    await f.request(path+'/verify',second,'POST',{code:totp(secret,nextCounter)});
    await f.request('/api/faro/profile',second);
    const third=await login();
    await f.request(path+'/verify',third,'POST',{code:totp(secret,nextCounter)},401);
    await f.request(path+'/setup',third,'POST',{password:'Bezpieczne123'},403);
    await f.request(path+'/recover',third,'POST',{password:'Bezpieczne123',code:confirmed.recoveryCodes[0]});
    await f.request('/api/me',second,'GET',undefined,401);await f.request('/api/faro/profile',third);
    await f.request(path+'/recover',third,'POST',{password:'Bezpieczne123',code:confirmed.recoveryCodes[0]},401);
    const exported=JSON.stringify(await f.request('/api/export',third));for(const value of [setup.secret,String(stored.pending_cipher),...confirmed.recoveryCodes])assert.equal(exported.includes(value),false);
    const audit=JSON.stringify(f.app.db.db.prepare('SELECT * FROM audit_logs WHERE user_id=?').all(user.id));for(const value of [setup.secret,'Bezpieczne123',...confirmed.recoveryCodes])assert.equal(audit.includes(value),false);
    const hash=hashSessionToken(third.split('=')[1]!);
    // Expiry after headers/preliminary authorization but before complete request body must deny mutation.
    const payload=JSON.stringify({firstName:'NieZapisuj',availability:{kind:'IMMEDIATE'},expectedVersion:0});
    const denied=await new Promise<number>((resolve,reject)=>{
      const pending=httpRequest(`${f.base}/api/faro/profile`,{method:'PUT',headers:{cookie:third,'content-type':'application/json','content-length':Buffer.byteLength(payload)}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode!));});
      pending.on('error',reject);
      f.app.server.once('request',()=>{f.app.db.db.prepare("UPDATE faro_mfa_sessions SET verified_until='2000-01-01T00:00:00Z' WHERE token_hash=?").run(hash);pending.end(payload.slice(1));});
      pending.write(payload.slice(0,1));
    });assert.equal(denied,403);assert.notEqual(new ProfileService(f.app.db).profile(user.id).firstName,'NieZapisuj');
    await f.request('/api/faro/profile',third,'GET',undefined,403);
    for(let i=0;i<4;i++)await f.request(path+'/verify',third,'POST',{code:'invalid'},401);
    await f.request(path+'/verify',third,'POST',{code:totp(secret,Math.floor(Date.now()/30000)+2)},429);
    const next=new MfaService(f.app.db,{...f.app.config,faroMfaEncryptionKey:'22'.repeat(32)},()=>new Date(Date.now()+601000));
    assert.throws(()=>next.verify(f.app.store.getUserBySession(hash)!,hash,{code:'123456'}),error=>(error as {code:string}).code==='MFA_UNAVAILABLE');
  }finally{await f.close();}
});
