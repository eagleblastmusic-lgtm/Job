import test from 'node:test';
import assert from 'node:assert/strict';
import { FaroWorker } from '../server/faro/worker.js';
import { TrustService } from '../server/faro/trustService.js';
import { RecruitmentService } from '../server/faro/recruitmentService.js';
import { loadConfig } from '../server/config.js';
import { faroFixture } from './faro-fixture.js';
import { JobDatabase } from '../server/db.js';
import { spawn } from 'node:child_process';

test('scheduled worker delivers durable outbox without notification GET and stops before database closure', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const f = await faroFixture({ faroWorkerEnabled: true, faroWorkerIntervalMs: 1000 });
  try {
    const u = await f.user('Scheduler');
    const recruitment = new RecruitmentService(f.app.db);
    recruitment.enqueue(u.id, 'process', 'test-process', 'Sprawdź następny krok.', 'scheduled-proof');
    assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM notifications').get()!.n, 0);
    t.mock.timers.tick(1000);
    assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM notifications').get()!.n, 1);
    t.mock.timers.tick(2000);
    assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM notifications').get()!.n, 1);
    await f.request('/api/faro/worker/status', u.cookie, 'GET', undefined, 403);
    await f.request('/api/faro/worker/tick', u.cookie, 'POST', {}, 403);
    f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(u.id);
    const status = await f.request<{running:boolean;outbox:Array<{status:string;count:number}>}>('/api/faro/worker/status',u.cookie);
    assert.equal(status.running, true);
    assert.deepEqual(status.outbox,[{status:'DELIVERED',count:1}]);
    assert.equal(JSON.stringify(status).includes(u.id),false);
    const runs=f.app.worker.status().runs;
    await f.close();
    t.mock.timers.tick(3000);
    assert.equal(f.app.worker.status().runs,runs);
    assert.equal(f.app.worker.status().stopped,true);
  } catch(error) { await f.close(); throw error; }
});

test('worker failure stays private, retries next interval and does not duplicate reminder effects', async t => {
  t.mock.timers.enable({ apis:['setInterval'] });
  const f=await faroFixture();
  let fail=true;
  const worker=new FaroWorker(()=>{if(fail)throw new Error('SQL with private candidate data');new TrustService(f.app.db).tick();},true,1000);
  try {
    worker.start();worker.start();
    t.mock.timers.tick(1000);
    assert.equal(worker.status().runs,1);
    assert.equal(worker.status().lastErrorCode,'WORKER_TICK_FAILED');
    assert.equal(JSON.stringify(worker.status()).includes('candidate'),false);
    fail=false;t.mock.timers.tick(1000);
    assert.equal(worker.status().runs,2);
    assert.equal(worker.status().lastErrorCode,null);
    assert.ok(worker.status().lastSuccessAt);
    worker.stop();assert.equal(worker.run(),false);
  } finally {worker.stop();await f.close();}
});

test('production gate disables scheduler even with explicit enable override', () => {
  const config=loadConfig({nodeEnv:'production',faroWorkerEnabled:true});
  assert.equal(config.faroWorkerEnabled,false);
  assert.throws(()=>new FaroWorker(()=>{},true,0));
});

