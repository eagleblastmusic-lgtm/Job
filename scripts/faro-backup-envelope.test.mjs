import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,open,symlink,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sealBackup,openBackup,writeProtectedBackup,readProtectedBackup,MAX_BACKUP_ARTIFACT_BYTES} from './faro-backup-envelope.mjs';
test('private backup is authenticated, randomized, durable and never overwrites historical data',async()=>{const root=await mkdtemp(join(tmpdir(),'faro-backup-proof-')),path=join(root,'protected.backup'),payload={secret:'SYNTHETIC_PRIVATE_RECORD',snapshot:{tables:[]}},key='aa'.repeat(32);try{const one=sealBackup(payload,key),two=sealBackup(payload,key);assert.notDeepEqual(one,two);assert.equal(one.includes(Buffer.from(payload.secret)),false);assert.deepEqual(openBackup(one,key),payload);assert.throws(()=>openBackup(one,'bb'.repeat(32)),/authentication/);const changed=JSON.parse(one);changed.data=Buffer.from('changed').toString('base64');assert.throws(()=>openBackup(Buffer.from(JSON.stringify(changed)),key),/authentication/);changed.format='FOREIGN';assert.throws(()=>openBackup(Buffer.from(JSON.stringify(changed)),key),/authentication/);assert.throws(()=>sealBackup(payload,'invalid'));await writeProtectedBackup(path,payload,key);const before=await readFile(path);assert.deepEqual(await readProtectedBackup(path,key),payload);await assert.rejects(()=>writeProtectedBackup(path,{changed:true},key),error=>error.code==='EEXIST');assert.deepEqual(await readFile(path),before);}finally{await rm(root,{recursive:true,force:true});}});

test('schema metadata with SQLite null prototypes preserves complete JSON wire values',()=>{const schema=Object.assign(Object.create(null),{name:'users',columns:[{name:'id',type:'TEXT',notnull:1}]}),payload={schema,rows:[{id:'synthetic'}]},decoded=openBackup(sealBackup(payload,'cc'.repeat(32)),'cc'.repeat(32));assert.deepEqual(decoded,JSON.parse(JSON.stringify(payload)));assert.equal(Object.getPrototypeOf(schema),null);});


test('protected artifact reader refuses oversized sparse files, directories and redirected entries before decrypting',async()=>{
 const root=await mkdtemp(join(tmpdir(),'faro-artifact-bounds-')),key='ad'.repeat(32);
 try{
  const large=join(root,'oversized.backup'),file=await open(large,'wx');try{await file.truncate(MAX_BACKUP_ARTIFACT_BYTES+1);}finally{await file.close();}
  await assert.rejects(()=>readProtectedBackup(large,key),/refused/);
  await assert.rejects(()=>readProtectedBackup(root,key),/refused/);
  const empty=join(root,'empty.backup');await writeFile(empty,'');await assert.rejects(()=>readProtectedBackup(empty,key),/refused/);
  const actual=join(root,'actual.backup');await writeProtectedBackup(actual,{synthetic:'preserved'},key);
  if(process.platform!=='win32'){const redirected=join(root,'redirected.backup');await symlink(actual,redirected);await assert.rejects(()=>readProtectedBackup(redirected,key),/refused/);}
  assert.deepEqual(await readProtectedBackup(actual,key),{synthetic:'preserved'});
 }finally{await rm(root,{recursive:true,force:true});}
});
