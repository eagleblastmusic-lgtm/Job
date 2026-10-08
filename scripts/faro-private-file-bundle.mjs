import {constants} from 'node:fs';
import {lstat,mkdir,open,unlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const maxFile=16*1024*1024,maxTotal=64*1024*1024,maxFiles=1000;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function descriptor(row){
 if(typeof row.id!=='string'||typeof row.user_id!=='string'||typeof row.storage_key!=='string'||!/^uploads\/[a-zA-Z0-9_-]{1,128}\/[a-zA-Z0-9._-]{1,160}$/.test(row.storage_key)||row.storage_key.split('/')[1]!==row.user_id||['.','..'].includes(row.storage_key.split('/')[2])||!/^[a-f0-9]{64}$/.test(row.sha256??'')||!Number.isSafeInteger(row.size_bytes)||row.size_bytes<0||row.size_bytes>maxFile)throw new Error('Private file descriptor refused.');
 return {id:row.id,user_id:row.user_id,storage_key:row.storage_key,size_bytes:row.size_bytes,sha256:row.sha256};
}
async function directory(path){const stat=await lstat(path);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Private file directory refused.');}
export async function capturePrivateFiles(dataDir,rows){
 if(rows.length>maxFiles)throw new Error('Private file bundle limit.');
 const root=resolve(dataDir);await directory(root);
 let total=0;const result=[],keys=new Set(),ids=new Set();
 for(const row of rows){const item=descriptor(row);if(keys.has(item.storage_key)||ids.has(item.id))throw new Error('Duplicate private file.');keys.add(item.storage_key);ids.add(item.id);total+=item.size_bytes;if(total>maxTotal)throw new Error('Private file bundle limit.');
  await directory(join(root,'uploads'));await directory(join(root,'uploads',item.user_id));
  const path=join(root,item.storage_key),entry=await lstat(path);if(!entry.isFile()||entry.isSymbolicLink()||entry.nlink!==1)throw new Error('Private file entry refused.');
  const file=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));let bytes;
  try{const before=await file.stat();if(!before.isFile()||before.nlink!==1||before.size!==item.size_bytes)throw new Error('Private file changed.');bytes=Buffer.alloc(item.size_bytes+1);let read=0;while(read<bytes.length){const part=await file.read(bytes,read,bytes.length-read,read);if(!part.bytesRead)break;read+=part.bytesRead;}if(read!==item.size_bytes)throw new Error('Private file changed.');bytes=bytes.subarray(0,read);const after=await file.stat();if(after.size!==before.size||after.mtimeMs!==before.mtimeMs||bytes.length!==item.size_bytes||hash(bytes)!==item.sha256)throw new Error('Private file integrity refused.');result.push({...item,data:bytes.toString('base64')});}finally{bytes?.fill(0);await file.close();}
 }
 return result;
}
export function validatePrivateFiles(files,rows){
 if(!Array.isArray(files)||files.length!==rows.length||files.length>maxFiles)throw new Error('Incomplete private file bundle.');
 const expected=new Map(rows.map(row=>{const item=descriptor(row);return [item.id,item];}));if(expected.size!==rows.length)throw new Error('Duplicate private file metadata.');
 const keys=new Set(),seen=new Set();let total=0;
 for(const file of files){const item=descriptor(file),row=expected.get(item.id);if(!row||JSON.stringify(item)!==JSON.stringify(row)||seen.has(item.id)||keys.has(item.storage_key)||typeof file.data!=='string'||file.data.length>Math.ceil(maxFile/3)*4||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.data))throw new Error('Private file manifest refused.');
  const bytes=Buffer.from(file.data,'base64');try{if(bytes.length!==item.size_bytes||hash(bytes)!==item.sha256)throw new Error('Private file integrity refused.');}finally{bytes.fill(0);}total+=item.size_bytes;if(total>maxTotal)throw new Error('Private file bundle limit.');seen.add(item.id);keys.add(item.storage_key);
 }
}
/** Caller exclusively owns a fresh offline target. Restore only reconciled, still-authorized descriptors. */
export async function restorePrivateFiles(dataDir,files,retainedRows){
 await directory(resolve(dataDir));const retained=new Map(retainedRows.map(row=>[row.id,descriptor(row)]));if(retained.size!==retainedRows.length)throw new Error('Ambiguous retained private files.');let restored=0;
 validatePrivateFiles(files,files);
 for(const file of files){const item=descriptor(file),current=retained.get(item.id);if(current&&JSON.stringify(item)!==JSON.stringify(current))throw new Error('Current private file authority mismatch.');}
 if(retained.size)await mkdir(join(dataDir,'uploads'),{mode:0o700});
 for(const file of files){const item=descriptor(file);if(!retained.has(item.id))continue;
  const parent=join(dataDir,'uploads',item.user_id);await mkdir(parent,{recursive:true,mode:0o700});await directory(parent);
  const bytes=Buffer.from(file.data,'base64');if(bytes.length!==item.size_bytes||hash(bytes)!==item.sha256){bytes.fill(0);throw new Error('Private file integrity refused.');}
  const path=join(dataDir,item.storage_key);let handle;try{handle=await open(path,'wx',0o600);await handle.writeFile(bytes);await handle.sync();await handle.close();handle=undefined;restored++;}catch(error){if(handle){await handle.close().catch(()=>{});await unlink(path).catch(()=>{});}throw error;}finally{bytes.fill(0);}
 }
 if(restored!==retained.size)throw new Error('Retained private file missing.');return {restoredFiles:restored};
}
