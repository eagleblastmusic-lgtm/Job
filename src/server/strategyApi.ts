import type { IncomingMessage,ServerResponse } from 'node:http';
import type { JobDatabase } from './db.js';
import type { AppConfig } from './config.js';
import { AppStore } from './store.js';
import { HttpError,sendJson } from './http.js';
import { FeatureFlagService } from './featureFlagService.js';
import { StrategyService } from './strategyService.js';
import { enforceExtendedOrigin,requireExtendedUser } from './extendedAuth.js';
export async function handleStrategyApi(req:IncomingMessage,res:ServerResponse,pathname:string,store:AppStore,db:JobDatabase,config:AppConfig):Promise<boolean>{if(!pathname.startsWith('/api/strategy'))return false;enforceExtendedOrigin(req,config);const user=requireExtendedUser(req,store);if(!new FeatureFlagService(db).isEnabled('strategy_engine',{userId:user.id,role:user.role}))throw new HttpError(404,'Strategia nie jest obecnie dostępna.','FEATURE_DISABLED');if((req.method??'GET')==='GET'&&pathname==='/api/strategy'){const report=new StrategyService(db).build(user.id);store.analytics(user.id,'strategy_viewed',{confidence:report.confidence,recommendationCount:report.recommendations.length});sendJson(res,200,{report});return true;}sendJson(res,404,{error:{code:'NOT_FOUND',message:'Nie znaleziono endpointu.'}});return true;}
