import { integer,text,date,choice } from './validation.js';
import { HttpError } from '../http.js';
import { calculateEconomics,type EconomicsInput } from '../../domain/faro/economics.js';
import { offerDetailOwned } from './offerReadModel.js';
import type { OfferRecord } from './offerReadModel.js';
export function economicsReadQuery(userId:string,offerId:string){return {text:'SELECT scenario,result,offer_version FROM faro_economics WHERE candidate_id=$1 AND offer_id=$2',values:[userId,offerId]};}
export function economicsFromRows(rows:Record<string,unknown>[]){const row=rows[0];return row?{scenario:JSON.parse(row.scenario as string) as EconomicsInput,result:JSON.parse(row.result as string) as ReturnType<typeof calculateEconomics>,offerVersion:row.offer_version as number}:null;}
export function economicsWritePlan(userId:string,offer:OfferRecord,body:Record<string,unknown>,asOf:string){
 const value=(key:string)=>body[key]===null?null:integer(body[key]),input:EconomicsInput={salaryOptionIndex:integer(body.salaryOptionIndex,0,7),netMin:value('netMin'),netMax:value('netMax'),commuteCost:value('commuteCost'),commuteMinutes:value('commuteMinutes'),transport:choice(body.transport,['CAR','TRANSIT','MIXED','NONE'] as const),source:text(body.source,300),observedAt:date(body.observedAt),assumptions:text(body.assumptions,1500)};
 if((input.netMin===null)!==(input.netMax===null)||(input.netMin!==null&&input.netMax!==null&&input.netMin>input.netMax))throw new HttpError(400,'Podaj prawidłowy zakres szacowanego netto.');
 const salary=offer.data.salary[input.salaryOptionIndex];if(!salary)throw new HttpError(400,'Nieznany wariant wynagrodzenia.');
 if(body.netPeriod!==undefined&&body.netPeriod!==salary.period)throw new HttpError(400,'Netto musi dotyczyć okresu wybranego wynagrodzenia.','ECONOMICS_UNIT_MISMATCH');
 if(body.commuteCostPeriod!==undefined&&body.commuteCostPeriod!==salary.period)throw new HttpError(400,'Koszt dojazdu musi dotyczyć okresu wybranego wynagrodzenia.','ECONOMICS_UNIT_MISMATCH');
 if(body.commuteTimeBasis!==undefined&&body.commuteTimeBasis!=='ROUND_TRIP_MINUTES_PER_WORK_DAY')throw new HttpError(400,'Czas dojazdu podaj w minutach w obie strony na dzień pracy.','ECONOMICS_UNIT_MISMATCH');
 const result=calculateEconomics(salary,input,asOf);return {ack:{scenario:input,result,offerVersion:offer.version},query:{text:'INSERT INTO faro_economics(candidate_id,offer_id,offer_version,scenario,result,updated_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(candidate_id,offer_id) DO UPDATE SET offer_version=excluded.offer_version,scenario=excluded.scenario,result=excluded.result,updated_at=excluded.updated_at',values:[userId,offer.id,offer.version,JSON.stringify(input),JSON.stringify(result),asOf]}};
}
interface EconomicsDatabase {readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;query(text:string,values:readonly unknown[]):Promise<unknown>;transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;}
export async function readEconomics(database:EconomicsDatabase,userId:string,offerId:string,asOf:string,authorize:()=>void|Promise<void>){return database.transaction(async()=>{await authorize();await offerDetailOwned(database,userId,offerId,asOf);return economicsFromRows((await database.readBatch([economicsReadQuery(userId,offerId)]))[0]??[]);},{readOnly:true});}
export async function saveEconomics(database:EconomicsDatabase,userId:string,offerId:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>){return database.transaction(async()=>{await authorize();const offer=await offerDetailOwned(database,userId,offerId,asOf),plan=economicsWritePlan(userId,offer,body,asOf);await database.query(plan.query.text,plan.query.values);return plan.ack;});}
