/* Booklyn lot layout: where the decorations of one building stand. Every item has its own fixed spot, so nothing is
   ever drawn on top of another item, and nothing stands on the building or on the street.
   Coordinates are local to the lot (0..P). The building sits in the middle (platform 1.0 to 3.2). */
export var P = 4.2;
/* centres of the 16 spots around the building; every spot is a 0.6 x 0.6 square */
export var SPOT = {
  NW: [.65, .65], N1: [1.35, .65], N2: [2.1, .65], N3: [2.85, .65], NE: [3.55, .65],
  W1: [.65, 1.35], W2: [.65, 2.1], W3: [.65, 2.85], SW: [.65, 3.55],
  E1: [3.55, 1.35], E2: [3.55, 2.1], E3: [3.55, 2.85], SE: [3.55, 3.55],
  S1: [1.35, 3.55], S2: [2.1, 3.55], S3: [2.85, 3.55]
};
export var HALF = { tree: .3, lamp: .15, flowers: .3, fountain: .3, statue: .24, bench: .3, base: .3 };
/* spots the front of the building shows (not hidden behind it) get the things people buy; the hidden ones only get plain trees */
export var TREE_SPOTS = ['N3', 'NE', 'W3'];
export var BASE_HIDDEN = ['NW', 'N1', 'N2', 'W1', 'W2'];
export var BASE_FRONT = ['SE', 'SW', 'NE', 'N3', 'W3'];

function sq(k, spot, extra) {
  var c = SPOT[spot], h = HALF[k] || .3, o = { k: k, spot: spot, x: c[0], y: c[1], x0: c[0] - h, y0: c[1] - h, x1: c[0] + h, y1: c[1] + h };
  if (k === 'bench') { o.x0 = c[0] - .2; o.x1 = c[0] + .2; }
  if (extra) for (var q in extra) o[q] = extra[q];
  return o;
}
/* dc = what the player owns for this building, seed = a number from the module code (for the plain trees) */
export function plan(dc, seed) {
  dc = dc || {}; var out = [], used = {};
  function put(o) { out.push(o); used[o.spot] = 1; if (o.spot2) used[o.spot2] = 1; }
  for (var t = 0; t < Math.min(3, dc.tree | 0); t++) put(sq('tree', TREE_SPOTS[t], { s: 1.05 }));
  if (dc.lamp) { put(sq('lamp', 'S1')); put(sq('lamp', 'S3')); }
  if (dc.fountain) put(sq('fountain', 'S2'));
  if (dc.pool) put({ k: 'pool', spot: 'E1', spot2: 'E2', x: 3.57, y: 1.72, x0: 3.3, y0: 1.05, x1: 3.85, y1: 2.4 });
  if (dc.statue) put(sq('statue', 'E3'));
  if (dc.flowers) put(sq('flowers', 'SE', { seed: seed }));
  if (dc.bench) put(sq('bench', 'SW'));
  /* plain greenery in the spots nobody uses */
  BASE_HIDDEN.concat(BASE_FRONT).forEach(function (sp, i) {
    if (used[sp]) return;
    var front = i >= BASE_HIDDEN.length;
    if (sp === 'SE' || ((seed >> i) & 1) || (!front && ((seed >> (i + 5)) & 1)))
      put(sq('tree', sp, { base: 1, s: .8 + ((seed >> (i + 3)) & 3) * .12 }));
  });
  return out;
}
export function overlap(a, b) { return a.x0 < b.x1 - 1e-9 && b.x0 < a.x1 - 1e-9 && a.y0 < b.y1 - 1e-9 && b.y0 < a.y1 - 1e-9; }
/* the building with its platform, and the street strip around the lot */
export var PLATFORM = { x0: 1.0, y0: 1.0, x1: 3.2, y1: 3.2 };
