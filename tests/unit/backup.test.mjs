import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as B from '../../app/js/backup.js';
import * as Q from '../../app/js/quiz-core.js';

const sha256 = async (u8) => createHash('sha256').update(u8).digest('hex');
const toBase64 = async (blob) => Buffer.from(await blob.arrayBuffer()).toString('base64');
const fromBase64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));
function blank() { return { schema: 1, name: '', sems: [], lit: {}, seen: {}, notes: {}, tasksDone: {}, deadlines: [], lastImport: [], coins: 0, shields: 0, lvl: {}, pin: {}, deco: {}, paid: {}, how: {}, scenery: {}, sceneOwn: {}, iliasKnown: {}, iliasDismissed: {}, iliasHash: {}, iliasImported: {}, lastBackup: 0, activeSem: null }; }
/* the real app's clean(): here a light stand-in with the same contract */
function prepareState(s) {
  if (!s || typeof s.schema !== 'number') throw new Error('shape');
  if (s.schema > 1) { const e = new Error('newer'); e.newer = true; throw e; }
  if (!Array.isArray(s.sems) || !Array.isArray(s.deadlines)) throw new Error('lists');
  return Object.assign(blank(), JSON.parse(JSON.stringify(s)));
}
const deps = { prepareState, fromBase64, sha256, upgradeBank: Q.upgradeBank, validQuestion: Q.validQuestion };
const sem = (id, mods) => ({ id, name: 'Sem ' + id, start: '', demo: false, finished: false, modules: mods.map((m) => ({ id: m, code: m.toUpperCase(), name: m, kw: '', h: 10, units: 3, titles: [], base: {} })) });
const sampleState = () => { const s = blank(); s.sems = [sem('s1', ['m1', 'm2'])]; s.activeSem = 's1'; s.lit = { 'm1:1': 1000, 'm1:2': 2000 }; s.coins = 120; s.notes = { 'm1:1': 'my note' }; s.deco = { m1: { tree: 2, lamp: true, hue: 40 } }; s.sceneOwn = { snow: 1 }; s.deadlines = [{ id: 'd1', date: '2026-11-03', mod: 'm1', kind: 'Exam', title: 'Midterm' }]; return s; };
async function mkFile(name, text, sem = 's1', mod = 'm1') {
  const bytes = Buffer.from(text); const blob = new Blob([bytes], { type: 'text/plain' });
  return { rec: { id: 'f' + name.replace(/\W/g, ''), name, size: bytes.length, type: 'text/plain', hash: createHash('sha256').update(bytes).digest('hex'), sem, mod, unit: 1, status: 'imported', include: true, confirmed: true, flag: false, text: 'cached text must not be saved' }, blob };
}
async function makeBackup(files, banks = {}, state = sampleState()) {
  const blobs = new Map(files.map((f) => [f.rec.id, f.blob]));
  const out = await B.buildFullBackup({ state, banks, files: files.map((f) => f.rec) }, { readBlob: async (id) => blobs.get(id), toBase64, now: () => 0 });
  return { ...out, blob: new Blob(out.parts) };
}

test('full backup round-trip: files, assignments, progress, notes, deadlines, banks, city, coins', async () => {
  const f1 = await mkFile('week1.txt', 'Hello from week one'), f2 = await mkFile('week2.txt', 'Second file ' + 'x'.repeat(5000));
  const bank = Q.newBank(); Q.addQuestions(bank, [{ id: 'q1', q: 'What does the first concept describe?', o: ['alpha', 'beta', 'gamma', 'delta'], a: 1, e: 'e', src: 'local' }], f1.rec.hash, 'week1.txt'); bank.stats.q1 = { asked: 2, miss: 1 };
  const made = await makeBackup([f1, f2], { 'm1:1': bank });
  assert.equal(made.files, 2);
  const got = await B.readBackup(made.blob, deps);
  assert.equal(got.kind, 'full');
  assert.equal(got.files.length, 2);
  const g1 = got.files.find((f) => f.meta.id === f1.rec.id);
  assert.equal(await g1.blob.text(), 'Hello from week one');
  assert.equal(g1.meta.mod, 'm1'); assert.equal(g1.meta.unit, 1); assert.equal(g1.meta.status, 'imported');
  assert.equal(g1.meta.text, undefined);
  assert.equal(got.state.coins, 120);
  assert.deepEqual(got.state.deco.m1, { tree: 2, lamp: true, hue: 40 });
  assert.equal(got.state.notes['m1:1'], 'my note');
  assert.equal(got.state.deadlines[0].title, 'Midterm');
  assert.equal(got.state.lit['m1:2'], 2000);
  assert.equal(got.banks['m1:1'].stats.q1.miss, 1);
  assert.equal(got.banks['m1:1'].q.length, 1);
  assert.equal(B.describeBackup(got).files, 2);
});

