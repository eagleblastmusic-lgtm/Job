import test from 'node:test';
import assert from 'node:assert/strict';
import { FaroWorker } from '../server/faro/worker.js';
import { TrustService } from '../server/faro/trustService.js';
import { RecruitmentService } from '../server/faro/recruitmentService.js';
import { loadConfig } from '../server/config.js';
import { faroFixture } from './faro-fixture.js';

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
