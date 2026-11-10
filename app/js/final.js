/* Booklyn final practice: practising a whole house (module) for the final exam.
   Pure logic, no page access, so it can be tested in Node.
   Results are kept SEPARATE from the floors: nothing here lights a floor, marks it reviewed or changes a quiz result.
   Per house (module id) we keep only small data, so the cloud copy stays small:
   { stats:{questionId:[asked, missed]}, recent:[questionId], missed:{questionId:floorNumber}, sessions:[{t,kind,n,ok,f:{floor:[n,ok]}}] }
   The questions themselves stay in the floor question banks on this device. */
import * as QC from './quiz-core.js';

export var SIZES = [20, 25];
export var FOCUS_LEN = 10;
export var RETRY_MAX = 20;
export var KINDS = ['full', 'retry', 'focus'];
export var MAX_SESSIONS = 20, MAX_STATS = 400, MAX_RECENT = 80, MAX_MISSED = 60, MAX_FLOOR = 60;
var ID_OK = /^[A-Za-z0-9_-]{1,40}$/;

export function blank() { return { stats: {}, recent: [], missed: {}, sessions: [] }; }
function int(v, lo, hi) { v = Math.floor(+v); if (!isFinite(v)) return lo; return v < lo ? lo : v > hi ? hi : v; }

/* Untrusted input (backup, cloud copy) becomes a safe map { houseId: data }. Houses that no longer exist are dropped when alive is given. */
export function clean(map, alive) {
  var out = {};
  if (!map || typeof map !== 'object' || Array.isArray(map)) return out;
  Object.keys(map).forEach(function (mid) {
    if (!ID_OK.test(mid) || (alive && !alive[mid]) || !map[mid] || typeof map[mid] !== 'object') return;
    var src = map[mid], d = blank();
    if (src.stats && typeof src.stats === 'object' && !Array.isArray(src.stats)) {
      Object.keys(src.stats).slice(0, MAX_STATS).forEach(function (id) {
        var v = src.stats[id]; if (!ID_OK.test(id) || !Array.isArray(v)) return;
        var a = int(v[0], 0, 9999), m = int(v[1], 0, 9999); d.stats[id] = [a, Math.min(m, a || m)];
      });
    }
    if (Array.isArray(src.recent)) d.recent = src.recent.filter(function (x) { return typeof x === 'string' && ID_OK.test(x); }).slice(-MAX_RECENT);
    if (src.missed && typeof src.missed === 'object' && !Array.isArray(src.missed)) {
      Object.keys(src.missed).slice(0, MAX_MISSED).forEach(function (id) { if (ID_OK.test(id)) d.missed[id] = int(src.missed[id], 1, MAX_FLOOR); });
    }
    if (Array.isArray(src.sessions)) {
      src.sessions.slice(-MAX_SESSIONS).forEach(function (x) {
        if (!x || typeof x !== 'object' || KINDS.indexOf(x.kind) < 0) return;
        var f = {}, n = int(x.n, 0, 100), ok = int(x.ok, 0, n);
        if (x.f && typeof x.f === 'object' && !Array.isArray(x.f)) Object.keys(x.f).slice(0, MAX_FLOOR).forEach(function (u) {
          var v = x.f[u], un = int(u, 0, MAX_FLOOR); if (!un || !Array.isArray(v)) return;
          var fn = int(v[0], 0, 100); f[un] = [fn, int(v[1], 0, fn)];
        });
        if (n > 0 && +x.t > 0) d.sessions.push({ t: Math.floor(+x.t), kind: x.kind, n: n, ok: ok, f: f });
      });
    }
    out[mid] = d;
  });
  return out;
}

/* Backup merge: keep the stronger history of both, all sessions (by time). */
export function merge(cur, inc) {
  var out = JSON.parse(JSON.stringify(cur || {}));
  Object.keys(inc || {}).forEach(function (mid) {
    var b = inc[mid], a = out[mid];
    if (!a) { out[mid] = b; return; }
    Object.keys(b.stats).forEach(function (id) { var x = a.stats[id], y = b.stats[id]; a.stats[id] = x ? [Math.max(x[0], y[0]), Math.max(x[1], y[1])] : y; });
    a.recent = a.recent.concat(b.recent.filter(function (id) { return a.recent.indexOf(id) < 0; })).slice(-MAX_RECENT);
    Object.keys(b.missed).forEach(function (id) { if (!(id in a.missed)) a.missed[id] = b.missed[id]; });
    var have = {}; a.sessions.forEach(function (s) { have[s.t] = 1; });
    b.sessions.forEach(function (s) { if (!have[s.t]) a.sessions.push(s); });
    a.sessions.sort(function (x, y) { return x.t - y.t; }); a.sessions = a.sessions.slice(-MAX_SESSIONS);
  });
  return clean(out);
}

