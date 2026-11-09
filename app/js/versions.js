/* Booklyn updated-material detection. Pure logic, no page access.
   1) findCandidate: does a newly added file look like a new version of a file already in the app?
   2) comparePages: what changed between the old and new text (pages are separated by \f, like the rest of Booklyn)?
   3) mapNotes: where should each note on the old version point in the new one? */

var NOISE = /\b(copy|kopie|copia|final|neu|new|old|alt|updated|update|aktualisiert|actualizado|rev\d*|v\d+(\.\d+)*|version\s*\d+)\b/g;

export function extOf(name) { var m = /\.([a-z0-9]{1,6})$/i.exec(String(name || '')); return m ? m[1].toLowerCase() : ''; }

/* "Week 3 Slides (1)_FINAL.pdf" and "week3_slides.pdf" give the same name. Digits stay, because week 5 is not week 6. */
export function normName(name) {
  var s = String(name || '').toLowerCase().replace(/\.[a-z0-9]{1,6}$/, '');
  s = s.replace(/[_.\-]+/g, ' ').replace(NOISE, ' ').replace(/\(\d+\)/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return s.replace(/\s+/g, ' ');
}

function jaccard(a, b) {
  var inter = 0, ka = Object.keys(a), kb = Object.keys(b);
  if (!ka.length && !kb.length) return 1;
  if (!ka.length || !kb.length) return 0;
  var small = ka.length < kb.length ? a : b, big = small === a ? b : a;
  Object.keys(small).forEach(function (k) { if (big[k]) inter++; });
  return inter / (ka.length + kb.length - inter);
}
function bag(s) { var o = {}; (String(s).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).forEach(function (w) { o[w] = 1; }); return o; }

export function nameScore(a, b) {
  var na = normName(a), nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb || na.replace(/ /g, '') === nb.replace(/ /g, '')) return 1;
  return jaccard(bag2(na), bag2(nb));
}
function bag2(s) { var o = {}; s.split(' ').forEach(function (w) { if (w) o[w] = 1; }); return o; }

/* olds: files already imported (same semester). A file with the same content is a duplicate, not a new version. */
export function findCandidate(rec, olds, threshold) {
  threshold = threshold || 0.8;
  var best = null, e = extOf(rec.name);
  (olds || []).forEach(function (o) {
    if (o.id === rec.id || o.hash === rec.hash || extOf(o.name) !== e) return;
    var sc = nameScore(rec.name, o.name);
    if (sc < threshold) return;
    if (!best || sc > best.score || (sc === best.score && o.mod === rec.mod && best.file.mod !== rec.mod)) best = { file: o, score: sc };
  });
  return best;
}

function norm(t) { return String(t).replace(/\s+/g, ' ').trim().toLowerCase(); }

/* Returns {kind:'text', identical, similarity} for text without pages, or
   {kind:'pages', oldCount, newCount, same, moved, changed:[{old,new,score}], added:[], removed:[], map:{oldPage:{page,score}}}
   Page numbers start at 1. */
export function comparePages(oldT, newT) {
  oldT = String(oldT || ''); newT = String(newT || '');
  var op = oldT.split('\f'), np = newT.split('\f');
  if (op.length < 2 && np.length < 2) return { kind: 'text', identical: norm(oldT) === norm(newT), similarity: jaccard(bag(oldT), bag(newT)) };
  var on = op.map(norm), nn = np.map(norm), usedO = {}, usedN = {}, map = {}, same = 0, moved = 0, changed = [];
  var byText = {};
  on.forEach(function (t, i) { if (t) (byText[t] = byText[t] || []).push(i); });
  nn.forEach(function (t, j) {
    if (!t || !byText[t]) return;
    var cand = byText[t].filter(function (i) { return !usedO[i]; });
    if (!cand.length) return;
    cand.sort(function (a, b) { return Math.abs(a - j) - Math.abs(b - j); });
    var i = cand[0]; usedO[i] = 1; usedN[j] = 1; map[i + 1] = { page: j + 1, score: 1 };
    if (i === j) same++; else moved++;
  });
  var ob = on.map(bag), nb = nn.map(bag), pairs = [];
  on.forEach(function (t, i) {
    if (usedO[i] || !t) return;
    nn.forEach(function (u, j) { if (usedN[j] || !u) return; var s = jaccard(ob[i], nb[j]); if (s >= 0.5) pairs.push([s, i, j]); });
  });
  pairs.sort(function (a, b) { return (b[0] - a[0]) || (Math.abs(a[1] - a[2]) - Math.abs(b[1] - b[2])); });
  pairs.forEach(function (p) {
    if (usedO[p[1]] || usedN[p[2]]) return;
    usedO[p[1]] = 1; usedN[p[2]] = 1; map[p[1] + 1] = { page: p[2] + 1, score: p[0] };
    changed.push({ old: p[1] + 1, new: p[2] + 1, score: p[0] });
  });
  changed.sort(function (a, b) { return a.new - b.new; });
  var added = [], removed = [];
  nn.forEach(function (t, j) { if (!usedN[j] && t) added.push(j + 1); });
  on.forEach(function (t, i) { if (!usedO[i] && t) removed.push(i + 1); });
  return { kind: 'pages', oldCount: op.length, newCount: np.length, same: same, moved: moved, changed: changed, added: added, removed: removed, map: map };
}

export function isUnchanged(res) {
  if (!res) return false;
  if (res.kind === 'text') return res.identical;
  return !res.moved && !res.changed.length && !res.added.length && !res.removed.length && res.oldCount === res.newCount;
}

/* For each note of the old version: {page, status, sure}. status: file | same | moved | changed | removed | check.
   sure=false means the student should look at it. res may be null when the text could not be read. */
export function mapNotes(res, notes) {
  var out = {};
  notes.forEach(function (n) {
    if (!n.page && !n.at) { out[n.id] = { page: 0, status: 'file', sure: true }; return; }
    if (n.at || !res || res.kind !== 'pages') { out[n.id] = { page: n.page, status: 'check', sure: false }; return; }
    var m = res.map[n.page];
    if (m && m.score === 1) out[n.id] = { page: m.page, status: m.page === n.page ? 'same' : 'moved', sure: true };
    else if (m) out[n.id] = { page: m.page, status: 'changed', sure: false };
    else out[n.id] = { page: n.page <= res.newCount ? n.page : 0, status: 'removed', sure: false };
  });
  return out;
}

/* "4, 7, 9" with a limit. */
export function listPages(a, max) {
  max = max || 8;
  return a.slice(0, max).join(', ') + (a.length > max ? ', … (' + a.length + ')' : '');
}
