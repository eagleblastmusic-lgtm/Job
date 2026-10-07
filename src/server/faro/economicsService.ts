import { FaroStore } from './base.js';
import { OfferService } from './offerService.js';
import { economicsReadQuery,economicsFromRows,economicsWritePlan } from './economicsModel.js';
export class EconomicsService extends FaroStore {
  get(userId:string,offerId:string){new OfferService(this.database,this.clock).detail(userId,offerId);const query=economicsReadQuery(userId,offerId);return economicsFromRows(this.db.prepare(query.text).all({$1:userId,$2:offerId}));}
  save(userId:string,offerId:string,body:Record<string,unknown>){return this.transaction(()=>{const offer=new OfferService(this.database,this.clock).detail(userId,offerId),plan=economicsWritePlan(userId,offer,body,this.now());this.db.prepare(plan.query.text).run(Object.fromEntries(plan.query.values.map((value,index)=>[`$${index+1}`,value])));return plan.ack;});}
}
