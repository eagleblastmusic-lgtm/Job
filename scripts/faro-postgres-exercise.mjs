import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { extract,parts,identifier,targetTable,importSnapshot,compare,clientFromEnvironment } from './faro-postgres-rehearsal.mjs';
import { faroFixture,offerInput } from '../dist/tests/faro-fixture.js';
import { ProfileService } from '../dist/server/faro/profileService.js';
import { OfferService } from '../dist/server/faro/offerService.js';
import { RecruitmentService } from '../dist/server/faro/recruitmentService.js';
import { AssessmentService } from '../dist/server/faro/assessmentService.js';
import { MfaService,totp } from '../dist/server/faro/mfaService.js';
import { hashSessionToken } from '../dist/server/auth.js';
const sourceOnly=process.argv.includes('--source-only'),schema=`faro_rehearsal_${randomBytes(8).toString('hex')}`,f=await faroFixture({faroMfaEncryptionKey:'44'.repeat(32)});let client,connected=false,created=false;
function decode(value){let bits=0,acc=0;const out=[];for(const c of value){acc=(acc<<5)|'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c);bits+=5;if(bits>=8){bits-=8;out.push((acc>>>bits)&255);}}return Buffer.from(out);}
try {
  assert.throws(()=>identifier('schema; DROP SCHEMA public'),/identifier/);assert.deepEqual(parts("id TEXT CHECK(id IN ('a,b','c')),x REAL DEFAULT (1+2),UNIQUE(id,x)"),["id TEXT CHECK(id IN ('a,b','c'))","x REAL DEFAULT (1+2)",'UNIQUE(id,x)']);
  const employer=await f.user('PgEmployer'),candidate=await f.user('PgCandidate'),profiles=new ProfileService(f.app.db),offers=new OfferService(f.app.db),r=new RecruitmentService(f.app.db),a=new AssessmentService(f.app.db);
  profiles.save(candidate.id,{firstName:"Anna-Łucja",expectedVersion:0,availability:{kind:'IMMEDIATE'}});
  profiles.addClaim(candidate.id,{skillId:'faro:activity:customer-service',level:'BASICS',source:'HOBBY',practice:{quantity:3,unit:'TASKS'},confirmed:true});
  const org=profiles.organization(employer.id,{name:'Syntetyczna organizacja PostgreSQL'});f.app.db.db.prepare("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=?").run(org.id);
  const offer=offers.create(employer.id,org.id,{...offerInput(employer.id),responsibilities:["Pomoc klientom — Łódź; 'quoted' <script>tekst</script>"]});offers.lifecycle(employer.id,offer.id,{action:'REVIEW',expectedVersion:1});offers.lifecycle(employer.id,offer.id,{action:'PUBLISH',expectedVersion:2,confirmed:true});
  const process=r.interest(candidate.id,offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:profiles.previewConfirmation(candidate.id).confirmationToken,idempotencyKey:'pg-interest'});
  r.change(employer.id,process.id,{command:'ADVANCE',expectedVersion:1,idempotencyKey:'pg-advance',nextAction:'Uzgodnienie następnego kroku',dueAt:new Date(Date.now()+86400000).toISOString()});r.watch(candidate.id,offer.id,true);
  const definition=a.create(employer.id,offer.id,{title:'Syntetyczna próba importu',type:'OPEN_ANSWER',scoringMode:'HUMAN',timeLimitMinutes:5,expectedMinutes:3,rubricVersion:'pg-r1',tasks:[{prompt:'Opisz krok',evaluationCriteria:'Uzasadniona kolejność',points:2}]});
  a.approve(employer.id,definition.id,{version:1,action:'REVIEW'});a.approve(employer.id,definition.id,{version:1,action:'APPROVE',confirmed:true});
  const attempt=a.assign(employer.id,process.id,{assessmentId:definition.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:r.row(process.id).revision,idempotencyKey:'pg-assignment'}),started=a.start(candidate.id,attempt.id);
  a.save(candidate.id,attempt.id,{expectedVersion:started.revision,answers:{'task-1':"Przykład <script>throw 'unsafe'</script> — tekst, nie polecenie."}},false);
  const token=hashSessionToken(candidate.cookie.slice(candidate.cookie.indexOf('=')+1)),user=f.app.store.getUserById(candidate.id),mfa=new MfaService(f.app.db,f.app.config),setup=mfa.setup(user,token,{password:'Bezpieczne123'});
  mfa.confirm(user,token,{code:totp(decode(setup.secret),Math.floor(Date.now()/30000))});
  f.app.store.recordConsent(candidate.id,'ANALYTICS',true,'synthetic-import');
  const snapshot=await extract(f.app.config.databasePath);for(const table of snapshot.tables){const ddl=targetTable(table);assert.ok(ddl.startsWith('CREATE TABLE'));assert.ok(!/\bREFERENCES\b/i.test(ddl));}assert.equal(snapshot.versions.length,35);assert.ok(snapshot.tables.some(t=>t.name==='faro_mfa'&&t.rows.length===1));assert.ok(snapshot.tables.some(t=>t.name==='faro_attempts'&&t.rows.length===1));
  f.app.db.db.exec('CREATE TABLE unsupported_source(id TEXT)');await assert.rejects(()=>extract(f.app.config.databasePath),/schema/);f.app.db.db.exec('DROP TABLE unsupported_source');
  assert.equal((await extract(f.app.config.databasePath)).schemaHash,snapshot.schemaHash);
  if(sourceOnly){console.log(`FARO_POSTGRES_SOURCE_VALIDATED tables=${snapshot.tables.length} migrations=${snapshot.versions.length}; real PostgreSQL not exercised.`);}else{
    client=clientFromEnvironment();await client.connect();connected=true;const proof=await importSnapshot(client,snapshot,schema);created=true;assert.equal(proof.length,snapshot.tables.length);
    await compare(client,snapshot,schema);await client.query(`SET search_path TO ${identifier(schema)}`);
    await assert.rejects(()=>importSnapshot(client,snapshot,schema),/rolled back/);await compare(client,snapshot,schema);
    const invalid=structuredClone(snapshot),target=invalid.tables.find(t=>t.name==='faro_mfa');target.rows[0].last_counter=-2;
    const badSchema=`${schema}_bad`;await assert.rejects(()=>importSnapshot(client,invalid,badSchema),/rolled back/);
    assert.equal((await client.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[badSchema])).rowCount,0);
    await assert.rejects(()=>client.query('UPDATE faro_mfa SET last_counter=-2 WHERE user_id=$1',[candidate.id]),e=>e.code==='23514');
    await assert.rejects(()=>client.query('INSERT INTO faro_mfa(user_id) VALUES($1)',['missing-parent']),e=>e.code==='23503');
    // Same-timestamp consent order survives source rowid, and future inserts obtain monotonic row order.
    const tie='2030-01-01 00:00:00';await client.query("INSERT INTO consents(id,user_id,consent_type,granted,version,created_at) VALUES($1,$2,'ANALYTICS',1,'synthetic',$3),($4,$2,'ANALYTICS',0,'synthetic',$3)",['pg-yes',candidate.id,tie,'pg-no']);
    // Use known retained analytics contract, never interpolate record values.
    const denied=await client.query("INSERT INTO analytics_events(id,user_id,event_name,properties,created_at) VALUES($1,$2,'PG_REHEARSAL','{}',$3)",['pg-denied',candidate.id,tie]);assert.equal(denied.rowCount,0);
    await client.query("INSERT INTO consents(id,user_id,consent_type,granted,version,created_at) VALUES($1,$2,'ANALYTICS',1,'synthetic',$3)",['pg-latest',candidate.id,tie]);
    const allowed=await client.query("INSERT INTO analytics_events(id,user_id,event_name,properties,created_at) VALUES($1,$2,'PG_REHEARSAL','{}',$3)",['pg-allowed',candidate.id,tie]);assert.equal(allowed.rowCount,1);
    await client.query('DELETE FROM users WHERE id=$1',[candidate.id]);assert.equal((await client.query('SELECT 1 FROM faro_mfa WHERE user_id=$1',[candidate.id])).rowCount,0);assert.equal((await client.query('SELECT 1 FROM faro_interests WHERE candidate_id=$1',[candidate.id])).rowCount,0);
    const finalSource=await extract(f.app.config.databasePath);assert.deepEqual(finalSource.tables.map(t=>t.hash),snapshot.tables.map(t=>t.hash));
    console.log(`FARO_POSTGRES_REHEARSAL_OK tables=${proof.length} migrations=${snapshot.versions.length}; counts/hashes/FKs/checks/consent/rollback/source-readonly PASS; runtime cutover not exercised.`);
  }
} catch(error){console.error(`FARO_POSTGRES_EXERCISE_FAILED ${typeof error?.code==='string'&&/^[A-Z0-9]{5}$/.test(error.code)?error.code:'VALIDATION'}; no credentials or record values logged.`);console.error(String(error?.stack??'').split('\n').slice(1,4).filter(line=>line.trim().startsWith('at ')).join('\n'));throw new Error('PostgreSQL exercise failed; see aggregate failure code.');}
finally {if(client){try{if(connected&&created)await client.query(`DROP SCHEMA ${identifier(schema)} CASCADE`);}finally{await client.end();}}await f.close();}
