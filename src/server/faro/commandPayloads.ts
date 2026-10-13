/** Data backfill, not a schema change: retain command identity/hash and remove only old projections. */
export const commandPayloadReadQuery = {text:'SELECT user_id,command_key,result FROM faro_commands',values:[]};

export function minimalCommandPayload(payload:string):string {
  let value:unknown;
  try { value=JSON.parse(payload); } catch { throw new Error('Invalid command acknowledgement.'); }
  if(!value||typeof value!=='object'||Array.isArray(value))return payload;
  const row=value as Record<string,unknown>;
  // All historical full DTO producers: assessment finalize/invalidate and interview propose/change.
  // Other commands contain bounded acknowledgements and must retain their original bytes.
  if(typeof row.id==='string'&&typeof row.processId==='string'&&typeof row.state==='string'
    &&(('reviewTasks' in row&&'answers' in row)||('startsAt' in row&&'candidateCompleted' in row))) {
    return JSON.stringify({id:row.id});
  }
  return payload;
}

export function commandPayloadCleanupQueries(rows:Record<string,unknown>[]) {
  return rows.flatMap(row=>{
    if(typeof row.result!=='string'||typeof row.user_id!=='string'||typeof row.command_key!=='string')throw new Error('Invalid command acknowledgement.');
    const minimal=minimalCommandPayload(row.result);
    return minimal===row.result?[]:[{text:'UPDATE faro_commands SET result=$1 WHERE user_id=$2 AND command_key=$3',values:[minimal,row.user_id,row.command_key]}];
  });
}

/** Caller owns the transaction, including erasure/recovery. Never delete the idempotency history. */
export async function minimizeCommandPayloadsOwned(database:{
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  query(text:string,values:readonly unknown[]):Promise<unknown>;
}) {
  for(const query of commandPayloadCleanupQueries((await database.readBatch([commandPayloadReadQuery]))[0]??[]))await database.query(query.text,query.values);
}
