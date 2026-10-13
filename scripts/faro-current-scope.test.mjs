import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {reconcileTaskRegister} from './faro-current-scope.mjs';
test('status generation refuses missing/duplicate/unknown classifications and evidence instead of inferring DONE',async()=>{
 const coverage=JSON.parse(await readFile('docs/faro/planning-coverage.json','utf8')),matrix=await readFile('docs/faro/02_CANONICAL_GAP_MATRIX.md','utf8'),registry=JSON.parse(await readFile('docs/faro/CURRENT_TASK_STATUS.json','utf8'));
 assert.deepEqual(reconcileTaskRegister(coverage,matrix,registry),registry);
 for(const mutate of [
   draft=>draft.tasks.splice(draft.tasks.findIndex(task=>task.id==='K047'),1),
   draft=>draft.tasks.push({...draft.tasks[0]}),
   draft=>draft.tasks[0].id='K087',
   draft=>delete draft.tasks[0].status,
   draft=>draft.tasks[0].status='ACCEPTED_BY_DEFAULT',
   draft=>draft.tasks[0].technicalEvidence='',
   draft=>draft.tasks[0].reason='',
   draft=>draft.tasks[0].technicalStatus='DEFAULT_DONE'
 ]){const draft=structuredClone(registry);mutate(draft);assert.throws(()=>reconcileTaskRegister(coverage,matrix,draft));}
 const future=structuredClone(coverage);future.backlog.K087='CP11';assert.throws(()=>reconcileTaskRegister(future,matrix,registry));
});
