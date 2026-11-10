/* Booklyn traffic: little cars drive along the streets and people walk along them. Pure simulation (no drawing), so it
   can be tested in Node. The streets are a grid with a node every P units; a street is a line of that grid, including
   the ring around the island. Cars keep to a lane on their side of the street, people keep to the pavement edge, and
   nobody leaves the strip around a street line, so nothing ever drives over a building. */
export var P = 4.2, LANE = .1, WALK = .27, NODE = .36, MAX_CARS = 12, MAX_PEDS = 16;
export var CAR_TYPES = ['sedan', 'hatch', 'van', 'taxi', 'bus', 'sports'];
export var PED_KINDS = ['person', 'kid', 'jogger', 'dog'];
export var LEN = { sedan: .55, hatch: .45, van: .58, taxi: .55, bus: 1.0, sports: .5 };
var SPEED = { sedan: 1.0, hatch: .95, van: .85, taxi: 1.08, bus: .7, sports: 1.3, person: .42, kid: .34, jogger: .85, dog: .38 };

function rnd(a) { a.r = (Math.imul(a.r, 1664525) + 1013904223) >>> 0; return a.r / 4294967296; }
function hashId(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0; return h || 1; }

/* how many cars and walkers a street grid of C x R lots has room for (more would only queue up) */
export function capacity(C, R) {
  var len = ((C + 1) * R + (R + 1) * C) * P;
  return { cars: Math.max(1, Math.min(MAX_CARS, Math.floor(len / 8))), peds: Math.max(3, Math.min(MAX_PEDS, Math.floor(len / 4))) };
}
export function newWorld(C, R) { return { C: C, R: R, agents: [] }; }
export function isCar(a) { return a.kind === 'car'; }
function lanePos(a) { return a.kind === 'car' ? (a.o === 'h' ? a.dir * LANE : -a.dir * LANE) : a.side * WALK; }
export function pose(a) {
  var x = a.o === 'h' ? a.s : a.li * P + a.lat, y = a.o === 'h' ? a.li * P + a.lat : a.s;
  return { x: x, y: y, ax: a.o === 'h' ? 'x' : 'y', dir: a.dir, v: a.v, ph: a.ph };
}
function along(w, o) { return o === 'h' ? w.C : w.R; }
function across(w, o) { return o === 'h' ? w.R : w.C; }

/* add a car or a walker at a free place on a street */
export function addAgent(w, spec) {
  var a = { id: spec.id, kind: spec.kind, type: spec.type, h: spec.h || 0, r: hashId(spec.id), v: 0, ph: 0, wait: 0 };
  var sp = SPEED[spec.type] || .5; a.vm = .9 + rnd(a) * .2; a.base = sp * a.vm; a.len = spec.kind === 'car' ? (LEN[spec.type] || .5) : .15;
  var tries = 0, ok = false;
  while (tries++ < 60 && !ok) {
    a.o = rnd(a) < .5 ? 'h' : 'v';
    a.li = Math.floor(rnd(a) * (across(w, a.o) + 1));
    var L = along(w, a.o) * P; a.s = .6 + rnd(a) * (L - 1.2);
    a.dir = rnd(a) < .5 ? 1 : -1; a.side = rnd(a) < .5 ? 1 : -1;
    a.lat = lanePos(a);
    ok = !w.agents.some(function (b) { var p = pose(a), q = pose(b); return Math.hypot(p.x - q.x, p.y - q.y) < .9; });
    /* not right at a crossing */
    var dn = Math.abs(a.s - Math.round(a.s / P) * P); if (dn < .7) ok = false;
  }
  w.agents.push(a); return a;
}
export function removeAgent(w, id) { w.agents = w.agents.filter(function (a) { return a.id !== id; }); }

function nextNode(a) { return a.dir > 0 ? Math.floor(a.s / P + 1e-9) + 1 : Math.ceil(a.s / P - 1e-9) - 1; }
function nodeOf(a, nn) { return a.o === 'h' ? [nn, a.li] : [a.li, nn]; }
function insideNode(b, ni, nj) { var p = pose(b); return Math.hypot(p.x - ni * P, p.y - nj * P) < NODE; }

