/* Booklyn search. Pure functions, no DOM: easy to test.
   Everything is folded the same way (lower case, no accents) and keeps the SAME LENGTH as the original text,
   so a match position in the folded text is also the right position in the original text.
   A search is made of words; a result must contain ALL of them. Words may be found in the title and in the body. */

export function fold(s) {
  s = String(s == null ? '' : s);
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s[i], n = c.normalize ? c.normalize('NFD').replace(/[̀-ͯ]/g, '') : c;
    n = n.toLowerCase();
    out += n.length === 1 ? n : (n.charAt(0) || c);
  }
  return out;
}

export function tokens(q) {
  var seen = {}, out = [];
  fold(q).split(/[^\p{L}\p{N}]+/u).forEach(function (w) {
    if (w && !seen[w] && out.length < 8) { seen[w] = 1; out.push(w); }
  });
  return out;
}

/* Cache of folded bodies: key -> folded text. Bodies can be long (whole PDFs), so fold each only once. */
var FOLDED = new Map();
var FOLDED_MAX = 400;
function foldedBody(doc) {
  if (!doc.body) return '';
  var key = doc.key || '';
  var hit = key ? FOLDED.get(key) : null;
  if (hit !== undefined && hit !== null && hit.len === doc.body.length) return hit.text;
  var text = fold(doc.body);
  if (key) {
    if (FOLDED.size >= FOLDED_MAX) FOLDED.delete(FOLDED.keys().next().value);
    FOLDED.set(key, { len: doc.body.length, text: text });
  }
  return text;
}
export function clearCache() { FOLDED.clear(); }

function countUpTo(hay, w, max) {
  var n = 0, i = -1;
  while (n < max && (i = hay.indexOf(w, i + 1)) > -1) n++;
  return n;
}

/* One document: {key, kind, mod, unit, title, body?}. Returns null if some word is missing, else a score and where the first hit is. */
export function matchDoc(doc, toks) {
  if (!toks.length) return null;
  var ft = fold(doc.title || ''), fb = foldedBody(doc), score = 0, inTitle = 0, bodyHit = -1;
  for (var i = 0; i < toks.length; i++) {
    var w = toks[i], t = ft.indexOf(w) > -1, b = fb ? fb.indexOf(w) : -1;
    if (!t && b < 0) return null;
    if (t) { inTitle++; score += 10 + (ft.indexOf(w) === 0 ? 3 : 0); }
    if (b > -1) { score += Math.min(countUpTo(fb, w, 5), 5); if (bodyHit < 0 || b < bodyHit) bodyHit = b; }
  }
  if (inTitle === toks.length) score += 20;
  /* exact title match beats a partial one */
  if (ft === toks.join(' ')) score += 30;
  return { score: score, field: inTitle ? 'title' : 'body', at: bodyHit, inTitle: inTitle };
}

/* Which page of the text a position is on, when the text has page marks (\f between pages). 0 = unknown. */
export function pageAt(text, idx) {
  if (!text || idx < 0 || text.indexOf('\f') < 0) return 0;
  var n = 1;
  for (var i = text.indexOf('\f'); i > -1 && i < idx; i = text.indexOf('\f', i + 1)) n++;
  return n;
}

/* A short piece of text around a position, cut at word edges, as plain text. */
export function snippet(text, at, width) {
  width = width || 150;
  if (!text) return '';
  var start = Math.max(0, at - Math.floor(width / 3)), end = Math.min(text.length, start + width);
  if (start > 0) { var sp = text.indexOf(' ', start); if (sp > -1 && sp < at) start = sp + 1; }
  if (end < text.length) { var sp2 = text.lastIndexOf(' ', end); if (sp2 > at) end = sp2; }
  var s = text.slice(start, end).replace(/[\f\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return (start > 0 ? '… ' : '') + s + (end < text.length ? ' …' : '');
}

/* Splits plain text into pieces, marking the parts that equal one of the words. [{t:'text', m:true|false}] */
export function marks(text, toks) {
  text = String(text || '');
  if (!toks.length) return [{ t: text, m: false }];
  var f = fold(text), flag = new Array(text.length + 1).fill(false);
  toks.forEach(function (w) {
    var i = -1;
    while ((i = f.indexOf(w, i + 1)) > -1) for (var j = i; j < i + w.length; j++) flag[j] = true;
  });
  var out = [], cur = '', m = flag[0];
  for (var k = 0; k < text.length; k++) {
    if (flag[k] !== m) { if (cur) out.push({ t: cur, m: m }); cur = ''; m = flag[k]; }
    cur += text[k];
  }
  if (cur) out.push({ t: cur, m: m });
  return out;
}

var KIND_RANK = { module: 4, floor: 3, file: 2, note: 1 };

/* docs: list of documents. opts: {mod: only this module, limit}. Returns the best results first. */
export function search(docs, q, opts) {
  opts = opts || {};
  var toks = tokens(q), out = [];
  if (!toks.length) return { toks: toks, results: [], total: 0 };
  for (var i = 0; i < docs.length; i++) {
    var d = docs[i];
    if (opts.mod && d.mod !== opts.mod) continue;
    var m = matchDoc(d, toks);
    if (!m) continue;
    var r = { doc: d, score: m.score + (KIND_RANK[d.kind] || 0), field: m.field, page: 0, snip: '' };
    if (d.body && m.at > -1) { r.snip = snippet(d.body, m.at, 150); r.page = pageAt(d.body, m.at); }
    out.push(r);
  }
  out.sort(function (a, b) { return b.score - a.score || String(a.doc.title).localeCompare(String(b.doc.title)); });
  var total = out.length;
  return { toks: toks, results: out.slice(0, opts.limit || 80), total: total };
}
