import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture,offerInput } from './faro-fixture.js';
import { ProfileService } from '../server/faro/profileService.js';
import { OfferService } from '../server/faro/offerService.js';
import { RecruitmentService } from '../server/faro/recruitmentService.js';
import { TrustService } from '../server/faro/trustService.js';

test('moderation read audit failure returns no private report and retry preserves participant masking',async()=>{
 const f=await faroFixture();try{
  const owner=await f.user('ReadOwner'),candidate=await f.user('ReadCandidate'),moderator=await f.user('ReadModerator'),profiles=new ProfileService(f.app.db),offers=new OfferService(f.app.db),org=profiles.organization(owner.id,{name:'Read organization'});
  f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(moderator.id);f.app.db.db.prepare("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=?").run(org.id);
  profiles.save(candidate.id,{firstName:'Test',availability:{kind:'IMMEDIATE'},expectedVersion:0});const offer=offers.create(owner.id,org.id,offerInput(owner.id));offers.lifecycle(owner.id,offer.id,{action:'REVIEW',expectedVersion:1});offers.lifecycle(owner.id,offer.id,{action:'PUBLISH',expectedVersion:2,confirmed:true});
  const process=new RecruitmentService(f.app.db).interest(candidate.id,offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:profiles.previewConfirmation(candidate.id).confirmationToken,idempotencyKey:'read-process'}),marker='Private report must never appear in an error';new TrustService(f.app.db).report(candidate.id,process.id,{kind:'PROCESS',statement:marker,idempotencyKey:'read-report'});
  f.app.db.db.exec("CREATE TRIGGER case_read_audit_guard BEFORE INSERT ON audit_logs WHEN NEW.action='MODERATION_CASES_READ' BEGIN SELECT RAISE(ABORT,'case read audit failed'); END");
  const failed=await f.request('/api/faro/cases',moderator.cookie,'GET',undefined,500);assert.equal(JSON.stringify(failed).includes(marker),false);
  f.app.db.db.exec('DROP TRIGGER case_read_audit_guard');
  const review=await f.request<{cases:Array<{statement:string;canModerate:boolean}>}>('/api/faro/cases',moderator.cookie);assert.ok(review.cases.some(row=>row.statement===marker&&row.canModerate));
  const employer=await f.request<{cases:unknown[]}>('/api/faro/cases',owner.cookie);assert.equal(employer.cases.length,0);
  const own=await f.request<{cases:Array<{statement:string;canModerate:boolean}>}>('/api/faro/cases',candidate.cookie);assert.ok(own.cases.some(row=>row.statement===marker&&!row.canModerate));
 }finally{await f.close();}
});
