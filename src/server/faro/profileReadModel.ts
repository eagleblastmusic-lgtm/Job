import { createHash } from 'node:crypto';
import { HttpError } from '../http.js';
import { employerProjection,skillProposalProvenance } from '../../domain/faro/skills.js';
import type { Claim,Learning,Practice,Availability } from '../../domain/faro/skills.js';
export function profileReadQueries(userId:string) {
  return [
    'SELECT first_name,availability,phone,version,preferences FROM faro_profiles WHERE user_id=$1',
    'SELECT id,skill_id,level,source,practice,verification,version,confirmed_at FROM faro_claims WHERE user_id=$1 AND revoked_at IS NULL ORDER BY confirmed_at,id',
    'SELECT skill_id,mode,practice FROM faro_learning WHERE user_id=$1 ORDER BY skill_id,mode',
    'SELECT id,description,source,created_at,practice FROM faro_activities WHERE user_id=$1 ORDER BY created_at,id',
    'SELECT id,activity_id,skill_id,rationale,model_version,status,created_at,decided_at FROM faro_proposals WHERE user_id=$1 ORDER BY created_at,id'
  ].map(text=>({text,values:[userId]}));
}
export function profileFromRows(rows:Record<string,unknown>[][],asOf:string) {
  const row=rows[0]?.[0] as {first_name:string;phone:string|null;version:number;preferences:string;availability:string}|undefined;
  const claims=(rows[1]??[]).map(raw=>{const c=raw as {id:string;skill_id:string;level:Claim['level'];source:Claim['source'];practice:string;verification:Claim['verification'];version:number;confirmed_at:string};return {id:c.id,skillId:c.skill_id,level:c.level,source:c.source,practice:JSON.parse(c.practice) as Practice,verification:c.verification,version:c.version,confirmedAt:c.confirmed_at};});
  const learning=(rows[2]??[]).map(raw=>{const l=raw as {skill_id:string;mode:Learning['mode'];practice:string};return {skillId:l.skill_id,mode:l.mode,practice:JSON.parse(l.practice) as Practice};});
  const activities=(rows[3]??[]).map(row=>({...row,practice:row.practice===null?null:JSON.parse(row.practice as string) as Practice}));
  return {firstName:row?.first_name??'',phone:row?.phone??null,version:row?.version??0,preferences:row?JSON.parse(row.preferences) as Record<string,unknown>:{},availability:row?JSON.parse(row.availability) as Availability:{kind:'UNKNOWN',value:null,updatedAt:asOf} as Availability,claims,learning,activities,proposals:(rows[4]??[]).map(proposal=>({...proposal,provenance:skillProposalProvenance(proposal.model_version)}))};
}
export async function readProfile(database:{readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>},userId:string,asOf:string) {
  return profileFromRows(await database.readBatch(profileReadQueries(userId)),asOf);
}

export function profileProjection(profile:ReturnType<typeof profileFromRows>,processId='preview') {
  if(!profile.firstName)throw new HttpError(400,'Najpierw zapisz swoje imię w profilu.','PROFILE_REQUIRED');
  return employerProjection(processId,profile.firstName,profile.claims,profile.learning,profile.availability);
}
export function profilePreview(userId:string,profile:ReturnType<typeof profileFromRows>) {
  const projection=profileProjection(profile),confirmationToken=createHash('sha256').update(JSON.stringify({userId,projection})).digest('hex');
  return {projection,confirmationToken};
}
