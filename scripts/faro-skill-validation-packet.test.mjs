import test from 'node:test';
import assert from 'node:assert/strict';
import {validationPacket,validateReview} from './faro-skill-validation-packet.mjs';
import {SKILL_CATALOG} from '../dist/domain/faro/skillCatalog.js';
test('alias collision diagnostics never create empirical equivalence or participants',()=>{
 const packet=validationPacket([{id:'a',label:'Test',aliases:['Test']},{id:'b',label:'TEST',aliases:[]}]);
 assert.equal(packet.aliasCollisions.length,1);assert.deepEqual(packet.aliasCollisions[0].skillIds,['a','b']);
 assert.deepEqual(packet.participants,[]);assert.deepEqual(packet.empiricalResults,[]);assert.equal(packet.reviewContract.matchingEffect,'NONE');
 assert.throws(()=>validationPacket([{id:'a',label:'Test',aliases:[]},{id:'a',label:'Else',aliases:[]}]),/DUPLICATE/);
});
test('review input pins catalog and references but never certifies empirical validity',()=>{
 const packet=validationPacket(),review={catalogHash:packet.catalogHash,skillIds:SKILL_CATALOG.slice(0,2).map(skill=>skill.id),relation:'POSSIBLE_OVERLAP',reviewerReference:'TEST_ONLY',evidenceReference:'TEST_ONLY',studyScope:'TEST_ONLY',limitations:'TEST_ONLY'};
 assert.equal(validateReview(review,packet).matchingEffect,'NONE');
 for(const invalid of [{...review,catalogHash:'wrong'},{...review,skillIds:['unknown',review.skillIds[1]]},{...review,relation:'EMPIRICALLY_EQUIVALENT'},{...review,evidenceReference:''},{...review,verified:true}])assert.throws(()=>validateReview(invalid,packet),/INVALID_SKILL_REVIEW/);
});
