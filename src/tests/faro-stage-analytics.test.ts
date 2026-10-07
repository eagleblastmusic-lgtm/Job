import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { compactStageTerms,pairStagePlan } from '../server/faro/stageAnalytics.js';

test('target employment terms compact exactly like SQLite while preserving key order, duplicate keys, escapes and numeric spelling',()=>{
  const db=new DatabaseSync(':memory:');try{
    const samples=['{ "revision" : 5, "sourceVersion": 1, "note": "two  spaces" }','{"nested":[1.0,1e0,{"a":"\\u0061","b":"a\\\\\\\" b"}]}','{"duplicate":1,"duplicate":2}','{"x":"\\t \\n","y":true,"z":null}'];
    for(const terms of samples){const extracted=db.prepare("SELECT json_extract(?, '$.employmentOffer') AS terms").get(`{"employmentOffer":${terms}}`)!.terms;assert.equal(compactStageTerms(terms),extracted);}
    for(const [left,right] of [['{"a":1,"b":2}','{"b":2,"a":1}'],['{"x":1}','{"x":1.0}'],['{"x":"a"}','{"x":"\\u0061"}']])assert.notEqual(compactStageTerms(left!),compactStageTerms(right!));
  }finally{db.close();}
});

test('pair-week analytics keeps v1 dedupe across stages and rejects absent, revoked, later or invalid-time consent',()=>{
  const source={candidate_id:'candidate',offer_id:'offer',occurred_at:'2026-10-11T23:59:59.000Z'},consent={granted:1,created_at:'2026-10-05T00:00:00.000Z'};
  const accepted=pairStagePlan(source,consent,'OFFER_ACCEPTED')!,interview=pairStagePlan(source,consent,'INTERVIEW_COMPLETED')!;
  assert.equal(accepted.values[0],interview.values[0]);assert.deepEqual(JSON.parse(accepted.values[2]!),{definitionVersion:'faro-mutual-stage-pair-week-v2',weekStart:'2026-10-05T00:00:00.000Z',stage:'OFFER_ACCEPTED'});
  for(const denied of [undefined,{granted:0,created_at:consent.created_at},{granted:1,created_at:'2026-10-12T00:00:00.000Z'}])assert.equal(pairStagePlan(source,denied,'OFFER_ACCEPTED'),null);
  assert.equal(pairStagePlan({...source,occurred_at:'invalid'},consent,'OFFER_ACCEPTED'),null);assert.equal(pairStagePlan(undefined,consent,'OFFER_ACCEPTED'),null);assert.notEqual(pairStagePlan({...source,occurred_at:'2026-10-12T00:00:00.000Z'},consent,'OFFER_ACCEPTED')!.values[0],accepted.values[0]);
});
