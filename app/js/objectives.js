/* Booklyn learning objectives: what a student should be able to do after a module or a week ("Explain what a router does"),
   linked by the student to the files and notes that cover them. Booklyn adds what it knows about quiz questions from
   those files, so gaps show up. This is a study aid, not a promise about an exam. Pure logic, no page access.
   An objective: {id, mod, unit (0 = whole module), text, files:[fileId], notes:[noteId], created, upd}. */
import { fold } from './search.js';

export var MAX_O = 600, MAX_TEXT = 240, MAX_LINKS = 60, MAX_PASTE = 40;
var ID_OK = /^[A-Za-z0-9_-]{1,40}$/;

function ids(a) {
  var seen = {}, out = [];
  (Array.isArray(a) ? a : []).forEach(function (x) {
    x = String(x);
    if (ID_OK.test(x) && !seen[x] && out.length < MAX_LINKS) { seen[x] = 1; out.push(x); }
  });
  return out;
}
function oneLine(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT); }

/* modAlive: {moduleId: true} or null (then modules are not checked). maxUnit: highest week number. */
export function clean(list, modAlive, maxUnit) {
  if (!Array.isArray(list)) return [];
  var seen = {}, out = [];
  list.forEach(function (o) {
    if (out.length >= MAX_O || !o || typeof o !== 'object') return;
    var text = oneLine(o.text);
    if (!text || !ID_OK.test(String(o.id)) || seen[o.id] || !ID_OK.test(String(o.mod))) return;
    if (modAlive && !modAlive[o.mod]) return;
    seen[o.id] = 1;
    out.push({
      id: String(o.id), mod: String(o.mod),
      unit: Math.min(maxUnit || 99, Math.max(0, Math.floor(+o.unit || 0))),
      text: text, files: ids(o.files), notes: ids(o.notes),
      created: +o.created > 0 ? +o.created : 0, upd: +o.upd > 0 ? +o.upd : 0
    });
  });
  return out;
}

export function make(id, mod, unit, text, now) {
  return clean([{ id: id, mod: mod, unit: unit, text: text, files: [], notes: [], created: now, upd: now }])[0] || null;
}

/* A pasted list (one objective per line, with or without bullets or numbers) -> clean texts. */
export function parseList(raw) {
  var seen = {}, out = [];
  String(raw == null ? '' : raw).split(/\r?\n/).forEach(function (line) {
    if (out.length >= MAX_PASTE) return;
    var t = line.replace(/^\s*(?:[-*•·▪‣–—]+|\(?\d{1,3}[.):]|\(?[a-zA-Z][.)])\s+/, '');
    t = oneLine(t);
    if (t.length < 3) return;
    var k = fold(t);
    if (seen[k]) return;
    seen[k] = 1; out.push(t);
  });
  return out;
}

export function forUnit(list, mod, unit) { return list.filter(function (o) { return o.mod === mod && o.unit === unit; }); }
export function forModule(list, mod) {
  return list.filter(function (o) { return o.mod === mod; }).sort(function (a, b) { return (a.unit - b.unit) || (a.created - b.created) || (a.id < b.id ? -1 : 1); });
}

export function hasLink(o, kind, id) { return (kind === 'note' ? o.notes : o.files).indexOf(id) > -1; }
/* Adds the link, or removes it when it is already there. Returns true when the link now exists. */
export function toggleLink(o, kind, id, now) {
  var arr = kind === 'note' ? o.notes : o.files, i = arr.indexOf(id);
  if (i > -1) { arr.splice(i, 1); o.upd = now; return false; }
  if (!ID_OK.test(String(id)) || arr.length >= MAX_LINKS) return false;
  arr.push(id); o.upd = now; return true;
}

/* A file was replaced by a newer version: objectives follow it. */
export function relinkFile(list, oldId, newId, now) {
  list.forEach(function (o) {
    var i = o.files.indexOf(oldId);
    if (i < 0) return;
    if (o.files.indexOf(newId) > -1) o.files.splice(i, 1); else o.files[i] = newId;
    o.upd = now;
  });
  return list;
}

/* Drops objectives of modules that are gone and links to files or notes that are gone.
   fileIds / noteIds: {id: true}. Returns {list, changed}. */
