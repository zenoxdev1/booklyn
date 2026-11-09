import test from 'node:test';
import assert from 'node:assert/strict';
import * as V from '../../app/js/versions.js';

test('normName ignores copy and version words but keeps numbers', () => {
  assert.equal(V.normName('Week 3 Slides (1)_FINAL.pdf'), 'week 3 slides');
  assert.equal(V.normName('SW07_slides_v2.pdf'), 'sw07 slides');
  assert.notEqual(V.normName('Week 5.pdf'), V.normName('Week 6.pdf'));
});

test('nameScore: same name 1, week 5 vs week 6 low, spacing ignored', () => {
  assert.equal(V.nameScore('Week 3 Slides.pdf', 'week3_slides_NEW.pdf'), 1);
  assert.ok(V.nameScore('Week 5 slides.pdf', 'Week 6 slides.pdf') < 0.8);
  assert.ok(V.nameScore('Lecture 10 Part A.pdf', 'Lecture 10 Part B.pdf') < 0.8);
});

test('findCandidate: needs the same type, a different content and a close name', () => {
  const old = [{ id: 'o1', name: 'BSCM_SW07_slides.pdf', hash: 'h1', mod: 'm1' }, { id: 'o2', name: 'BSCM_SW08_slides.pdf', hash: 'h2', mod: 'm1' }];
  const nw = { id: 'n1', name: 'BSCM_SW07_slides_v2.pdf', hash: 'h9', mod: 'm1' };
  assert.equal(V.findCandidate(nw, old).file.id, 'o1');
  assert.equal(V.findCandidate({ ...nw, hash: 'h1' }, old), null);
  assert.equal(V.findCandidate({ ...nw, name: 'BSCM_SW07_slides_v2.pptx' }, old), null);
  assert.equal(V.findCandidate({ ...nw, name: 'Other.pdf' }, old), null);
});

const page = (s) => s.repeat(1);
const A = 'router forwards packets between networks using destination address tables';
const B = 'switch connects computers inside one local network using hardware addresses';
const C = 'firewall filters traffic with security rules and inspects every packet';
const D = 'gateway connects different protocols and translates between them for hosts';

test('comparePages: unchanged text is all same', () => {
  const r = V.comparePages([A, B, C].join('\f'), [A, B, C].join('\f'));
  assert.equal(r.kind, 'pages'); assert.equal(r.same, 3);
  assert.ok(V.isUnchanged(r));
});

test('comparePages: a page moved, one changed a little, one added, one removed', () => {
  const oldT = [A, B, C, D].join('\f');
  const B2 = B + ' and also wireless access points bridge radio clients';
  const newT = ['title page text', C, A, B2].join('\f');
  const r = V.comparePages(oldT, newT);
  assert.equal(r.map[1].page, 3); assert.equal(r.map[1].score, 1);
  assert.equal(r.map[3].page, 2);
  assert.equal(r.map[2].page, 4); assert.ok(r.map[2].score < 1);
  assert.deepEqual(r.added, [1]);
  assert.deepEqual(r.removed, [4]);
  assert.equal(r.changed.length, 1);
  assert.equal(r.moved, 2);
});

test('comparePages: text without pages compares as one piece', () => {
  assert.equal(V.comparePages('Hello world text here', 'hello   WORLD text here').identical, true);
  const r = V.comparePages('alpha beta gamma delta', 'alpha beta gamma epsilon');
  assert.equal(r.kind, 'text'); assert.equal(r.identical, false); assert.ok(r.similarity > 0.3 && r.similarity < 1);
});

test('mapNotes follows pages and marks the unsure ones', () => {
  const r = V.comparePages([A, B, C, D].join('\f'), ['x intro page', C, A, B + ' with a lot more wireless access radio text'].join('\f'));
  const notes = [{ id: 'a', page: 1, at: 0 }, { id: 'b', page: 2, at: 0 }, { id: 'c', page: 4, at: 0 }, { id: 'd', page: 0, at: 0 }, { id: 'e', page: 0, at: 30 }];
  const m = V.mapNotes(r, notes);
  assert.deepEqual(m.a, { page: 3, status: 'moved', sure: true });
  assert.equal(m.b.status, 'changed'); assert.equal(m.b.page, 4); assert.equal(m.b.sure, false);
  assert.equal(m.c.status, 'removed'); assert.equal(m.c.sure, false);
  assert.deepEqual(m.d, { page: 0, status: 'file', sure: true });
  assert.equal(m.e.status, 'check');
});

test('mapNotes without readable text marks every located note for a check', () => {
  const m = V.mapNotes(null, [{ id: 'a', page: 3, at: 0 }, { id: 'b', page: 0, at: 0 }]);
  assert.equal(m.a.status, 'check'); assert.equal(m.b.status, 'file');
});

test('listPages shortens long lists', () => {
  assert.equal(V.listPages([4, 7, 9]), '4, 7, 9');
  assert.ok(V.listPages([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).includes('(10)'));
});
