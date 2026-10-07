import { mkdir,writeFile,stat } from 'node:fs/promises';
import { join } from 'node:path';
import { faroFixture } from './faro-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileDisposalPlan } from '../server/faro/fileDisposalModel.js';
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
  await f.request('/api/account',user.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'},500);assert.ok(await stat(path));assert.ok(f.app.store.getUserById(user.id));assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_file_disposals').get()!.n,0);
  f.app.db.db.exec('DROP TRIGGER disposal_guard');
  await f.request('/api/account',user.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});await assert.rejects(()=>stat(path),error=>(error as NodeJS.ErrnoException).code==='ENOENT');assert.equal(f.app.store.getUserById(user.id),null);
 }finally{await f.close();}
});
