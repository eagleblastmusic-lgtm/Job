import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {faroFixture,offerInput} from '../dist/tests/faro-fixture.js';
import {faroPgFixture} from '../dist/tests/faro-pg-fixture.js';
import {JobDatabase} from '../dist/server/db.js';
import {createPgFaroApp} from '../dist/server/pgFaroApp.js';
import {PgJobDatabase} from '../dist/server/postgresDb.js';
import {readRecoveryLedger} from '../dist/server/faro/recoveryReadModel.js';
import {extract,identifier} from './faro-postgres-rehearsal.mjs';
import {captureNativeSnapshot} from './faro-postgres-backup.mjs';
import {writeProtectedBackup} from './faro-backup-envelope.mjs';
import {restoreFaro} from './restore-faro.mjs';

const run=promisify(execFile),marker='FARO_AUDIT_001_SYNTHETIC_PRIVATE_OPEN_ANSWER';
const sqlAdapter=database=>({
  read:async(text,values=[])=>'readBatch' in database?(await database.readBatch([{text,values}]))[0]:database.db.prepare(text).all(Object.fromEntries(values.map((value,i)=>[`$${i+1}`,value]))),
  write:async(text,values=[])=>'query' in database?database.query(text,values):database.db.prepare(text).run(Object.fromEntries(values.map((value,i)=>[`$${i+1}`,value])))
});
async function assertNoPrivateCopies(db,native){
  const {read}=sqlAdapter(db),tables=await read(native?"SELECT table_name name FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE'":"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  for(const {name} of tables)assert.equal(JSON.stringify(await read(`SELECT * FROM ${identifier(name)}`)).includes(marker),false,`Private answer retained in ${name}`);
}

/** Real HTTP for both adapters; legacy payloads simulate data written by the audited binary. */
export async function proveCommandJournal({native=false,only='all'}={}){
  const f=native?await faroPgFixture():await faroFixture(),root=await mkdtemp(join(tmpdir(),'faro-journal-regression-'));
  f.app.config.appOrigin=f.base;
  const {read,write}=sqlAdapter(f.app.db);
  let recovered;
  try {
    const owner=await f.user('JournalOwner'),reviewer=await f.user('JournalReviewer'),candidate=await f.user('JournalCandidate');
    const org=await f.request('/api/faro/organizations',owner.cookie,'POST',{name:'Synthetic journal regression'},201);
    await write("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=$1",[org.id]);
    await write("INSERT INTO faro_members(organization_id,user_id,role) VALUES($1,$2,'RECRUITER')",[org.id,reviewer.id]);
    const offer=await f.request(`/api/faro/organizations/${org.id}/offers`,owner.cookie,'POST',offerInput(owner.id),201);
    await write('INSERT INTO faro_assignments(offer_id,user_id) VALUES($1,$2)',[offer.id,reviewer.id]);
    await f.request(`/api/faro/offers/${offer.id}/lifecycle`,owner.cookie,'POST',{action:'REVIEW',expectedVersion:1});
    await f.request(`/api/faro/offers/${offer.id}/lifecycle`,owner.cookie,'POST',{action:'PUBLISH',expectedVersion:2,confirmed:true});
    await f.request('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Anna',availability:{kind:'IMMEDIATE'},expectedVersion:0});
    const preview=await f.request('/api/faro/profile/preview-confirmation',candidate.cookie);
    const recruitment=await f.request(`/api/faro/offers/${offer.id}/interest`,candidate.cookie,'POST',{offerVersion:1,projectionConfirmed:true,confirmationToken:preview.confirmationToken,idempotencyKey:'journal-interest'},201);
    await f.request(`/api/faro/processes/${recruitment.id}/commands`,owner.cookie,'POST',{command:'ADVANCE',expectedVersion:1,nextAction:'Synthetic assessment',dueAt:new Date(Date.now()+86400000).toISOString(),idempotencyKey:'journal-advance'});
    const definition=await f.request(`/api/faro/offers/${offer.id}/assessments`,owner.cookie,'POST',{type:'OPEN_ANSWER',title:'Synthetic open answer',timeLimitMinutes:5,expectedMinutes:3,rubricVersion:'journal-r1',tasks:[{prompt:'Opisz kolejny krok.',evaluationCriteria:'0: brak; 1: krok; 2: krok i uzasadnienie.',points:2}]},201);
    for(const action of ['REVIEW','APPROVE'])await f.request(`/api/faro/assessments/${definition.id}/versions/1`,owner.cookie,'POST',{action,confirmed:true});
    const ack=await f.request(`/api/faro/processes/${recruitment.id}/assessment`,owner.cookie,'POST',{assessmentId:definition.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:'journal-assignment'},201),url=`/api/faro/attempts/${ack.id}`;
    const started=await f.request(url,candidate.cookie,'POST',{});
    const submitted=await f.request(url+'/submit',candidate.cookie,'POST',{expectedVersion:started.revision,answers:{'task-1':marker}});
    const finalize={expectedVersion:submitted.revision,processVersion:submitted.processVersion,confirmed:true,scores:{'task-1':2},note:'Synthetic pinned rubric review.',idempotencyKey:'journal-finalize'};
    const final=await f.request(url+'/review',owner.cookie,'POST',finalize);
    if(only!=='erasure') {
      const amended=await f.request(url+'/amend-result',reviewer.cookie,'POST',{expectedVersion:final.revision,processVersion:final.processVersion,confirmed:true,scores:{'task-1':1},reason:'Synthetic independent amendment.',idempotencyKey:'journal-amend'});
      const replay=await f.request(url+'/review',owner.cookie,'POST',finalize);
      assert.equal(replay.revision,amended.revision,'FARO-AUDIT-002: replay must project current revision');
      assert.equal(replay.result.earned,1);assert.equal(replay.resultHistory.length,2);assert.equal(replay.resultValidity,'VALID');
    }
    const beforeInvalidation=await f.request(url,reviewer.cookie),invalidate={expectedVersion:beforeInvalidation.revision,processVersion:beforeInvalidation.processVersion,confirmed:true,reasonCode:'AMBIGUOUS_TASK',reason:'Synthetic independent invalidation.',idempotencyKey:'journal-invalidate'};
    const invalid=await f.request(url+'/invalidate-result',reviewer.cookie,'POST',invalidate);
    if(only!=='erasure') {
      const effects=await read('SELECT kind,data FROM faro_events WHERE process_id=$1 ORDER BY id',[recruitment.id]),outbox=await read('SELECT id,dedupe_key FROM faro_outbox ORDER BY id');
      for(const [suffix,actor,body] of [['review',owner,finalize],['invalidate-result',reviewer,invalidate]]){
        const replay=await f.request(url+'/'+suffix,actor.cookie,'POST',body);
        assert.equal(replay.resultValidity,'INVALIDATED','FARO-AUDIT-002: replay must never resurrect VALID');assert.equal(replay.result,null);assert.equal(replay.revision,invalid.revision);assert.deepEqual(replay.resultHistory,invalid.resultHistory);
        await f.request(url+'/'+suffix,actor.cookie,'POST',{...body,confirmed:false},409);
      }
      assert.deepEqual(await read('SELECT kind,data FROM faro_events WHERE process_id=$1 ORDER BY id',[recruitment.id]),effects);assert.deepEqual(await read('SELECT id,dedupe_key FROM faro_outbox ORDER BY id'),outbox);
      await write('UPDATE faro_members SET active=0 WHERE organization_id=$1 AND user_id=$2',[org.id,reviewer.id]);
      await f.request(url+'/invalidate-result',reviewer.cookie,'POST',invalidate,404);
      await write('UPDATE faro_members SET active=1 WHERE organization_id=$1 AND user_id=$2',[org.id,reviewer.id]);
      await write('DELETE FROM faro_assignments WHERE offer_id=$1 AND user_id=$2',[offer.id,owner.id]);
      await f.request(url+'/review',owner.cookie,'POST',finalize,404);
      await write('INSERT INTO faro_assignments(offer_id,user_id) VALUES($1,$2)',[offer.id,owner.id]);
      console.log(`FARO_AUDIT_002_REPLAY_PASS backend=${native?'postgresql':'sqlite'} amend/invalidate/distinct-actors/current-authority/input-conflict/single-event-outbox`);
    }
    if(only==='replay')return;
    const journals=await read('SELECT user_id,command_key,input_hash,result,created_at FROM faro_commands ORDER BY user_id,command_key');
    for(const key of ['journal-finalize','journal-invalidate'])assert.deepEqual(JSON.parse(journals.find(row=>row.command_key===key).result),{id:ack.id},'FARO-AUDIT-001: only acknowledgement may be retained');
    const unrelated=journals.filter(row=>!['journal-finalize','journal-invalidate'].includes(row.command_key)&&row.user_id!==candidate.id);
    const seedLegacy=async()=>{
      await write('UPDATE faro_commands SET result=$1 WHERE command_key=$2',[JSON.stringify(final),'journal-finalize']);
      await write('UPDATE faro_commands SET result=$1 WHERE command_key=$2',[JSON.stringify(invalid),'journal-invalidate']);
      await write('INSERT INTO faro_commands(user_id,command_key,input_hash,result,created_at) VALUES($1,$2,$3,$4,$5)',[reviewer.id,'legacy-interview','preserved-hash',JSON.stringify({id:'synthetic-interview-id',processId:recruitment.id,state:'CONFIRMED',startsAt:started.serverNow,candidateCompleted:false,location:marker}),started.serverNow]);
    };
    await seedLegacy();
    // Real encrypted native backup / VACUUM INTO SQLite backup, before account erasure.
    const backup=join(root,'old-backup'),authority=join(root,'current-authority'),targetSchema='faro_rehearsal_journal_'+randomBytes(6).toString('hex'),key=randomBytes(32).toString('hex');
    if(native){
      const schema=(await read('SELECT current_schema() schema'))[0].schema,empty=join(root,'reviewed.sqlite'),db=new JobDatabase(empty);db.close();
      const snapshot=await captureNativeSnapshot(f.app.db,await extract(empty),schema,()=>{});
      await writeProtectedBackup(backup,{format:'FARO_LOGICAL_SNAPSHOT_V1',snapshot},key);
    }else await run(process.execPath,['scripts/backup.mjs','--database',f.app.config.databasePath,'--data-dir',f.app.config.dataDir,'--output',backup],{windowsHide:true});
    const prior=await read('SELECT user_id,command_key,input_hash,result,created_at FROM faro_commands ORDER BY user_id,command_key');
    if(native)await write("ALTER TABLE faro_commands ADD CONSTRAINT journal_cleanup_failure CHECK(command_key<>'journal-invalidate' OR result LIKE '%reviewTasks%') NOT VALID");
    else f.app.db.db.exec("CREATE TRIGGER journal_cleanup_failure BEFORE UPDATE ON faro_commands WHEN NEW.command_key='journal-invalidate' BEGIN SELECT RAISE(ABORT,'synthetic cleanup failure'); END");
    await f.request('/api/account',candidate.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'},500);
    assert.equal((await read('SELECT id FROM users WHERE id=$1',[candidate.id])).length,1);assert.equal((await read('SELECT id FROM faro_attempts WHERE id=$1',[ack.id])).length,1);
    assert.deepEqual(await read('SELECT user_id,command_key,input_hash,result,created_at FROM faro_commands ORDER BY user_id,command_key'),prior,'Failed cleanup must roll back every journal update');
    if(native)await write('ALTER TABLE faro_commands DROP CONSTRAINT journal_cleanup_failure');else f.app.db.db.exec('DROP TRIGGER journal_cleanup_failure');
    // Startup backfill covers all actors, preserves immutable assessment/projection snapshots.
    const historyBefore=await read('SELECT revision,validity,result FROM faro_result_history WHERE attempt_id=$1 ORDER BY revision',[ack.id]),snapshotBefore=await read('SELECT snapshot FROM faro_interests WHERE id=$1',[recruitment.id]);
    if(native){const schema=(await read('SELECT current_schema() schema'))[0].schema,app=await createPgFaroApp({connection:{connectionString:process.env.FARO_PG_REHEARSAL_URL},schema,overrides:{nodeEnv:'test',dataDir:root,faroWorkerEnabled:false}});await app.close();}
    else {const db=new JobDatabase(f.app.config.databasePath);db.close();}
    assert.deepEqual(await read('SELECT revision,validity,result FROM faro_result_history WHERE attempt_id=$1 ORDER BY revision',[ack.id]),historyBefore);assert.deepEqual(await read('SELECT snapshot FROM faro_interests WHERE id=$1',[recruitment.id]),snapshotBefore);
    for(const row of await read('SELECT result FROM faro_commands'))assert.equal(row.result.includes(marker),false);
    // Reintroduce legacy payloads to exercise the erasure transaction itself, not only startup.
    await write('DELETE FROM faro_commands WHERE command_key=$1',['legacy-interview']);await seedLegacy();
    await f.request('/api/account',candidate.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});
    await assertNoPrivateCopies(f.app.db,native);
    assert.deepEqual(await read("SELECT user_id,command_key,input_hash,result,created_at FROM faro_commands WHERE command_key NOT IN ('journal-finalize','journal-invalidate','legacy-interview') ORDER BY user_id,command_key"),unrelated);
    await f.request(url+'/review',owner.cookie,'POST',finalize,404);await f.request(url+'/invalidate-result',reviewer.cookie,'POST',invalidate,404);
    if(native){
      await writeProtectedBackup(authority,{format:'FARO_CURRENT_AUTHORITY_V1',ledger:await readRecoveryLedger(f.app.db,()=>{})},key);
      const result=await run(process.execPath,['scripts/restore-faro-postgres.mjs','--source',backup,'--authority-source',authority,'--target-schema',targetSchema,'--offline-confirmed','--authority-current-confirmed'],{windowsHide:true,env:{...process.env,FARO_PG_URL:process.env.FARO_PG_REHEARSAL_URL,FARO_BACKUP_ENCRYPTION_KEY:key,FARO_AUTHORITY_ENCRYPTION_KEY:key}});
      assert.equal(JSON.parse(result.stdout).erasedSubjects,1);recovered=new PgJobDatabase({connectionString:process.env.FARO_PG_REHEARSAL_URL});await recovered.connect();await recovered.query(`SET search_path TO ${identifier(targetSchema)}`);
    }else{const result=await restoreFaro({source:backup,dataDir:join(root,'restore'),erasureSource:f.app.config.databasePath});assert.equal(result.erasedSubjects,1);recovered=new JobDatabase(result.databasePath);}
    await assertNoPrivateCopies(recovered,native);
    const restored=sqlAdapter(recovered);assert.equal((await restored.read('SELECT id FROM users WHERE id=$1',[candidate.id])).length,0);
    for(const keyName of ['journal-finalize','journal-invalidate','legacy-interview'])assert.equal((await restored.read('SELECT result FROM faro_commands WHERE command_key=$1',[keyName])).length,1,'Retain idempotency history after restore');
    assert.deepEqual(await restored.read("SELECT user_id,command_key,input_hash,result,created_at FROM faro_commands WHERE command_key NOT IN ('journal-finalize','journal-invalidate','legacy-interview') ORDER BY user_id,command_key"),unrelated);
    if(native)await recovered.query(`DROP SCHEMA ${identifier(targetSchema)} CASCADE`);else assert.deepEqual(recovered.db.prepare('PRAGMA foreign_key_check').all(),[]);
    console.log(`FARO_AUDIT_001_ERASURE_RESTORE_PASS backend=${native?'postgresql':'sqlite'} minimal-ack/history-backfill/all-operational-tables/cleanup-rollback/current-authority/old-backup/retained-unrelated-history`);
  }finally {
    if(recovered){if(native)await recovered.end();else recovered.close();}
    await f.close();assert.equal(dirname(resolve(root)),resolve(tmpdir()));await rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:200});
    console.log('FARO_COMMAND_JOURNAL_PROOF_CLEANUP_PASS');
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await proveCommandJournal({native:process.argv.includes('--postgres'),only:process.argv.includes('--replay-only')?'replay':process.argv.includes('--erasure-only')?'erasure':'all'});
