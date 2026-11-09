import test from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../app/js/questions.js';

const mk = (id, o = {}) => Object.assign({ id, mod: 'm1', unit: 1, text: 'Why?', file: '', page: 0, due: '', answer: '', done: false, created: 1, upd: 1, doneAt: 0 }, o);

test('make trims, limits and rejects empty questions', () => {
  assert.equal(Q.make('a1', 'm1', 1, '   ', {}, 5), null);
  const q = Q.make('a1', 'm1', 2, '  What  is\n a subnet?  ', { page: 3, due: '2026-11-12' }, 5);
  assert.equal(q.text, 'What is a subnet?');
  assert.equal(q.page, 3);
  assert.equal(q.due, '2026-11-12');
  assert.equal(Q.make('a1', 'm1', 1, 'x'.repeat(1000), {}, 5).text.length, Q.MAX_TEXT);
});

test('clean drops bad ids, bad dates, duplicates and questions of removed modules', () => {
  const out = Q.clean([mk('ok'), mk('ok'), mk('<b>'), mk('x2', { mod: 'gone' }), mk('x3', { due: '12/11/2026', page: -4, unit: 99 }), null, 'str'], { m1: 1 }, 14);
  assert.deepEqual(out.map((q) => q.id), ['ok', 'x3']);
  assert.equal(out[1].due, '');
  assert.equal(out[1].page, 0);
  assert.equal(out[1].unit, 14);
  assert.deepEqual(Q.clean('nope'), []);
});

test('order puts lesson dates first (overdue, then soonest) and the rest oldest first', () => {
  const l = [mk('c', { created: 3 }), mk('b', { due: '2026-11-20' }), mk('a', { due: '2026-11-10' }), mk('d', { created: 2 })];
  assert.deepEqual(Q.order(l).map((q) => q.id), ['a', 'b', 'd', 'c']);
});

test('open and unanswered: an answered question stays open until completed', () => {
  const l = [mk('a'), mk('b', { answer: 'Because.' }), mk('c', { done: true })];
  assert.deepEqual(Q.open(l).map((q) => q.id), ['a', 'b']);
  assert.deepEqual(Q.unanswered(l).map((q) => q.id), ['a']);
});

test('next lesson: overdue questions plus the nearest lesson date still to come', () => {
  const l = [mk('late', { due: '2026-11-05' }), mk('n1', { due: '2026-11-12' }), mk('n2', { due: '2026-11-12' }), mk('far', { due: '2026-11-19' }), mk('free'), mk('done', { due: '2026-11-12', done: true })];
  assert.deepEqual(Q.nextLesson(l, '2026-11-09').map((q) => q.id), ['late', 'n1', 'n2']);
  assert.deepEqual(Q.nextLesson([mk('free')], '2026-11-09'), []);
});

test('reminders: daily mentions every unanswered question, lesson only those close to their date, off none', () => {
  const l = [mk('a'), mk('b', { due: '2026-11-10' }), mk('c', { due: '2026-11-20' }), mk('d', { due: '2026-11-10', answer: 'x' }), mk('e', { done: true })];
  assert.deepEqual(Q.reminder(l, 'daily', '2026-11-09').map((q) => q.id), ['b', 'c', 'a']);
  assert.deepEqual(Q.reminder(l, 'lesson', '2026-11-09').map((q) => q.id), ['b']);
  assert.deepEqual(Q.reminder(l, 'lesson', '2026-11-08').map((q) => q.id), []);
  assert.deepEqual(Q.reminder(l, 'off', '2026-11-09'), []);
});

test('reminder window works across month ends', () => {
  assert.deepEqual(Q.reminder([mk('a', { due: '2026-12-01' })], 'lesson', '2026-11-30').map((q) => q.id), ['a']);
});

test('merge keeps both sides and the newer edit wins', () => {
  const cur = [mk('a', { text: 'old', upd: 1 }), mk('b', { upd: 5 })];
  const inc = [mk('a', { text: 'new', upd: 2 }), mk('b', { text: 'older', upd: 3 }), mk('c')];
  const m = Q.merge(cur, inc);
  assert.equal(m.length, 3);
  assert.equal(m.find((q) => q.id === 'a').text, 'new');
  assert.equal(m.find((q) => q.id === 'b').text, 'Why?');
});

test('isoDay uses the local date', () => {
  assert.equal(Q.isoDay(new Date(2026, 10, 9, 23, 59)), '2026-11-09');
});
