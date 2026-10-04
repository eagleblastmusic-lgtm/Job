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
