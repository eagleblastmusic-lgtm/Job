import { createHash } from 'node:crypto';
import { HttpError } from '../http.js';
import { text } from './validation.js';
export function commandRequest(key:unknown,input:unknown) {
  return {key:text(key,150),hash:createHash('sha256').update(JSON.stringify(input)).digest('hex')};
}
export function commandReadQuery(userId:string,key:string) {return {text:'SELECT input_hash,result FROM faro_commands WHERE user_id=$1 AND command_key=$2',values:[userId,key]};}
export function commandReplay<T>(rows:Record<string,unknown>[],hash:string):{found:false}|{found:true;result:T} {
  const existing=rows[0] as {input_hash:string;result:string}|undefined;
  if(!existing)return {found:false};
  if(existing.input_hash!==hash)throw new HttpError(409,'Klucz operacji został już użyty dla innych danych.','IDEMPOTENCY_CONFLICT');
  return {found:true,result:JSON.parse(existing.result) as T};
}
export function commandSaveQuery(userId:string,request:ReturnType<typeof commandRequest>,result:unknown,asOf:string) {
  return {text:'INSERT INTO faro_commands(user_id,command_key,input_hash,result,created_at) VALUES($1,$2,$3,$4,$5)',values:[userId,request.key,request.hash,JSON.stringify(result),asOf]};
}
interface CommandDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  query(text:string,values:readonly unknown[]):Promise<unknown>;
  transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
export async function runCommandOnce<T>(database:CommandDatabase,userId:string,key:unknown,input:unknown,asOf:string,authorize:()=>void|Promise<void>,work:()=>T|Promise<T>):Promise<T> {
  const request=commandRequest(key,input);
  return database.transaction(async()=>{
    // A saved acknowledgement never substitutes for current authority, even on an exact replay.
    await authorize();
    const replay=commandReplay<T>((await database.readBatch([commandReadQuery(userId,request.key)]))[0]??[],request.hash);
    if(replay.found)return replay.result;
    const result=await work(),query=commandSaveQuery(userId,request,result,asOf);await database.query(query.text,query.values);
    return result;
  });
}
