import test from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../app/js/quiz-core.js';

const DOC = [
  'Latency is the time a packet needs to travel from the sender to the receiver across the network.',
  'Bandwidth is the maximum amount of data that a link can transfer in a given period of time.',
  'A router is a device that forwards packets between different networks using their destination address.',
  'Throughput describes the amount of data that is actually delivered over a link per second.',
  'A firewall is a system that filters network traffic according to a set of security rules.',
].join(' ');

test('definition questions come from clear definitions, with plausible options from the same material', () => {
  const qs = Q.definitionQuestions(DOC, 10);
  assert.ok(qs.length >= 3, 'got ' + qs.length);
  qs.forEach((q) => {
    assert.equal(q.o.length, 4); assert.equal(new Set(q.o).size, 4);
    assert.equal(Q.qualityIssue(q), '');
    assert.ok(q.evidence.length > 30 && DOC.includes(q.evidence));
    assert.equal(q.src, 'def');
    assert.ok(!/_____/.test(q.q), 'no word blanks');
  });
});

test('too few definitions: no questions at all (nothing is invented)', () => {
  assert.deepEqual(Q.definitionQuestions('Latency is the time a packet needs to travel across the network today.', 10), []);
  assert.deepEqual(Q.definitionQuestions('Random notes without any clear statements. More notes here. And a few more words.', 10), []);
});

test('pronoun subjects and circular definitions are skipped', () => {
  const d = Q.extractDefinitions('It is the thing that happens when you press the key on the board. Packet loss is a problem called packet loss in the network itself.');
  assert.equal(d.length, 0);
});

test('definitions remember their page', () => {
  const pages = DOC.split('. ').map((s) => s.trim().replace(/\.?$/, '.')).join('\f');
  const d = Q.extractDefinitions(pages);
  assert.ok(d.length >= 4); d.forEach((x) => assert.ok(x.page >= 1));
});

test('quality rules reject the typical weak question shapes', () => {
  const base = { id: 'x', q: 'Which protocol keeps latency low for streaming applications?', o: ['UDP', 'TCP', 'ARP', 'DNS'], a: 0, e: 'because', src: 'ai' };
  assert.equal(Q.qualityIssue(base), '');
  assert.match(Q.qualityIssue({ ...base, q: 'According to the text, which protocol keeps latency low?' }), /refers/);
  assert.match(Q.qualityIssue({ ...base, o: ['UDP', 'TCP', 'ARP', 'All of the above'] }), /above/);
  assert.match(Q.qualityIssue({ ...base, o: ['UDP', 'TCP', 'ARP'] }), /needs 4|incomplete/);
});

test('sections keep their heading and page range', () => {
  const text = ['Transport layer\nTCP is reliable. ' + 'x'.repeat(2000), 'More about TCP ' + 'y'.repeat(2000), 'Routing\nA router forwards. ' + 'z'.repeat(3000)].join('\f');
  const s = Q.sectionChunks(text, 5500, 'p.');
  assert.ok(s.length >= 2);
  assert.equal(s[0].title, 'Transport layer');
  assert.equal(s[0].ref, 'p. 1–2');
  assert.equal(s[1].title, 'Routing'); assert.equal(s[1].ref, 'p. 3');
  assert.ok(s.every((c) => c.text.length <= 5500));
});

test('sections of plain text carry the last heading forward and have no page', () => {
  const text = 'Introduction\n\n' + 'Word '.repeat(1500) + '\n\n' + 'Word '.repeat(1500);
  const s = Q.sectionChunks(text, 3000);
  assert.ok(s.length >= 2); s.forEach((c) => { assert.equal(c.ref, ''); assert.equal(c.title, 'Introduction'); });
  assert.equal(s.map((c) => c.text).join('').replace(/\s+/g, ''), text.replace(/\s+/g, ''));
});

test('old question banks lose cloze questions but keep AI ones and the answer history', () => {
  const ai = { id: 'a1', q: 'Which protocol keeps latency low for streaming applications?', o: ['UDP', 'TCP', 'ARP', 'DNS'], a: 0, e: 'x', src: 'ai', fk: 'f1' };
  const cloze = { id: 'l1', q: 'Fill in the blank: x', o: ['a', 'b', 'c', 'd'], a: 0, e: 'x', src: 'local', fk: 'f1' };
  const b = Q.upgradeBank({ v: 2, q: [ai, cloze], used: [1], done: { f1: true }, stats: { a1: { asked: 2, miss: 1 }, l1: { asked: 1, miss: 0 } } });
  assert.equal(b.v, 3); assert.deepEqual(b.q.map((q) => q.id), ['a1']); assert.equal(b.stats.a1.miss, 1); assert.deepEqual(b.done, {});
});

test('source line prefers the AI section reference', () => {
  assert.equal(Q.sourceLine({ file: 'w3.pdf', ref: 'p. 4–5' }), 'w3.pdf, p. 4–5');
});
