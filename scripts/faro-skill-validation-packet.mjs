import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {SKILL_CATALOG} from '../dist/domain/faro/skillCatalog.js';
import {normalizeText} from '../dist/domain/ontology.js';

/** Catalog diagnostics generate hypotheses only. No user records or invented research. */
export function validationPacket(catalog=SKILL_CATALOG){
 const ids=new Set(),aliases=new Map();
 for(const skill of catalog){
  if(ids.has(skill.id))throw new Error('DUPLICATE_CATALOG_ID');ids.add(skill.id);
  for(const label of new Set([skill.label,...skill.aliases].map(normalizeText))){
   if(!label)continue;const matches=aliases.get(label)??[];matches.push(skill.id);aliases.set(label,matches);
  }
 }
 return {schemaVersion:'faro-skill-validation-packet-v1',catalogHash:createHash('sha256').update(JSON.stringify(catalog)).digest('hex'),
  conceptCount:catalog.length,participants:[],empiricalResults:[],
  aliasCollisions:[...aliases].filter(([,ids])=>ids.length>1).sort(([a],[b])=>a.localeCompare(b,'pl')).map(([alias,skillIds])=>({alias,skillIds,status:'HYPOTHESIS_REQUIRES_REVIEW'})),
  reviewContract:{required:['catalogHash','skillIds','relation','reviewerReference','evidenceReference','studyScope','limitations'],
   permittedRelations:['DISTINCT','POSSIBLE_OVERLAP','POSSIBLE_PREREQUISITE'],
   matchingEffect:'NONE',empiricalValidation:'EXTERNAL_BLOCKED'}};
}
export function validateReview(value,packet=validationPacket()){
 const fail=()=>{throw new Error('INVALID_SKILL_REVIEW');};
 if(!value||typeof value!=='object'||Array.isArray(value))fail();
 const fields=['catalogHash','skillIds','relation','reviewerReference','evidenceReference','studyScope','limitations'];
 if(Object.keys(value).length!==fields.length||fields.some(field=>!Object.hasOwn(value,field)))fail();
 if(value.catalogHash!==packet.catalogHash||!packet.reviewContract.permittedRelations.includes(value.relation))fail();
 const ids=new Set(SKILL_CATALOG.map(skill=>skill.id));
 if(!Array.isArray(value.skillIds)||value.skillIds.length!==2||value.skillIds[0]===value.skillIds[1]||value.skillIds.some(id=>!ids.has(id)))fail();
 for(const field of ['reviewerReference','evidenceReference','studyScope','limitations'])if(typeof value[field]!=='string'||!value[field].trim()||value[field].length>1000)fail();
 return {schemaVersion:'faro-skill-review-v1',status:'REVIEW_RECORDED_NOT_EMPIRICALLY_VALIDATED',matchingEffect:'NONE',review:value};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const args=process.argv.slice(2);
  if(args.length===0)process.stdout.write(JSON.stringify(validationPacket(),null,2)+'\n');
  else if(args.length===2&&args[0]==='--review')process.stdout.write(JSON.stringify(validateReview(JSON.parse(await readFile(args[1],'utf8'))),null,2)+'\n');
  else throw new Error('INVALID_ARGUMENTS');
 }catch{console.error('FARO_SKILL_VALIDATION_REFUSED');process.exitCode=1;}
}
