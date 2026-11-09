import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../../app/js/snotes.js';

const mk = (id, o = {}) => Object.assign({ id, file: 'f1', text: 'x', page: 0, at: 0, unsure: false, created: 1, upd: 1 }, o);

test('kindOf: which files can point to a place', () => {
  assert.equal(S.kindOf('Week1.PDF'), 'page');
  assert.equal(S.kindOf('slides.pptx'), 'slide');
  assert.equal(S.kindOf('lecture.mp4'), 'time');
  assert.equal(S.kindOf('notes.txt'), 'none');
});

test('parseAt and fmtAt', () => {
  assert.equal(S.parseAt('90'), 90);
  assert.equal(S.parseAt('1:30'), 90);
  assert.equal(S.parseAt('1:02:03'), 3723);
  assert.equal(S.parseAt('abc'), 0);
  assert.equal(S.parseAt('1:2x'), 0);
  assert.equal(S.parseAt(''), 0);
  assert.equal(S.fmtAt(90), '1:30');
  assert.equal(S.fmtAt(3723), '1:02:03');
  assert.equal(S.fmtAt(5), '0:05');
});

test('make puts the place in the right field for each file type', () => {
  assert.equal(S.make('a', 'f1', 'x.pdf', 'hi', '7', 1).page, 7);
  assert.equal(S.make('a', 'f1', 'x.pptx', 'hi', '12', 1).page, 12);
  const t = S.make('a', 'f1', 'x.mp3', 'hi', '2:10', 1);
  assert.equal(t.at, 130); assert.equal(t.page, 0);
  const n = S.make('a', 'f1', 'x.txt', 'hi', '5', 1);
  assert.equal(n.page, 0); assert.equal(n.at, 0);
  assert.equal(S.make('a', 'f1', 'x.pdf', '   ', '3', 1), null);
});

test('clean drops bad ids, empty text and duplicates, and limits values', () => {
  const out = S.clean([mk('a'), mk('a'), mk('<b>'), mk('c', { text: '  ' }), mk('d', { file: 'bad id' }), mk('e', { page: -3, at: 1e9 }), null]);
  assert.deepEqual(out.map((n) => n.id), ['a', 'e']);
  assert.equal(out[1].page, 0);
  assert.equal(out[1].at, 172800);
  assert.deepEqual(S.clean('x'), []);
});

test('forFile lists whole-file notes first, then by page and time', () => {
  const l = [mk('a', { page: 5 }), mk('b'), mk('c', { page: 2 }), mk('d', { file: 'other', page: 1 }), mk('e', { at: 30 }), mk('f', { at: 10 })];
  assert.deepEqual(S.forFile(l, 'f1').map((n) => n.id), ['b', 'f', 'e', 'c', 'a']);
  assert.equal(S.count(l, 'f1'), 5);
});

test('a note keeps its file when the file moves: it points at the file id only', () => {
  const n = S.make('a', 'f1', 'x.pdf', 'hi', '4', 1);
  assert.deepEqual(Object.keys(n).sort(), ['at', 'created', 'file', 'id', 'page', 'text', 'unsure', 'upd']);
});

test('prune drops notes of removed files', () => {
  assert.deepEqual(S.prune([mk('a'), mk('b', { file: 'gone' })], { f1: true }).map((n) => n.id), ['a']);
});

test('flagFile marks located notes as uncertain, whole-file notes stay', () => {
  const l = S.flagFile([mk('a', { page: 3 }), mk('b'), mk('c', { file: 'o', page: 1 })], 'f1', 9);
  assert.equal(l[0].unsure, true); assert.equal(l[1].unsure, false); assert.equal(l[2].unsure, false);
});

test('merge keeps both lists and the newer edit', () => {
  const m = S.merge([mk('a', { text: 'old', upd: 1 })], [mk('a', { text: 'new', upd: 2 }), mk('b')]);
  assert.equal(m.length, 2);
  assert.equal(m.find((n) => n.id === 'a').text, 'new');
});
