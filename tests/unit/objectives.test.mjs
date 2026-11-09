import test from 'node:test';
import assert from 'node:assert/strict';
import * as O from '../../app/js/objectives.js';

test('parseList strips bullets and numbers, dedupes, skips short lines', () => {
  const r = O.parseList('- Explain what a router does\n2) Describe the OSI model\n  • explain what a router does \n\nab\n(3) Compare TCP and UDP\na) Define subnetting');
  assert.deepEqual(r, ['Explain what a router does', 'Describe the OSI model', 'Compare TCP and UDP', 'Define subnetting']);
});
test('parseList limits the paste and text length', () => {
  const many = Array.from({ length: 80 }, (_, i) => 'Objective number ' + i).join('\n');
  assert.equal(O.parseList(many).length, O.MAX_PASTE);
  assert.equal(O.parseList('x'.repeat(1000))[0].length, O.MAX_TEXT);
});
test('clean validates ids, modules, units and links', () => {
  const l = O.clean([
    { id: 'a1', mod: 'm1', unit: 3, text: ' Hello   world ', files: ['f1', 'f1', 'bad id', 7], notes: ['n1'], created: 5, upd: 6 },
    { id: 'a1', mod: 'm1', unit: 1, text: 'dup' },
    { id: 'a2', mod: 'gone', unit: 1, text: 'x1x' },
    { id: 'a3', mod: 'm1', unit: 500, text: 'big unit' },
    { id: '../x', mod: 'm1', text: 'bad id' },
    { id: 'a4', mod: 'm1', text: '   ' },
    null, 5
  ], { m1: true }, 14);
  assert.equal(l.length, 2);
  assert.equal(l[0].text, 'Hello world');
  assert.deepEqual(l[0].files, ['f1', '7']);
  assert.equal(l[1].unit, 14);
  assert.deepEqual(O.clean('nope'), []);
});
test('toggleLink adds and removes', () => {
  const o = O.make('a', 'm1', 1, 'Explain routers', 1);
  assert.equal(O.toggleLink(o, 'file', 'f1', 2), true);
  assert.equal(O.hasLink(o, 'file', 'f1'), true);
  assert.equal(O.toggleLink(o, 'note', 'n1', 3), true);
  assert.equal(O.toggleLink(o, 'file', 'f1', 4), false);
  assert.deepEqual(o.files, []); assert.deepEqual(o.notes, ['n1']); assert.equal(o.upd, 4);
});
test('relinkFile follows a replaced file without duplicates', () => {
  const a = O.make('a', 'm1', 1, 'Explain routers', 1); a.files = ['old'];
  const b = O.make('b', 'm1', 1, 'Explain switches', 1); b.files = ['old', 'new'];
  const c = O.make('c', 'm1', 1, 'Explain gateways', 1); c.files = ['other'];
  O.relinkFile([a, b, c], 'old', 'new', 9);
  assert.deepEqual(a.files, ['new']); assert.deepEqual(b.files, ['new']); assert.deepEqual(c.files, ['other']); assert.equal(c.upd, 1);
});
test('prune drops dead links and dead modules', () => {
  const a = O.make('a', 'm1', 1, 'Explain routers', 1); a.files = ['f1', 'f2']; a.notes = ['n1'];
  const b = O.make('b', 'm2', 1, 'Explain switches', 1);
  const r = O.prune([a, b], { f1: true }, {}, { m1: true });
  assert.equal(r.changed, true); assert.equal(r.list.length, 1);
  assert.deepEqual(r.list[0].files, ['f1']); assert.deepEqual(r.list[0].notes, []);
  assert.equal(O.prune(r.list, { f1: true }, {}, { m1: true }).changed, false);
});
test('merge keeps the newer copy', () => {
  const a = O.make('a', 'm1', 1, 'Old text', 1), b = O.make('a', 'm1', 1, 'New text', 5), c = O.make('c', 'm1', 1, 'Other text', 1);
  const m = O.merge([a], [b, c]);
  assert.equal(m.length, 2); assert.equal(m.find(x => x.id === 'a').text, 'New text');
  assert.equal(O.merge([b], [a])[0].text, 'New text');
});
test('practice and status', () => {
  const o = O.make('a', 'm1', 1, 'Explain routers', 1);
  assert.equal(O.status(o, null), 'none');
  o.notes = ['n1']; assert.equal(O.status(o, null), 'notesonly');
  o.files = ['f1']; assert.equal(O.status(o, O.practice([], {})), 'noq');
  const qs = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
  assert.equal(O.status(o, O.practice(qs, {})), 'untested');
  assert.equal(O.status(o, O.practice(qs, { q1: { asked: 2, miss: 0 } })), 'ok');
  const pr = O.practice(qs, { q1: { asked: 2, miss: 1 }, q2: { asked: 1, miss: 0 } });
  assert.deepEqual(pr, { total: 3, asked: 2, missed: 1 });
  assert.equal(O.status(o, pr), 'weak');
});
test('tally counts gaps', () => {
  const t = O.tally(['ok', 'weak', 'none', 'ok']);
  assert.equal(t.gaps, 2); assert.equal(t.ok, 2); assert.equal(t.all, 4);
});
test('keyWords drops filler words and short words', () => {
  assert.deepEqual(O.keyWords('Explain what a router does in the network'), ['router', 'network']);
  assert.deepEqual(O.keyWords('Erkläre die Funktion des Routers'), ['funktion', 'routers']);
});
test('suggest finds files that mention the objective words', () => {
  const docs = [
    { id: 'f1', name: 'NET_week1_slides.pdf', body: 'a router forwards packets between networks using routing tables' },
    { id: 'f2', name: 'Switching.pdf', body: 'a switch connects computers in one local network' },
    { id: 'f3', name: 'Accounting.pdf', body: 'balance sheet and income statement' }
  ];
  const r = O.suggest('Explain how a router forwards packets', docs);
  assert.equal(r[0].id, 'f1'); assert.equal(r.length, 1);
  assert.deepEqual(O.suggest('and the', docs), []);
  assert.equal(O.suggest('Routing', docs)[0].id, 'f1');
});