export function prune(list, fileIds, noteIds, modAlive) {
  var changed = false, out = [];
  list.forEach(function (o) {
    if (modAlive && !modAlive[o.mod]) { changed = true; return; }
    var f = o.files.filter(function (x) { return fileIds[x]; }), n = o.notes.filter(function (x) { return noteIds[x]; });
    if (f.length !== o.files.length || n.length !== o.notes.length) { changed = true; o.files = f; o.notes = n; }
    out.push(o);
  });
  return { list: out, changed: changed };
}

export function merge(cur, inc) {
  var by = {};
  cur.forEach(function (o) { by[o.id] = o; });
  inc.forEach(function (o) { if (!by[o.id] || (o.upd || 0) > (by[o.id].upd || 0)) by[o.id] = o; });
  return Object.keys(by).map(function (k) { return by[k]; }).slice(0, MAX_O);
}

/* What Booklyn knows about practice on an objective.
   qs: the quiz questions that came from the linked files, as [{id}]; stats: {questionId: {asked, miss}}.
   Returns {total, asked, missed}. */
export function practice(qs, stats) {
  var r = { total: 0, asked: 0, missed: 0 };
  stats = stats || {};
  qs.forEach(function (q) {
    r.total++;
    var s = stats[q.id];
    if (s && s.asked > 0) r.asked++;
    if (s && s.miss > 0) r.missed++;
  });
  return r;
}

/* Where an objective stands. Only says what the data shows; never "ready for the exam".
   none: nothing linked. noq: material linked, no quiz questions from it yet. untested: questions exist, none asked.
   weak: some questions still missed. ok: questions asked, none missed. */
export function status(o, pr) {
  if (!o.files.length && !o.notes.length) return 'none';
  if (!o.files.length) return 'notesonly';
  if (!pr || !pr.total) return 'noq';
  if (!pr.asked) return 'untested';
  if (pr.missed) return 'weak';
  return 'ok';
}
export var GAP = { none: 1, notesonly: 1, noq: 1, untested: 1, weak: 1, ok: 0 };
export function isGap(st) { return !!GAP[st]; }

/* Counts for a list of statuses. */
export function tally(sts) {
  var t = { none: 0, notesonly: 0, noq: 0, untested: 0, weak: 0, ok: 0, gaps: 0, all: sts.length };
  sts.forEach(function (s) { t[s]++; if (GAP[s]) t.gaps++; });
  return t;
}

/* ---------- suggestions: which files or notes probably cover an objective ---------- */
var STOP = {};
('about above after also and any are because been before being between both but can could describe define does each explain from give have how into know list make more most must name other over should show some state such than that the their them then there these they this those through under understand use used using very was were what when where which while will with within would your ' +
 'aber auch beim beschreibe beschreiben dass dein dann dazu diese dieser eine einer einen erkläre erklären für haben kann können mehr nach nicht oder sein sich sind sowie über und verstehen von wenn werden wie wird ' +
 'como cada con cuando debe describe describir entender explica explicar para pero por puede que sobre ser sus una unos ' +
 'avec dans des est expliquer les mais par pour qui sont une vous').split(' ').forEach(function (w) { STOP[fold(w)] = 1; });

export function keyWords(text) {
  var seen = {}, out = [];
  fold(text).split(/[^\p{L}\p{N}]+/u).forEach(function (w) {
    if (w.length >= 4 && !STOP[w] && !seen[w] && out.length < 10) { seen[w] = 1; out.push(w); }
  });
  return out;
}

/* docs: [{id, name, body?}]. Returns the best matches [{id, score, hits}] (score 0..1), best first.
   A match needs at least two key words (or the only one, for a one-word objective), found in the name or text. */
export function suggest(text, docs, limit) {
  var kw = keyWords(text);
  if (!kw.length) return [];
  var need = kw.length === 1 ? 1 : 2, res = [];
  docs.forEach(function (d) {
    var hay = fold(String(d.name || '') + ' ' + String(d.body || '')), hits = kw.filter(function (w) { return hay.indexOf(w) > -1; }).length;
    if (hits >= need && hits / kw.length >= 0.5) res.push({ id: d.id, score: hits / kw.length, hits: hits });
  });
  res.sort(function (a, b) { return (b.score - a.score) || (b.hits - a.hits) || (a.id < b.id ? -1 : 1); });
  return res.slice(0, limit || 5);
}