/* is the crossing ahead of agent a taken? */
function blocked(w, a, nn, d) {
  var nd = nodeOf(a, nn), ni = nd[0], nj = nd[1];
  for (var k = 0; k < w.agents.length; k++) {
    var b = w.agents[k]; if (b === a) continue;
    if (a.kind === 'car') {
      if (b.kind === 'car' && b.o === a.o && b.li === a.li) continue;
      if (insideNode(b, ni, nj)) return true;
      if (b.kind === 'car' && b.o !== a.o) {                       /* a car coming from the side that is closer, or equally close with a smaller id, goes first */
        var bn = nextNode(b), bnd = nodeOf(b, bn);
        if (bnd[0] === ni && bnd[1] === nj) {
          var db = Math.abs(bn * P - b.s);
          if (db < 1.1 && (db < d - .05 || (Math.abs(db - d) <= .05 && b.id < a.id))) return true;
        }
      }
    } else if (b.kind === 'car' && Math.hypot(pose(b).x - ni * P, pose(b).y - nj * P) < NODE + .12) return true;
  }
  return false;
}
function leaderGap(w, a) {
  var gap = 9, v = a.base;
  if (a.kind !== 'car') return null;
  for (var k = 0; k < w.agents.length; k++) {
    var b = w.agents[k]; if (b === a || b.kind !== 'car' || b.o !== a.o || b.li !== a.li || b.dir !== a.dir) continue;
    var g = (b.s - a.s) * a.dir - (a.len + b.len) / 2; if (g > -.05 && g < gap) { gap = g; v = b.v; }
  }
  return gap < 9 ? { gap: gap, v: v } : null;
}
/* the lane a car would turn into must be free around the crossing */
function laneFree(w, a, no, nn, dir, atS) {
  return !w.agents.some(function (b) {
    if (b === a || b.kind !== 'car' || a.kind !== 'car') return false;
    var ahead = (b.s - atS) * dir;   /* cars still waiting behind the crossing do not count: they have to give way anyway */
    return b.o === no && b.li === nn && b.dir === dir && ahead > -.3 && ahead < (a.len + b.len) / 2 + .35;
  });
}
/* what to do at the next crossing is decided in good time, so a car does not enter it unless it can leave it */
function plan(w, a, nn, force) {
  if (a.pn === nn && !force) return;
  a.pn = nn; var N = along(w, a.o), M = across(w, a.o), opts = [];
  if (nn + a.dir >= 0 && nn + a.dir <= N) opts.push(['s', .56]);
  if (a.li > 0) opts.push(['u', .22]);
  if (a.li < M) opts.push(['d', .22]);
  var tot = 0; opts.forEach(function (o) { tot += o[1]; });
  if (force && opts.length > 1) { opts = opts.filter(function (o) { return o[0] !== a.plan; }); tot = 0; opts.forEach(function (o) { tot += o[1]; }); }
  var r = rnd(a) * tot; a.plan = opts[0][0];
  for (var i = 0; i < opts.length; i++) { r -= opts[i][1]; if (r <= 0) { a.plan = opts[i][0]; break; } }
}
function planFree(w, a, nn) {
  if (a.plan === 's' || a.kind !== 'car') return true;
  var pos = pose(a), no = a.o === 'h' ? 'v' : 'h', atS = no === 'v' ? pos.y : pos.x;
  return laneFree(w, a, no, nn, a.plan === 'd' ? 1 : -1, atS);
}
/* returns false when the agent has to wait at the crossing because the way on is taken */
function turn(w, a, nn) {
  plan(w, a, nn);
  if (a.plan === 's') { a.pn = undefined; return true; }
  var pos = pose(a), no = a.o === 'h' ? 'v' : 'h', atS = no === 'v' ? pos.y : pos.x;
  if (!planFree(w, a, nn)) return false;
  a.pn = undefined; a.o = no; a.li = nn; a.s = atS; a.dir = a.plan === 'd' ? 1 : -1; a.lat = no === 'v' ? pos.x - nn * P : pos.y - nn * P;
  if (a.kind !== 'car' && rnd(a) < .5) a.side = -a.side;
  return true;
}
function advance(w, a, dt) {
  if (a.pend !== undefined) {                       /* waiting at a crossing for a free way on */
    if (turn(w, a, a.pend)) { a.pend = undefined; a.wait = 0; } else { a.wait += dt; if (a.wait > 3) { plan(w, a, a.pend, true); a.wait = 0; } a.v = 0; return; }
  }
  var lim = a.base, nn = nextNode(a), d = Math.abs(nn * P - a.s), maxMove = 1e9;
  var lead = leaderGap(w, a);
  if (lead) { if (lead.gap < .22) lim = 0; else if (lead.gap < .9) lim = Math.min(lim, lead.v + (lead.gap - .22) * 1.2); maxMove = Math.max(0, lead.gap - .12); }
  if (d < 1.3) plan(w, a, nn);
  if (d < 1.3 && (blocked(w, a, nn, d) || !planFree(w, a, nn))) { a.wait += dt; a.stall = (a.stall || 0) + dt; if (a.wait > 2.5 && a.kind === 'car') { plan(w, a, nn, true); a.wait = 0; } if (a.stall < 6) { var stop = a.kind === 'car' ? NODE + a.len / 2 + .08 : .42; lim = Math.min(lim, Math.max(0, (d - stop)) * 2.5); maxMove = Math.min(maxMove, Math.max(0, d - stop)); } }
  else { a.wait = 0; a.stall = 0; }
  a.v += (lim - a.v) * Math.min(1, dt * 4);
  var mv = Math.min(a.v * dt, maxMove);
  if (mv >= d - 1e-9) { a.s = nn * P; if (!turn(w, a, nn)) { a.pend = nn; a.v = 0; return; } mv -= d; if (mv > 0) { var n2 = nextNode(a); mv = Math.min(mv, Math.abs(n2 * P - a.s)); a.s += a.dir * mv; } }
  else a.s += a.dir * mv;
  /* never run off the end of a street */
  var L = along(w, a.o) * P; if (a.s < 0) a.s = 0; if (a.s > L) a.s = L;
  var want = lanePos(a), dl = want - a.lat, step = .9 * dt; a.lat += Math.abs(dl) <= step ? dl : Math.sign(dl) * step;
  a.ph += a.v * dt * (a.kind === 'car' ? 0 : 5);
}
export function step(w, dt) { dt = Math.min(dt, .05); w.agents.forEach(function (a) { advance(w, a, dt); }); }

