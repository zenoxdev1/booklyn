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
export var GEN = 2; /* generation of the on-device questions: older ones are made again with the new kinds */
export var RECENT_MAX = 60;
export function newBank() { return { v: 3, gen: GEN, q: [], used: [], done: {}, stats: {}, recent: [], aiReason: '' }; }
export function upgradeBank(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.q)) return newBank();
  if (b.v === 3) {
    b.used = b.used || []; b.done = b.done || {}; b.stats = b.stats || {}; b.aiReason = b.aiReason || '';
    b.recent = Array.isArray(b.recent) ? b.recent.slice(-RECENT_MAX) : [];
    if (b.gen !== GEN) {
      /* new kinds of on-device questions: the old ones are dropped and made again; AI questions and the answer history stay */
      b.q = b.q.filter(function (q) { return q && q.src !== 'def'; });
      b.done = {}; b.gen = GEN;
    }
    return b;
  }
  if (b.v === 2) {
    /* version 2 held fill-in-the-blank questions made from single words: they were often unclear, so they are dropped.
       Questions written by the AI stay, and so does the answer history. */
    var nb = newBank();
    nb.stats = b.stats || {}; nb.used = b.used || []; nb.recent = Array.isArray(b.recent) ? b.recent.slice(-RECENT_MAX) : [];
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
   material), then fresh AI questions, then local ones, least asked first. Variety rules, relaxed only when the bank is too small:
   - nothing that was in the last quizzes (bank.recent) comes back while other questions are available,
   - no two questions about the same sentence/concept in one quiz,
   - at most 2 questions of the same kind (statement, term, gap, pairing, AI …) in one quiz,
   - the answer options are shuffled again every time.
   Returns null if fewer than n are valid. */
