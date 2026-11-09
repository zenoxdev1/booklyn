import test from 'node:test';
import assert from 'node:assert/strict';
import { plan } from '../../app/js/today.js';

const F = (k, st, left = 0, until = 0) => ({ k, st, left, until });

test('no floors: nothing to do', () => {
  const p = plan([], '', '');
  assert.equal(p.lead, null);
  assert.equal(p.why, '');
});

test('a light fading within 3 days comes before the deadline suggestion', () => {
  const p = plan([F('a:1', 'ready'), F('a:2', 'fading', 2, 100)], 'a:1', '');
  assert.equal(p.lead.k, 'a:2');
  assert.equal(p.why, 'urgent');
});

test('a light fading later does not beat the deadline suggestion', () => {
  const p = plan([F('a:1', 'ready'), F('a:2', 'fading', 6, 100)], 'a:1', '');
  assert.equal(p.lead.k, 'a:1');
  assert.equal(p.why, 'next');
  assert.deepEqual(p.review.map((f) => f.k), ['a:2']);
});

test('the floor the student picked wins, an invalid pick is ignored', () => {
  const fl = [F('a:1', 'ready'), F('a:2', 'progress'), F('a:3', 'fading', 1, 50)];
  assert.equal(plan(fl, 'a:1', 'a:2').lead.k, 'a:2');
  assert.equal(plan(fl, 'a:1', 'a:2').why, 'pick');
  assert.equal(plan(fl, 'a:1', 'zzz').lead.k, 'a:3');
  assert.equal(plan(fl, 'a:1', 'a:9').why, 'urgent');
});

test('a lit floor cannot be picked or suggested', () => {
  const p = plan([F('a:1', 'lit'), F('a:2', 'ready')], 'a:1', 'a:1');
  assert.equal(p.lead.k, 'a:2');
  assert.equal(p.why, 'order');
});

test('review list is sorted by time left and leaves out the chosen task', () => {
  const p = plan([F('a:1', 'fading', 5, 300), F('a:2', 'fading', 4, 200), F('a:3', 'fading', 6, 400)], '', '');
  assert.equal(p.lead.k, 'a:2');
  assert.equal(p.why, 'review');
  assert.deepEqual(p.review.map((f) => f.k), ['a:1', 'a:3']);
});

test('counts keep reviewed, quiz-passed and due-for-review apart', () => {
  const p = plan([F('a:1', 'lit'), F('a:2', 'lit'), F('a:3', 'fading', 3, 1), F('a:4', 'progress'), F('a:5', 'ready'), F('a:6', 'empty')], '', '');
  assert.deepEqual(p.counts, { lit: 2, fading: 1, progress: 1, ready: 1 });
});

test('other tasks are the floors that are not started or only reviewed', () => {
  const p = plan([F('a:1', 'ready'), F('a:2', 'progress'), F('a:3', 'ready')], 'a:2', '');
  assert.equal(p.lead.k, 'a:2');
  assert.deepEqual(p.other.map((f) => f.k), ['a:1', 'a:3']);
});
