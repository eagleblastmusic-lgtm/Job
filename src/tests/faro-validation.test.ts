import test from 'node:test';
import assert from 'node:assert/strict';
import {date} from '../server/faro/validation.js';

test('canonical dates reject calendar rollover and ambiguous clocks before normalizing explicit offsets',()=>{
  for(const raw of ['2027-02-29T12:00:00Z','2028-02-30T12:00:00Z','2100-02-29T12:00:00Z','2026-04-31T12:00:00Z','2026-00-01T12:00:00Z','2026-13-01T12:00:00Z','2026-01-00T12:00:00Z','2026-01-01T24:00:00Z','2026-01-01T12:60:00Z','2026-01-01T12:00:60Z','2026-01-01T12:00:00+24:00','2026-01-01T12:00:00+02:60','2026-01-01T12:00:00','2026-01-01TgarbageZ','2026-01-01T12:00:00.1234Z'])assert.throws(()=>date(raw),(e:unknown)=>e instanceof Error&&'status' in e&&e.status===400,raw);
  assert.equal(date('2028-02-29T12:00:00+02:00'),'2028-02-29T10:00:00.000Z');
  assert.equal(date('2000-02-29T23:30:00-02:00'),'2000-03-01T01:30:00.000Z');
  assert.equal(date('2026-01-01T00:30:00+01:00'),'2025-12-31T23:30:00.000Z');
  assert.equal(date('2026-01-01T12:00:00.1Z'),'2026-01-01T12:00:00.100Z');
  assert.equal(date('2026-01-01T12:00:00.12Z'),'2026-01-01T12:00:00.120Z');
});
