import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

/** The reviewed register is explicit authority. Unknown tasks never default to DONE. */
export function reconcileTaskRegister(coverage,matrix,registry){
 const ids=Array.from({length:86},(_,i)=>`K${String(i+1).padStart(3,'0')}`),states=new Set(['DONE','DELTA_REQUIRED','EXTERNAL_BLOCKED','DEFERRED']);
 if(JSON.stringify(Object.keys(coverage.backlog).sort())!==JSON.stringify(ids))throw new Error('Canonical task coverage mismatch');
 if(!Array.isArray(registry.tasks)||registry.tasks.length!==86||new Set(registry.tasks.map(task=>task.id)).size!==86||JSON.stringify(registry.tasks.map(task=>task.id).sort())!==JSON.stringify(ids))throw new Error('Explicit task classifications required for all 86 requirements');
 const classified=new Map(registry.tasks.map(task=>[task.id,task]));
 return {...registry,tasks:ids.map(id=>{
   const task=classified.get(id),requirement=new RegExp(`^### ${id} — (.+)$`,'m').exec(matrix)?.[1]?.trim();
   if(!requirement||!states.has(task.status)||typeof task.reason!=='string'||!task.reason.trim()||typeof task.technicalEvidence!=='string'||!task.technicalEvidence.trim())throw new Error('Missing reviewed status/reason/evidence for '+id);
   if(task.technicalStatus!==undefined&&!states.has(task.technicalStatus))throw new Error('Missing reviewed technical subitem status for '+id);
   return {...task,requirement,checkpoint:coverage.backlog[id]};
 })};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const coverage=JSON.parse(await readFile('docs/faro/planning-coverage.json','utf8')),matrix=await readFile('docs/faro/02_CANONICAL_GAP_MATRIX.md','utf8'),path='docs/faro/CURRENT_TASK_STATUS.json',current=JSON.parse(await readFile(path,'utf8'));
 const registry=reconcileTaskRegister(coverage,matrix,current);
 if(process.argv.includes('--check')){if(JSON.stringify(registry)!==JSON.stringify(current))throw new Error('Task titles/checkpoints differ from canonical coverage');}
 else await writeFile(path,JSON.stringify(registry,null,2)+'\n');
 console.log(JSON.stringify({operation:'FARO_CURRENT_TASK_COVERAGE',total:registry.tasks.length,statuses:registry.tasks.reduce((counts,task)=>({...counts,[task.status]:(counts[task.status]??0)+1}),{}),technicalDeltas:registry.tasks.filter(task=>task.technicalStatus==='DELTA_REQUIRED').map(task=>task.id)}));
}
