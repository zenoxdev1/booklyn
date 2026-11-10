import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../../app/js/final.js';

const mk = (id, extra = {}) => ({ id, q: 'What does the concept ' + id + ' describe in your lecture?', o: ['a' + id, 'b' + id, 'c' + id, 'd' + id], a: 2, e: 'because ' + id, src: 'def', kind: 'stmt', evidence: 'Evidence sentence for ' + id + ' in the file.', fk: 'h1', file: 'w1.pdf', page: 3, topic: 'Topic ' + id, ...extra });
function floors(spec) { const o = {}; Object.entries(spec).forEach(([u, n]) => { o[u] = Array.from({ length: n }, (_, i) => mk('f' + u + 'q' + i, { file: 'w' + u + '.pdf', page: i + 1 })); }); return o; }
const count = (qs) => qs.reduce((m, q) => (m[q.unit] = (m[q.unit] || 0) + 1, m), {});

test('allocation is balanced and small floors give what they have', () => {
  assert.deepEqual(F.allocate({ 1: 10, 2: 10, 3: 10, 4: 10 }, 20), { 1: 5, 2: 5, 3: 5, 4: 5 });
  const a = F.allocate({ 1: 2, 2: 30, 3: 30 }, 20);
  assert.equal(a[1], 2); assert.equal(a[2] + a[3], 18); assert.ok(Math.abs(a[2] - a[3]) <= 1);
  assert.deepEqual(F.allocate({ 1: 3, 2: 4 }, 25), { 1: 3, 2: 4 }, 'never more than exists');
  assert.deepEqual(F.allocate({ 1: 0 }, 20), {});
  const odd = (seed) => F.allocate({ 1: 9, 2: 9, 3: 9 }, 20, seed);
  [0, 1, 2].forEach((s) => assert.equal(Object.values(odd(s)).reduce((x, y) => x + y, 0), 20));
  assert.notDeepEqual(odd(0), odd(1), 'the floor that gets the odd question changes');
});

test('a session covers every floor that has material and has the requested size', () => {
  const fl = floors({ 1: 12, 2: 12, 3: 12, 4: 12, 5: 12, 6: 12 });
  [20, 25].forEach((n) => {
    for (let seed = 1; seed < 10; seed++) {
      const s = F.pickSession(fl, F.blank(), n, seed);
      assert.equal(s.length, n);
      assert.equal(new Set(s.map((q) => q.id)).size, n, 'no repeats');
      const c = count(s); assert.equal(Object.keys(c).length, 6);
      assert.ok(Math.max(...Object.values(c)) - Math.min(...Object.values(c)) <= 1, JSON.stringify(c));
      s.forEach((q) => assert.ok(q.id.startsWith('f' + q.unit + 'q'), 'tagged with the right floor'));
    }
  });
});

test('with little material the session is shorter, never invented', () => {
  const s = F.pickSession(floors({ 1: 3, 2: 4 }), F.blank(), 20, 1);
  assert.equal(s.length, 7);
  assert.deepEqual(F.pickSession({}, F.blank(), 20, 1), []);
});

test('variety inside a session: same-sentence questions are not both used while others exist', () => {
  const fl = { 1: [] };
  for (let i = 0; i < 8; i++) fl[1].push(mk('x' + i, { evidence: 'Shared sentence ' + (i % 4), kind: ['stmt', 'term', 'cloze', 'pair'][i % 4] }));
  const s = F.pickSession(fl, F.blank(), 4, 5);
  assert.equal(new Set(s.map((q) => q.evidence)).size, 4);
});

test('recording a session keeps results apart from the floors and tracks misses', () => {
  const fin = F.blank(), fl = floors({ 1: 6, 2: 6 });
  const s = F.pickSession(fl, fin, 8, 3);
  const answers = s.map((q, i) => ({ q, ok: i % 2 === 0 }));
  const sess = F.record(fin, answers, { kind: 'full', t: 1000 });
  assert.equal(sess.n, 8); assert.equal(sess.ok, 4);
  assert.equal(Object.keys(fin.missed).length, 4);
  Object.keys(fin.missed).forEach((id) => assert.equal(fin.missed[id], Number(id[1])));
  assert.equal(fin.sessions.length, 1); assert.equal(fin.recent.length, 8);
  /* answering a missed question right removes it */
  const miss = answers.find((a) => !a.ok).q;
  F.record(fin, [{ q: miss, ok: true }], { kind: 'retry', t: 2000 });
  assert.ok(!(miss.id in fin.missed)); assert.equal(fin.stats[miss.id][1], 0);
  /* record() only touches its own data: no lit/reviewed keys exist anywhere */
  assert.deepEqual(Object.keys(fin).sort(), ['missed', 'recent', 'sessions', 'stats']);
});

test('the next session avoids the last questions while others exist, and misses come first', () => {
  const fin = F.blank(), fl = floors({ 1: 20 });
  const s1 = F.pickSession(fl, fin, 5, 1);
  F.record(fin, s1.map((q, i) => ({ q, ok: i !== 0 })), { kind: 'full', t: 1 });
  const missedId = s1[0].id;
  const s2 = F.pickSession(fl, fin, 5, 2);
  assert.ok(s2.some((q) => q.id === missedId), 'the missed question returns');
  const others = s1.filter((q) => q.id !== missedId).map((q) => q.id);
  assert.ok(!s2.some((q) => others.includes(q.id)), 'answered-right ones wait');
});

