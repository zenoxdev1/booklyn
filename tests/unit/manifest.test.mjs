import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const m = JSON.parse(readFileSync(new URL('../../app/manifest.webmanifest', import.meta.url), 'utf8'));
const dir = new URL('../../app/', import.meta.url);

test('manifest has what Android and Play need', () => {
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, '/app/'); assert.equal(m.scope, '/app/'); assert.equal(m.id, '/app/');
  assert.ok(m.name && m.short_name && m.theme_color && m.background_color);
  assert.ok(m.icons.some((i) => i.sizes === '192x192' && i.purpose === 'any'));
  assert.ok(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
});
test('every icon file exists', () => { for (const i of m.icons) assert.ok(existsSync(new URL(i.src, dir)), i.src); });
test('shortcuts stay inside the scope and use existing icons', () => {
  for (const s of m.shortcuts || []) { assert.ok(s.url.startsWith(m.scope), s.url); for (const i of s.icons || []) assert.ok(existsSync(new URL(i.src, dir)), i.src); }
});
test('public pages have no unfilled placeholders', () => {
  for (const f of ['imprint', 'privacy', 'terms']) {
    const h = readFileSync(new URL(`../../${f}/index.html`, import.meta.url), 'utf8');
    assert.ok(!/\[(Full name|Street|Postcode|contact email|city, canton)/.test(h), f);
  }
  assert.ok(!/example\.invalid/.test(readFileSync(new URL('../../.well-known/security.txt', import.meta.url), 'utf8')));
});
