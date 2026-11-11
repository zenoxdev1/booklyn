import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ROWS } from '../../site/landing.strings.mjs';
import { buildAll, LANGS } from '../../tools/build-landing.mjs';

const tpl = readFileSync(new URL('../../site/landing.template.html', import.meta.url), 'utf8');
const pages = buildAll();

test('every string exists in all four languages and none is blank', () => {
  for (const r of ROWS) {
    assert.equal(r.length, 5, r[0]);
    r.forEach((v, i) => assert.ok(typeof v === 'string' && v.trim(), `${r[0]} [${i}]`));
  }
  assert.equal(new Set(ROWS.map((r) => r[0])).size, ROWS.length, 'duplicate keys');
});

test('the template uses only known keys and every key is used', () => {
  const keys = new Set(ROWS.map((r) => r[0]));
  const extra = new Set(['lang', 'langname', 'langcur', 'canon', 'hreflang', 'ogLocale', 'switcher', 'home', 'app']);
  const used = new Set([...tpl.matchAll(/\{\{([\w.]+)\}\}/g)].map((m) => m[1]));
  for (const k of used) assert.ok(keys.has(k) || extra.has(k), 'unknown ' + k);
  for (const k of keys) assert.ok(used.has(k), 'unused ' + k);
});

test('four pages, no placeholder left, correct lang and canonical', () => {
  assert.deepEqual(Object.keys(pages).sort(), ['de/index.html', 'es/index.html', 'fr/index.html', 'index.html']);
  for (const L of LANGS) {
    const h = pages[L.path === '/' ? 'index.html' : `${L.code}/index.html`];
    assert.ok(!/\{\{|\}\}/.test(h), L.code + ' placeholder left');
    assert.ok(h.includes(`<html lang="${L.code}">`));
    assert.ok(h.includes(`rel="canonical" href="https://booklyn.pages.dev${L.path}"`));
    for (const o of LANGS) assert.ok(h.includes(`hreflang="${o.code}" href="https://booklyn.pages.dev${o.path}"`));
    assert.ok(h.includes('hreflang="x-default"'));
    assert.equal((h.match(/aria-current="true"/g) || []).length, 2, 'switcher marks the current language (top and footer)');
    assert.ok(h.includes(L.code === 'en' ? 'href="/app/"' : `href="/app/?lang=${L.code}"`));
  }
});

test('translations differ from English (nothing was left untranslated)', () => {
  const same = ROWS.filter((r) => r[1].length > 25 && (r[2] === r[1] || r[3] === r[1] || r[4] === r[1]));
  assert.deepEqual(same.map((r) => r[0]), []);
});

test('text in attributes has no stray double quotes', () => {
  for (const h of Object.values(pages)) {
    for (const m of h.matchAll(/(?:alt|aria-label|content)="([^"]*)"/g)) assert.ok(!/[<>]/.test(m[1]), m[1]);
    assert.ok(!/(?:alt|aria-label)="[^"]*"[a-z]/i.test(h));
  }
});

test('files on disk are in sync with the template (run node tools/build-landing.mjs)', () => {
  for (const [f, html] of Object.entries(pages)) {
    const p = new URL('../../' + f, import.meta.url);
    assert.ok(existsSync(p), f);
    assert.equal(readFileSync(p, 'utf8'), html, f + ' is out of date');
  }
});

test('the screenshots the page points to exist', () => {
  for (const s of ['shot-campus', 'shot-phone', 'shot-shop']) assert.ok(existsSync(new URL(`../../assets/${s}.webp`, import.meta.url)), s);
});

test('app dictionary has the unit-label strings in de, es and fr', async () => {
  const { DICT } = await import('../../app/js/i18n-dict.js');
  for (const l of ['de', 'es', 'fr']) for (const k of ['Topic ', 'Chapter ', 'Weeks', 'Topics', 'Chapters', 'This module is organised by']) assert.ok(DICT[l][k], l + ' ' + k);
});
