import { DatabaseSync } from 'node:sqlite';
import { cp, lstat, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JobDatabase } from '../dist/server/db.js';
import { RecoveryService } from '../dist/server/faro/recoveryService.js';
const [nodeMajor,nodeMinor]=process.versions.node.split('.').map(Number);
if(!((nodeMajor===22&&nodeMinor>=12)||nodeMajor>=24))throw new Error('Odtwarzanie wymaga Node 22.12+ LTS albo 24+, z obsługą SQLite readOnly.');

export function readLatestLedger(databasePath) {
  const db=new DatabaseSync(databasePath,{readOnly:true});
  try {
    db.exec('BEGIN');
    const erasures=db.prepare('SELECT subject_hash,erased_at,policy_version FROM faro_erasure_log').all();
    const owners=db.prepare("SELECT organization_id,user_id FROM faro_members WHERE role='OWNER' AND active=1").all();
    const members=db.prepare('SELECT organization_id,user_id,role FROM faro_members WHERE active=1').all();
    const assignments=db.prepare('SELECT a.offer_id,a.user_id FROM faro_assignments a JOIN faro_offers o ON o.id=a.offer_id JOIN faro_members m ON m.organization_id=o.organization_id AND m.user_id=a.user_id AND m.active=1').all();
    const accounts=db.prepare('SELECT id,role,password_hash,email,name FROM users').all();
    const organizations=db.prepare('SELECT id,verification FROM faro_organizations').all();
    db.exec('COMMIT');return {erasures,owners,members,assignments,accounts,organizations};
  } finally {db.close();}
}
/** Database-only Canonical recovery. Never overwrites a live target or silently drops uploads. */
export async function restoreFaro({source,dataDir,erasureSource}) {
  if(!source||!dataDir||!erasureSource)throw new Error('Wymagane: --source, --data-dir i --erasure-source (bieżąca autorytatywna baza).');
  source=resolve(source);dataDir=resolve(dataDir);erasureSource=resolve(erasureSource);
  const within=(root,path)=>{const rel=relative(root,path);return !rel||(!rel.startsWith('..')&&!isAbsolute(rel));};
  if(within(dataDir,source)||within(source,dataDir)||within(dataDir,erasureSource))throw new Error('Cel odtworzenia musi być oddzielony od kopii i bieżącej bazy.');
  try {await lstat(dataDir);throw new Error('Katalog docelowy już istnieje; nie wolno nadpisywać danych.');}
  catch(error) {if(error.code!=='ENOENT')throw error;}
  const manifest=JSON.parse(await readFile(resolve(source,'manifest.json'),'utf8'));
  if(manifest.format!==1)throw new Error('Nieobsługiwany format kopii.');
  const snapshot=resolve(source,'job.sqlite');
  if(!(await lstat(snapshot)).isFile())throw new Error('Kopia bazy musi być zwykłym plikiem.');
  const uploads=resolve(source,'uploads');
  try {if((await readdir(uploads)).length)throw new Error('Odtwarzanie plików wymaga oddzielnej procedury bezpieczeństwa; ta ścieżka obsługuje bazę Canonical bez plików.');}
  catch(error) {if(error.code!=='ENOENT')throw error;}
  const check=new DatabaseSync(snapshot,{readOnly:true});
  try {
    if(check.prepare('SELECT COUNT(*) n FROM uploaded_files').get().n)throw new Error('Kopia zawiera rekordy plików; użyj zatwierdzonej procedury plikowej.');
    if(Object.values(check.prepare('PRAGMA integrity_check').get())[0]!=='ok'||check.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Kopia bazy jest niespójna.');
  } finally {check.close();}
  if(!(await lstat(erasureSource)).isFile())throw new Error('Bieżąca baza musi być zwykłym plikiem.');
  // Exclusive directory creation closes the existence-check race.
  await mkdir(dataDir,{mode:0o700});
  const databasePath=resolve(dataDir,'job.sqlite');
  let target;
  try {
    await cp(snapshot,databasePath,{errorOnExist:true,force:false,dereference:true});
    target=new JobDatabase(databasePath);
    // Capture current authority after copying/migrating; no await before reconciliation.
    const result=new RecoveryService(target).reconcile(readLatestLedger(erasureSource));
    return {databasePath,...result,activation:'REVIEW_REQUIRED'};
  } catch(error) {
    target?.close();target=null;
    // Discard only files created in the exclusive new target, so failed erasure cannot be activated.
    for(const path of [databasePath,`${databasePath}-wal`,`${databasePath}-shm`]) {
      if(!within(dataDir,path))throw new Error('Nieprawidłowa ścieżka odtworzonego pliku.');
      await rm(path,{force:true});
    }
    throw error;
  } finally {target?.close();}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const arg=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;};
  console.log(JSON.stringify(await restoreFaro({source:arg('--source'),dataDir:arg('--data-dir'),erasureSource:arg('--erasure-source')})));
}
