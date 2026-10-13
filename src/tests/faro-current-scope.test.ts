import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
test('canonical scope generation requires explicit reviewed classification and evidence',async()=>{
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const result=await promisify(execFile)(process.execPath,['--test','--test-reporter=tap','scripts/faro-current-scope.test.mjs'],{windowsHide:true,env});
 assert.match(result.stdout,/(pass 1|# pass 1)/);
});
