/* Booklyn quiz core: everything about making and choosing quiz questions that does not touch the screen.
   Rules of the app live here as constants: every quiz has 5 questions and needs 4 right (80 %) to pass.
   The functions are pure (same input, same output) so they can be tested in Node. */

export var QUIZ_LEN = 5;
export var PASS_MIN = 4;
export var PASS_PCT = 80;
export function isPass(score, total) { return total === QUIZ_LEN && score >= PASS_MIN; }

var STOPW = {};('the and for are but not you all can had her was one our out has have this that with from they been were will would there their what about which when your said each she how its who did get may him his than then them these some into only other over such more most very just also like make time even back after use two way could first where those being both under while should because between through during before another does doing against without within along might must much many any own same too off here again once further few nor per via etc eg ie '+
 'der die das und ist ein eine einer eines einem einen nicht mit von zu den dem des sich auf für als auch sie sind wird werden wurde wurden kann können oder aber wenn dass dies diese dieser dieses diesem diesen bei nach aus über unter noch nur wie was wer wo hat haben sein seine ihre ihr zum zur vom im am um bis durch gegen ohne dann denn doch schon sehr mehr alle alles andere anderen einen jede jeder jedes man wir ihr ich du er es '+
 'el la los las un una unos unas de del al y en que es por con para como más pero sus este esta estos estas ese esa son fue ser está están hay muy también todo todos cada otro otra entre sobre sin desde hasta cuando donde porque').split(' ').forEach(function(w){if(w)STOPW[w]=1;});