/* ---- what is saved with the island: which cars and walkers you own (positions are not saved, they start somewhere on the streets) ---- */
var ID = /^[A-Za-z0-9_-]{1,40}$/;
function hue(h) { h = Math.round(+h); return isFinite(h) ? ((h % 360) + 360) % 360 : 215; }
export function cleanState(t) {
  var out = { cars: [], peds: [] }, seen = {};
  function take(list, kinds, max, dst, key) {
    (Array.isArray(list) ? list : []).forEach(function (x) {
      if (!x || typeof x !== 'object' || dst.length >= max || !ID.test(String(x.id)) || seen[x.id] || kinds.indexOf(x[key]) < 0) return;
      seen[x.id] = 1; var o = { id: String(x.id), h: hue(x.h) }; o[key] = x[key]; dst.push(o);
    });
  }
  t = t && typeof t === 'object' ? t : {};
  take(t.cars, CAR_TYPES, MAX_CARS, out.cars, 't'); take(t.peds, PED_KINDS, MAX_PEDS, out.peds, 'k');
  return out;
}
/* two copies of the island (this device and a backup) are joined; what this device has stays, new ones are added */
export function mergeState(a, b) {
  a = cleanState(a); b = cleanState(b);
  var have = {}; a.cars.concat(a.peds).forEach(function (x) { have[x.id] = 1; });
  b.cars.forEach(function (x) { if (!have[x.id] && a.cars.length < MAX_CARS) { a.cars.push(x); have[x.id] = 1; } });
  b.peds.forEach(function (x) { if (!have[x.id] && a.peds.length < MAX_PEDS) { a.peds.push(x); have[x.id] = 1; } });
  return a;
}
