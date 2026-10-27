import test from 'node:test';
import assert from 'node:assert/strict';
import { ingest, commitPatch, removeFiles } from '../../app/js/imports.js';

/* A tiny fake of the file storage that can be told to fail. */
function fakeStore() {
  const s = { metas: new Map(), failOn: null, failPutMany: false, failDel: false,
    async add(rec, blob) { if (s.failOn && s.failOn(rec)) { const e = new Error('boom'); e.name = s.failName || 'UnknownError'; throw e; } s.metas.set(rec.id, { rec: { ...rec }, blob }); },
    async putMany(list) { if (s.failPutMany) throw new Error('write failed'); list.forEach((r) => s.metas.set(r.id, { rec: { ...r } })); },
    async delMany(ids) { if (s.failDel) throw new Error('delete failed'); ids.forEach((i) => s.metas.delete(i)); } };
  return s;
}
const mk = (name, hash) => ({ name, hash, size: 3 });
let n = 0;
const base = (store, files, extra = {}) => ({ files, store, hashOf: async (f) => f.hash, build: (f, h) => ({ id: 'id' + (++n), name: f.name, hash: h, status: 'pending' }), isQuota: (e) => e.name === 'QuotaExceededError', explain: (e) => 'reason:' + e.name, ...extra });

test('a file is listed only after its write was confirmed', async () => {
  const store = fakeStore(), files = [];
  store.failOn = (r) => r.name === 'b.pdf';
  const r = await ingest([mk('a.pdf', 'h1'), mk('b.pdf', 'h2'), mk('c.pdf', 'h3')], base(store, files));
  assert.deepEqual(files.map((f) => f.name), ['a.pdf', 'c.pdf']);
  assert.equal(r.added.length, 2);
  assert.equal(r.failed.length, 1);
  assert.equal(r.failed[0].name, 'b.pdf');
  assert.match(r.failed[0].reason, /^reason:/);
  assert.equal(store.metas.size, 2);
});

test('retrying only the failed files creates no duplicates', async () => {
  const store = fakeStore(), files = [];
  const list = [mk('a.pdf', 'h1'), mk('b.pdf', 'h2')];
  store.failOn = (r) => r.name === 'b.pdf';
  const first = await ingest(list, base(store, files));
  store.failOn = null;
  const retry = await ingest(first.failed.map((x) => x.file), base(store, files));
  assert.equal(retry.added.length, 1);
  assert.equal(files.length, 2);
  /* even picking the whole list again adds nothing new */
  const again = await ingest(list, base(store, files));
  assert.equal(again.added.length, 0);
  assert.equal(again.dups, 2);
  assert.equal(files.length, 2);
  assert.equal(store.metas.size, 2);
});

test('the same content twice in one batch is stored once', async () => {
  const store = fakeStore(), files = [];
  const r = await ingest([mk('a.pdf', 'same'), mk('copy of a.pdf', 'same')], base(store, files));
  assert.equal(r.added.length, 1);
  assert.equal(r.dups, 1);
});

test('when storage is full the rest of the batch is reported, not lost silently', async () => {
  const store = fakeStore(), files = [];
  store.failName = 'QuotaExceededError';
  store.failOn = (r) => r.name === 'b.pdf';
  const r = await ingest([mk('a.pdf', '1'), mk('b.pdf', '2'), mk('c.pdf', '3'), mk('d.pdf', '4')], base(store, files));
  assert.equal(r.added.length, 1);
  assert.deepEqual(r.failed.map((x) => x.name), ['b.pdf', 'c.pdf', 'd.pdf']);
  assert.ok(r.failed.every((x) => x.quota));
});

test('commitPatch changes memory only after the save succeeded', async () => {
  const store = fakeStore();
  const files = [{ id: 'x', status: 'pending' }, { id: 'y', status: 'pending' }];
  const ok = await commitPatch(store, files, () => ({ status: 'imported' }));
  assert.equal(ok.ok, true);
  assert.deepEqual(files.map((f) => f.status), ['imported', 'imported']);
  assert.equal(store.metas.get('x').rec.status, 'imported');
});

test('a failed save leaves every record untouched and can be retried', async () => {
  const store = fakeStore();
  const files = [{ id: 'x', status: 'pending' }, { id: 'y', status: 'pending' }];
  store.failPutMany = true;
  const bad = await commitPatch(store, files, () => ({ status: 'imported' }));
  assert.equal(bad.ok, false);
  assert.ok(bad.error);
  assert.deepEqual(files.map((f) => f.status), ['pending', 'pending']);
  store.failPutMany = false;
  const retry = await commitPatch(store, files, () => ({ status: 'imported' }));
  assert.equal(retry.ok, true);
  assert.deepEqual(files.map((f) => f.status), ['imported', 'imported']);
});

test('commitPatch skips files the patch function does not want', async () => {
  const store = fakeStore();
  const files = [{ id: 'x', status: 'pending', include: true }, { id: 'y', status: 'pending', include: false }];
  const r = await commitPatch(store, files, (f) => (f.include ? { status: 'imported' } : null));
  assert.deepEqual(r.changed, ['x']);
  assert.equal(files[1].status, 'pending');
});

test('removeFiles reports failure instead of pretending', async () => {
  const store = fakeStore();
  store.metas.set('x', { rec: { id: 'x' } });
  store.failDel = true;
  assert.equal((await removeFiles(store, ['x'])).ok, false);
  assert.equal(store.metas.size, 1);
  store.failDel = false;
  assert.equal((await removeFiles(store, ['x'])).ok, true);
  assert.equal(store.metas.size, 0);
});