test('two actual worker processes claim once; persisted expired reservation is fenced after restart with one inbox delivery',async()=>{
  const f=await faroFixture();const children:Array<ReturnType<typeof spawn>>=[];let reopened:JobDatabase|undefined;
  try {
    const user=await f.user('LeaseRace'),r=new RecruitmentService(f.app.db);
    r.enqueue(user.id,'process','lease-process','Syntetyczna aktualizacja.','lease-race');
    const script=`import {JobDatabase} from ${JSON.stringify(new URL('../server/db.js',import.meta.url).href)};import {RecruitmentService} from ${JSON.stringify(new URL('../server/faro/recruitmentService.js',import.meta.url).href)};const db=new JobDatabase(process.argv[1]);process.stdout.write('READY\\n');process.stdin.once('data',()=>{process.stdout.write(JSON.stringify(new RecruitmentService(db).claimOutbox(1,1000))+'\\n');db.close();process.stdin.pause();});`;
    const launch=()=>{
      const child=spawn(process.execPath,['--input-type=module','-e',script,f.app.config.databasePath],{stdio:['pipe','pipe','pipe']});children.push(child);
      let output='',error='';let readyResolve:()=>void=()=>{};let readyReject:(e:Error)=>void=()=>{};
      const ready=new Promise<void>((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
      child.stdout!.on('data',data=>{output+=String(data);if(output.includes('READY\n'))readyResolve();});child.stderr!.on('data',data=>{error+=String(data);});
      const result=new Promise<Array<{id:string;claimToken:string}>>((resolve,reject)=>{
        child.on('error',e=>{readyReject(e);reject(e);});child.on('exit',code=>{if(code!==0){const e=new Error(`Synthetic claim worker failed (${code}): ${error}`);readyReject(e);reject(e);}else resolve(JSON.parse(output.trim().split('\n').at(-1)!) as Array<{id:string;claimToken:string}>);});
      });
      return {child,ready,result};
    };
    const workers=[launch(),launch()];await Promise.all(workers.map(w=>w.ready));for(const worker of workers)worker.child.stdin!.end('claim');
    const claims=(await Promise.all(workers.map(w=>w.result))).flat();assert.equal(claims.length,1);
    assert.deepEqual(r.claimOutbox(),[]);assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM notifications').get()!.n,0);
    reopened=new JobDatabase(f.app.config.databasePath);
    const now=new Date(Date.now()+2000),next=new RecruitmentService(reopened,()=>now);
    const newer=next.claimOutbox(1,1000);assert.equal(newer.length,1);assert.notEqual(newer[0]!.claimToken,claims[0]!.claimToken);
    assert.equal(r.deliverClaimedOutbox(claims[0]!.id,claims[0]!.claimToken),false);assert.equal(next.deliverClaimedOutbox(newer[0]!.id,'wrong-token'),false);
    assert.equal(next.deliverClaimedOutbox(newer[0]!.id,newer[0]!.claimToken),true);assert.equal(next.deliverClaimedOutbox(newer[0]!.id,newer[0]!.claimToken),false);
    reopened.close();reopened=new JobDatabase(f.app.config.databasePath);
    const row=reopened.db.prepare('SELECT status,attempts,claim_token,lease_until FROM faro_outbox').get()!;
    assert.deepEqual({...row},{status:'DELIVERED',attempts:2,claim_token:null,lease_until:null});assert.equal(reopened.db.prepare('SELECT COUNT(*) n FROM notifications').get()!.n,1);
  }finally{for(const child of children)if(child.exitCode===null)child.kill();reopened?.close();await f.close();}
});

test('delivery failures have bounded budget/backoff and audited admin retry preserves attempts; expired crashes cannot retry forever',async()=>{
  const f=await faroFixture();try {
    const user=await f.user('LeaseFailure'),admin=await f.user('LeaseOperator');let now=new Date();const r=new RecruitmentService(f.app.db,()=>now);
    r.enqueue(user.id,'process','failed-process','Syntetyczna aktualizacja.','lease-failure');
    f.app.db.db.exec("CREATE TRIGGER synthetic_inbox_failure BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT,'private internal error'); END;");
    const id=(f.app.db.db.prepare("SELECT id FROM faro_outbox WHERE dedupe_key='lease-failure'").get() as {id:string}).id;
    for(let attempt=1;attempt<=5;attempt++) {
      const claim=r.claimOutbox()[0]!;assert.equal(r.deliverClaimedOutbox(claim.id,claim.claimToken),false);
      const row=f.app.db.db.prepare('SELECT attempts,status,error_code,next_attempt_at,claim_token,lease_until FROM faro_outbox WHERE id=?').get(id)!;
      assert.equal(row.attempts,attempt);assert.equal(row.status,attempt===5?'DEAD_LETTER':'PENDING');assert.equal(row.error_code,'DELIVERY_FAILED');assert.equal(row.claim_token,null);assert.equal(row.lease_until,null);
      assert.ok(Date.parse(row.next_attempt_at as string)>now.getTime());now=new Date(Date.parse(row.next_attempt_at as string)+1);
    }
    assert.deepEqual(r.claimOutbox(),[]);assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM notifications').get()!.n,0);
    const path=`/api/faro/worker/outbox/${id}/retry`,body={expectedAttempts:5,idempotencyKey:'admin-lease-retry',confirmed:true,reasonCode:'TRANSIENT_FAILURE_RESOLVED'};
    await f.request(path,user.cookie,'POST',body,403);await f.request(path,admin.cookie,'POST',body,403);
    f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(admin.id);
    await f.request(path,admin.cookie,'POST',{...body,confirmed:false},400);await f.request(path,admin.cookie,'POST',{...body,expectedAttempts:4},409);
    const response=await f.request(path,admin.cookie,'POST',body);assert.deepEqual(await f.request(path,admin.cookie,'POST',body),response);
    await f.request(path,admin.cookie,'POST',{...body,reasonCode:'LEASE_RECOVERY_REVIEWED'},409);
    assert.equal(f.app.db.db.prepare('SELECT attempts FROM faro_outbox WHERE id=?').get(id)!.attempts,5);
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='OUTBOX_RETRY_TRANSIENT_FAILURE_RESOLVED'").get()!.n,1);
    f.app.db.db.exec('DROP TRIGGER synthetic_inbox_failure');r.deliverOutbox();
    assert.equal(f.app.db.db.prepare('SELECT status FROM faro_outbox WHERE id=?').get(id)!.status,'DELIVERED');assert.equal(f.app.db.db.prepare('SELECT attempts FROM faro_outbox WHERE id=?').get(id)!.attempts,6);
    f.app.db.db.prepare("UPDATE users SET role='USER' WHERE id=?").run(admin.id);await f.request(path,admin.cookie,'POST',body,403);
    r.enqueue(user.id,'process','crash-process','Syntetyczna aktualizacja.','lease-crash-budget');
    for(let attempt=1;attempt<=5;attempt++){assert.equal(r.claimOutbox(1,1000).length,1);now=new Date(now.getTime()+1001);}
    assert.deepEqual(r.claimOutbox(1,1000),[]);const dead=f.app.db.db.prepare("SELECT status,attempts,error_code FROM faro_outbox WHERE dedupe_key='lease-crash-budget'").get()!;
    assert.deepEqual({...dead},{status:'DEAD_LETTER',attempts:5,error_code:'LEASE_EXPIRED'});
    assert.deepEqual(f.app.db.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{await f.close();}
});

test('erasure after claim prevents stale worker inbox delivery from a cached recipient',async()=>{
  const f=await faroFixture();try {
    const user=await f.user('LeaseErase'),r=new RecruitmentService(f.app.db);
    r.enqueue(user.id,'process','erase-process','Syntetyczna aktualizacja.','lease-erase');const claim=r.claimOutbox()[0]!;
    await f.request('/api/account',user.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});
    assert.equal(r.deliverClaimedOutbox(claim.id,claim.claimToken),false);assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM notifications').get()!.n,0);assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_outbox').get()!.n,0);
  }finally{await f.close();}
});
