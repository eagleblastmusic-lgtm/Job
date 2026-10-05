import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
import { SKILL_CATALOG } from '../domain/faro/skillCatalog.js';
import { faroFixture } from './faro-fixture.js';

test('authored task guidance is catalog-only, stable and immutable; it does not rewrite existing declarations or infer credential certification',async()=>{
  const f=await faroFixture();try {
    const user=await f.user('GuidanceUser'),guides=SKILL_CATALOG.filter(s=>s.levelGuidance);
    assert.equal(guides.length,5);assert.ok(guides.every(s=>s.kind==='ACTIVITY'&&s.canonicalURI===null&&s.levelGuidance!.status==='AUTHOR_DRAFT'&&Object.isFrozen(s.levelGuidance)));
    assert.equal(SKILL_CATALOG.find(s=>s.id==='faro:legacy:7')!.levelGuidance,undefined);
    await f.request('/api/faro/profile',user.cookie,'PUT',{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
    await f.request('/api/faro/claims',user.cookie,'POST',{skillId:guides[0]!.id,level:'INDEPENDENT',source:'HOBBY',practice:{quantity:3,unit:'TASKS'},confirmed:true},201);
    const before=await f.request('/api/faro/profile',user.cookie);
    const catalog=await f.request<{skills:typeof SKILL_CATALOG}>('/api/faro/catalog',user.cookie);assert.equal(catalog.skills.find(s=>s.id===guides[0]!.id)!.levelGuidance!.INDEPENDENT,guides[0]!.levelGuidance!.INDEPENDENT);
    assert.deepEqual(await f.request('/api/faro/profile',user.cookie),before);
    const projection=await f.request<{projection:{skillClaims:Array<{verification:string}>}}>('/api/faro/profile/preview-confirmation',user.cookie);assert.equal(projection.projection.skillClaims[0]!.verification,'DECLARED');assert.doesNotMatch(JSON.stringify(projection),/AUTHOR_DRAFT|levelGuidance|FARO_ASSESSMENT/);
  }finally{await f.close();}
});

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