test('light backup (a single JSON line) is still restorable', async () => {
  const got = await B.readBackup(new Blob([B.lightBackupText(sampleState())]), deps);
  assert.equal(got.kind, 'light');
  assert.equal(got.files.length, 0);
  assert.equal(got.state.coins, 120);
});

test('pretty-printed light backup is accepted too', async () => {
  const got = await B.readBackup(new Blob([JSON.stringify(sampleState(), null, 2)]), deps);
  assert.equal(got.kind, 'light');
});

async function rejects(blob, pattern) {
  await assert.rejects(() => B.readBackup(blob, deps), (e) => { assert.ok(e instanceof B.BackupError, String(e)); assert.match(e.message, pattern); assert.match(e.message, /Nothing was changed/); return true; });
}

test('a truncated backup is rejected before anything is applied', async () => {
  const f1 = await mkFile('a.txt', 'aaaa'), made = await makeBackup([f1]);
  const text = made.parts.join('');
  await rejects(new Blob([text.slice(0, text.lastIndexOf('{"t":"end"'))]), /cut off|incomplete/);
  await rejects(new Blob([text.slice(0, text.length - 60)]), /damaged|cut off/);
});

test('a file whose content was changed fails its checksum', async () => {
  const f1 = await mkFile('a.txt', 'original content'), made = await makeBackup([f1]);
  const lines = made.parts.join('').split('\n');
  const i = lines.findIndex((l) => l.includes('"t":"file"')), obj = JSON.parse(lines[i]);
  obj.data = Buffer.from('tampered content').toString('base64');   // same length as the original (16 bytes)
  obj.meta.size = 16;
  lines[i] = JSON.stringify(obj);
  await rejects(new Blob([lines.join('\n')]), /checksum/);
});

test('a file with the wrong size is reported as incomplete', async () => {
  const f1 = await mkFile('a.txt', 'original content'), made = await makeBackup([f1]);
  const lines = made.parts.join('').split('\n');
  const i = lines.findIndex((l) => l.includes('"t":"file"')), obj = JSON.parse(lines[i]);
  obj.data = Buffer.from('short').toString('base64'); lines[i] = JSON.stringify(obj);
  await rejects(new Blob([lines.join('\n')]), /incomplete/);
});

test('garbage, empty, newer-version and unknown-record files are rejected', async () => {
  await rejects(new Blob(['hello world']), /not a (valid )?Booklyn backup/);
  await rejects(new Blob(['']), /empty/);
  await rejects(new Blob(['{"schema":99,"sems":[],"deadlines":[]}']), /newer/);
  await rejects(new Blob(['{"foo":1}']), /not a Booklyn backup/);
  const made = await makeBackup([]);
  const lines = made.parts.join('').split('\n'); lines.splice(2, 0, '{"t":"mystery"}');
  await rejects(new Blob([lines.join('\n')]), /does not understand/);
});

test('an invalid file id in the backup is rejected (ids end up in the page)', async () => {
  const f1 = await mkFile('a.txt', 'aaaa'); f1.rec.id = 'bad id"><script>';
  const made = await makeBackup([f1]);
  await rejects(made.blob, /invalid id/);
});

