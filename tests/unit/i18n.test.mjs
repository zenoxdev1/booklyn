import test from 'node:test';
import assert from 'node:assert/strict';
import { DICT } from '../../app/js/i18n-dict.js';

const langs = ['de', 'es', 'fr'];
const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
const ctl = (s) => (s.match(/\x01/g) || []).length;

test('all languages cover the same keys', () => {
  const base = Object.keys(DICT.de).sort();
  for (const l of langs) assert.deepEqual(Object.keys(DICT[l]).sort(), base, l);
});

for (const l of langs) {
  test(l + ': placeholders and markers match the English key', () => {
    for (const [k, v] of Object.entries(DICT[l])) {
      assert.equal(typeof v, 'string', k);
      assert.ok(v.trim().length > 0, 'empty: ' + k);
      assert.equal(ph(v), ph(k), 'placeholders: ' + k + ' -> ' + v);
      assert.equal(ctl(v), ctl(k), 'markers: ' + k + ' -> ' + v);
    }
  });
  test(l + ': no raw HTML-breaking characters were introduced', () => {
    for (const [k, v] of Object.entries(DICT[l])) {
      for (const ch of ['<', '>', '&', '"']) {
        assert.equal(v.split(ch).length, k.split(ch).length, 'char ' + ch + ': ' + k + ' -> ' + v);
      }
    }
  });
}
