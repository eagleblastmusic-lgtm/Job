import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {open,lstat,unlink} from 'node:fs/promises';
import {constants} from 'node:fs';
export const MAX_BACKUP_ARTIFACT_BYTES=256*1024*1024;
const aad=Buffer.from('FARO_NATIVE_BACKUP_V1');
function keyBytes(key){if(!/^[a-fA-F0-9]{64}$/.test(key??''))throw new Error('Protected 32-byte backup key required.');return Buffer.from(key,'hex');}
export function sealBackup(payload,key){
 const secret=keyBytes(key),plain=Buffer.from(JSON.stringify(payload)),iv=randomBytes(12);
 try{const cipher=createCipheriv('aes-256-gcm',secret,iv);cipher.setAAD(aad);const data=Buffer.concat([cipher.update(plain),cipher.final()]);return Buffer.from(JSON.stringify({format:'FARO_NATIVE_BACKUP_V1',iv:iv.toString('hex'),tag:cipher.getAuthTag().toString('hex'),data:data.toString('base64')}));}
 finally{secret.fill(0);plain.fill(0);}
}
export function openBackup(bytes,key){
 const secret=keyBytes(key);let partial,plain;
 try{if(!Buffer.isBuffer(bytes)||bytes.length>MAX_BACKUP_ARTIFACT_BYTES)throw new Error();const value=JSON.parse(bytes.toString());if(value.format!=='FARO_NATIVE_BACKUP_V1'||!/^[a-f0-9]{24}$/.test(value.iv??'')||!/^[a-f0-9]{32}$/.test(value.tag??'')||typeof value.data!=='string')throw new Error();const cipher=createDecipheriv('aes-256-gcm',secret,Buffer.from(value.iv,'hex'));cipher.setAAD(aad);cipher.setAuthTag(Buffer.from(value.tag,'hex'));partial=cipher.update(Buffer.from(value.data,'base64'));plain=Buffer.concat([partial,cipher.final()]);return JSON.parse(plain.toString());}
 catch{throw new Error('Backup authentication failed.');}
 finally{secret.fill(0);partial?.fill(0);plain?.fill(0);}
}
/** Exclusive creation: never overwrite a historical backup; sync before reporting success. */
export async function writeProtectedBackup(path,payload,key){const bytes=sealBackup(payload,key);let file;try{if(bytes.length>MAX_BACKUP_ARTIFACT_BYTES)throw new Error('Backup artifact limit exceeded.');file=await open(path,'wx',0o600);await file.writeFile(bytes);await file.sync();await file.close();file=undefined;return {bytes:bytes.length};}catch(error){if(file){await file.close().catch(()=>{});await unlink(path).catch(()=>{});}throw error;}finally{bytes.fill(0);}}
/** Reject oversized or redirected artifacts before allocation; cap reads even if an input grows. */
export async function readProtectedBackup(path,key){
 let file,bytes;
 try{
  const entry=await lstat(path);if(!entry.isFile()||entry.isSymbolicLink()||entry.size<1||entry.size>MAX_BACKUP_ARTIFACT_BYTES)throw new Error();
  file=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));const before=await file.stat();
  if(!before.isFile()||before.size!==entry.size||before.size>MAX_BACKUP_ARTIFACT_BYTES)throw new Error();
  bytes=Buffer.alloc(before.size+1);let size=0;
  while(size<bytes.length){const part=await file.read(bytes,size,bytes.length-size,size);if(!part.bytesRead)break;size+=part.bytesRead;}
  const after=await file.stat();if(size!==before.size||after.size!==before.size||after.mtimeMs!==before.mtimeMs)throw new Error();
  return openBackup(bytes.subarray(0,size),key);
 }catch{throw new Error('Backup artifact read or authentication refused.');}
 finally{bytes?.fill(0);if(file)await file.close();}
}