/* Same wording AND same options = the same question. (Pairing questions share one wording but differ in their options.) */
export function questionKey(q) {
  return q.q.trim().toLowerCase() + '|' + q.o.map(function (x) { return String(x).trim().toLowerCase(); }).sort().join('|');
}
export function conceptKey(q) {
  var ev = String(q.evidence || '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 90);
  return ev ? 'e:' + ev : 'q:' + q.id;
}
export function kindOf(q) { return q.kind || q.src || 'x'; }
export function selectQuiz(bank, n, seed, opts) {
  n = n || QUIZ_LEN;
  var st = bank.stats || {}, recent = {};
  (bank.recent || []).forEach(function (id) { recent[id] = 1; });
  function s(q) { return st[q.id] || { asked: 0, miss: 0 }; }
  var seen = {}, qs = bank.q.filter(function (q) {
    if (!validQuestion(q)) return false;
    var key = questionKey(q); if (seen[key]) return false; seen[key] = 1; return true;
  });
  if (qs.length < n) { if (!(opts && opts.partial)) return null; n = qs.length; if (!n) return []; }
  var sh = shuffled(qs, seed);
  var missed = sh.filter(function (q) { return s(q).miss > 0; }).sort(function (a, b) { return s(b).miss - s(a).miss; });
  var rest = sh.filter(function (q) { return !(s(q).miss > 0); }).sort(function (a, b) {
    var ra = (s(a).asked ? 2 + s(a).asked : (a.src === 'ai' ? 0 : 1)), rb = (s(b).asked ? 2 + s(b).asked : (b.src === 'ai' ? 0 : 1));
    return ra - rb;
  });
  var pick = [], used = {}, kinds = {};
  function take(q) { pick.push(q); used[q.id] = 1; used[conceptKey(q)] = 1; kinds[kindOf(q)] = (kinds[kindOf(q)] || 0) + 1; }
  /* passes from strict to loose */
  var passes = [
    { recent: true, concept: true, kind: true }, { recent: true, concept: true, kind: false },
    { recent: false, concept: true, kind: true }, { recent: false, concept: true, kind: false },
    { recent: false, concept: false, kind: false }
  ];
  function fill(list, limit) {
    passes.forEach(function (p) {
      list.forEach(function (q) {
        if (pick.length >= limit || used[q.id]) return;
        if (p.recent && recent[q.id] && !(s(q).miss > 0)) return;
        if (p.concept && used[conceptKey(q)]) return;
        if (p.kind && (kinds[kindOf(q)] || 0) >= 2) return;
        take(q);
      });
    });
  }
  fill(missed, Math.max(1, n - 2));
  fill(rest, n);
  fill(missed, n);
  return shuffled(pick, seed + 7).map(function (q) {
    var order = shuffled(q.o.map(function (_, i) { return i; }), hashStr(q.id) + seed * 31), o2 = order.map(function (i) { return q.o[i]; });
    return { id: q.id, q: q.q, o: o2, a: order.indexOf(q.a), e: q.e, src: q.src, kind: q.kind || '', topic: q.topic || '', fk: q.fk || '', file: q.file || '', page: q.page || null, pageLabel: q.pageLabel || '', ref: q.ref || '', evidence: q.evidence || '', title: q.title || '' };
  });
}
export function markAsked(bank, ids) {
  ids.forEach(function (id) { var s = bank.stats[id] || (bank.stats[id] = { asked: 0, miss: 0 }); s.asked++; });
  bank.recent = (Array.isArray(bank.recent) ? bank.recent : []).filter(function (x) { return ids.indexOf(x) < 0; }).concat(ids).slice(-RECENT_MAX);
}
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
var PRON = /^(it|this|that|these|those|there|we|you|they|he|she|which|what|here|one|each|also|however|for|in|on|at|by|of|to|with|from|as|if|so|then|thus|es|dies|dieses|diese|dieser|diesen|das|hier|dort|wir|sie|er|man|auch|jedoch|für|mit|bei|von|zu|zum|zur|im|in|am|an|auf|aus|nach|um|wenn|wie|wo|was|welche|welcher|nur|dann|also|aber|oder|und|dabei|damit|dafür|daher|deshalb|zudem|ausserdem|außerdem|beispiel|beispiele|bsp|ziel|frage|aufgabe|hinweis)(?=\s|$)/i;
var DEF_PATTERNS = [
  /^((?:The |A |An )?[A-Z][A-Za-z0-9\-\/ ]{2,40}?) (?:is|are) (?:defined as |called |known as |described as )?((?:a|an|the|any|when|where|used|made|one) .{20,170}?)\.$/,
  /^((?:The |A |An )?[A-Z][A-Za-z0-9\-\/ ]{2,40}?) (?:means|refers to|describes|denotes|stands for) (.{20,170}?)\.$/,
  /^((?:Der |Die |Das |Ein |Eine )?[A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9\-\/ ]{2,40}?) (?:ist|sind) (?:definiert als |genannt )?((?:ein|eine|einer|eines|der|die|das|jede|jeder|jedes|wenn|wo|dann|alle) .{20,170}?)\.$/,
  /^((?:Der |Die |Das |Ein |Eine )?[A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9\-\/ ]{2,40}?) (?:bezeichnet|beschreibt|bedeutet|meint) (.{20,170}?)\.$/
];
/* true when the material is mostly German (so the question wording can match it) */
export function isGerman(text) {
  var s = ' ' + String(text || '').slice(0, 20000).toLowerCase().replace(/[^a-zäöüß]+/g, ' ') + ' ';
  var de = (s.match(/ (der|die|das|und|ist|nicht|mit|von|für|wird|werden|ein|eine|auf|bei|sind|zu|als) /g) || []).length;
  var en = (s.match(/ (the|and|is|of|to|in|that|with|for|are|as|on|by|an|this) /g) || []).length;
  return de > en * 1.2 && de >= 8;
}
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
        if (/\d{3,}|http|\(see |\bfig\b|[:;]|\d\s*°|=/i.test(def) || def.split(' ').length < 4) return;
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
function esc(s) { return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); }
/* Wordings per kind: the same fact is asked in different ways so quizzes do not feel the same every time. */
var WORDS = {
  stmt: { en: ['Which statement describes “{t}” correctly?', 'Which of these is the correct description of “{t}”?', 'What does “{t}” mean in your material?'],
          de: ['Welche Aussage beschreibt «{t}» richtig?', 'Welche Beschreibung passt zu «{t}»?', 'Was bedeutet «{t}» in deinem Material?'] },
  term: { en: ['Which term is described here: “{d}”?', 'Which concept does this describe: “{d}”?', 'What is being defined here: “{d}”?'],
          de: ['Welcher Begriff wird hier beschrieben: «{d}»?', 'Welches Konzept ist gemeint: «{d}»?', 'Was wird hier definiert: «{d}»?'] },
  cloze: { en: ['Complete the sentence: “{s}”', 'Which term fills the gap? “{s}”'], de: ['Ergänze den Satz: «{s}»', 'Welcher Begriff fehlt? «{s}»'] },
  pair: { en: ['Which term is matched with its correct description?', 'Which pairing is correct?'], de: ['Welche Zuordnung von Begriff und Beschreibung stimmt?', 'Welches Paar ist richtig zugeordnet?'] }
};
export var DEF_KINDS = ['stmt', 'term', 'cloze', 'pair'];
function word(kind, de, h, vars) {
  var list = WORDS[kind][de ? 'de' : 'en'], t = list[h % list.length];
  return t.replace(/\{(\w)\}/g, function (_, k) { return vars[k]; });
}
function defQuestion(defs, d, kind, de) {
  var pool = defs.filter(function (x) { return x !== d && x.def.toLowerCase().indexOf(d.term.toLowerCase()) < 0 && x.term.toLowerCase().indexOf(d.term.toLowerCase()) < 0 && d.def.toLowerCase().indexOf(x.term.toLowerCase()) < 0; });
  var h = hashStr(d.sent), qtext, right, wrongs, ev = d.sent;
  if (kind === 'stmt') {
    pool = shuffled(pool, h).slice(0, 3);
    if (pool.length < 3) return null;
    qtext = word('stmt', de, h, { t: d.term });
    right = cap(d.def); wrongs = pool.map(function (x) { return cap(x.def); });
  } else if (kind === 'term') {
    pool = shuffled(pool.filter(function (x) { return Math.abs(x.term.split(' ').length - d.term.split(' ').length) <= 1; }), h).slice(0, 3);
    if (pool.length < 3) return null;
    qtext = word('term', de, h, { d: cap(d.def) });
    right = cap(d.term); wrongs = pool.map(function (x) { return cap(x.term); });
  } else if (kind === 'cloze') {
    var re = new RegExp('\\b' + esc(d.term) + '\\b', 'i');
    if (!re.test(d.sent)) return null;
    pool = shuffled(pool.filter(function (x) { return Math.abs(x.term.split(' ').length - d.term.split(' ').length) <= 1 && !re.test(x.term); }), h + 3).slice(0, 3);
    if (pool.length < 3) return null;
    var blanked = d.sent.replace(re, '_____');
    if (blanked.indexOf('_____') < 0 || (blanked.match(/_____/g) || []).length !== 1) return null;
    qtext = word('cloze', de, h, { s: blanked });
    right = cap(d.term); wrongs = pool.map(function (x) { return cap(x.term); });
  } else {
    if (d.def.length > 110) return null;
    pool = shuffled(pool.filter(function (x) { return x.def.length <= 110; }), h + 5).slice(0, 3);
    if (pool.length < 3) return null;
    var P = [d].concat(pool);
    qtext = word('pair', de, h, {});
    right = cap(d.term) + ' — ' + d.def;
    /* the three wrong pairs use terms 1..3 with the description of the next one (a cycle among them), so none is right */
    wrongs = [cap(P[1].term) + ' — ' + P[2].def, cap(P[2].term) + ' — ' + P[3].def, cap(P[3].term) + ' — ' + P[1].def];
  }
  var optsArr = wrongs.concat([right]), order = shuffled([0, 1, 2, 3], hashStr(d.sent + 'o' + kind)), o2 = order.map(function (i) { return optsArr[i]; });
  var idn = kind === 'stmt' ? '0' : kind === 'term' ? '1' : kind;
  return { id: 'd' + hashStr(d.sent + idn), q: qtext, o: o2, a: o2.indexOf(right), e: 'From your material: “' + ev + '”', src: 'def', kind: kind, topic: d.term, evidence: ev, page: d.page };
}
export function definitionQuestions(text, max, opts) {
  opts = opts || {};
  var defs = extractDefinitions(text), out = [], de = opts.lang ? opts.lang === 'de' : isGerman(text), seen = {};
  if (defs.length < 4) return [];
  /* rounds: every definition gets its first kind, then its second, and so on, so a small limit still mixes kinds */
  for (var r = 0; r < DEF_KINDS.length && out.length < max; r++) {
    defs.forEach(function (d, idx) {
      if (out.length >= max) return;
      var q = defQuestion(defs, d, DEF_KINDS[(idx + r) % DEF_KINDS.length], de);
      if (!q || seen[q.id]) return;
      q.pageLabel = q.page ? (opts.pageLabel || 'p.') : '';
      if (qualityIssue(q)) return;
      seen[q.id] = 1; out.push(q);
    });
  }
  return out;
}
