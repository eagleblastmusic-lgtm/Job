import {readdir} from 'node:fs/promises';

// One additive migration in the named disposable staging; not a general migration runner.
export async function upgradeActivityPractice(client,{allowUpgrade=false}={}){
 const schema='faro_rehearsal_render_staging',version='0038_faro_activity_practice';
 const expected=(await readdir('migrations')).filter(name=>/^\d+_[a-zA-Z0-9_-]+\.sql$/.test(name)).sort().map(name=>name.slice(0,-4));
 if(expected.length!==38||expected.at(-1)!==version)throw new Error('STAGING_UPGRADE_VERSION');
 await client.query('BEGIN');
 try{
  await client.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'");
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[schema]);
  const scope=(await client.query('SELECT current_database() AS database,current_user AS actor')).rows[0];
  if(scope.database!=='faro_free_staging_pg18'||scope.actor!=='faro_free_staging_pg18_user')throw new Error('STAGING_UPGRADE_SCOPE');
  const versions=(await client.query(`SELECT version FROM ${schema}.schema_migrations ORDER BY version`)).rows.map(row=>row.version);
  const columns=(await client.query('SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',[schema,'faro_activities'])).rows;
  const old=['__faro_source_rowid','id','user_id','description','source','created_at'];
  const complete=versions.length===38;
  if(JSON.stringify(versions)!==JSON.stringify(complete?expected:expected.slice(0,-1))||JSON.stringify(columns.map(row=>row.column_name))!==JSON.stringify(complete?[...old,'practice']:old))throw new Error('STAGING_UPGRADE_SCHEMA');
  if(columns.slice(0,old.length).some((column,index)=>column.data_type!==(index===0?'bigint':'text')||column.is_nullable!=='NO'))throw new Error('STAGING_UPGRADE_SCHEMA');
  if(complete){const practice=columns.at(-1);if(practice.data_type!=='text'||practice.is_nullable!=='YES')throw new Error('STAGING_UPGRADE_SCHEMA');await client.query('COMMIT');return 'ALREADY_CURRENT';}
  if(!allowUpgrade)throw new Error('STAGING_UPGRADE_CONFIRMATION');
  await client.query(`ALTER TABLE ${schema}.faro_activities ADD COLUMN practice TEXT`);
  await client.query(`INSERT INTO ${schema}.schema_migrations(version,applied_at) VALUES($1,$2)`,[version,new Date().toISOString()]);
  await client.query('COMMIT');return 'UPGRADED_0038';
 }catch(error){await client.query('ROLLBACK');throw error;}
}
