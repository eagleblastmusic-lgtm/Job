import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture,offerInput } from './faro-fixture.js';
import { ProfileService } from '../server/faro/profileService.js';
import { OfferService } from '../server/faro/offerService.js';
import { RecruitmentService } from '../server/faro/recruitmentService.js';
import { TrustService } from '../server/faro/trustService.js';
async function setup() {
  const f=await faroFixture(),owner=await f.user('RestrictionOwner'),candidate=await f.user('RestrictionCandidate'),moderator=await f.user('RestrictionModerator');
  f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(moderator.id);
  const p=new ProfileService(f.app.db),o=new OfferService(f.app.db),r=new RecruitmentService(f.app.db),t=new TrustService(f.app.db);
  const org=p.organization(owner.id,{name:'Syntetyczna organizacja ograniczeń'});p.verify(moderator.id,org.id,'Sprawdzenie syntetycznej organizacji.');
  p.save(candidate.id,{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
  const offer=o.create(owner.id,org.id,offerInput(owner.id));o.lifecycle(owner.id,offer.id,{action:'REVIEW',expectedVersion:1});o.lifecycle(owner.id,offer.id,{action:'PUBLISH',expectedVersion:2,confirmed:true});
  const process=r.interest(candidate.id,offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:p.previewConfirmation(candidate.id).confirmationToken,idempotencyKey:'restriction-interest'});
  const restrict=(key:string)=>{
    const report=t.report(candidate.id,process.id,{kind:'PROCESS',statement:'Prywatny opis zgłaszającego nie trafia do organizacji.',idempotencyKey:key});
    t.review(moderator.id,report.id,{state:'EVIDENCE_REVIEW',decision:'Sprawdzenie syntetycznych dowodów.',reviewAt:new Date(Date.now()+86400000).toISOString(),expectedVersion:1,idempotencyKey:`${key}-review`});
    t.review(moderator.id,report.id,{state:'ACTION',decision:'Prywatne dowody nie są treścią ograniczenia.',decisionCode:'PROCESS_VIOLATION_CONFIRMED',reviewAt:new Date(Date.now()+86400000).toISOString(),restrict:true,restorationCondition:'Sprawdzenie usunięcia naruszenia w ręcznym review.',expectedVersion:2,idempotencyKey:`${key}-action`});
    return t.restrictions(owner.id,org.id).find(row=>row.state==='ACTIVE')!;
  };
  return {...f,owner,candidate,moderator,p,o,r,t,org,offer,process,restrict};
}
test('restriction appeal and independent restoration retain history, guard scope/replay and cannot clear another restriction or republish',async()=>{
  const f=await setup();try {
    const one=f.restrict('restriction-one'),two=f.restrict('restriction-two');assert.notEqual(one.id,two.id);
    const listPath=`/api/faro/organizations/${f.org.id}/restrictions`;
    await f.request(listPath,f.candidate.cookie,'GET',undefined,404);
    const own=await f.request<{restrictions:ReturnType<TrustService['restrictions']>}>(listPath,f.owner.cookie);
    assert.equal(own.restrictions.length,2);assert.doesNotMatch(JSON.stringify(own),/Prywatny opis|Prywatne dowody|reporter_id|source_case_id|restored_by/);
    const appeal={expectedVersion:1,idempotencyKey:'restriction-appeal',reason:'Naprawiono proces. Prosimy o niezależny przegląd.'};
    const path=`/api/faro/restrictions/${one.id}`;
    await f.request(`${path}/appeal`,f.candidate.cookie,'POST',appeal,404);
    f.app.db.db.exec("CREATE TRIGGER restriction_appeal_guard BEFORE INSERT ON audit_logs WHEN NEW.action='RESTRICTION_APPEALED' BEGIN SELECT RAISE(ABORT,'restriction appeal audit failed'); END");
    await f.request(`${path}/appeal`,f.owner.cookie,'POST',appeal,500);assert.equal(f.app.db.db.prepare('SELECT revision FROM faro_restrictions WHERE id=?').get(one.id)?.revision,1);assert.equal(f.app.db.db.prepare('SELECT appeal FROM faro_restrictions WHERE id=?').get(one.id)?.appeal,null);assert.equal(f.app.db.db.prepare('SELECT command_key FROM faro_commands WHERE user_id=? AND command_key=?').get(f.owner.id,appeal.idempotencyKey),undefined);f.app.db.db.exec('DROP TRIGGER restriction_appeal_guard');
    const ack=await f.request(`${path}/appeal`,f.owner.cookie,'POST',appeal);assert.deepEqual(await f.request(`${path}/appeal`,f.owner.cookie,'POST',appeal),ack);
    await f.request(`${path}/appeal`,f.owner.cookie,'POST',{...appeal,reason:'Zmiana tej samej operacji odwołania.'},409);
    const restore={expectedVersion:2,idempotencyKey:'restriction-restore',confirmed:true,reason:'Warunki sprawdzono niezależnie; kończymy to ograniczenie.'};
    await f.request(`${path}/restore`,f.owner.cookie,'POST',restore,403);
    f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(f.owner.id);await f.request(`${path}/restore`,f.owner.cookie,'POST',restore,403);
    const sourceCase=f.app.db.db.prepare('SELECT source_case_id FROM faro_restrictions WHERE id=?').get(one.id)!.source_case_id;
    f.app.db.db.prepare('DELETE FROM faro_cases WHERE id=?').run(sourceCase!);
    assert.equal(f.app.db.db.prepare('SELECT source_case_id FROM faro_restrictions WHERE id=?').get(one.id)!.source_case_id,null);
    f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(f.candidate.id);await f.request(`${path}/restore`,f.candidate.cookie,'POST',restore,403);await f.request(listPath,f.candidate.cookie,'GET',undefined,404);
    await f.request(`${path}/restore`,f.moderator.cookie,'POST',{...restore,expectedVersion:1},409);
    await f.request(`${path}/restore`,f.moderator.cookie,'POST',{...restore,confirmed:false},400);
    f.app.db.db.exec("CREATE TRIGGER restriction_restore_guard BEFORE INSERT ON audit_logs WHEN NEW.action='RESTRICTION_RESTORED' BEGIN SELECT RAISE(ABORT,'restriction restore audit failed'); END");
    await f.request(`${path}/restore`,f.moderator.cookie,'POST',restore,500);assert.equal(f.app.db.db.prepare('SELECT state,revision FROM faro_restrictions WHERE id=?').get(one.id)?.state,'ACTIVE');assert.equal(f.app.db.db.prepare('SELECT revision FROM faro_restrictions WHERE id=?').get(one.id)?.revision,2);assert.equal(f.app.db.db.prepare('SELECT command_key FROM faro_commands WHERE user_id=? AND command_key=?').get(f.moderator.id,restore.idempotencyKey),undefined);f.app.db.db.exec('DROP TRIGGER restriction_restore_guard');
    const restored=await f.request(`${path}/restore`,f.moderator.cookie,'POST',restore);assert.deepEqual(await f.request(`${path}/restore`,f.moderator.cookie,'POST',restore),restored);
    assert.equal(f.app.db.db.prepare('SELECT verification FROM faro_organizations WHERE id=?').get(f.org.id)!.verification,'RESTRICTED');
    await f.request(`/api/faro/restrictions/${two.id}/restore`,f.moderator.cookie,'POST',{...restore,expectedVersion:1,idempotencyKey:'restriction-restore-two'});
    assert.equal(f.app.db.db.prepare('SELECT verification FROM faro_organizations WHERE id=?').get(f.org.id)!.verification,'PENDING');assert.equal(f.o.get(f.offer.id).status,'PAUSED');
    assert.equal(f.r.row(f.process.id).status,'INTERESTED');assert.equal(f.r.row(f.process.id).revision,1);
    assert.equal(f.t.restrictions(f.owner.id,f.org.id).filter(row=>row.state==='RESTORED').length,2);
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='RESTRICTION_RESTORED'").get()!.n,2);
    f.app.db.db.prepare("UPDATE users SET role='USER' WHERE id=?").run(f.moderator.id);await f.request(`${path}/restore`,f.moderator.cookie,'POST',restore,403);
    const exported=await f.request<{faro:{faro_restriction_appeals:Array<{appeal:string}>}}>('/api/export',f.owner.cookie);assert.equal(exported.faro.faro_restriction_appeals[0]!.appeal,appeal.reason);
    const successor=await f.user('RestrictionSuccessor');const invite=f.p.invite(f.owner.id,f.org.id,{email:successor.email,role:'ADMIN'});f.p.acceptInvite(successor.id,successor.email,invite.token);
    f.app.db.db.prepare("UPDATE faro_members SET role='ADMIN' WHERE organization_id=? AND user_id=?").run(f.org.id,f.owner.id);f.app.db.db.prepare("UPDATE faro_members SET role='OWNER' WHERE organization_id=? AND user_id=?").run(f.org.id,successor.id);
    await f.request('/api/account',f.owner.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});assert.equal(f.app.db.db.prepare('SELECT appeal FROM faro_restrictions WHERE id=?').get(one.id)!.appeal,null);assert.deepEqual(f.app.db.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{await f.close();}
});
