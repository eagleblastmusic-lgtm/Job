import test from 'node:test';
import assert from 'node:assert/strict';
import { coordinates, straightLineDistance } from '../domain/faro/geography.js';
import { faroFixture } from './faro-fixture.js';

test('geographic distance validates inputs and never invents routing or transit information',()=>{
  for(const value of [null,[],{}, {latitude:NaN,longitude:0},{latitude:91,longitude:0},{latitude:0,longitude:Infinity},{latitude:'0',longitude:0}])assert.throws(()=>coordinates(value));
  const a={latitude:0,longitude:179},b={latitude:0,longitude:-179};
  assert.equal(straightLineDistance(a,a).distanceMeters,0);
  assert.equal(straightLineDistance(a,b).distanceMeters,222390);
  assert.deepEqual(straightLineDistance(a,b),straightLineDistance(b,a));
  assert.equal(straightLineDistance(a,b).commuteMinutes,null);
  assert.equal(straightLineDistance(a,b).transitFare,null);
});
test('authenticated geography API stays offline and preserves manual economics',async()=>{
  const f=await faroFixture();try{
    await f.request('/api/faro/geography','','GET',undefined,401);
    const user=await f.user('Geo');
    const capability=await f.request('/api/faro/geography',user.cookie);
    assert.equal(capability.dataBasis,'OPENSTREETMAP');assert.equal(capability.routing,'UNCONFIGURED');
    assert.equal(capability.publicServiceRequestsEnabled,false);assert.equal(capability.manualEconomicsAvailable,true);
    await f.request('/api/faro/geography/distance',user.cookie,'POST',{from:{latitude:52,longitude:21},to:{latitude:52,longitude:21}});
    await f.request('/api/faro/geography/distance',user.cookie,'POST',{from:{latitude:92,longitude:21},to:{}},400);
  }finally{await f.close();}
});
