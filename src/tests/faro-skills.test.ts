import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);

test('persisted Faro skill IDs retain meaning when historical ontology is reordered or extended',async()=>{
  // Isolated import order proves the original index-based mapping counterexample.
  const ontology=new URL('../domain/ontology.js',import.meta.url).href,skills=new URL('../domain/faro/skills.js',import.meta.url).href;
  const script=`const {ONTOLOGY}=await import(${JSON.stringify(ontology)});ONTOLOGY.reverse();ONTOLOGY.unshift({family:'test',canonical:'UNREVIEWED_ADDITION',aliases:['unreviewed'],type:'SKILL'});const {SKILL_CATALOG,skillById,suggestSkills}=await import(${JSON.stringify(skills)});console.log(JSON.stringify({first:skillById('faro:legacy:1')?.label,sql:skillById('faro:legacy:4')?.label,activity:skillById('faro:activity:customer-service')?.label,added:SKILL_CATALOG.some(s=>s.label==='UNREVIEWED_ADDITION'),suggestions:suggestSkills('pracowałem na stacji').map(s=>s.skillId),frozen:Object.isFrozen(SKILL_CATALOG)&&SKILL_CATALOG.every(s=>Object.isFrozen(s)&&Object.isFrozen(s.aliases)),count:SKILL_CATALOG.length,uri:skillById('faro:legacy:4')?.canonicalURI}));`;
  const {stdout}=await execFileAsync(process.execPath,['--input-type=module','-e',script]);
  const r=JSON.parse(stdout) as {first:string;sql:string;activity:string;added:boolean;suggestions:string[];frozen:boolean;count:number;uri:null};
  assert.equal(r.first,'Excel');assert.equal(r.sql,'SQL');assert.equal(r.activity,'Obsługa klienta');assert.equal(r.added,false);
  assert.equal(r.frozen,true);assert.equal(r.count,23);assert.equal(r.uri,null);
  assert.ok(r.suggestions.includes('faro:activity:customer-service'));assert.ok(r.suggestions.includes('faro:activity:cash-register'));
});
