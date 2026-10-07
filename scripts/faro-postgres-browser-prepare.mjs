import { mkdtemp,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JobDatabase } from '../dist/server/db.js';
import { extract,importSnapshot,clientFromEnvironment } from './faro-postgres-rehearsal.mjs';
const schema=process.argv[2];
if(!/^faro_rehearsal_[a-f0-9]{16}$/.test(schema??''))throw new Error('Isolated synthetic test schema required.');
const dir=await mkdtemp(join(tmpdir(),'faro-pg-browser-'));let client;
try{const file=join(dir,'empty.sqlite'),source=new JobDatabase(file);source.close();const snapshot=await extract(file);client=clientFromEnvironment();await client.connect();await importSnapshot(client,snapshot,schema);console.log('FARO_POSTGRES_BROWSER_SCHEMA_READY');}
catch{throw new Error('PostgreSQL browser schema preparation failed; no record or credential values logged.');}
finally{if(client)await client.end();await rm(dir,{recursive:true,force:true});}
