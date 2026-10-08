import {lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {extract,importSnapshot,compare,identifier,clientFromEnvironment} from './faro-postgres-rehearsal.mjs';

// Offline staging import only. No runtime activation and no production schema migration.
const arg=name=>{const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:undefined;};
let database,created=false,schema;
try{
 schema=arg('--target-schema');const source=arg('--source');
 if(!process.argv.includes('--operator-confirmed')||!process.argv.includes('--offline-confirmed')||!source||source.startsWith('--')||!/^faro_rehearsal_[a-z0-9_]{1,40}$/.test(schema??''))throw new Error();
 const path=resolve(source),entry=await lstat(path);if(!entry.isFile()||entry.isSymbolicLink())throw new Error();
 const snapshot=await extract(path);
 // A DB-only import cannot truthfully prepare a target with missing private files.
 if(snapshot.tables.find(table=>table.name==='uploaded_files')?.rows.length)throw new Error();
 database=clientFromEnvironment();await database.connect();
 const proof=await importSnapshot(database,snapshot,schema);created=true;
 await compare(database,snapshot,schema);
 const current=await extract(path);
 if(current.schemaHash!==snapshot.schemaHash||JSON.stringify(current.versions)!==JSON.stringify(snapshot.versions)||JSON.stringify(current.tables.map(table=>[table.name,table.hash]))!==JSON.stringify(snapshot.tables.map(table=>[table.name,table.hash])))throw new Error();
 console.log(JSON.stringify({operation:'FARO_POSTGRES_OFFLINE_STAGING_PREPARE',tables:proof.length,migrations:snapshot.versions.length,result:'PASS',source:'READ_ONLY_UNCHANGED',activation:'REQUIRES_SEPARATE_REVIEWED_CUTOVER'}));
}catch{
 if(created&&database)try{await database.query(`DROP SCHEMA ${identifier(schema)} CASCADE`);}catch{console.error('FARO_POSTGRES_PREPARE_QUARANTINE_CLEANUP_FAILED; do not activate target.');}
 console.error('FARO_POSTGRES_PREPARE_FAILED; source untouched; no credentials or records logged; do not activate target.');process.exitCode=1;
}finally{if(database)await database.end();}
