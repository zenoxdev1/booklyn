/* Booklyn import voyage: boats of one colour per subject sail to the port, then a small boat carries the delivery
   from the port to the building of that subject. Pure geometry and timing, so it can be tested in Node.
   All coordinates are city units (x, y on the ground plane); the page turns them into screen points. */

export var STAGGER = 1.1, UNLOAD = 0.8, LEAVE = 0.8, SEA_SPEED = 3.2, LAND_SPEED = 5.5, MAX_BOATS = 8;

export function pathLen(p) {
  var s = 0; for (var i = 1; i < p.length; i++) s += Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]);
  return s;
}
/* Point at distance d along an axis-aligned path, with the axis it is moving along ('x' or 'y'). */
export function pathAt(p, d) {
  d = Math.max(0, d);
  for (var i = 1; i < p.length; i++) {
    var a = p[i - 1], b = p[i], l = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    if (d <= l || i === p.length - 1) {
      var t = l ? Math.min(1, d / l) : 1, ax = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]) ? 'x' : 'y';
      return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ax: ax };
    }
    d -= l;
  }
  return { x: p[0][0], y: p[0][1], ax: 'x' };
}
export function reversed(p) { return p.slice().reverse(); }

/* g = { C, R, P, F, cy (bridge line), X1 (island edge), XP1 (east end of the port), py0 (north side of the port), sx1, sy1 (sea corner) } */
/* two berths on the east side of the port, boats use them in turn so a new boat never sails into one that is unloading */
export function berthY(g, berth) { return g.py0 + (berth % 2 ? 2.7 : 0.9); }
export function seaRoute(g, berth) {
  var lane = g.XP1 + 2.6, dy = berthY(g, berth || 0);
  return [[g.sx1 - 0.4, g.sy1 - 0.4], [lane, g.sy1 - 0.4], [lane, dy], [g.XP1 + 1.05, dy]];
}
/* from the quay across the port, over the bridge and along the streets to the door of the building in `slot` */
export function landRoute(g, slot, berth) {
  var col = slot % g.C, row = Math.floor(slot / g.C), ox = col * g.P, oy = row * g.P;
  var door = ox + g.P / 2, y1 = oy + (g.P + g.F) / 2, ys = oy + g.P, stop = Math.min(ys - 0.2, y1 + 0.7), edge = g.C * g.P;
  var r = [[g.XP1 - 0.3, berthY(g, berth || 0)], [g.XP1 - 0.3, g.cy], [edge, g.cy]];
  if (ys !== g.cy) r.push([edge, ys]);
  r.push([door, ys], [door, stop]);
  return r;
}

/* One entry per boat: when each phase starts and how long it lasts. */
export function timeline(boats, g) {
  var tl = [];
  boats.slice(0, MAX_BOATS).forEach(function (b, i) {
    var sea = seaRoute(g, i), seaL = pathLen(sea), land = landRoute(g, b.slot, i), landL = pathLen(land);
    var t0 = i * STAGGER, sail = Math.max(2.2, seaL / SEA_SPEED), leave = LEAVE, deliver = Math.max(2.2, landL / LAND_SPEED);
    tl.push({ i: i, b: b, sea: sea, land: land, t0: t0, sail: sail, unload: UNLOAD, leave: leave, deliver: deliver,
      tUnloaded: t0 + sail + UNLOAD, tArrive: t0 + sail + UNLOAD + deliver, tEnd: t0 + sail + UNLOAD + Math.max(leave, deliver) });
  });
  return tl;
}
export function totalTime(tl) { return tl.reduce(function (m, e) { return Math.max(m, e.tEnd); }, 0); }

/* Where everything of one boat is at time t (seconds). big = the sailing boat, small = the delivery boat. */
export function stateAt(e, t) {
  var s = { big: null, small: null, arrived: t >= e.tArrive, done: t >= e.tEnd, pulse: 0 };
  if (t < e.t0) return s;
  var seaL = pathLen(e.sea), landL = pathLen(e.land);
  if (t < e.t0 + e.sail) { s.big = pathAt(e.sea, seaL * (t - e.t0) / e.sail); s.big.op = 1; return s; }
  var u = e.t0 + e.sail;
  if (t < e.tUnloaded) { s.big = pathAt(e.sea, seaL); s.big.op = 1; return s; }
  var back = (t - e.tUnloaded) / e.leave;
  /* the ship fades out at its berth (sailing back would cross the next ship on the same lane) */
  if (back < 1) { s.big = pathAt(e.sea, seaL); s.big.op = 1 - back * back; }
  var fwd = (t - e.tUnloaded) / e.deliver;
  if (fwd < 1) s.small = pathAt(e.land, landL * fwd);
  else if (t < e.tArrive + 0.9) s.pulse = (t - e.tArrive) / 0.9;
  return s;
}