test('files whose semester is not in the backup are skipped with a note', async () => {
  const f1 = await mkFile('a.txt', 'aaaa', 'ghost'), made = await makeBackup([f1]);
  const got = await B.readBackup(made.blob, deps);
  assert.equal(got.files.length, 0);
  assert.ok(got.notes.some((n) => /skipped/.test(n)));
});

test('missing blobs are listed instead of failing the backup', async () => {
  const f1 = await mkFile('a.txt', 'aaaa'), f2 = await mkFile('b.txt', 'bbbb');
  const blobs = new Map([[f1.rec.id, f1.blob]]);
  const out = await B.buildFullBackup({ state: sampleState(), banks: {}, files: [f1.rec, f2.rec] }, { readBlob: async (id) => blobs.get(id), toBase64 });
  assert.deepEqual(out.missing, ['b.txt']);
  const got = await B.readBackup(new Blob(out.parts), deps);
  assert.equal(got.files.length, 1);
  assert.ok(got.notes.some((n) => /could not be saved/.test(n)));
});

test('merge adds what is missing and keeps what is here', () => {
  const cur = sampleState(); cur.coins = 50; cur.lit = { 'm1:1': 5000 }; cur.notes = { 'm1:1': 'local note' }; cur.deco = { m1: { tree: 1, hue: 200 } };
  const inc = sampleState(); inc.sems.push(sem('s2', ['m9'])); inc.lit['m9:1'] = 7; inc.coins = 300; inc.deco.m1 = { tree: 3, lamp: true, hue: 40 };
  inc.deadlines.push({ id: 'd2', date: '2026-12-01', mod: 'm9', kind: 'Test', title: 'New' });
  const { state: out } = B.mergeStates(cur, inc);
  assert.deepEqual(out.sems.map((s) => s.id), ['s1', 's2']);
  assert.equal(out.lit['m1:1'], 5000);          // newer time wins
  assert.equal(out.lit['m1:2'], 2000);          // only in backup: added
  assert.equal(out.lit['m9:1'], 7);
  assert.equal(out.notes['m1:1'], 'local note');
  assert.equal(out.coins, 300);                 // higher wins
  assert.equal(out.deco.m1.tree, 3);            // counts take the higher number
  assert.equal(out.deco.m1.hue, 200);           // this device's choice stays
  assert.equal(out.deco.m1.lamp, true);         // owned item from the backup is added
  assert.deepEqual(out.deadlines.map((d) => d.id).sort(), ['d1', 'd2']);
});

test('merge leaves out a semester whose module ids clash with another semester here', () => {
  const cur = sampleState(), inc = blank();
  inc.sems = [sem('other', ['m1'])];
  const r = B.mergeStates(cur, inc);
  assert.equal(r.state.sems.length, 1);
  assert.deepEqual(r.skippedSems, ['Sem other']);
});

test('merging a question bank keeps questions and the worse answer history of both', () => {
  const a = Q.newBank(), b = Q.newBank();
  Q.addQuestions(a, [{ id: 'q1', q: 'What does the first concept describe?', o: ['alpha', 'beta', 'gamma', 'delta'], a: 0, e: '', src: 'local' }], 'f', 'f.pdf'); a.stats.q1 = { asked: 1, miss: 0 };
  Q.addQuestions(b, [{ id: 'q1', q: 'What does the first concept describe?', o: ['alpha', 'beta', 'gamma', 'delta'], a: 0, e: '', src: 'local' }, { id: 'q2', q: 'What does the second concept describe?', o: ['alpha', 'beta', 'gamma', 'delta'], a: 0, e: '', src: 'local' }], 'f', 'f.pdf'); b.stats.q1 = { asked: 3, miss: 2 };
  const m = B.mergeBanks(a, b);
  assert.equal(m.q.length, 2);
  assert.deepEqual(m.stats.q1, { asked: 3, miss: 2 });
});

test('the data map says what syncs and what stays on the device', () => {
  const files = B.DATA_MAP.find((d) => /Imported files/.test(d.what));
  assert.equal(files.sync, false); assert.equal(files.full, true); assert.equal(files.light, false);
  assert.equal(B.DATA_MAP.find((d) => /Semesters/.test(d.what)).sync, true);
});
