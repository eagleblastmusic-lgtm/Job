import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { tickOffersAndProcesses,tickNativeWorker } from '../dist/server/faro/trustTickModel.js';
import { FaroWorker } from '../dist/server/faro/worker.js';
import { clientFromEnvironment,identifier } from './faro-postgres-rehearsal.mjs';

export async function proveNativeWorker(db,schema,ownerId,templateOfferId,asOf){
 const candidateId=randomUUID(),org=randomUUID(),stale=randomUUID(),closing=randomUUID(),upcoming=randomUUID(),process=randomUUID(),processCandidate=randomUUID(),hour=3600000,deadline=new Date(Date.parse(asOf)+12*hour).toISOString(),past=new Date(Date.parse(asOf)-hour).toISOString(),future=new Date(Date.parse(asOf)+30*86400000).toISOString();
 await db.query("INSERT INTO users(id,email,password_hash,name,created_at,updated_at) SELECT $1,$2,password_hash,'Synthetic timed candidate',$3,$3 FROM users WHERE id=$4",[candidateId,`${candidateId}@example.invalid`,asOf,ownerId]);
 await db.query("INSERT INTO faro_organizations(id,name,verification,created_at) VALUES($1,'Synthetic timed organization','VERIFIED',$2)",[org,asOf]);
 await db.query("INSERT INTO faro_members(organization_id,user_id,role) VALUES($1,$2,'OWNER')",[org,ownerId]);
 for(const [id,closesAt,confirmedUntil] of [[stale,future,past],[closing,past,past],[upcoming,deadline,future]]){
  await db.query("INSERT INTO faro_offers(id,organization_id,status,current_version,confirmed_until,created_at) VALUES($1,$2,'PUBLISHED',1,$3,$4)",[id,org,confirmedUntil,asOf]);
  await db.query("INSERT INTO faro_offer_versions(offer_id,version,content,author_id,created_at,publication_proof) SELECT $1,1,jsonb_set(content::jsonb,'{closesAt}',to_jsonb($2::text))::text,$3,$4,'EXPLICIT' FROM faro_offer_versions WHERE offer_id=$5 AND version=1",[id,closesAt,ownerId,asOf,templateOfferId]);
  await db.query('INSERT INTO faro_assignments(offer_id,user_id) VALUES($1,$2)',[id,ownerId]);
  await db.query('INSERT INTO faro_watches(candidate_id,offer_id,alerts,created_at) VALUES($1,$2,1,$3)',[candidateId,id,asOf]);
 }
 // First duplicate closesAt and last published version, never the unpublished current draft, govern closing.
 await db.query("UPDATE faro_offer_versions SET content='{\"closesAt\":' || to_json($1::text)::text || ',' || substr(jsonb_set(content::jsonb,'{closesAt}',to_jsonb($2::text))::text,2) WHERE offer_id=$3",[past,future,closing]);
 await db.query("INSERT INTO faro_offer_versions(offer_id,version,content,author_id,created_at) SELECT offer_id,2,jsonb_set(content::jsonb,'{closesAt}',to_jsonb($1::text))::text,author_id,created_at FROM faro_offer_versions WHERE offer_id=$2 AND version=1",[future,closing]);await db.query('UPDATE faro_offers SET current_version=2 WHERE id=$1',[closing]);
 await db.query("INSERT INTO faro_interests(id,candidate_id,offer_id,offer_version,snapshot,status,stage,response_due_at,stage_due_at,first_response_at,created_at) VALUES($1,$2,$3,1,'{}','ACTIVE','ACCEPTED_TO_NEXT_STAGE',$4,$4,$5,$5),($6,$2,$7,1,'{}','ACTIVE','CLARIFICATION_REQUESTED',$8,$8,$5,$5)",[process,candidateId,stale,past,asOf,processCandidate,upcoming,deadline]);
 const read=async(text,values=[])=>(await db.readBatch([{text,values}]))[0]??[],state=()=>read('SELECT id,status,revision FROM faro_offers WHERE organization_id=$1 ORDER BY id',[org]);
 const before=await state();await assert.rejects(()=>tickOffersAndProcesses(db,asOf,()=>{throw new Error('WORKER_AUTHORITY_REFUSED');}),/WORKER_AUTHORITY_REFUSED/);assert.deepEqual(await state(),before);
 await db.query("ALTER TABLE faro_outbox ADD CONSTRAINT pg_tick_guard CHECK(entity_id<>'"+closing+"') NOT VALID");
 await assert.rejects(()=>tickOffersAndProcesses(db,asOf,()=>{}),error=>error.code==='23514');assert.deepEqual(await state(),before);assert.equal((await read("SELECT COUNT(*) n FROM faro_cases WHERE organization_id=$1 AND kind='STALE_OFFER'",[org]))[0].n,0);
 await db.query('ALTER TABLE faro_outbox DROP CONSTRAINT pg_tick_guard');
 const second=clientFromEnvironment();await second.connect();try{await second.query(`SET search_path TO ${identifier(schema)}`);await Promise.all([tickOffersAndProcesses(db,asOf,()=>{}),tickOffersAndProcesses(second,asOf,()=>{})]);}finally{await second.end();}
 const rows=await state();assert.equal(rows.find(row=>row.id===stale).status,'PAUSED');assert.equal(rows.find(row=>row.id===closing).status,'CLOSED');assert.equal(rows.find(row=>row.id===closing).revision,3);assert.equal(rows.find(row=>row.id===upcoming).status,'PUBLISHED');
 assert.equal((await read("SELECT COUNT(*) n FROM faro_cases WHERE organization_id=$1 AND kind='STALE_OFFER'",[org]))[0].n,2);
 const notifications=await read('SELECT recipient_id,entity_id,dedupe_key,message FROM faro_outbox WHERE entity_id IN ($1,$2,$3,$4) ORDER BY dedupe_key',[closing,upcoming,process,processCandidate]);assert.equal(notifications.length,4);assert.ok(notifications.some(row=>row.entity_id===process&&row.recipient_id===ownerId));assert.ok(notifications.some(row=>row.entity_id===processCandidate&&row.recipient_id===candidateId));assert.equal(notifications.filter(row=>row.dedupe_key.endsWith(':closing-soon')).length,1);
 // A replacement scheduler drains committed outbox and repeats without duplicating any delivered effect.
 const worker=new FaroWorker(()=>tickNativeWorker(db,asOf,()=>{}).then(()=>undefined),false,1000);assert.equal(await worker.run(),true);await worker.idle();worker.stop();const replacement=new FaroWorker(()=>tickNativeWorker(db,asOf,()=>{}).then(()=>undefined),false,1000);assert.equal(await replacement.run(),true);await replacement.idle();for(let batch=0;batch<20&&(await read("SELECT COUNT(*) n FROM faro_outbox WHERE status='PENDING' AND entity_id IN ($1,$2,$3,$4)",[closing,upcoming,process,processCandidate]))[0].n>0;batch++)assert.equal(await replacement.run(),true);replacement.stop();
 assert.equal((await read('SELECT COUNT(*) n FROM notifications WHERE entity_id IN ($1,$2,$3,$4)',[closing,upcoming,process,processCandidate]))[0].n,4);assert.deepEqual(await state(),rows);
}
