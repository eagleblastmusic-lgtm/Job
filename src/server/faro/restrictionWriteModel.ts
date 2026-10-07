import { HttpError } from '../http.js';
import { text,integer } from './validation.js';
import { runCommandOnce } from './commandJournal.js';
import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
import { restrictionReadQuery,restrictionFromRows,restrictionModeratorOwned,moderationReadAudit,type RestrictionRow,type TrustReadDatabase } from './trustReadModel.js';
import { tickNotificationQuery } from './trustTickModel.js';
export function restrictionAppealQueries(userId:string,row:RestrictionRow,body:Record<string,unknown>,asOf:string){
 if(integer(body.expectedVersion,1)!==row.revision)throw new HttpError(409,'Odśwież ograniczenie.','VERSION_CONFLICT');
 if(row.state!=='ACTIVE'||row.appeal)throw new HttpError(409,'Odwołanie nie jest teraz dostępne.');
 return [{text:'UPDATE faro_restrictions SET appeal=$1,appealed_at=$2,appeal_by=$3,revision=revision+1 WHERE id=$4',values:[text(body.reason,1500,10),asOf,userId,row.id]},moderationReadAudit(userId,'RESTRICTION_APPEALED',row.id,asOf)];
}
export function restrictionRestoreQueries(userId:string,row:RestrictionRow,body:Record<string,unknown>,asOf:string){
 if(integer(body.expectedVersion,1)!==row.revision)throw new HttpError(409,'Odśwież ograniczenie.','VERSION_CONFLICT');
 if(row.state!=='ACTIVE')throw new HttpError(409,'Ograniczenie zostało już rozpatrzone.');
 if(body.confirmed!==true)throw new HttpError(400,'Potwierdź ręczne sprawdzenie warunków przywrócenia.','CONFIRMATION_REQUIRED');
 return [{text:"UPDATE faro_restrictions SET state='RESTORED',restoration_reason=$1,restored_at=$2,restored_by=$3,revision=revision+1 WHERE id=$4",values:[text(body.reason,1500,10),asOf,userId,row.id]},
 {text:"UPDATE faro_organizations SET verification='PENDING' WHERE id=$1 AND verification='RESTRICTED' AND NOT EXISTS(SELECT 1 FROM faro_restrictions WHERE organization_id=$1 AND state='ACTIVE')",values:[row.organization_id]},moderationReadAudit(userId,'RESTRICTION_RESTORED',row.id,asOf)];
}
export async function appealOrganizationRestriction(database:TrustReadDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>){let row:RestrictionRow;return runCommandOnce(database,userId,body.idempotencyKey,{...body,id,operation:'RESTRICTION_APPEAL'},asOf,async()=>{await authorize();row=restrictionFromRows((await database.readBatch([restrictionReadQuery(id)]))[0]??[]);membershipFromRows((await database.readBatch([membershipReadQuery(userId,row.organization_id)]))[0]??[],['OWNER','ADMIN']);},async()=>{
 const recipients=(await database.readBatch([{text:"SELECT id FROM users WHERE role='ADMIN'",values:[]}]))[0]??[];
 for(const query of [...restrictionAppealQueries(userId,row,body,asOf),...recipients.map(recipient=>tickNotificationQuery(recipient.id as string,'organization',row.organization_id,'Odwołanie od ograniczenia organizacji wymaga ręcznego przeglądu.',`restriction:${id}:appeal`,asOf))])await database.query(query.text,query.values);return {id};
});}
export async function restoreOrganizationRestriction(database:TrustReadDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>){let row:RestrictionRow;return runCommandOnce(database,userId,body.idempotencyKey,{...body,id,operation:'RESTRICTION_RESTORE'},asOf,async()=>{await authorize();row=restrictionFromRows((await database.readBatch([restrictionReadQuery(id)]))[0]??[]);if(!await restrictionModeratorOwned(database,userId,row))throw new HttpError(403,'Wymagany niezależny moderator.','MODERATION_CONFLICT');},async()=>{
 const recipients=(await database.readBatch([{text:"SELECT user_id FROM faro_members WHERE organization_id=$1 AND active=1 AND role IN ('OWNER','ADMIN')",values:[row.organization_id]}]))[0]??[];
 for(const query of [...restrictionRestoreQueries(userId,row,body,asOf),...recipients.map(recipient=>tickNotificationQuery(recipient.user_id as string,'organization',row.organization_id,'Zmieniono stan ograniczenia organizacji. Sprawdź zakres i ręczny przegląd.',`restriction:${id}:${row.revision+1}`,asOf))])await database.query(query.text,query.values);return {id};
});}
