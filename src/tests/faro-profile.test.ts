import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture } from './faro-fixture.js';
import { ProfileService } from '../server/faro/profileService.js';
import { employerProjection } from '../domain/faro/skills.js';

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
    await f.request(`/api/faro/claims/${own.claims[0]!.id}`, candidate.cookie, 'DELETE');
    assert.equal(new ProfileService(f.app.db).projection(candidate.id).skillClaims.length, 0);
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