function units(floors) { return Object.keys(floors).map(Number).filter(function (u) { return floors[u] && floors[u].length; }).sort(function (a, b) { return a - b; }); }

/* How many questions each floor gives so the session is balanced: one at a time to each floor that still has some, so floors with
   little material give what they have and the rest is shared by the other floors. avail = { floor: number of questions }. */
export function allocate(avail, n, seed) {
  var us = Object.keys(avail).map(Number).filter(function (u) { return avail[u] > 0; }).sort(function (a, b) { return a - b; });
  var out = {}, total = us.reduce(function (s, u) { return s + avail[u]; }, 0), left = Math.min(n, total);
  if (!us.length) return out;
  var start = (seed >>> 0) % us.length;
  us = us.slice(start).concat(us.slice(0, start)); /* the floor that gets the odd extra question changes with the seed */
  us.forEach(function (u) { out[u] = 0; });
  while (left > 0) {
    var gave = false;
    for (var i = 0; i < us.length && left > 0; i++) { var u = us[i]; if (out[u] < avail[u]) { out[u]++; left--; gave = true; } }
    if (!gave) break;
  }
  return out;
}

function statsObj(fin) { var o = {}; Object.keys(fin.stats).forEach(function (id) { o[id] = { asked: fin.stats[id][0], miss: fin.stats[id][1] }; }); return o; }

/* floors = { floorNumber: [valid questions] }. Returns up to n questions, each tagged with its floor (q.unit), mixed in order.
   Questions missed in earlier final practice come first inside their floor; questions from the latest sessions are avoided while others exist. */
export function pickSession(floors, fin, n, seed) {
  fin = fin || blank();
  var us = units(floors), avail = {}, st = statsObj(fin), picked = [], used = {};
  us.forEach(function (u) { avail[u] = floors[u].length; });
  var alloc = allocate(avail, n, seed), target = Math.min(n, us.reduce(function (s, u) { return s + avail[u]; }, 0));
  us.forEach(function (u) {
    if (!alloc[u]) return;
    var qs = QC.selectQuiz({ q: floors[u], stats: st, recent: fin.recent }, alloc[u], (seed >>> 0) + u * 17, { partial: true }) || [];
    qs.forEach(function (q) { q.unit = u; picked.push(q); used[q.id] = 1; });
  });
  if (picked.length < target) { /* duplicates were removed inside a floor: top up from any floor */
    var rest = [];
    us.forEach(function (u) { floors[u].forEach(function (q) { if (!used[q.id]) rest.push([u, q]); }); });
    QC.shuffled(rest, seed + 11).forEach(function (r) {
      if (picked.length >= target || used[r[1].id]) return;
      var q = Object.assign({}, r[1]); q.unit = r[0]; q.o = q.o.slice(); picked.push(q); used[q.id] = 1;
    });
  }
  return QC.shuffled(picked, (seed >>> 0) + 3);
}

/* Saves a finished session. answers = [{ q: {id, unit}, ok }]. A question answered right leaves the missed list. */
export function record(fin, answers, meta) {
  var f = {}, ok = 0, ids = [];
  answers.forEach(function (a) {
    var id = a.q.id, s = fin.stats[id] || (fin.stats[id] = [0, 0]), u = a.q.unit;
    s[0]++; ids.push(id);
    var fl = f[u] || (f[u] = [0, 0]); fl[0]++;
    if (a.ok) { ok++; fl[1]++; s[1] = Math.max(0, s[1] - 1); delete fin.missed[id]; }
    else { s[1]++; delete fin.missed[id]; fin.missed[id] = u; }
  });
  fin.recent = fin.recent.filter(function (x) { return ids.indexOf(x) < 0; }).concat(ids).slice(-MAX_RECENT);
  var keys = Object.keys(fin.stats);
  if (keys.length > MAX_STATS) keys.forEach(function (id) { if (Object.keys(fin.stats).length > MAX_STATS && !fin.stats[id][1]) delete fin.stats[id]; });
  var mk = Object.keys(fin.missed); if (mk.length > MAX_MISSED) mk.slice(0, mk.length - MAX_MISSED).forEach(function (id) { delete fin.missed[id]; });
  var sess = { t: meta.t, kind: meta.kind, n: answers.length, ok: ok, f: f };
  fin.sessions.push(sess); fin.sessions = fin.sessions.slice(-MAX_SESSIONS);
  return sess;
}

