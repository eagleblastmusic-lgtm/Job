import { AsyncLocalStorage } from 'node:async_hooks';
import { Client,type ClientConfig,type QueryResult,type QueryResultRow } from 'pg';
interface Scope {active:boolean;transaction:boolean;failure?:string|undefined;}
function databaseError(error:unknown):Error&{code:string} {
  const code=typeof error==='object'&&error!==null&&'code' in error&&typeof error.code==='string'&&/^[A-Z0-9]{5}$/.test(error.code)?error.code:'08006';
  return Object.assign(new Error('PostgreSQL operation failed.'),{code});
}
function misuse(code:string){return Object.assign(new Error('Invalid PostgreSQL connection scope.'),{code});}
/** Owned asynchronous connection boundary for canonical runtime and maintenance. */
export class PgJobDatabase {
  private readonly client:Client;
  private readonly scope=new AsyncLocalStorage<Scope>();
  private tail:Promise<void>=Promise.resolve();
  private ready=false;
  private opening=false;
  private closing=false;
  private transportFailure:(Error&{code:string})|undefined;
  constructor(options:ClientConfig){
    this.client=new Client({...options,connectionTimeoutMillis:options.connectionTimeoutMillis??5000});
    this.client.on('error',error=>{this.transportFailure=databaseError(error);this.ready=false;});
    this.client.on('end',()=>{this.ready=false;});
  }
  private serialize<T>(work:()=>Promise<T>):Promise<T>{const result=this.tail.then(work);this.tail=result.then(()=>undefined,()=>undefined);return result;}
  async connect():Promise<void>{if(this.ready||this.closing||this.opening)throw misuse('PG_CONNECTION_STATE');this.opening=true;await this.serialize(async()=>{try{await this.client.connect();this.ready=true;}catch(error){this.closing=true;await this.client.end().catch(()=>undefined);throw databaseError(error);}finally{this.opening=false;}});}
  async query<T extends QueryResultRow=QueryResultRow>(text:string,values:readonly unknown[]=[]):Promise<QueryResult<T>> {
    const current=this.scope.getStore();
    if(current&&!current.active)throw misuse('PG_SCOPE_CLOSED');
    if(!this.ready||(this.closing&&!current))throw misuse('PG_CONNECTION_STATE');
    const work=async()=>{if(!this.ready)throw this.transportFailure??misuse('PG_CONNECTION_STATE');try{return await this.client.query<T>(text,[...values]);}catch(error){const safe=databaseError(error);if(current?.transaction)current.failure=safe.code;throw safe;}};
    return current?work():this.serialize(work);
  }
  async session<T>(work:()=>T|Promise<T>):Promise<T> {
    const current=this.scope.getStore();if(current){if(!current.active)throw misuse('PG_SCOPE_CLOSED');return await work();}
    if(!this.ready||this.closing)throw misuse('PG_CONNECTION_STATE');
    return this.serialize(()=>{if(!this.ready)throw this.transportFailure??misuse('PG_CONNECTION_STATE');return this.scope.run({active:true,transaction:false},async()=>{const owned=this.scope.getStore()!;try{return await work();}finally{owned.active=false;}});});
  }
  async transaction<T>(work:()=>T|Promise<T>,options:{readOnly?:boolean}={}):Promise<T> {
    return this.session(async()=>{
      const owned=this.scope.getStore()!;if(owned.transaction)throw misuse('PG_NESTED_TRANSACTION');owned.transaction=true;owned.failure=undefined;let begun=false;
      try {
        await this.query(options.readOnly?'BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY':'BEGIN ISOLATION LEVEL SERIALIZABLE');begun=true;
        await this.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'; SET LOCAL idle_in_transaction_session_timeout='30s'; SET LOCAL timezone='UTC'");
        const result=await work();if(owned.failure)throw Object.assign(new Error('PostgreSQL transaction failed.'),{code:owned.failure});
        const committed=await this.query('COMMIT');if(committed.command!=='COMMIT')throw misuse('PG_COMMIT_FAILED');return result;
      } catch(error){if(begun){try{await this.query('ROLLBACK');}catch{this.ready=false;this.closing=true;await this.client.end().catch(()=>undefined);}}throw error;}
      finally {owned.transaction=false;owned.failure=undefined;}
    });
  }
  async readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]> {
    const work=async()=>{
      const results:QueryResult[]=[];
      // One connection sends each read only after the previous read succeeds.
      for(const query of queries)results.push(await this.query(query.text,query.values));
      return results.map(result=>result.rows.map(row=>{
        const copy:Record<string,unknown>={...row};
        for(const field of result.fields)if(field.dataTypeID===20&&copy[field.name]!==null){
          const value=Number(copy[field.name]);
          if(!Number.isSafeInteger(value))throw Object.assign(new Error('PostgreSQL integer outside domain range.'),{code:'22003'});
          copy[field.name]=value;
        }
        return copy;
      }));
    };
    const current=this.scope.getStore();
    return current?.active&&current.transaction?work():this.transaction(work,{readOnly:true});
  }
  async end():Promise<void>{if(this.scope.getStore()?.active)throw misuse('PG_CLOSE_IN_SCOPE');if(this.closing)return;this.closing=true;await this.serialize(async()=>{this.ready=false;await this.client.end();});}
}
