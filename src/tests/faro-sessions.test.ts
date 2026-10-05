import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture } from './faro-fixture.js';

test('reauthenticated revoke-all removes every own session immediately and preserves foreign sessions and profile',async()=>{
  const f=await faroFixture();
  try {
    const own=await f.user('SessionOwner'),other=await f.user('SessionOther');
    const login=await fetch(`${f.base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:own.email,password:'Bezpieczne123'})});
    assert.equal(login.status,200);const second=login.headers.get('set-cookie')!.split(';')[0]!;
    await f.request('/api/faro/sessions/revoke-all',own.cookie,'POST',{password:'Bezpieczne123'},400);
    await f.request('/api/faro/sessions/revoke-all',own.cookie,'POST',{password:'BledneHaslo123',confirmed:true},401);
    await f.request('/api/me',second);
    const cross=await fetch(`${f.base}/api/faro/sessions/revoke-all`,{method:'POST',headers:{cookie:own.cookie,origin:'https://foreign.invalid','content-type':'application/json'},body:JSON.stringify({password:'Bezpieczne123',confirmed:true})});
    assert.equal(cross.status,403);
    f.app.db.db.exec("CREATE TRIGGER fail_session_audit BEFORE INSERT ON audit_logs WHEN NEW.action='SESSIONS_REVOKED' BEGIN SELECT RAISE(ABORT,'fixture audit failure'); END");
    await f.request('/api/faro/sessions/revoke-all',own.cookie,'POST',{password:'Bezpieczne123',confirmed:true},500);
    await f.request('/api/me',second);
    f.app.db.db.exec('DROP TRIGGER fail_session_audit');
    await f.request('/api/faro/sessions/revoke-all',own.cookie,'POST',{password:'Bezpieczne123',confirmed:true,userId:other.id});
    for(const cookie of [own.cookie,second])await f.request('/api/me',cookie,'GET',undefined,401);
    await f.request('/api/me',other.cookie);
    assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM sessions WHERE user_id=?').get(own.id)!.n,0);
    const audit=f.app.db.db.prepare("SELECT metadata FROM audit_logs WHERE action='SESSIONS_REVOKED' AND user_id=?").all(own.id);
    assert.equal(audit.length,1);assert.equal(JSON.stringify(audit).includes('Bezpieczne123'),false);
    await f.request('/api/faro/sessions/revoke-all',second,'POST',{password:'Bezpieczne123',confirmed:true},401);
    const renewed=await fetch(`${f.base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:own.email,password:'Bezpieczne123'})});
    assert.equal(renewed.status,200);await f.request('/api/faro/profile',renewed.headers.get('set-cookie')!.split(';')[0]!);
  }finally{await f.close();}
});
