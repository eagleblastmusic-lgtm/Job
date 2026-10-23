import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

test('K063 operational evidence validates real failure signals and refuses invalid evidence',async()=>{
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const result=await promisify(execFile)(process.execPath,['--test','--test-reporter=tap','scripts/faro-performance-proof.test.mjs'],{env,windowsHide:true});
 assert.match(result.stdout,/# pass 1/);assert.match(result.stdout,/# fail 0/);
});
