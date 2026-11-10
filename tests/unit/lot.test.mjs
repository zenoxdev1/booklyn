import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../app/js/lot.js';

const FLAGS = ['lamp', 'pool', 'fountain', 'flowers', 'statue', 'bench'];
function* combos() {
  for (let mask = 0; mask < 1 << FLAGS.length; mask++)
    for (let tree = 0; tree <= 3; tree++) {
      const dc = { tree }; FLAGS.forEach((f, i) => { if (mask >> i & 1) dc[f] = true; }); yield dc;
    }
}

test('no decoration overlaps another one, for every combination and many seeds', () => {
  let n = 0;
  for (const dc of combos()) for (const seed of [0, 1, 5, 21, 255, 1023, 99999, 0x7fffffff]) {
    const it = L.plan(dc, seed);
    for (let a = 0; a < it.length; a++) for (let b = a + 1; b < it.length; b++) { n++; assert.ok(!L.overlap(it[a], it[b]), JSON.stringify(dc) + ' seed ' + seed + ': ' + it[a].k + '@' + it[a].spot + ' overlaps ' + it[b].k + '@' + it[b].spot); }
  }
  assert.ok(n > 10000);
});

test('everything stays on the lawn: not on the building platform, not on the street', () => {
  for (const dc of combos()) for (const seed of [0, 7, 1234]) for (const i of L.plan(dc, seed)) {
    assert.ok(i.x0 >= .3 && i.y0 >= .3 && i.x1 <= L.P - .3 && i.y1 <= L.P - .3, 'inside the lawn: ' + i.k + '@' + i.spot);
    assert.ok(!L.overlap(i, L.PLATFORM), 'not on the building: ' + i.k + '@' + i.spot);
  }
});

test('what you buy is always drawn, and a tree you buy never replaces another bought thing', () => {
  const all = { tree: 3, lamp: true, pool: true, fountain: true, flowers: true, statue: true, bench: true };
  const it = L.plan(all, 3);
  assert.equal(it.filter((x) => x.k === 'tree' && !x.base).length, 3);
  assert.equal(it.filter((x) => x.k === 'lamp').length, 2);
  ['pool', 'fountain', 'flowers', 'statue', 'bench'].forEach((k) => assert.equal(it.filter((x) => x.k === k).length, 1, k));
  assert.equal(L.plan({}, 2).filter((x) => !x.base).length, 0, 'an empty lot only has plain trees');
});

test('the lot plan is the same every time (no random jumping)', () => {
  assert.deepEqual(L.plan({ tree: 2, lamp: true }, 17), L.plan({ tree: 2, lamp: true }, 17));
});
