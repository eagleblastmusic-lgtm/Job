import {validatePrivateFiles,restorePrivateFiles} from './faro-private-file-bundle.mjs';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {JobDatabase} from '../dist/server/db.js';
import {PgJobDatabase} from '../dist/server/postgresDb.js';
import {reconcileRecovery} from '../dist/server/faro/recoveryWriteModel.js';
import {extract,importSnapshot,identifier} from './faro-postgres-rehearsal.mjs';
import {readProtectedBackup} from './faro-backup-envelope.mjs';
const arg=name=>{const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:undefined;};
let database,dir,created=false,schema,filesTarget,filesOwned=false;
try{
 schema=arg('--target-schema');const source=arg('--source'),authority=arg('--authority-source'),url=process.env.FARO_PG_URL;
 if(!process.argv.includes('--offline-confirmed')||!process.argv.includes('--authority-current-confirmed')||!source||!authority||!url||!/^faro_rehearsal_[a-z0-9_]{1,40}$/.test(schema??''))throw new Error();
 const backup=await readProtectedBackup(source,process.env.FARO_BACKUP_ENCRYPTION_KEY),current=await readProtectedBackup(authority,process.env.FARO_AUTHORITY_ENCRYPTION_KEY);
 const withFiles=backup.format==='FARO_LOGICAL_SNAPSHOT_WITH_FILES_V1';const requestedFilesTarget=arg('--files-target');filesTarget=requestedFilesTarget?resolve(requestedFilesTarget):undefined;
 if((!withFiles&&backup.format!=='FARO_LOGICAL_SNAPSHOT_V1')||current.format!=='FARO_CURRENT_AUTHORITY_V1'||!current.ledger)throw new Error();
 dir=await mkdtemp(join(tmpdir(),'faro-restore-schema-'));const path=join(dir,'empty.sqlite'),baseline=new JobDatabase(path);baseline.close();const reviewed=await extract(path),metadata=snapshot=>JSON.stringify({schemaHash:snapshot.schemaHash,versions:snapshot.versions,indexes:snapshot.indexes,tables:snapshot.tables.map(({rows,hash,...table})=>table)});
 if(metadata(backup.snapshot)!==metadata(reviewed))throw new Error();
 const uploads=backup.snapshot.tables.find(table=>table.name==='uploaded_files').rows;
 if(withFiles){if(!filesTarget||filesTarget.startsWith('--'))throw new Error();validatePrivateFiles(backup.files,uploads);await mkdir(filesTarget,{mode:0o700});filesOwned=true;}else if(uploads.length||filesTarget)throw new Error();
 database=new PgJobDatabase({connectionString:url});await database.connect();await importSnapshot(database,backup.snapshot,schema);created=true;await database.query(`SET search_path TO ${identifier(schema)}`);
 const result=await reconcileRecovery(database,current.ledger,new Date().toISOString(),()=>{},withFiles);
 const physical=withFiles?await restorePrivateFiles(filesTarget,backup.files,(await database.readBatch([{text:'SELECT id,user_id,storage_key,size_bytes,sha256 FROM uploaded_files',values:[]}]))[0]):{restoredFiles:0};
 console.log(JSON.stringify({operation:'FARO_POSTGRES_ISOLATED_RECOVERY',...result,...physical,activation:'REQUIRES_SEPARATE_REVIEWED_CUTOVER',rpoRto:'NOT_CONFIRMED'}));
}catch{
 if(created&&database)try{await database.query(`DROP SCHEMA ${identifier(schema)} CASCADE`);}catch{console.error('FARO_POSTGRES_RECOVERY_QUARANTINE_CLEANUP_FAILED; do not activate destination.');}
 if(filesOwned)try{await rm(filesTarget,{recursive:true,force:true});}catch{console.error('FARO_PRIVATE_FILE_RECOVERY_QUARANTINE_CLEANUP_FAILED; do not activate destination.');}
 console.error('FARO_POSTGRES_RECOVERY_FAILED; source artifacts untouched; do not activate destination.');process.exitCode=1;
}finally{if(database)await database.end();if(dir)await rm(dir,{recursive:true,force:true});}
