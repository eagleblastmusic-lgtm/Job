import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture } from './faro-fixture.js';
import { ProfileService } from '../server/faro/profileService.js';
import { employerProjection } from '../domain/faro/skills.js';
import { profilePractice } from '../server/faro/profileWriteModel.js';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';

test('activity practice remains private source evidence and is never copied into every proposed claim',async()=>{
  const f=await faroFixture();try{
    const own=await f.user('ActivityPractice'),other=await f.user('ActivityPracticeOther');
    await f.request('/api/faro/profile',own.cookie,'PUT',{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
    const activity={description:'SQL Excel',source:'WORK',practice:{quantity:24,unit:'MONTHS',context:'PRIVATE_ACTIVITY_PRACTICE'}};
    const recorded=await f.request<{activities:Array<{id:string;created_at:string;practice:{quantity:number;context:string}|null}>;proposals:Array<{id:string}>;claims:unknown[]}>('/api/faro/activities',own.cookie,'POST',activity,201);
    assert.equal(recorded.activities[0]!.practice!.quantity,24);assert.equal(recorded.activities[0]!.practice!.context,activity.practice.context);assert.ok(Number.isFinite(Date.parse(recorded.activities[0]!.created_at)));assert.equal(recorded.claims.length,0);
    const before=new ProfileService(f.app.db).profile(own.id);
    await f.request('/api/faro/activities',own.cookie,'POST',{...activity,practice:{...activity.practice,context:0}},400);assert.deepEqual(new ProfileService(f.app.db).profile(own.id),before);
    const confirmed=await f.request<{claims:Array<{practice:unknown}>}>(`/api/faro/proposals/${recorded.proposals[0]!.id}`,own.cookie,'POST',{status:'ACCEPTED',level:'BASICS',source:'WORK',practice:{quantity:null,unit:'TASKS'},confirmed:true});
    assert.deepEqual(confirmed.claims[0]!.practice,{quantity:null,unit:'TASKS'});
    assert.doesNotMatch(JSON.stringify(await f.request('/api/faro/profile/preview',own.cookie)),/PRIVATE_ACTIVITY_PRACTICE|24/);
    assert.match(JSON.stringify(await f.request('/api/export',own.cookie)),/PRIVATE_ACTIVITY_PRACTICE/);assert.doesNotMatch(JSON.stringify(await f.request('/api/export',other.cookie)),/PRIVATE_ACTIVITY_PRACTICE/);
    await f.request(`/api/faro/activities/${recorded.activities[0]!.id}`,own.cookie,'DELETE',{confirmed:true});assert.doesNotMatch(JSON.stringify(await f.request('/api/export',own.cookie)),/PRIVATE_ACTIVITY_PRACTICE/);
    const legacy=await f.request<{activities:Array<{practice:unknown}>}>('/api/faro/activities',own.cookie,'POST',{description:'opis bez określonej praktyki',source:'HOBBY'},201);assert.equal(legacy.activities[0]!.practice,null);
  }finally{await f.close();}
});

test('0038 preserves historical activity source, relationships and unknown practice',async()=>{
  const db=new DatabaseSync(':memory:');try{
    db.exec("PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY); CREATE TABLE faro_activities(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,description TEXT NOT NULL,source TEXT NOT NULL,created_at TEXT NOT NULL); INSERT INTO users VALUES('owner'); INSERT INTO faro_activities VALUES('original','owner','historical private description','WORK','2020-01-01T00:00:00.000Z');");
    const before=db.prepare('SELECT * FROM faro_activities').get();
    db.exec(await readFile(new URL('../../migrations/0038_faro_activity_practice.sql',import.meta.url),'utf8'));
    const after=db.prepare('SELECT * FROM faro_activities').get()!;assert.equal(after.practice,null);const {practice:_,...retained}=after;assert.deepEqual(retained,{...before});assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
    db.exec("DELETE FROM users WHERE id='owner'");assert.equal(db.prepare('SELECT count(*) AS n FROM faro_activities').get()!.n,0);
  }finally{db.close();}
});

test('practice context is bounded private evidence, survives reload and fences stale learning erasure',async()=>{
  const f=await faroFixture();try{
    const own=await f.user('PrivatePractice'),other=await f.user('OtherPractice');
    await f.request('/api/faro/profile',own.cookie,'PUT',{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
    const practice={quantity:9,unit:'MONTHS',context:'  PRIVATE_CONTEXT_SENTINEL <script>narzędzia</script>  '};
    const claim={skillId:'faro:legacy:4',level:'BASICS',source:'SELF_LEARNING',practice,confirmed:true};
    await f.request('/api/faro/claims',own.cookie,'POST',claim,201);
    const profile=new ProfileService(f.app.db).profile(own.id);assert.equal(profile.claims[0]!.practice.context,practice.context.trim());assert.equal(profile.claims[0]!.level,'BASICS');assert.equal(profile.claims[0]!.verification,'DECLARED');
    for(const context of [null,0,{},'x'.repeat(501)])await f.request('/api/faro/claims',own.cookie,'POST',{...claim,practice:{...practice,context}},400);
    assert.deepEqual(new ProfileService(f.app.db).profile(own.id),profile);
    const preview=await f.request('/api/faro/profile/preview-confirmation',own.cookie);assert.doesNotMatch(JSON.stringify(preview),/PRIVATE_CONTEXT_SENTINEL|script|context/);
    assert.doesNotMatch(JSON.stringify(await f.request('/api/faro/profile',other.cookie)),/PRIVATE_CONTEXT_SENTINEL/);
    assert.match(JSON.stringify(await f.request('/api/export',own.cookie)),/PRIVATE_CONTEXT_SENTINEL/);
    assert.doesNotMatch(JSON.stringify(await f.request('/api/export',other.cookie)),/PRIVATE_CONTEXT_SENTINEL/);
    assert.deepEqual(profilePractice(practice),{quantity:9,unit:'MONTHS'}); // Process clarification remains a minimized shared declaration.
    const learning={skillId:claim.skillId,mode:'SELF_DEVELOPING',practice:{...practice,context:'first private context'}};
    await f.request('/api/faro/learning',own.cookie,'POST',learning,201);
    const currentPractice={...learning.practice,context:'second private context'};
    await f.request('/api/faro/learning',own.cookie,'POST',{...learning,practice:currentPractice},201);
    await f.request('/api/faro/learning',own.cookie,'DELETE',{...learning,expectedPractice:learning.practice,confirmed:true},409);
    assert.equal(new ProfileService(f.app.db).profile(own.id).learning[0]!.practice.context,currentPractice.context);
    assert.doesNotMatch(JSON.stringify(await f.request('/api/faro/profile/preview',own.cookie)),/private context|context/);
    await f.request('/api/faro/learning',own.cookie,'DELETE',{...learning,expectedPractice:currentPractice,confirmed:true});
    assert.equal(new ProfileService(f.app.db).profile(own.id).learning.length,0);
    await f.request('/api/faro/claims',own.cookie,'POST',{...claim,practice:{quantity:1,unit:'TASKS'}},201);
    assert.equal(new ProfileService(f.app.db).profile(own.id).claims[0]!.practice.context,undefined);
  }finally{await f.close();}
});

test('own private activity removal cascades proposals, preserves declarations and rolls back on audit failure',async()=>{
  const f=await faroFixture();try{
    const own=await f.user('RemoveActivity'),other=await f.user('OtherActivity');
    await f.request('/api/faro/profile',own.cookie,'PUT',{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
    const recorded=await f.request<{activities:Array<{id:string}>;proposals:Array<{id:string}>}>('/api/faro/activities',own.cookie,'POST',{description:'PRIVATE_ERASURE_SENTINEL SQL Excel',source:'WORK'},201);
    const id=recorded.activities[0]!.id,proposal=recorded.proposals[0]!.id,url=`/api/faro/activities/${id}`;
    await f.request(`/api/faro/proposals/${proposal}`,own.cookie,'POST',{status:'ACCEPTED',level:'BASICS',source:'WORK',practice:{quantity:1,unit:'TASKS'},confirmed:true});
    const before=await f.request('/api/faro/profile',own.cookie),preview=await f.request('/api/faro/profile/preview-confirmation',own.cookie);
    await f.request(url,own.cookie,'DELETE',{confirmed:false},400);
    await f.request(url,other.cookie,'DELETE',{confirmed:true},404);
    f.app.db.db.exec("CREATE TRIGGER reject_activity_audit BEFORE INSERT ON audit_logs WHEN NEW.action='ACTIVITY_REMOVED' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
    await f.request(url,own.cookie,'DELETE',{confirmed:true},500);
    assert.deepEqual(await f.request('/api/faro/profile',own.cookie),before);
    f.app.db.db.exec('DROP TRIGGER reject_activity_audit');
    const removed=await f.request<{activities:unknown[];proposals:unknown[];claims:unknown[] }>(url,own.cookie,'DELETE',{confirmed:true});
    assert.equal(removed.activities.length,0);assert.equal(removed.proposals.length,0);assert.equal(removed.claims.length,1);
    assert.deepEqual(await f.request('/api/faro/profile/preview-confirmation',own.cookie),preview);
    await f.request(`/api/faro/proposals/${proposal}`,own.cookie,'POST',{status:'REJECTED'},404);
    await f.request(url,own.cookie,'DELETE',{confirmed:true},404);
    const exported=await f.request('/api/export',own.cookie);assert.doesNotMatch(JSON.stringify(exported),/PRIVATE_ERASURE_SENTINEL/);
    const audit=f.app.db.db.prepare("SELECT metadata FROM audit_logs WHERE user_id=? AND action='ACTIVITY_REMOVED'").all(own.id);
    assert.equal(audit.length,1);assert.equal(audit[0]!.metadata,'{}');
  }finally{await f.close();}
});

test('activity is private, proposals require confirmation, projection is allowlisted and declaration is not verification', async () => {
  const f = await faroFixture();
  try {
    const candidate = await f.user('Anna'), other = await f.user('Ola');
    await f.request('/api/faro/profile', candidate.cookie, 'PUT', { firstName: 'Anna Kowalska', expectedVersion: 0, availability: { kind: 'IMMEDIATE' } }, 400);
    await f.request('/api/faro/profile', candidate.cookie, 'PUT', { firstName: 'Anna', expectedVersion: 0, phone: '+48500100200', availability: { kind: 'IMMEDIATE' }, surname: 'Kowalska', age: 25, photo: 'private.jpg', cv: 'SECRET' });
    const p = await f.request<{ proposals: Array<{ id: string }>; claims: unknown[] }>('/api/faro/activities', candidate.cookie, 'POST', { description: 'Pracowałam na stacji Tajna Firma jako kierownik Kowalska', source: 'WORK' }, 201);
    assert.ok(p.proposals.length >= 5); assert.equal(p.claims.length, 0);
    const proposal = p.proposals[0]!.id;
    const accepted = { status: 'ACCEPTED', level: 'INDEPENDENT', source: 'WORK', practice: { quantity: 3, unit: 'MONTHS', employer: 'Tajna Firma' }, confirmed: true, verification: 'FARO_ASSESSMENT' };
    await f.request(`/api/faro/proposals/${proposal}`, other.cookie, 'POST', accepted, 404);
    await f.request(`/api/faro/proposals/${proposal}`, candidate.cookie, 'POST', { ...accepted, confirmed: false }, 400);
    await f.request(`/api/faro/proposals/${proposal}`, candidate.cookie, 'POST', accepted);
    await f.request(`/api/faro/proposals/${proposal}`, candidate.cookie, 'POST', accepted, 409);
    const preview = await f.request<ReturnType<typeof employerProjection>>('/api/faro/profile/preview', candidate.cookie);
    assert.equal(preview.skillClaims.length, 1); assert.equal(preview.skillClaims[0]!.verification, 'DECLARED');
    assert.deepEqual(Object.keys(preview).sort(), ['processId','firstName','skillClaims','taskExperience','learningIntents','availability','sharedAssessmentResults'].sort());
    const serialized = JSON.stringify(preview);
    for (const forbidden of ['Tajna Firma','Kowalska','kierownik','500100200','SECRET','surname','photo','watchlist']) assert.ok(!serialized.includes(forbidden), forbidden);
    const own = new ProfileService(f.app.db).profile(candidate.id);
    assert.equal(own.claims[0]!.version, 1); assert.equal(own.claims[0]!.practice.quantity, 3);
    const claimId=own.claims[0]!.id,withdrawUrl=`/api/faro/claims/${claimId}`;
    await f.request(withdrawUrl,other.cookie,'DELETE',{},404);
    f.app.db.db.exec("CREATE TRIGGER reject_withdrawal_audit BEFORE INSERT ON audit_logs WHEN NEW.action='SKILL_WITHDRAWN' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
    await f.request(withdrawUrl,candidate.cookie,'DELETE',{},500);
    assert.deepEqual(new ProfileService(f.app.db).profile(candidate.id),own);
    assert.deepEqual(await f.request('/api/faro/profile/preview',candidate.cookie),preview);
    f.app.db.db.exec('DROP TRIGGER reject_withdrawal_audit');
    await f.request(withdrawUrl, candidate.cookie, 'DELETE');
    assert.equal(new ProfileService(f.app.db).projection(candidate.id).skillClaims.length, 0);
    await f.request(withdrawUrl,candidate.cookie,'DELETE',{},404);
    const history=f.app.db.db.prepare('SELECT version,confirmed_at,revoked_at FROM faro_claims WHERE id=?').get(claimId);
    assert.equal(history!.version,1);assert.equal(history!.confirmed_at,own.claims[0]!.confirmedAt);assert.ok(history!.revoked_at);
    const audit=f.app.db.db.prepare("SELECT entity_id,metadata FROM audit_logs WHERE user_id=? AND action='SKILL_WITHDRAWN'").all(candidate.id);
    assert.deepEqual(audit.map(a=>({...a})),[{entity_id:claimId,metadata:'{}'}]);
  } finally { await f.close(); }
});

test('organization verification and membership are server scoped, invites expire and revocation applies immediately', async () => {
  const f = await faroFixture();
  try {
    const owner = await f.user('Owner'), outsider = await f.user('Other'), recruit = await f.user('Recruit');
    const org = await f.request<{ id: string; verification: string }>('/api/faro/organizations', owner.cookie, 'POST', { name: 'Firma A' }, 201);
    assert.equal(org.verification, 'PENDING');
    await f.request(`/api/faro/organizations/${org.id}/verify`, owner.cookie, 'POST', { note: 'Potwierdzone prawo reprezentacji' }, 403);
    await f.request(`/api/faro/organizations/${org.id}/invites`, outsider.cookie, 'POST', { email: recruit.email, role: 'RECRUITER' }, 404);
    const invitation = await f.request<{ token: string }>(`/api/faro/organizations/${org.id}/invites`, owner.cookie, 'POST', { email: recruit.email, role: 'RECRUITER' }, 201);
    await f.request('/api/faro/invites/accept', outsider.cookie, 'POST', { token: invitation.token }, 404);
    await f.request('/api/faro/invites/accept', recruit.cookie, 'POST', { token: invitation.token });
    await f.request('/api/faro/invites/accept', recruit.cookie, 'POST', { token: invitation.token }, 404);
    assert.equal((await f.request<{ organizations: unknown[] }>('/api/faro/organizations', recruit.cookie)).organizations.length, 1);
    await f.request(`/api/faro/organizations/${org.id}/members/${recruit.id}`, owner.cookie, 'DELETE');
    assert.equal((await f.request<{ organizations: unknown[] }>('/api/faro/organizations', recruit.cookie)).organizations.length, 0);
    await f.request(`/api/faro/organizations/${org.id}/members/${owner.id}`, owner.cookie, 'DELETE', {}, 409);
  } finally { await f.close(); }
});

test('organization verification and private moderation require independence even after affiliation is revoked; verification cannot bypass restrictions',async()=>{
  const f=await faroFixture();try {
    const owner=await f.user('Owner'),former=await f.user('Former'),admin=await f.user('Independent');
    const profiles=new ProfileService(f.app.db),org=profiles.organization(owner.id,{name:'Niezależnie weryfikowana firma'});
    const invite=profiles.invite(owner.id,org.id,{email:former.email,role:'ADMIN'});profiles.acceptInvite(former.id,former.email,invite.token);
    for(const u of [owner,former,admin])f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(u.id);
    const url=`/api/faro/organizations/${org.id}/verify`,note='Sprawdzone prawo reprezentacji firmy';
    await f.request(url,owner.cookie,'POST',{note},409);await f.request(url,former.cookie,'POST',{note},409);
    profiles.revokeMember(owner.id,org.id,former.id);
    await f.request(url,former.cookie,'POST',{note},409);
    assert.equal((profiles.organizations(owner.id)[0] as {verification:string}).verification,'PENDING');
    await f.request(url,admin.cookie,'POST',{note});
    f.app.db.db.prepare("UPDATE faro_organizations SET verification='RESTRICTED' WHERE id=?").run(org.id);
    await f.request(url,admin.cookie,'POST',{note},409);
    assert.equal((profiles.organizations(owner.id)[0] as {verification:string}).verification,'RESTRICTED');
    const caseId='independence-case';
    f.app.db.db.prepare("INSERT INTO faro_cases(id,organization_id,kind,statement,created_at) VALUES(?,?,'STALE_OFFER',?,?)").run(caseId,org.id,'PRIVATE_MODERATION_EVIDENCE',new Date().toISOString());
    const formerCases=await f.request<{cases:Array<{id:string}>}>('/api/faro/cases',former.cookie);assert.equal(formerCases.cases.length,0);
    const ownerCases=await f.request<{cases:Array<{canModerate:boolean;statement:unknown}>}>('/api/faro/cases',owner.cookie);
    assert.equal(ownerCases.cases[0]!.canModerate,false);assert.equal(ownerCases.cases[0]!.statement,null);
    const reviewUrl=`/api/faro/cases/${caseId}/review`,review={state:'EVIDENCE_REVIEW',decision:'Niezależny przegląd sygnału',reviewAt:new Date().toISOString(),expectedVersion:1,idempotencyKey:'conflict-review'};
    await f.request(reviewUrl,former.cookie,'POST',review,409);await f.request(reviewUrl,owner.cookie,'POST',review,409);
    assert.equal((f.app.db.db.prepare('SELECT revision FROM faro_cases WHERE id=?').get(caseId) as {revision:number}).revision,1);
    const independent=await f.request<{cases:Array<{canModerate:boolean;statement:unknown}>}>('/api/faro/cases',admin.cookie);
    assert.equal(independent.cases[0]!.canModerate,true);assert.equal(independent.cases[0]!.statement,'PRIVATE_MODERATION_EVIDENCE');
    await f.request(reviewUrl,admin.cookie,'POST',review);
    assert.equal((f.app.db.db.prepare('SELECT revision FROM faro_cases WHERE id=?').get(caseId) as {revision:number}).revision,2);
  }finally{await f.close();}
});

test('membership revocation and audit roll back together at the real API boundary',async()=>{
  const f=await faroFixture();try{
    const owner=await f.user('AtomicOwner'),member=await f.user('AtomicMember'),profiles=new ProfileService(f.app.db),org=profiles.organization(owner.id,{name:'Atomic organization'});
    const invite=profiles.invite(owner.id,org.id,{email:member.email,role:'RECRUITER'});profiles.acceptInvite(member.id,member.email,invite.token);
    f.app.db.db.exec("CREATE TRIGGER reject_membership_audit BEFORE INSERT ON audit_logs WHEN NEW.action='MEMBERSHIP_REVOKED' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
    await f.request(`/api/faro/organizations/${org.id}/members/${member.id}`,owner.cookie,'DELETE',undefined,500);
    assert.equal(profiles.member(member.id,org.id).role,'RECRUITER');assert.equal((f.app.db.db.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='MEMBERSHIP_REVOKED' AND entity_id=?").get(org.id) as {n:number}).n,0);
    f.app.db.db.exec('DROP TRIGGER reject_membership_audit');
    await f.request(`/api/faro/organizations/${org.id}/members/${member.id}`,owner.cookie,'DELETE');
    assert.equal(profiles.organizations(member.id).length,0);assert.equal(profiles.affiliated(member.id,org.id),true);
    assert.equal((f.app.db.db.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='MEMBERSHIP_REVOKED' AND entity_id=?").get(org.id) as {n:number}).n,1);
  }finally{await f.close();}
});