test('review plan lists floors with mistakes, topics and exact sources, weakest first', () => {
  const fl = floors({ 1: 4, 2: 4 });
  const answers = [];
  fl[1].forEach((q, i) => answers.push({ q: { ...q, unit: 1 }, ok: i === 0 }));
  fl[2].forEach((q, i) => answers.push({ q: { ...q, unit: 2 }, ok: i < 3 }));
  const plan = F.reviewPlan(answers, ['Intro', 'Routing']);
  assert.equal(plan.length, 2);
  assert.equal(plan[0].unit, 1); assert.equal(plan[0].title, 'Intro'); assert.equal(plan[0].ok, 1); assert.equal(plan[0].missed.length, 3);
  assert.equal(plan[0].topics.length, 3);
  assert.ok(plan[0].sources.every((s) => s.file === 'w1.pdf' && s.page > 0 && /w1\.pdf, p\. \d+/.test(s.text)));
  assert.equal(plan[1].unit, 2); assert.equal(plan[1].missed.length, 1);
  assert.deepEqual(F.floorResults(answers).map((r) => r.unit), [1, 2]);
  /* a question reported as bad is not a mistake of the student */
  assert.equal(F.reviewPlan([{ q: { ...fl[1][0], unit: 1, bad: true }, ok: false }], []).length, 0);
});

test('page from an AI reference like "p. 4–5"', () => {
  assert.equal(F.pageOf({ page: 7 }), 7); assert.equal(F.pageOf({ ref: 'p. 4–5' }), 4); assert.equal(F.pageOf({}), 0);
});

test('retry and focused review', () => {
  const fin = F.blank(), fl = floors({ 1: 10, 2: 10, 3: 10, 4: 10 });
  assert.deepEqual(F.focusSet(fin, fl, 1), [], 'nothing to focus on yet');
  const s = F.pickSession(fl, fin, 20, 4);
  const answers = s.map((q) => ({ q, ok: q.unit !== 3 })); /* floor 3 is the weak one */
  F.record(fin, answers, { kind: 'full', t: 5 });
  const open = F.openMissed(fin, fl);
  assert.equal(open.length, 5); open.forEach((q) => assert.equal(q.unit, 3));
  const retry = F.retrySet(open, 9);
  assert.equal(retry.length, 5); retry.forEach((q) => { assert.equal(q.o[q.a], open.find((x) => x.id === q.id).o[open.find((x) => x.id === q.id).a]); });
  assert.deepEqual(F.weakFloors(fin, fl, fin.sessions[0])[0], 3);
  const foc = F.focusSet(fin, fl, 3);
  assert.equal(foc.length, F.FOCUS_LEN);
  assert.ok(foc.every((q) => q.unit === 3), 'only the weak floor');
  /* a retry can be at most 20 */
  const big = F.blank(); for (let i = 0; i < 40; i++) big.missed['m' + i] = 1;
  const f1 = { 1: Array.from({ length: 40 }, (_, i) => mk('m' + i)) };
  assert.equal(F.openMissed(big, f1).length, F.RETRY_MAX);
});

test('stored data is cleaned: only known houses, small numbers, no odd keys', () => {
  const c = F.clean({ m1: { stats: { a: [3, 1], '<x>': [1, 1], b: [1, 9] }, recent: ['a', 5, '<b>'], missed: { a: 2, z: 999 }, sessions: [{ t: 5, kind: 'full', n: 4, ok: 9, f: { 1: [4, 9], x: [1, 1] } }, { t: 0, kind: 'full', n: 3, ok: 1, f: {} }, { t: 4, kind: 'hack', n: 3, ok: 1, f: {} }] }, gone: { stats: {} }, 'bad id!': {} }, { m1: 1 });
  assert.deepEqual(Object.keys(c), ['m1']);
  assert.deepEqual(c.m1.stats, { a: [3, 1], b: [1, 1] });
  assert.deepEqual(c.m1.recent, ['a']); assert.deepEqual(c.m1.missed, { a: 2, z: 60 });
  assert.equal(c.m1.sessions.length, 1); assert.deepEqual(c.m1.sessions[0], { t: 5, kind: 'full', n: 4, ok: 4, f: { 1: [4, 4] } });
  assert.deepEqual(F.clean(null), {}); assert.deepEqual(F.clean([1]), {});
});

test('merging two histories keeps the stronger one and all sessions', () => {
  const a = F.clean({ m1: { stats: { q: [2, 1] }, recent: ['q'], missed: { q: 1 }, sessions: [{ t: 1, kind: 'full', n: 2, ok: 1, f: { 1: [2, 1] } }] } });
  const b = F.clean({ m1: { stats: { q: [5, 0], r: [1, 1] }, recent: ['r'], missed: {}, sessions: [{ t: 2, kind: 'retry', n: 1, ok: 1, f: { 1: [1, 1] } }] }, m2: { stats: {}, recent: [], missed: {}, sessions: [] } });
  const m = F.merge(a, b);
  assert.deepEqual(m.m1.stats, { q: [5, 1], r: [1, 1] }); assert.equal(m.m1.sessions.length, 2); assert.ok(m.m2);
  assert.deepEqual(F.summary(m.m1), { count: 2, last: m.m1.sessions[1], best: 100, open: 1 });
});
