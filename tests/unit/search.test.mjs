import test from 'node:test';
import assert from 'node:assert/strict';
import { fold, tokens, matchDoc, pageAt, snippet, marks, search, clearCache } from '../../app/js/search.js';

test('fold keeps the length and removes accents and case', () => {
  const s = 'Äpfel Über ÉCOLE straße İstanbul';
  assert.equal(fold(s).length, s.length);
  assert.equal(fold('Äpfel Über ÉCOLE'), 'apfel uber ecole');
});

test('tokens: words, no duplicates, no punctuation, max 8', () => {
  assert.deepEqual(tokens('  Router, ROUTER   ipv4! '), ['router', 'ipv4']);
  assert.deepEqual(tokens(''), []);
  assert.equal(tokens('a b c d e f g h i j').length, 8);
  assert.deepEqual(tokens('Übung Woche 3'), ['ubung', 'woche', '3']);
});

test('matchDoc needs every word, in the title or the body', () => {
  const d = { key: 'f1', title: 'Module 9 - Address Resolution.pdf', body: 'ARP maps an IPv4 address to a MAC address.' };
  assert.ok(matchDoc(d, ['address', 'resolution']));
  assert.ok(matchDoc(d, ['arp', 'resolution']));
  assert.equal(matchDoc(d, ['arp', 'banana']), null);
  assert.equal(matchDoc(d, []), null);
  assert.equal(matchDoc(d, ['arp', 'resolution']).field, 'title');
});

test('a title hit ranks above a body-only hit', () => {
  clearCache();
  const docs = [
    { key: 'a', kind: 'file', mod: 'm1', unit: 1, title: 'Slides week 1.pdf', body: 'the router forwards packets' },
    { key: 'b', kind: 'file', mod: 'm1', unit: 2, title: 'Router configuration.pdf', body: '' },
  ];
  const r = search(docs, 'router');
  assert.equal(r.total, 2);
  assert.equal(r.results[0].doc.key, 'b');
  assert.equal(r.results[1].field, 'body');
  assert.ok(r.results[1].snip.includes('router'));
});

test('search can be limited to one module', () => {
  const docs = [
    { key: 'a', kind: 'file', mod: 'm1', unit: 1, title: 'Binomial.pdf' },
    { key: 'b', kind: 'file', mod: 'm2', unit: 1, title: 'Binomial notes.docx' },
  ];
  assert.equal(search(docs, 'binomial').total, 2);
  const r = search(docs, 'binomial', { mod: 'm2' });
  assert.equal(r.total, 1);
  assert.equal(r.results[0].doc.mod, 'm2');
});

test('accents do not matter: Ubung finds Übung', () => {
  const docs = [{ key: 'a', kind: 'file', mod: 'm', unit: 1, title: 'Übung 3 Lösungen.pdf' }];
  assert.equal(search(docs, 'ubung losungen').total, 1);
});

test('pageAt counts the page marks before the match', () => {
  const t = 'page one\fpage two\fpage three has needle';
  assert.equal(pageAt(t, t.indexOf('needle')), 3);
  assert.equal(pageAt('no marks here', 3), 0);
  assert.equal(pageAt(t, 2), 1);
});

test('search result carries the page of the first body hit', () => {
  clearCache();
  const body = 'intro text\fsecond page\fthe poisson distribution is here';
  const r = search([{ key: 'p', kind: 'file', mod: 'm', unit: 1, title: 'Week 7.pdf', body }], 'poisson');
  assert.equal(r.results[0].page, 3);
});

test('snippet is short, has no page marks and cuts at words', () => {
  const body = ('lorem ipsum '.repeat(40)) + 'TARGET word' + (' dolor sit '.repeat(40));
  const s = snippet(body, body.indexOf('TARGET'), 100);
  assert.ok(s.includes('TARGET'));
  assert.ok(s.length < 130);
  assert.ok(s.startsWith('… ') && s.endsWith(' …'));
  assert.ok(!/\f/.test(snippet('a\fb TARGET', 4, 100)));
});

test('marks highlights each word, ignoring case and accents', () => {
  const m = marks('Die Übung zur Binomialverteilung', ['ubung', 'binomial']);
  assert.equal(m.map((x) => x.t).join(''), 'Die Übung zur Binomialverteilung');
  assert.deepEqual(m.filter((x) => x.m).map((x) => x.t), ['Übung', 'Binomial']);
  assert.deepEqual(marks('abc', []), [{ t: 'abc', m: false }]);
});

test('a stale cached body is not reused when the text changed', () => {
  clearCache();
  const key = 'x';
  assert.ok(matchDoc({ key, title: 't', body: 'old words here' }, ['old']));
  assert.equal(matchDoc({ key, title: 't', body: 'new text that is longer than before' }, ['old']), null);
});

test('limit and total', () => {
  const docs = Array.from({ length: 120 }, (_, i) => ({ key: 'k' + i, kind: 'file', mod: 'm', unit: 1, title: 'file ' + i + ' notes' }));
  const r = search(docs, 'notes', { limit: 30 });
  assert.equal(r.total, 120);
  assert.equal(r.results.length, 30);
});
