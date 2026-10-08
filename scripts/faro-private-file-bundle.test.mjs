import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink,stat,link} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {capturePrivateFiles,validatePrivateFiles,restorePrivateFiles} from './faro-private-file-bundle.mjs';
import {sealBackup,openBackup} from './faro-backup-envelope.mjs';

test('encrypted private file bundle verifies bytes and restores only current authorized files without overwrites',async()=>{
 const root=await mkdtemp(join(tmpdir(),'faro-file-bundle-'));
 try{
  const source=join(root,'source'),target=join(root,'target');await mkdir(join(source,'uploads','owner'),{recursive:true});await mkdir(target);
  const bytes=Buffer.from('synthetic private retained body'),row={id:'file',user_id:'owner',storage_key:'uploads/owner/private.txt',size_bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
  await writeFile(join(source,row.storage_key),bytes);
  const files=await capturePrivateFiles(source,[row]);validatePrivateFiles(files,[row]);
  const key='75'.repeat(32),cipher=sealBackup({files},key);assert.equal(cipher.includes(bytes),false);assert.equal(cipher.includes(Buffer.from(row.storage_key)),false);
  assert.deepEqual(openBackup(cipher,key).files,files);
  const refused=join(root,'refused-target');await mkdir(refused);await assert.rejects(()=>restorePrivateFiles(refused,files,[{...row,sha256:'0'.repeat(64)}]));await assert.rejects(()=>stat(join(refused,'uploads')));
  assert.deepEqual(await restorePrivateFiles(target,files,[row]),{restoredFiles:1,verifiedFiles:1});assert.deepEqual(await readFile(join(target,row.storage_key)),bytes);
  await assert.rejects(()=>restorePrivateFiles(target,files,[row]));assert.deepEqual(await readFile(join(target,row.storage_key)),bytes);
  const erased=join(root,'erased-target');await mkdir(erased);assert.deepEqual(await restorePrivateFiles(erased,files,[]),{restoredFiles:0,verifiedFiles:0});await assert.rejects(()=>readFile(join(erased,row.storage_key)));
  assert.throws(()=>validatePrivateFiles([{...files[0],data:Buffer.from('tampered').toString('base64')}],[row]));
  assert.throws(()=>validatePrivateFiles([...files,...files],[row,row]));
  for(const bad of ['../outside','uploads/other/private.txt','uploads/owner/../outside','uploads/owner/private:stream'])await assert.rejects(()=>capturePrivateFiles(source,[{...row,storage_key:bad}]));
  await assert.rejects(()=>capturePrivateFiles(source,[{...row,size_bytes:row.size_bytes+1}]));await assert.rejects(()=>capturePrivateFiles(source,[{...row,sha256:'0'.repeat(64)}]));
  await assert.rejects(()=>capturePrivateFiles(source,[{...row,size_bytes:17*1024*1024}]));
  const hardlink=join(root,'linked-private.txt');await link(join(source,row.storage_key),hardlink);await assert.rejects(()=>capturePrivateFiles(source,[row]));await rm(hardlink);
  if(process.platform!=='win32'){const actual=join(root,'actual-private.txt');await writeFile(actual,bytes);await rm(join(source,row.storage_key));await symlink(actual,join(source,row.storage_key));await assert.rejects(()=>capturePrivateFiles(source,[row]));assert.deepEqual(await readFile(actual),bytes);}
  const outside=join(root,'outside');await mkdir(outside);await rm(join(source,'uploads','owner'),{recursive:true});await symlink(outside,join(source,'uploads','owner'),process.platform==='win32'?'junction':'dir');await assert.rejects(()=>capturePrivateFiles(source,[row]));
 }finally{await rm(root,{recursive:true,force:true});}
});
