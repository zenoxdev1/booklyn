import test from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../app/js/quiz-core.js';

const squash = (s) => s.replace(/\s+/g, '');

test('chunking keeps every character of the text (no truncation, no dropped tail)', () => {
  const para = 'Alpha beta gamma delta. '.repeat(400);          // one very long paragraph
  const text = [para, 'Short paragraph.', 'x'.repeat(9000), 'Tail.'].join('\n\n');
  const chunks = Q.chunksOf(text, 3500);
  assert.equal(squash(chunks.join('')), squash(text));
  assert.ok(chunks.every((c) => c.length <= 3500));
  assert.ok(chunks.length >= 5);
});

test('a short text is one chunk and a tiny tail is not dropped', () => {
  assert.deepEqual(Q.chunksOf('Hello world.', 3500), ['Hello world.']);
  const text = 'a'.repeat(3400) + '\n\n' + 'END';
  const chunks = Q.chunksOf(text, 3500);
  assert.equal(squash(chunks.join('')), squash(text));
  assert.ok(chunks[chunks.length - 1].includes('END'));
});

test('chunking never loses text even with no spaces or sentence ends', () => {
  const text = 'z'.repeat(10001);
  const chunks = Q.chunksOf(text, 3500);
  assert.equal(chunks.join(''), text);
});

test('pass rule is 4 of 5', () => {
  assert.equal(Q.QUIZ_LEN, 5);
  assert.equal(Q.PASS_MIN, 4);
  assert.equal(Q.PASS_PCT, 80);
  assert.equal(Q.isPass(4, 5), true);
  assert.equal(Q.isPass(5, 5), true);
  assert.equal(Q.isPass(3, 5), false);
  assert.equal(Q.isPass(2, 3), false);   // a 3-question quiz can no longer pass
});

function q(id, extra = {}) {
  return { id, q: 'What does the concept number ' + id + ' describe?', o: ['A' + id, 'B' + id, 'C' + id, 'D' + id], a: 1, e: 'because', src: 'local', ...extra };
}
function bank(n) { const b = Q.newBank(); for (let i = 0; i < n; i++) b.q.push({ ...q('q' + i), fk: 'f1', file: 'f1.pdf' }); return b; }

test('fewer than 5 valid questions gives no quiz at all', () => {
  assert.equal(Q.selectQuiz(bank(4), 5, 1), null);
  const b = bank(5); b.q[0].bad = true;
  assert.equal(Q.selectQuiz(b, 5, 1), null);
  const c = bank(5); c.q[0].o = ['same', 'same', 'x', 'y'];
  assert.equal(Q.selectQuiz(c, 5, 1), null);
  assert.equal(Q.selectQuiz(bank(5), 5, 1).length, 5);
});

test('a quiz never repeats a question', () => {
  const qz = Q.selectQuiz(bank(12), 5, 42);
  assert.equal(new Set(qz.map((x) => x.id)).size, 5);
});

test('questions answered wrong come back first', () => {
  const b = bank(20);
  Q.recordAnswer(b, 'q3', false); Q.recordAnswer(b, 'q9', false); Q.recordAnswer(b, 'q9', false);
  for (let seed = 1; seed < 15; seed++) {
    const ids = Q.selectQuiz(b, 5, seed).map((x) => x.id);
    assert.ok(ids.includes('q3') && ids.includes('q9'), 'seed ' + seed);
  }
  /* answering right takes the pressure off */
  Q.recordAnswer(b, 'q3', true);
  assert.equal(b.stats.q3.miss, 0);
  assert.equal(b.stats.q9.miss, 2);
});

test('a quiz is still 5 questions when many were missed', () => {
  const b = bank(6);
  for (let i = 0; i < 6; i++) Q.recordAnswer(b, 'q' + i, false);
  assert.equal(Q.selectQuiz(b, 5, 3).length, 5);
});

test('cache refresh: questions of removed files are dropped, new files get questions', () => {
  const b = Q.newBank();
  const f1 = { id: 'a', hash: 'h1', name: 'one.pdf' }, f2 = { id: 'b', hash: 'h2', name: 'two.pdf' };
  assert.equal(Q.syncBank(b, [f1, f2]).need.length, 2);
  Q.addQuestions(b, [q('1'), q('2')], 'h1', 'one.pdf'); b.done.h1 = true;
  Q.addQuestions(b, [q('3'), q('4')], 'h2', 'two.pdf'); b.done.h2 = true;
  assert.equal(Q.syncBank(b, [f1, f2]).need.length, 0);
  /* remove file 2 */
  let r = Q.syncBank(b, [f1]);
  assert.equal(r.dropped, 2);
  assert.deepEqual(b.q.map((x) => x.id), ['1', '2']);
  /* replace file 1 by a different file (new hash) */
  const f1b = { id: 'c', hash: 'h1new', name: 'one-v2.pdf' };
  r = Q.syncBank(b, [f1b]);
  assert.equal(b.q.length, 0);
  assert.deepEqual(r.need.map((x) => x.name), ['one-v2.pdf']);
  /* add a file back: only it needs work */
  b.done.h1new = true;
  r = Q.syncBank(b, [f1b, f2]);
  assert.deepEqual(r.need.map((x) => x.name), ['two.pdf']);
});

test('old question banks (no file info) are rebuilt but keep what was asked', () => {
  const old = { q: [{ id: 'l1', q: 'x', o: ['a', 'b', 'c'], a: 0, e: '', asked: 3 }], used: [1] };
  const b = Q.upgradeBank(old);
  assert.equal(b.v, 3);
  assert.equal(b.q.length, 0);
  assert.equal(b.stats.l1.asked, 3);
});

test('source line shows the file only when it is known and never invents a page', () => {
  assert.equal(Q.sourceLine({ file: '' }), '');
  assert.equal(Q.sourceLine({ file: 'week3.pdf', page: null }), 'week3.pdf');
  assert.equal(Q.sourceLine({ file: 'week3.pdf', page: 4, pageLabel: 'p.' }), 'week3.pdf, p. 4');
  assert.equal(Q.sourceLine({ file: 's.pptx', page: 2, pageLabel: 'slide' }), 's.pptx, slide 2');
});

test('local questions remember their page when the text has page breaks', () => {
  const sent = (w) => 'The ' + w + ' protocol describes how routers forward packets across different networks reliably today. ';
  const pageText = (w) => (sent(w) + sent(w) + 'Routers and packets and protocols matter for networks and routing tables in practice here. ').repeat(3);
  const text = [pageText('network'), pageText('transport'), pageText('routing')].join('\f');
  const qs = Q.localQuestions(text, 20, { pageLabel: 'p.' });
  assert.ok(qs.length > 0);
  qs.forEach((x) => { assert.ok(x.page >= 1 && x.page <= 3); assert.equal(x.pageLabel, 'p.'); assert.ok(Q.validQuestion(x)); });
  const flat = Q.localQuestions(text.replace(/\f/g, ' '), 20);
  flat.forEach((x) => assert.equal(x.page, null));
});