/* Per-floor result of one session, weakest first. */
export function floorResults(answers) {
  var f = {};
  answers.forEach(function (a) { var r = f[a.q.unit] || (f[a.q.unit] = { unit: a.q.unit, n: 0, ok: 0 }); r.n++; if (a.ok) r.ok++; });
  return Object.keys(f).map(function (u) { return f[u]; }).sort(function (a, b) { return (a.ok / a.n) - (b.ok / b.n) || a.unit - b.unit; });
}

export function pageOf(q) {
  if (q.page > 0) return q.page;
  var m = /\d+/.exec(String(q.ref || '')); return m ? +m[0] : 0;
}

/* What to review after a session: every floor with a mistake, with the topics and the exact places in the material (file and page when known). */
export function reviewPlan(answers, titles) {
  var by = {};
  answers.forEach(function (a) {
    if (a.ok || a.q.bad) return;
    var u = a.q.unit, e = by[u] || (by[u] = { unit: u, title: (titles && titles[u - 1]) || '', missed: [], topics: [], sources: [] });
    e.missed.push(a.q);
    var t = String(a.q.topic || a.q.title || '').trim();
    if (t && e.topics.indexOf(t) < 0) e.topics.push(t);
    if (a.q.file) {
      var key = a.q.fk + '|' + a.q.file + '|' + (QC.sourceLine(a.q));
      if (!e.sources.some(function (s) { return s.key === key; })) e.sources.push({ key: key, fk: a.q.fk || '', file: a.q.file, page: pageOf(a.q), text: QC.sourceLine(a.q) });
    }
  });
  var res = floorResults(answers), n = {}; res.forEach(function (r) { n[r.unit] = r; });
  return Object.keys(by).map(function (u) { var e = by[u]; e.n = n[u].n; e.ok = n[u].ok; return e; })
    .sort(function (a, b) { return (a.ok / a.n) - (b.ok / b.n) || a.unit - b.unit; });
}

/* Missed questions still open (resolved from the floor banks), most missed first, at most RETRY_MAX. */
export function openMissed(fin, floors) {
  var out = [];
  units(floors).forEach(function (u) {
    floors[u].forEach(function (q) { if (fin.missed[q.id]) { var c = Object.assign({}, q); c.unit = u; out.push(c); } });
  });
  out.sort(function (a, b) { return ((fin.stats[b.id] || [0, 0])[1] - (fin.stats[a.id] || [0, 0])[1]) || (a.unit - b.unit); });
  return out.slice(0, RETRY_MAX);
}

/* Questions for a retry: the given questions, options shuffled again, mixed. */
export function retrySet(qs, seed) {
  return QC.shuffled(qs.map(function (q, i) {
    var order = QC.shuffled(q.o.map(function (_, k) { return k; }), QC.hashStr(q.id) + (seed >>> 0) + i), c = Object.assign({}, q);
    c.o = order.map(function (k) { return q.o[k]; }); c.a = order.indexOf(q.a); return c;
  }), (seed >>> 0) + 5);
}

/* Floors that need work: floors with open missed questions, or the weakest floors of the last session. */
export function weakFloors(fin, floors, last) {
  var score = {};
  Object.keys(fin.missed).forEach(function (id) { var u = fin.missed[id]; if (floors[u]) score[u] = (score[u] || 0) + 1; });
  if (last && last.f) Object.keys(last.f).forEach(function (u) { var v = last.f[u]; if (floors[u] && v[0] > v[1]) score[u] = (score[u] || 0) + (v[0] - v[1]) / v[0] * 2; });
  return Object.keys(score).map(Number).sort(function (a, b) { return score[b] - score[a] || a - b; });
}

/* Focused review: FOCUS_LEN questions from the (up to 3) weakest floors, missed ones first. Returns [] when nothing needs work. */
export function focusSet(fin, floors, seed) {
  var weak = weakFloors(fin, floors, fin.sessions[fin.sessions.length - 1]).slice(0, 3);
  if (!weak.length) return [];
  var sub = {}; weak.forEach(function (u) { sub[u] = floors[u]; });
  return pickSession(sub, fin, FOCUS_LEN, seed);
}

/* Short text for the start screen. */
export function summary(fin) {
  var s = fin.sessions, last = s[s.length - 1] || null, best = 0;
  s.forEach(function (x) { if (x.n) best = Math.max(best, Math.round(x.ok / x.n * 100)); });
  return { count: s.length, last: last, best: best, open: Object.keys(fin.missed).length };
}
