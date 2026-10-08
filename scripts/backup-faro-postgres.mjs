import {capturePrivateFiles} from './faro-private-file-bundle.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {JobDatabase} from '../dist/server/db.js';
import {PgJobDatabase} from '../dist/server/postgresDb.js';
import {extract,identifier} from './faro-postgres-rehearsal.mjs';
import {captureNativeSnapshot} from './faro-postgres-backup.mjs';
import {readRecoveryLedger} from '../dist/server/faro/recoveryReadModel.js';
import {writeProtectedBackup} from './faro-backup-envelope.mjs';
let dir,database;
try{
 const index=process.argv.indexOf('--output'),output=process.argv[index+1],key=process.env.FARO_BACKUP_ENCRYPTION_KEY,url=process.env.FARO_PG_URL,schema=process.env.FARO_PG_SCHEMA;
 if(index<0||!output||output.startsWith('--')||!process.argv.includes('--operator-confirmed')||!url||!/^[a-z][a-z0-9_]{0,62}$/.test(schema??'')||!/^[a-fA-F0-9]{64}$/.test(key??''))throw new Error();
 dir=await mkdtemp(join(tmpdir(),'faro-backup-schema-'));const file=join(dir,'empty.sqlite'),baseline=new JobDatabase(file);baseline.close();const reviewed=await extract(file);
 database=new PgJobDatabase({connectionString:url});await database.connect();await database.query(`SET search_path TO ${identifier(schema)}`);
 const snapshot=await captureNativeSnapshot(database,reviewed,schema,()=>{});
 const authorityOnly=process.argv.includes('--authority-only');
 const uploads=snapshot.tables.find(table=>table.name==='uploaded_files').rows,withFiles=process.argv.includes('--with-private-files'),filesIndex=process.argv.indexOf('--private-files-dir'),filesDir=filesIndex<0?undefined:process.argv[filesIndex+1];
 if(withFiles&&(authorityOnly||!process.argv.includes('--offline-confirmed')||!filesDir||filesDir.startsWith('--')))throw new Error();
 if(!authorityOnly&&uploads.length&&!withFiles)throw new Error('Reviewed physical backup required.');
 const files=withFiles?await capturePrivateFiles(filesDir,uploads):undefined;
 const payload=authorityOnly?{format:'FARO_CURRENT_AUTHORITY_V1',createdAt:new Date().toISOString(),ledger:await readRecoveryLedger(database,()=>{})}:{format:withFiles?'FARO_LOGICAL_SNAPSHOT_WITH_FILES_V1':'FARO_LOGICAL_SNAPSHOT_V1',createdAt:new Date().toISOString(),snapshot,...(withFiles?{files}:{})};
 const result=await writeProtectedBackup(resolve(output),payload,key);
 console.log(JSON.stringify({operation:authorityOnly?'FARO_POSTGRES_ENCRYPTED_AUTHORITY':'FARO_POSTGRES_ENCRYPTED_BACKUP',...result,...(authorityOnly?{custody:'STORE_INDEPENDENTLY_FROM_STALE_BACKUPS'}:{tables:snapshot.tables.length,physicalFiles:files?.length??0,restoreRequires:'CURRENT_INDEPENDENT_AUTHORITY_LEDGER'})}));

}catch{console.error('FARO_POSTGRES_BACKUP_FAILED; no credential, record or path values logged.');process.exitCode=1;}
finally{if(database)await database.end();if(dir)await rm(dir,{recursive:true,force:true});}
