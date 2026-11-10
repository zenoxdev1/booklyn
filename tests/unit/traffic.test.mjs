import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../app/js/traffic.js';

function world(C, R, cars, peds) {
  const w = T.newWorld(C, R);
  for (let i = 0; i < cars; i++) T.addAgent(w, { id: 'c' + i, kind: 'car', type: T.CAR_TYPES[i % 6], h: i * 40 });
  for (let i = 0; i < peds; i++) T.addAgent(w, { id: 'p' + i, kind: 'ped', type: T.PED_KINDS[i % 4], h: i * 30 });
  return w;
}
const onStreet = (w, p) => {
  const nx = Math.abs(p.x - Math.round(p.x / T.P) * T.P), ny = Math.abs(p.y - Math.round(p.y / T.P) * T.P);
  return (nx <= .31 || ny <= .31) && p.x > -.35 && p.y > -.35 && p.x < w.C * T.P + .35 && p.y < w.R * T.P + .35;
};

test('cars and people always stay on a street (never on a building lot), in every layout', () => {
  for (const [C, R] of [[1, 1], [2, 1], [3, 2], [6, 2], [4, 3]]) {
    const w = world(C, R, T.MAX_CARS, T.MAX_PEDS);
    for (let t = 0; t < 120 * 20; t++) {
      T.step(w, 1 / 20);
      for (const a of w.agents) { const p = T.pose(a); assert.ok(onStreet(w, p), `${a.id} left the street at ${p.x.toFixed(2)},${p.y.toFixed(2)} (${C}x${R}, step ${t})`); }
    }
  }
});

test('cars keep their distance from each other in the same lane', () => {
  const w = world(3, 2, T.capacity(3, 2).cars, 0); let worst = 9;
  for (let t = 0; t < 180 * 20; t++) {
    T.step(w, 1 / 20);
    for (let i = 0; i < w.agents.length; i++) for (let j = i + 1; j < w.agents.length; j++) {
      const a = w.agents[i], b = w.agents[j];
      if (a.o === b.o && a.li === b.li && a.dir === b.dir) { const g = Math.abs(a.s - b.s) - (a.len + b.len) / 2; worst = Math.min(worst, g); }
    }
  }
  assert.ok(worst > -.02, 'cars in the same lane never overlap, closest gap ' + worst.toFixed(3));
});

test('cars at a crossing do not drive through each other', () => {
  const w = world(3, 2, T.capacity(3, 2).cars, 0); let worst = 9;
  for (let t = 0; t < 240 * 20; t++) {
    T.step(w, 1 / 20);
    for (let i = 0; i < w.agents.length; i++) for (let j = i + 1; j < w.agents.length; j++) {
      const p = T.pose(w.agents[i]), q = T.pose(w.agents[j]); worst = Math.min(worst, Math.hypot(p.x - q.x, p.y - q.y));
    }
  }
  assert.ok(worst > .12, 'closest two cars centres ' + worst.toFixed(3));
});

test('traffic keeps moving (no deadlock) and cars use many streets', () => {
  const w = world(3, 2, T.capacity(3, 2).cars, 6); const seen = new Set();
  for (let t = 0; t < 200 * 20; t++) { T.step(w, 1 / 20); w.agents.forEach((a) => seen.add(a.o + a.li)); }
  const moving = w.agents.filter((a) => a.v > .05).length;
  assert.ok(moving >= w.agents.length / 2, 'most are moving: ' + moving + '/' + w.agents.length);
  assert.ok(seen.size >= 6, 'streets used ' + seen.size);
});

test('how many fit depends on the size of the island, and a full island keeps flowing', () => {
  assert.deepEqual(T.capacity(1, 1), { cars: 2, peds: 4 });
  assert.equal(T.capacity(6, 2).cars, T.MAX_CARS);
  for (const [C, R] of [[1, 1], [2, 1], [2, 2], [3, 2], [4, 3]]) {
    const cap = T.capacity(C, R), w = world(C, R, cap.cars, cap.peds); let mov = 0, tot = 0;
    for (let t = 0; t < 240 * 20; t++) { T.step(w, 1 / 20); if (t > 40 * 20) w.agents.forEach((a) => { tot++; if (a.v > .1) mov++; }); }
    assert.ok(mov / tot > .6, C + 'x' + R + ' keeps moving: ' + (mov / tot).toFixed(2));
  }
});

test('a car or a walker can be removed again, and new ones start on free spots', () => {
  const w = world(3, 2, 4, 2); T.removeAgent(w, 'c1'); assert.equal(w.agents.length, 5);
  const a = T.addAgent(w, { id: 'x', kind: 'car', type: 'bus', h: 10 }); const p = T.pose(a);
  w.agents.filter((b) => b !== a).forEach((b) => { const q = T.pose(b); assert.ok(Math.hypot(p.x - q.x, p.y - q.y) > .3); });
  assert.ok(onStreet(w, p));
});

test('the pose gives the axis the vehicle drives along, and it turns smoothly onto crossing streets', () => {
  const w = world(3, 2, 1, 0); const a = w.agents[0]; let last = T.pose(a), jump = 0;
  for (let t = 0; t < 400 * 20; t++) { T.step(w, 1 / 20); const p = T.pose(a); jump = Math.max(jump, Math.hypot(p.x - last.x, p.y - last.y)); last = p; assert.ok(p.ax === 'x' || p.ax === 'y'); }
  assert.ok(jump < .2, 'no jumps, biggest step ' + jump.toFixed(3));
});

test('saved traffic is cleaned and merged safely', () => {
  const c = T.cleanState({ cars: [{ id: 'a', t: 'bus', h: 400 }, { id: 'a', t: 'van', h: 1 }, { id: 'b', t: 'rocket', h: 1 }, { id: '../x', t: 'van', h: 1 }, null], peds: [{ id: 'p', k: 'dog', h: -10 }, { id: 'q', k: 'ghost', h: 1 }] });
  assert.deepEqual(c, { cars: [{ id: 'a', h: 40, t: 'bus' }], peds: [{ id: 'p', h: 350, k: 'dog' }] });
  assert.deepEqual(T.cleanState(undefined), { cars: [], peds: [] });
  const many = { cars: Array.from({ length: 30 }, (_, i) => ({ id: 'c' + i, t: 'sedan', h: 1 })), peds: [] };
  assert.equal(T.cleanState(many).cars.length, T.MAX_CARS);
  const m = T.mergeState({ cars: [{ id: 'a', t: 'sedan', h: 1 }], peds: [] }, { cars: [{ id: 'a', t: 'bus', h: 2 }, { id: 'z', t: 'van', h: 3 }], peds: [{ id: 'p', k: 'kid', h: 5 }] });
  assert.deepEqual(m.cars.map((x) => x.id + x.t), ['asedan', 'zvan']); assert.equal(m.peds.length, 1);
});
