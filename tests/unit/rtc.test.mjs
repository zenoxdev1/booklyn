import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { addSignal, readSignals, clearSignals, validSignal, SIGNAL_TTL_MS, MAX_ROWS_PER_USER } from '../../functions/api/_rtclib.mjs';

// A tiny D1-shaped wrapper over SQLite so the real SQL is exercised.
function d1() {
  const db = new DatabaseSync(':memory:');
  const sql = readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8');
  db.exec(sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS rtc_signals')));
  return {
    prepare(q) {
      const st = db.prepare(q); let args = [];
      const o = {
        bind(...a) { args = a; return o; },
        async run() { const r = st.run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
        async first() { return st.get(...args) || null; },
        async all() { return { results: st.all(...args) }; },
      };
      return o;
    },
  };
}
const A = 'device-aaaa1111', B = 'device-bbbb2222', S = 'session-12345678';
const msg = (o) => ({ from: A, to: B, session: S, kind: 'offer', payload: '{"sdp":"x"}', ...o });

test('a device sees what was sent to it or to everyone, not its own messages', async () => {
  const db = d1();
  await addSignal(db, 1, msg({ from: B, to: null, kind: 'hello', payload: '{}' }));
  await addSignal(db, 1, msg({}));
  const forB = await readSignals(db, 1, B, 0);
  assert.deepEqual(forB.rows.map((r) => r.kind), ['offer'], 'B gets the offer but not its own hello');
  const forA = await readSignals(db, 1, A, 0);
  assert.deepEqual(forA.rows.map((r) => r.kind), ['hello'], 'A gets the broadcast hello');
});

test('another account never sees the messages', async () => {
  const db = d1();
  await addSignal(db, 1, msg({}));
  assert.equal((await readSignals(db, 2, B, 0)).rows.length, 0);
});

test('since skips what was already read', async () => {
  const db = d1();
  const a = await addSignal(db, 1, msg({ kind: 'ice' }));
  await addSignal(db, 1, msg({ kind: 'ice' }));
  const r = await readSignals(db, 1, B, a.id);
  assert.equal(r.rows.length, 1);
});

test('old messages are deleted', async () => {
  const db = d1(); const t0 = 1_000_000;
  await addSignal(db, 1, msg({}), t0);
  const r = await readSignals(db, 1, B, 0, t0 + SIGNAL_TTL_MS + 1);
  assert.equal(r.rows.length, 0);
});

test('input is validated and the number of rows is capped', async () => {
  const db = d1();
  assert.equal((await addSignal(db, 1, msg({ kind: 'nope' }))).status, 400);
  assert.equal((await addSignal(db, 1, msg({ from: 'x' }))).status, 400);
  assert.equal((await addSignal(db, 1, msg({ payload: 'x'.repeat(17000) }))).status, 400);
  assert.equal(validSignal(msg({})), '');
  for (let i = 0; i < MAX_ROWS_PER_USER; i++) assert.ok((await addSignal(db, 1, msg({ kind: 'ice' }))).ok);
  assert.equal((await addSignal(db, 1, msg({ kind: 'ice' }))).status, 429);
});

test('a device can remove what it sent', async () => {
  const db = d1();
  await addSignal(db, 1, msg({}));
  await clearSignals(db, 1, A);
  assert.equal((await readSignals(db, 1, B, 0)).rows.length, 0);
});

test('the SQL for the new table is in schema.sql', () => {
  assert.match(readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8'), /CREATE TABLE IF NOT EXISTS rtc_signals/);
});
