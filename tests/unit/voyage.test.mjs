import test from 'node:test';
import assert from 'node:assert/strict';
import * as V from '../../app/js/voyage.js';

const G = { C: 3, R: 2, P: 4.2, F: 1.8, cy: 4.2, X1: 12.95, XP1: 20.35, py0: 2.3, sx1: 23.85, sy1: 7.5 };

test('path length and position along an axis-aligned path', () => {
  const p = [[0, 0], [4, 0], [4, 3]];
  assert.equal(V.pathLen(p), 7);
  assert.deepEqual(V.pathAt(p, 0), { x: 0, y: 0, ax: 'x' });
  assert.deepEqual(V.pathAt(p, 2), { x: 2, y: 0, ax: 'x' });
  assert.deepEqual(V.pathAt(p, 5), { x: 4, y: 1, ax: 'y' });
  assert.deepEqual(V.pathAt(p, 99), { x: 4, y: 3, ax: 'y' });
  assert.deepEqual(V.reversed(p)[0], [4, 3]);
});

test('the sea route ends at the quay, the land route ends at the door of the right building', () => {
  const s = V.seaRoute(G); assert.deepEqual(s[s.length - 1], [G.XP1 + 1.05, G.py0 + .9]);
  assert.notEqual(V.seaRoute(G, 1)[3][1], s[3][1], 'a second berth');
  s.forEach((pt, i) => { if (i) assert.ok(pt[0] === s[i - 1][0] || pt[1] === s[i - 1][1], 'axis aligned'); });
  for (let slot = 0; slot < 6; slot++) {
    const r = V.landRoute(G, slot), end = r[r.length - 1], col = slot % 3, row = Math.floor(slot / 3);
    assert.equal(end[0], col * G.P + G.P / 2, 'in front of the door of slot ' + slot);
    assert.ok(end[1] > row * G.P + (G.P + G.F) / 2 && end[1] < (row + 1) * G.P + .01);
    r.forEach((pt, i) => { if (i) assert.ok(pt[0] === r[i - 1][0] || pt[1] === r[i - 1][1], 'axis aligned'); });
    /* it goes over the bridge line and uses the street at the island edge */
    assert.ok(r.some((pt) => pt[0] === G.C * G.P) && r.some((pt) => pt[1] === G.cy));
  }
});

test('boats leave one after another, the number is limited, every boat arrives', () => {
  const boats = Array.from({ length: 12 }, (_, i) => ({ mod: 'm' + i, slot: i % 6 }));
  const tl = V.timeline(boats, G);
  assert.equal(tl.length, V.MAX_BOATS);
  tl.forEach((e, i) => { assert.equal(e.t0, i * V.STAGGER); assert.ok(e.tArrive > e.tUnloaded && e.tEnd >= e.tArrive); });
  assert.ok(V.totalTime(tl) < 20, 'whole voyage under 20 s: ' + V.totalTime(tl));
});

test('a boat sails in, unloads, a delivery boat reaches the building, then everything is done', () => {
  const [e] = V.timeline([{ mod: 'a', slot: 4 }], G);
  let s = V.stateAt(e, -1); assert.equal(s.big, null); assert.equal(s.small, null); assert.equal(s.done, false);
  s = V.stateAt(e, e.t0 + e.sail / 2); assert.ok(s.big && !s.small);
  s = V.stateAt(e, e.tUnloaded - .1); assert.deepEqual([s.big.x, s.big.y], [e.sea[3][0], e.sea[3][1]], 'moored at the quay');
  s = V.stateAt(e, e.tUnloaded + .3); assert.ok(s.big && s.small, 'delivery starts while the boat leaves');
  s = V.stateAt(e, e.tArrive + .2); assert.ok(s.arrived && s.pulse > 0 && s.small === null);
  const end = e.land[e.land.length - 1]; s = V.stateAt(e, e.tUnloaded + e.deliver - .001); assert.ok(Math.abs(s.small.x - end[0]) < .05 && Math.abs(s.small.y - end[1]) < .05);
  s = V.stateAt(e, e.tEnd + .1); assert.ok(s.done && !s.big && !s.small);
});

test('boats of different subjects do not sail at the same time on the same spot', () => {
  const tl = V.timeline([{ slot: 0 }, { slot: 1 }, { slot: 2 }], G);
  for (let t = 0; t < V.totalTime(tl); t += .05) {
    const pos = tl.map((e) => V.stateAt(e, t).big).filter((b) => b && b.op > .4);
    for (let a = 0; a < pos.length; a++) for (let b = a + 1; b < pos.length; b++) assert.ok(Math.hypot(pos[a].x - pos[b].x, pos[a].y - pos[b].y) > 0.5, 'too close at ' + t.toFixed(2));
  }
});
