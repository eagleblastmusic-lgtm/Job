import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import { eraseAccount } from '../dist/server/faro/privacyErasureModel.js';
import { transferOrganizationOwner } from '../dist/server/faro/privacyReadModel.js';
import { requireIdentityOwned } from '../dist/server/faro/identityAccessModel.js';

/** Disposable native-only records: no source mutation or dependency on preceding scenario state. */
export async function proveNativeErasure(db,templateUserId,templateOfferId,templateAssessmentId,asOf){
 const owner=randomUUID(),successor=randomUUID(),candidate=randomUUID(),stranger=randomUUID(),org=randomUUID(),offer=randomUUID(),process=randomUUID(),attempt=randomUUID(),meeting=randomUUID(),caseId=randomUUID();
 const token=id=>`pg-erasure-${id}`,body={confirmation:'USUŃ KONTO',password:'Bezpieczne123'};
 for(const id of [owner,successor,candidate,stranger]){
  await db.query("INSERT INTO users(id,email,password_hash,name,created_at,updated_at) SELECT $1,$2,password_hash,'Synthetic erasure account',$3,$3 FROM users WHERE id=$4",[id,`${id}@example.invalid`,asOf,templateUserId]);
  await db.query("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES($1,$2,'2030-01-01T00:00:00.000Z',$3)",[token(id),id,asOf]);
 }
 await db.query("INSERT INTO faro_organizations(id,name,verification,created_at) VALUES($1,'Synthetic erasure organization','VERIFIED',$2)",[org,asOf]);
 await db.query("INSERT INTO faro_members(organization_id,user_id,role) VALUES($1,$2,'OWNER'),($1,$3,'RECRUITER')",[org,owner,successor]);
 await db.query("INSERT INTO faro_offers(id,organization_id,status,created_at) VALUES($1,$2,'PUBLISHED',$3)",[offer,org,asOf]);
 await db.query("INSERT INTO faro_offer_versions(offer_id,version,content,author_id,created_at) SELECT $1,1,jsonb_set(content::jsonb,'{recruiterId}',to_jsonb($2::text))::text,$2,$3 FROM faro_offer_versions WHERE offer_id=$4 AND version=1",[offer,owner,asOf,templateOfferId]);
 await db.query('INSERT INTO faro_assignments(offer_id,user_id) VALUES($1,$2),($1,$3)',[offer,owner,successor]);
 await db.query("INSERT INTO faro_interests(id,candidate_id,offer_id,offer_version,snapshot,status,stage,response_due_at,stage_due_at,next_action,created_at) VALUES($1,$2,$3,1,'{}','ACTIVE','INTERVIEW_CONFIRMED',$4,$4,'Synthetic meeting',$4)",[process,candidate,offer,asOf]);
 await db.query('INSERT INTO faro_contact_grants(process_id,candidate_id,organization_id,granted_at) VALUES($1,$2,$3,$4)',[process,candidate,org,asOf]);
 await db.query("INSERT INTO faro_attempts(id,process_id,assessment_id,assessment_version,state,deadline) VALUES($1,$2,$3,1,'INVITED',$4)",[attempt,process,templateAssessmentId,asOf]);
 await db.query("INSERT INTO faro_interviews(id,process_id,recruiter_id,state,starts_at,ends_at,confirm_by,timezone,location,created_at) VALUES($1,$2,$3,'CONFIRMED',$4,$5,$4,'Europe/Warsaw','Synthetic room',$4)",[meeting,process,owner,asOf,new Date(Date.parse(asOf)+3600000).toISOString()]);
 await db.query("INSERT INTO faro_cases(id,organization_id,process_id,reporter_id,kind,statement,appeal,decision,created_at) VALUES($1,$2,$3,$4,'PROCESS','Private candidate statement','Private appeal','Private decision',$5)",[caseId,org,process,candidate,asOf]);
 await db.query("INSERT INTO faro_case_explanations(id,case_id,user_id,participant,statement,created_at) VALUES($1,$2,$3,'EMPLOYER','Private employer statement',$4)",[randomUUID(),caseId,successor,asOf]);
 await db.query("INSERT INTO faro_outbox(id,recipient_id,entity_type,entity_id,message,dedupe_key,next_attempt_at) VALUES($1,$2,'process',$3,'Synthetic delivery',$1,$4)",[randomUUID(),successor,process,asOf]);
 const scalar=async(text,values)=>(await db.readBatch([{text,values}]))[0]?.[0];
 const erase=(id,request=body)=>eraseAccount(db,token(id),request,asOf,false,true);
 await assert.rejects(()=>eraseAccount(db,'unknown',body,asOf,false,true),error=>error.code==='UNAUTHENTICATED');
 await assert.rejects(()=>erase(owner,{...body,confirmation:'no'}),error=>error.status===400);
 await assert.rejects(()=>erase(owner,{...body,password:'WrongPassword123'}),error=>error.code==='REAUTH_FAILED');
 assert.equal((await scalar("SELECT COUNT(*) n FROM audit_logs WHERE user_id=$1 AND action='ACCOUNT_DELETION_REAUTH_FAILED'",[owner])).n,1);
 await db.query("INSERT INTO faro_mfa(user_id,active_cipher,activated_at) VALUES($1,'synthetic-encrypted-state',$2)",[owner,asOf]);
 await assert.rejects(()=>erase(owner),error=>error.code==='MFA_REQUIRED');
 await db.query('DELETE FROM faro_mfa WHERE user_id=$1',[owner]);
 await assert.rejects(()=>erase(owner),error=>error.code==='OWNERSHIP_TRANSFER_REQUIRED');
 await transferOrganizationOwner(db,owner,org,successor,asOf,()=>requireIdentityOwned(db,token(owner),asOf,false,true));
 // Imported SQLite JSON keeps the first duplicate field; PostgreSQL must pause the same offer.
 await db.query("UPDATE faro_offer_versions SET content='{\"recruiterId\":' || to_json($1::text)::text || ',' || substr(jsonb_set(content::jsonb,'{recruiterId}',to_jsonb($2::text))::text,2) WHERE offer_id=$3",[owner,successor,offer]);
 // Last write fails: cancellation, role-preserving intake pause, audit and tombstone all roll back.
 await db.query("ALTER TABLE faro_erasure_log ADD CONSTRAINT pg_erasure_guard CHECK(policy_version<>'local-erasure-v1') NOT VALID");
 const before=await scalar('SELECT status,stage,revision FROM faro_interests WHERE id=$1',[process]);
 await assert.rejects(()=>erase(owner),error=>error.code==='23514');
 assert.deepEqual(await scalar('SELECT status,stage,revision FROM faro_interests WHERE id=$1',[process]),before);
 assert.equal((await scalar('SELECT state FROM faro_interviews WHERE id=$1',[meeting])).state,'CONFIRMED');
 assert.equal((await scalar('SELECT status FROM faro_offers WHERE id=$1',[offer])).status,'PUBLISHED');
 assert.ok(await scalar('SELECT id FROM users WHERE id=$1',[owner]));
 await db.query('ALTER TABLE faro_erasure_log DROP CONSTRAINT pg_erasure_guard');
 assert.deepEqual(await erase(owner),{ok:true});
 assert.equal((await scalar('SELECT status FROM faro_offers WHERE id=$1',[offer])).status,'PAUSED');
 assert.equal((await scalar('SELECT state,recruiter_id FROM faro_interviews WHERE id=$1',[meeting])).state,'CANCELLED');
 assert.equal((await scalar('SELECT status,stage FROM faro_interests WHERE id=$1',[process])).stage,'ACCEPTED_TO_NEXT_STAGE');
 assert.equal((await scalar('SELECT status FROM faro_interests WHERE id=$1',[process])).status,'ACTIVE');
 assert.equal((await scalar('SELECT role FROM faro_members WHERE organization_id=$1 AND user_id=$2',[org,successor])).role,'OWNER');
 // Sole successor closure preserves candidate data and withdraws obligations.
 assert.deepEqual(await erase(successor),{ok:true});
 assert.equal((await scalar('SELECT status FROM faro_offers WHERE id=$1',[offer])).status,'CLOSED');
 assert.equal((await scalar('SELECT verification FROM faro_organizations WHERE id=$1',[org])).verification,'RESTRICTED');
 assert.equal((await scalar('SELECT status FROM faro_interests WHERE id=$1',[process])).status,'CANCELLED');
 assert.equal((await scalar('SELECT state FROM faro_attempts WHERE id=$1',[attempt])).state,'WITHDRAWN');
 assert.equal((await scalar('SELECT revoked_at FROM faro_contact_grants WHERE process_id=$1',[process])).revoked_at,asOf);
 assert.ok(await scalar('SELECT id FROM users WHERE id=$1',[candidate]));
 // Use the unrelated surviving account as recipient to prove process-derived delivery cleanup.
 await db.query("INSERT INTO faro_outbox(id,recipient_id,entity_type,entity_id,message,dedupe_key,next_attempt_at) VALUES($1,$2,'process',$3,'Synthetic delivery',$1,$4)",[randomUUID(),stranger,process,asOf]);
 await db.query("INSERT INTO notifications(id,user_id,entity_type,entity_id,message,created_at) VALUES($1,$2,'process',$3,'Synthetic inbox',$4)",[randomUUID(),stranger,process,asOf]);
 await db.query("INSERT INTO faro_case_explanations(id,case_id,user_id,participant,statement,created_at) VALUES($1,$2,$3,'EMPLOYER','Private surviving statement',$4)",[randomUUID(),caseId,stranger,asOf]);
 await db.query("ALTER TABLE faro_erasure_log ADD CONSTRAINT pg_erasure_guard CHECK(policy_version<>'local-erasure-v1') NOT VALID");
 await assert.rejects(()=>erase(candidate),error=>error.code==='23514');
 assert.equal((await scalar('SELECT statement FROM faro_cases WHERE id=$1',[caseId])).statement,'Private candidate statement');
 assert.ok(await scalar('SELECT id FROM faro_interests WHERE id=$1',[process]));
 assert.equal((await scalar("SELECT COUNT(*) n FROM faro_outbox WHERE entity_type='process' AND entity_id=$1",[process])).n>0,true);
 await db.query('ALTER TABLE faro_erasure_log DROP CONSTRAINT pg_erasure_guard');
 assert.deepEqual(await erase(candidate),{ok:true});
 assert.equal(await scalar('SELECT id FROM faro_interests WHERE id=$1',[process]),undefined);
 assert.deepEqual(await scalar('SELECT statement,appeal,decision,process_id,reporter_id FROM faro_cases WHERE id=$1',[caseId]),{statement:'Treść usunięta w ramach realizacji prawa do danych.',appeal:null,decision:null,process_id:null,reporter_id:null});
 assert.equal((await scalar('SELECT statement FROM faro_case_explanations WHERE case_id=$1',[caseId])).statement,'Treść usunięta w ramach realizacji prawa do danych.');
 for(const table of ['faro_outbox','notifications'])assert.equal((await scalar(`SELECT COUNT(*) n FROM ${table} WHERE entity_type='process' AND entity_id=$1`,[process])).n,0);
 for(const id of [owner,successor,candidate]){assert.equal(await scalar('SELECT id FROM users WHERE id=$1',[id]),undefined);assert.equal(await scalar('SELECT token_hash FROM sessions WHERE user_id=$1',[id]),undefined);assert.deepEqual(await scalar('SELECT erased_at,policy_version FROM faro_erasure_log WHERE subject_hash=$1',[createHash('sha256').update(id).digest('hex')]),{erased_at:asOf,policy_version:'local-erasure-v1'});}
 assert.ok(await scalar('SELECT id FROM users WHERE id=$1',[stranger]));
 await assert.rejects(()=>erase(candidate),error=>error.code==='UNAUTHENTICATED');
}