export function hashStr(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
export function shuffled(arr, seed) { var a = arr.slice(), h = seed >>> 0 || 1; for (var i = a.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; var j = h % (i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

/* ---------- complete chunking ----------
   Cuts a text into pieces of at most `size` characters WITHOUT losing anything:
   joining the pieces gives back every word of the text (only blank space can change).
   Cuts fall on paragraph ends first, then sentence ends, then spaces; a word longer than
   `size` is cut hard as a last resort. Nothing is truncated and no short tail is dropped. */
function splitLong(p, size) {
  var sents = p.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [p], out = [], cur = '';
  function flush() { if (cur) out.push(cur); cur = ''; }
  sents.forEach(function (s) {
    if (s.length > size) {
      flush();
      var words = s.split(/(\s+)/);
      words.forEach(function (w) {
        while (w.length > size) { flush(); out.push(w.slice(0, size)); w = w.slice(size); }
        if ((cur + w).length > size) flush();
        cur += w;
      });
      flush();
      return;
    }
    if ((cur + s).length > size) flush();
    cur += s;
  });
  flush();
  return out.map(function (x) { return x.trim(); }).filter(Boolean);
}
export function chunksOf(text, size) {
  size = size || 3500;
  var out = [], cur = '';
  function flush() { if (cur.trim()) out.push(cur); cur = ''; }
  String(text || '').split(/\n\n+/).forEach(function (para) {
    para = para.trim();
    if (!para) return;
    (para.length <= size ? [para] : splitLong(para, size)).forEach(function (piece) {
      if (cur && cur.length + 2 + piece.length > size) flush();
      cur = cur ? cur + '\n\n' + piece : piece;
    });
  });
  flush();
  return out;
}

/* ---------- questions made on the device (fill in the blank) ----------
   `text` may contain form feeds (\f) between pages or slides. Then each question remembers its page. */
export function localQuestions(text, max, opts) {
  opts = opts || {};
  var pages = String(text).split('\f'), paged = pages.length > 1;
  var clean = pages.join(' ').replace(/\s+/g, ' ');
  var words = clean.match(/[A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ][A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ\-]{4,}/g) || [], freq = {};
  words.forEach(function (w) { var l = w.toLowerCase(); if (STOPW[l] || l.length > 22) return; freq[l] = (freq[l] || 0) + 1; });
  var terms = Object.keys(freq).filter(function (w) { return freq[w] >= 2; }).sort(function (a, b) { return freq[b] - freq[a] || (a < b ? -1 : 1); }).slice(0, 80);
  if (terms.length < 6) return [];
  var tset = {}; terms.forEach(function (t, i) { tset[t] = i; });
  var sents = [];
  pages.forEach(function (pg, pi) {
    var pc = pg.replace(/\s+/g, ' ');
    (pc.match(/[^.!?]{50,230}[.!?]/g) || []).forEach(function (x) { sents.push({ s: x.trim(), page: paged ? pi + 1 : null }); });
  });
  sents = sents.filter(function (o) {
    var x = o.s, w = x.split(' ').length, letters = (x.match(/[A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ]/g) || []).length;
    return w >= 8 && w <= 34 && letters / x.length > .72 && !/https?:|www\.|@|©/.test(x) && /^[A-ZÄÖÜÁÉÍÓÚÑ]/.test(x);
  });
  var out = [], usedT = {};
  shuffled(sents, hashStr(clean.slice(0, 200))).forEach(function (o) {
    var sent = o.s;
    if (out.length >= max) return;
    var toks = sent.match(/[A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ][A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ\-]{4,}/g) || [], cand = toks.filter(function (t) { var l = t.toLowerCase(); return tset[l] !== undefined && sent.indexOf(t) > 3 && !usedT[l]; });
    if (!cand.length) return;
    cand.sort(function (a, b) { return tset[b.toLowerCase()] - tset[a.toLowerCase()]; });
    var ans = cand[Math.min(cand.length - 1, 1)], al = ans.toLowerCase();
    var re = new RegExp('\\b' + ans.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'g');
    if ((sent.match(re) || []).length !== 1) return;
    var dist = terms.filter(function (t) { return t !== al && sent.toLowerCase().indexOf(t) < 0 && Math.abs(t.length - al.length) <= 4; });
    function sfx(w) { return /ing$/.test(w) ? 'g' : /ed$/.test(w) ? 'd' : /ly$/.test(w) ? 'y' : /s$/.test(w) ? 's' : 'o'; }
    var same = dist.filter(function (t) { return sfx(t) === sfx(al); });
    if (same.length >= 3) dist = same;
    dist = shuffled(dist, hashStr(sent)).slice(0, 3);
    if (dist.length < 3) return;
    var cap = /^[A-ZÄÖÜÁÉÍÓÚÑ]/.test(ans);
    var opts2 = dist.map(function (d) { return cap ? d.charAt(0).toUpperCase() + d.slice(1) : d; }); opts2.push(ans);
    var order = shuffled([0, 1, 2, 3], hashStr(sent + 'o')), o2 = order.map(function (i) { return opts2[i]; });
    usedT[al] = 1;
    out.push({ id: 'l' + hashStr(sent), q: 'Fill in the blank: “' + sent.replace(re, '_____') + '”', o: o2, a: o2.indexOf(ans), e: 'From your file: “' + sent + '”', src: 'local', page: o.page, pageLabel: o.page ? (opts.pageLabel || 'p.') : '' });
  });
  return out;
}

/* ---------- a question is only used if it is complete and sensible ---------- */
export function validQuestion(q) {
  if (!q || q.bad || typeof q.q !== 'string' || !q.q.trim() || !Array.isArray(q.o)) return false;
  if (q.o.length < 3 || q.o.length > 5) return false;
  if (!q.o.every(function (x) { return typeof x === 'string' && x.trim(); })) return false;
  var seen = {}; for (var i = 0; i < q.o.length; i++) { var k = q.o[i].trim().toLowerCase(); if (seen[k]) return false; seen[k] = 1; }
  if (!Number.isInteger(q.a) || q.a < 0 || q.a >= q.o.length) return false;
  return typeof q.e === 'string';
}

/* ---------- the question bank (one per unit, kept in localStorage) ----------
   bank = { v:2, q:[questions], used:[chunk hashes already sent to the AI], done:{fileKey:true}, stats:{questionId:{asked,miss}} }
   Every question carries `fk`, the key of the file it came from, so questions of a removed or
   replaced file can be dropped. */
export function newBank() { return { v: 3, q: [], used: [], done: {}, stats: {}, aiReason: '' }; }
export function upgradeBank(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.q)) return newBank();
  if (b.v === 3) { b.used = b.used || []; b.done = b.done || {}; b.stats = b.stats || {}; b.aiReason = b.aiReason || ''; return b; }
  if (b.v === 2) {
    /* version 2 held fill-in-the-blank questions made from single words: they were often unclear, so they are dropped.
       Questions written by the AI stay, and so does the answer history. */
    var nb = newBank();
    nb.stats = b.stats || {}; nb.used = b.used || [];
    (b.q || []).forEach(function (q) { if (q && q.src === 'ai' && q.fk) nb.q.push(q); });
    return nb;
  }
  /* old banks did not record which file a question came from: keep only what students answered, rebuild the rest */
  var nb = newBank();
  b.q.forEach(function (q) { if (q && q.id && q.asked) nb.stats[q.id] = { asked: q.asked, miss: 0 }; });
  return nb;
}
export function fileKey(rec) { return rec.hash || rec.id; }

/* Drops questions whose file is gone and reports which files still need questions. */
export function syncBank(bank, recs) {
  var live = {}; recs.forEach(function (r) { live[fileKey(r)] = true; });
  var before = bank.q.length;
  bank.q = bank.q.filter(function (q) { return q.fk && live[q.fk]; });
  Object.keys(bank.done).forEach(function (k) { if (!live[k]) delete bank.done[k]; });
  var need = recs.filter(function (r) { return !bank.done[fileKey(r)]; });
  return { dropped: before - bank.q.length, need: need };
}
export function addQuestions(bank, qs, fk, fileName) {
  var have = {}; bank.q.forEach(function (q) { have[q.id] = 1; });
  var n = 0;
  qs.forEach(function (q) {
    if (have[q.id] || !validQuestion(q) || qualityIssue(q)) return;
    q.fk = fk; q.file = fileName || ''; have[q.id] = 1; bank.q.push(q); n++;
  });
  return n;
}

/* Picks n questions. Questions answered wrong before come first (at most n-2 of them, so the quiz still has new
   material), then fresh AI questions, then local ones, least asked first. Returns null if fewer than n are valid. */
export function selectQuiz(bank, n, seed) {
  n = n || QUIZ_LEN;
  var st = bank.stats || {};
  function s(q) { return st[q.id] || { asked: 0, miss: 0 }; }
  var seen = {}, qs = bank.q.filter(function (q) {
    if (!validQuestion(q)) return false;
    var key = q.q.trim().toLowerCase(); if (seen[key]) return false; seen[key] = 1; return true;
  });
  if (qs.length < n) return null;
  var sh = shuffled(qs, seed);
  var missed = sh.filter(function (q) { return s(q).miss > 0; }).sort(function (a, b) { return s(b).miss - s(a).miss; });
  var rest = sh.filter(function (q) { return !(s(q).miss > 0); }).sort(function (a, b) {
    var ra = (s(a).asked ? 2 + s(a).asked : (a.src === 'ai' ? 0 : 1)), rb = (s(b).asked ? 2 + s(b).asked : (b.src === 'ai' ? 0 : 1));
    return ra - rb;
  });
  var pick = missed.slice(0, Math.max(1, n - 2));
  rest.forEach(function (q) { if (pick.length < n) pick.push(q); });
  missed.forEach(function (q) { if (pick.length < n && pick.indexOf(q) < 0) pick.push(q); });
  return shuffled(pick, seed + 7).map(function (q) {
    return { id: q.id, q: q.q, o: q.o, a: q.a, e: q.e, src: q.src, file: q.file || '', page: q.page || null, pageLabel: q.pageLabel || '', ref: q.ref || '', evidence: q.evidence || '', title: q.title || '' };
  });
}
export function markAsked(bank, ids) { ids.forEach(function (id) { var s = bank.stats[id] || (bank.stats[id] = { asked: 0, miss: 0 }); s.asked++; }); }
export function recordAnswer(bank, id, correct) {
  var s = bank.stats[id] || (bank.stats[id] = { asked: 0, miss: 0 });
  if (correct) s.miss = Math.max(0, (s.miss || 0) - 1); else s.miss = (s.miss || 0) + 1;
}
/* Text under a question: the file name (and page) only when Booklyn really knows it. */
export function sourceLine(q) {
  if (!q || !q.file) return '';
  if (q.ref) return q.file + ', ' + q.ref;
  return q.file + (q.page ? ', ' + (q.pageLabel || 'p.') + ' ' + q.page : '');
}
export function pageRef(label, from, to) {
  if (!from) return '';
  var l = label || 'p.';
  return from === to || !to ? l + ' ' + from : l + ' ' + from + '–' + to;
}

/* ---------- quality rules every question must pass, whoever wrote it ---------- */
var REFERS_TO_TEXT = /\b(according to (the|this) (text|slide|slides|material|lecture|document|script|passage)|in (the|this) (text|slide|slides|passage|lecture|script)|laut (dem )?(text|skript|folie)|im (text|skript))\b/i;
var BAD_OPTION = /^(all|none) of the above|^both\b|^(alle|keine) (der|oben)|^beide\b|^a and b\b|^a und b\b/i;
export function qualityIssue(q) {
  if (!validQuestion(q)) return 'incomplete';
  if (q.o.length !== 4) return 'needs 4 options';
  if (q.q.length < 20 || q.q.length > 400) return 'question length';
  if (REFERS_TO_TEXT.test(q.q)) return 'refers to the document';
  if (q.o.some(function (x) { return BAD_OPTION.test(x.trim()); })) return 'all/none of the above';
  var right = q.o[q.a].trim().toLowerCase();
  if (right.length >= 6 && q.q.toLowerCase().indexOf(right) >= 0 && !/_____/.test(q.q)) return 'answer appears in the question';
  var others = q.o.filter(function (_, i) { return i !== q.a; }), mx = Math.max.apply(null, others.map(function (x) { return x.length; }));
  if (right.length > 60 && right.length > 1.8 * mx) return 'correct option much longer than the others';
  return '';
}

/* ---------- sections: chunks that keep their heading and page range ---------- */
function headingOf(t) {
  var lines = String(t).split('\n');
  for (var i = 0; i < lines.length && i < 4; i++) {
    var l = lines[i].trim();
    if (!l) continue;
    if (l.length >= 3 && l.length <= 90 && !/[.,;:!?]$/.test(l) && l.split(/\s+/).length <= 10 && /[A-Za-zÄÖÜäöü]/.test(l)) return l;
    return '';
  }
  return '';
}
export function sectionChunks(text, size, label) {
  size = size || 5500;
  var pages = String(text || '').split('\f'), out = [];
  if (pages.length > 1) {
    var cur = null;
    pages.forEach(function (pg, i) {
      var t = pg.trim(); if (!t) return;
      var title = headingOf(t), no = i + 1;
      if (cur && cur.text.length + t.length + 2 <= size) { cur.text += '\n\n' + t; cur.to = no; if (!cur.title && title) cur.title = title; return; }
      if (cur) { out.push(cur); cur = null; }
      if (t.length > size) chunksOf(t, size).forEach(function (c) { out.push({ title: title, text: c, from: no, to: no, label: label }); });
      else cur = { title: title, text: t, from: no, to: no, label: label };
    });
    if (cur) out.push(cur);
  } else {
    var last = '';
    chunksOf(text, size).forEach(function (c) {
      var h = headingOf(c) || last; last = h;
      out.push({ title: h, text: c, from: null, to: null, label: '' });
    });
  }
  return out.map(function (c) { c.ref = pageRef(c.label, c.from, c.to); return c; });
}

/* ---------- questions about definitions (made on the device, no AI) ----------
   Only sentences that state a clear definition ("X is …", "X refers to …", "X ist …") are used.
   The wrong options are the definitions or terms of other concepts from the same material, so they look plausible. */
var PRON = /^(it|this|that|these|those|there|we|you|they|he|she|which|what|here|one|each|also|however)\b/i;
var DEF_PATTERNS = [
  /^((?:The |A |An )?[A-Z][A-Za-z0-9\-\/ ]{2,40}?) (?:is|are) (?:defined as |called |known as |described as )?((?:a|an|the|any|when|where|used|made|one) .{20,170}?)\.$/,
  /^((?:The |A |An )?[A-Z][A-Za-z0-9\-\/ ]{2,40}?) (?:means|refers to|describes|denotes|stands for) (.{20,170}?)\.$/,
  /^((?:Der |Die |Das |Ein |Eine )?[A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9\-\/ ]{2,40}?) (?:ist|sind|bezeichnet|beschreibt|bedeutet) (?:ein |eine |der |die |das |wenn |wo )?(.{20,170}?)\.$/
];
export function extractDefinitions(text) {
  var pages = String(text).split('\f'), paged = pages.length > 1, defs = [], seen = {};
  pages.forEach(function (pg, pi) {
    var flat = pg.replace(/\s+/g, ' ');
    (flat.match(/[A-ZÄÖÜ][^.!?]{30,260}[.]/g) || []).forEach(function (sent) {
      sent = sent.trim();
      for (var i = 0; i < DEF_PATTERNS.length; i++) {
        var m = DEF_PATTERNS[i].exec(sent);
        if (!m) continue;
        var term = m[1].replace(/^(The|A|An|Der|Die|Das|Ein|Eine) /, '').trim(), def = m[2].trim();
        if (PRON.test(term) || term.split(' ').length > 4 || term.length < 3) return;
        if (/\d{3,}|http|\(see |\bfig\b/i.test(def) || def.split(' ').length < 4) return;
        if (def.toLowerCase().indexOf(term.toLowerCase()) >= 0) return;
        var key = term.toLowerCase();
        if (seen[key]) return;
        seen[key] = 1;
        defs.push({ term: term, def: def, sent: sent, page: paged ? pi + 1 : null });
        return;
      }
    });
  });
  return defs;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
export function definitionQuestions(text, max, opts) {
  opts = opts || {};
  var defs = extractDefinitions(text), out = [];
  if (defs.length < 4) return [];
  defs.forEach(function (d, idx) {
    if (out.length >= max) return;
    var type = idx % 2;
    var pool = defs.filter(function (x) { return x !== d && x.def.toLowerCase().indexOf(d.term.toLowerCase()) < 0 && x.term.toLowerCase().indexOf(d.term.toLowerCase()) < 0 && d.def.toLowerCase().indexOf(x.term.toLowerCase()) < 0; });
    var qtext, right, wrongs;
    if (type === 0) {
      pool = shuffled(pool, hashStr(d.sent)).slice(0, 3);
      if (pool.length < 3) return;
      qtext = 'Which statement describes “' + d.term + '” correctly?';
      right = cap(d.def); wrongs = pool.map(function (x) { return cap(x.def); });
    } else {
      pool = pool.filter(function (x) { return Math.abs(x.term.split(' ').length - d.term.split(' ').length) <= 1; });
      pool = shuffled(pool, hashStr(d.sent)).slice(0, 3);
      if (pool.length < 3) return;
      qtext = 'Which term is described here: “' + cap(d.def) + '”?';
      right = cap(d.term); wrongs = pool.map(function (x) { return cap(x.term); });
    }
    var optsArr = wrongs.concat([right]), order = shuffled([0, 1, 2, 3], hashStr(d.sent + 'o')), o2 = order.map(function (i) { return optsArr[i]; });
    var q = { id: 'd' + hashStr(d.sent + type), q: qtext, o: o2, a: o2.indexOf(right), e: 'From your material: “' + d.sent + '”', src: 'def', evidence: d.sent, page: d.page, pageLabel: d.page ? (opts.pageLabel || 'p.') : '' };
    if (!qualityIssue(q)) out.push(q);
  });
  return out;
}
