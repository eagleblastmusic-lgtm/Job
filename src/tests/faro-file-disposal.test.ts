import { mkdir,writeFile,stat } from 'node:fs/promises';
import { join } from 'node:path';
import { faroFixture } from './faro-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileDisposalPlan,fileDisposalStatusQuery } from '../server/faro/fileDisposalModel.js';
import { JobDatabase } from '../server/db.js';

test('file disposal is confined to the actual upload owner and its queue survives account cascade atomically',()=>{
 const db=new JobDatabase(':memory:');try{
  const asOf='2026-10-07T00:00:00.000Z';
  assert.throws(()=>fileDisposalPlan('owner','uploads/other/private.txt','data',asOf),/owner mismatch/);
  for(const key of ['../private','uploads/owner/../other','C:/private','/private'])assert.throws(()=>fileDisposalPlan('owner',key,'data',asOf));
  const query=fileDisposalPlan('owner','uploads/owner/private.txt','data',asOf);
  db.db.prepare("INSERT INTO users(id,email,password_hash,name,locale,timezone,role,created_at,updated_at) VALUES('owner','owner@example.pl','synthetic','Owner','pl','Europe/Warsaw','USER',?,?)").run(asOf,asOf);
  const enqueue=()=>db.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
  db.db.exec('BEGIN IMMEDIATE');enqueue();db.db.prepare("DELETE FROM users WHERE id='owner'").run();db.db.exec('ROLLBACK');
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM faro_file_disposals').get()!.n,0);
  assert.ok(db.db.prepare("SELECT id FROM users WHERE id='owner'").get());
  db.db.exec('BEGIN IMMEDIATE');enqueue();enqueue();db.db.prepare("DELETE FROM users WHERE id='owner'").run();db.db.exec('COMMIT');
  const row=db.db.prepare('SELECT subject_hash,attempts,claim_token FROM faro_file_disposals').get()!;assert.match(String(row.subject_hash),/^[a-f0-9]{64}$/);assert.equal(row.attempts,0);assert.equal(row.claim_token,null);assert.equal(db.db.prepare('SELECT COUNT(*) n FROM faro_file_disposals').get()!.n,1);
 }finally{db.close();}
});

test('actual account erasure never unlinks a private file before its durable transaction commits',async()=>{
 const f=await faroFixture();try{
  const user=await f.user('DisposalOwner'),key=`uploads/${user.id}/synthetic.txt`,path=join(f.app.config.dataDir,key),asOf=new Date().toISOString();
  await mkdir(join(f.app.config.dataDir,'uploads',user.id),{recursive:true});await writeFile(path,'synthetic private file');
  f.app.db.db.prepare("INSERT INTO uploaded_files(id,user_id,kind,original_name,mime_type,storage_key,size_bytes,sha256,created_at) VALUES(?,?,'CV','synthetic.txt','text/plain',?,22,'synthetic',?)").run('disposal-file',user.id,key,asOf);
  f.app.db.db.exec("CREATE TRIGGER disposal_guard BEFORE INSERT ON faro_file_disposals BEGIN SELECT RAISE(ABORT,'disposal queue failed'); END;");
  const messages:string[]=[],originalLog=console.error;
  console.error=(...values:unknown[])=>{messages.push(values.map(String).join(' '));};
  try{const failure=await f.request('/api/account',user.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'},500);assert.equal(JSON.stringify(failure).includes('disposal queue failed'),false);}
  finally{console.error=originalLog;}
  assert.equal(messages.length,1);assert.match(messages[0]!,/^FARO_INTERNAL_FAILURE requestId=[a-f0-9-]{36} code=INTERNAL_ERROR$/);
  for(const secret of ['disposal queue failed',path,user.id,'Bezpieczne123','SELECT','INSERT','store.js'])assert.equal(messages.join(' ').includes(secret),false);
  assert.ok(await stat(path));assert.ok(f.app.store.getUserById(user.id));assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_file_disposals').get()!.n,0);
  f.app.db.db.exec('DROP TRIGGER disposal_guard');
  await f.request('/api/account',user.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});await assert.rejects(()=>stat(path),error=>(error as NodeJS.ErrnoException).code==='ENOENT');assert.equal(f.app.store.getUserById(user.id),null);
 }finally{await f.close();}
});


test('administrator sees aggregate durable disposal backlog with no paths, subjects or lease tokens',async()=>{
 const f=await faroFixture();try{
  const admin=await f.user('DisposalAdmin'),user=await f.user('DisposalReader');
  await f.request('/api/faro/worker/status',user.cookie,'GET',undefined,403);
  f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(admin.id);
  const empty=await f.request('/api/faro/worker/status',admin.cookie);
  assert.deepEqual(empty.fileDisposals,{pending:0,ready:0,retrying:0,leased:0,failed:0,oldestRequestedAt:null});
  const past='2026-01-01T00:00:00.000Z',future='2099-01-01T00:00:00.000Z';
  for(const [key,attempts,next,lease,error] of [['uploads/private-a/file',0,past,null,null],['uploads/private-b/file',2,future,null,'FILE_DISPOSAL_FAILED'],['uploads/private-c/file',1,past,future,null]] as const){
   f.app.db.db.prepare('INSERT INTO faro_file_disposals(storage_key,subject_hash,requested_at,attempts,next_attempt_at,lease_until,claim_token,error_code) VALUES(?,?,?,?,?,?,?,?)').run(key,'private-subject-hash',past,attempts,next,lease,lease?'private-lease-token':null,error);
  }
  const response=await f.request('/api/faro/worker/status',admin.cookie);
  assert.deepEqual(response.fileDisposals,{pending:3,ready:1,retrying:2,leased:1,failed:1,oldestRequestedAt:past});
  for(const privateValue of ['uploads/','private-subject-hash','private-lease-token'])assert.equal(JSON.stringify(response).includes(privateValue),false);
  const query=fileDisposalStatusQuery(future);
  const row=f.app.db.db.prepare(query.text).get({$1:query.values[0]!})!;
  assert.equal(row.ready,3);assert.equal(row.leased,0);
  f.app.db.db.prepare("UPDATE users SET role='USER' WHERE id=?").run(admin.id);
  await f.request('/api/faro/worker/status',admin.cookie,'GET',undefined,403);
 }finally{await f.close();}
});
