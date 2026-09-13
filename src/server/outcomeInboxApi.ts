import type { IncomingMessage,ServerResponse } from 'node:http';
import type { JobDatabase } from './db.js';
import type { AppConfig } from './config.js';
import { AppStore } from './store.js';
import { HttpError,readJson,sendJson } from './http.js';
import { FeatureFlagService } from './featureFlagService.js';
import { OutcomeInboxService } from './outcomeInboxService.js';
import { enforceExtendedOrigin,requireExtendedUser } from './extendedAuth.js';

export async function handleOutcomeInboxApi(req:IncomingMessage,res:ServerResponse,pathname:string,store:AppStore,db:JobDatabase,config:AppConfig):Promise<boolean>{
 if(!pathname.startsWith('/api/outcome-inbox'))return false;
 enforceExtendedOrigin(req,config);const user=requireExtendedUser(req,store);
 if(!new FeatureFlagService(db).isEnabled('outcome_inbox',{userId:user.id,role:user.role}))throw new HttpError(404,'Skrzynka wyników nie jest obecnie dostępna.','FEATURE_DISABLED');
 const service=new OutcomeInboxService(db),method=req.method??'GET';
 if(method==='GET'&&pathname==='/api/outcome-inbox'){sendJson(res,200,{items:service.list(user.id)});return true;}
 if(method==='POST'&&pathname==='/api/outcome-inbox/suggestions'){const body=await readJson(req);if(typeof body.applicationId!=='string'||typeof body.text!=='string')throw new HttpError(400,'Wybierz aplikację i wklej wiadomość.','VALIDATION_ERROR');try{const item=service.ingest(user.id,body.applicationId,body.text);store.analytics(user.id,'outcome_inbox_suggestion_created',{suggestedOutcome:item.suggestedOutcome,confidence:item.confidence});sendJson(res,201,{item});}catch(error){throw new HttpError(400,(error as Error).message,'VALIDATION_ERROR');}return true;}
 const match=pathname.match(/^\/api\/outcome-inbox\/([^/]+)\/(confirm|dismiss)$/);
 if(method==='POST'&&match){try{const action=match[2]==='confirm'?'CONFIRM':'DISMISS';const item=service.resolve(user.id,match[1]??'',action);store.analytics(user.id,action==='CONFIRM'?'outcome_inbox_confirmed':'outcome_inbox_dismissed',{suggestedOutcome:item.suggestedOutcome});sendJson(res,200,{item});}catch(error){throw new HttpError(400,(error as Error).message,'VALIDATION_ERROR');}return true;}
 sendJson(res,404,{error:{code:'NOT_FOUND',message:'Nie znaleziono endpointu.'}});return true;
}
