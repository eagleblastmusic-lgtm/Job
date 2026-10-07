import { identifier,digest } from './faro-postgres-rehearsal.mjs';
/** Consistent logical PostgreSQL backup in memory; caller protects any persisted copy as private data. */
export async function captureNativeSnapshot(database,reviewed,schema,authorizeOperator){
 return database.transaction(async()=>{
  await authorizeOperator();
  const names=(await database.readBatch([{text:"SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE' ORDER BY table_name",values:[schema]}]))[0].map(row=>row.table_name);
  if(JSON.stringify(names)!==JSON.stringify(reviewed.tables.map(table=>table.name).sort()))throw new Error('Native backup schema does not match reviewed tables.');
  const tables=[];
  for(const table of reviewed.tables){
   const columns=(await database.readBatch([{text:'SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',values:[schema,table.name]}]))[0].map(row=>row.column_name);
   if(JSON.stringify(columns)!==JSON.stringify(['__faro_source_rowid',...table.columns.map(column=>column.name)]))throw new Error('Native backup column scope mismatch.');
   const rows=(await database.readBatch([{text:`SELECT ${columns.map(identifier).join(',')} FROM ${identifier(schema)}.${identifier(table.name)} ORDER BY "__faro_source_rowid"`,values:[]}]))[0];
   for(const row of rows)for(const column of table.columns)if(typeof row[column.name]==='number'&&(!Number.isFinite(row[column.name])||(column.type==='INTEGER'&&!Number.isSafeInteger(row[column.name]))))throw new Error('Native backup number outside reviewed domain.');
   tables.push({...table,rows,hash:digest(rows,table.columns)});
  }
  return {...reviewed,tables};
 },{readOnly:true});
}
