import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

for(const [finding,flag,proof] of [
  ['FARO-AUDIT-001','--erasure-only','FARO_AUDIT_001_ERASURE_RESTORE_PASS'],
  ['FARO-AUDIT-002','--replay-only','FARO_AUDIT_002_REPLAY_PASS']
])test(`${finding}: real SQLite HTTP command journal regression`,async()=>{
  const result=await promisify(execFile)(process.execPath,['scripts/faro-command-journal-proof.mjs',flag!],{windowsHide:true});
  assert.ok(result.stdout.includes(proof!));assert.ok(result.stdout.includes('FARO_COMMAND_JOURNAL_PROOF_CLEANUP_PASS'));
});
