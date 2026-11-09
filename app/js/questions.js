/* Booklyn lesson questions: things a student wants to ask in class or look up later.
   Pure logic (no page access). A question: {id, mod, unit (0 = whole module), text, file, page, due 'YYYY-MM-DD' or '',
   answer, done, created, upd, doneAt}. */
export var MAX_Q = 500, MAX_TEXT = 300, MAX_ANSWER = 2000, MODES = ['daily', 'lesson', 'off'];
var ID_OK = /^[A-Za-z0-9_-]{1,40}$/, DATE_OK = /^\d{4}-\d{2}-\d{2}$/;

export function isoDay(d) {
  d = d || new Date();
  var m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}
function addDays(iso, n) {
  var p = iso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + n);
  return isoDay(d);
}

/* Untrusted input (backup, cloud copy) becomes a safe list. Questions of modules that no longer exist are dropped when alive is given. */
export function clean(list, alive, maxUnit) {
  if (!Array.isArray(list)) return [];
  var seen = {}, out = [];
  list.forEach(function (q) {
    if (out.length >= MAX_Q || !q || typeof q !== 'object') return;
    var text = String(q.text == null ? '' : q.text).replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
    if (!text || !ID_OK.test(String(q.id)) || seen[q.id] || !ID_OK.test(String(q.mod))) return;
    if (alive && !alive[q.mod]) return;
    seen[q.id] = 1;
    var unit = Math.floor(+q.unit || 0), top = maxUnit || 30;
    out.push({
      id: String(q.id), mod: String(q.mod), unit: unit < 0 ? 0 : unit > top ? top : unit, text: text,
      file: ID_OK.test(String(q.file)) ? String(q.file) : '', page: Math.min(9999, Math.max(0, Math.floor(+q.page || 0))),
      due: DATE_OK.test(String(q.due)) ? String(q.due) : '', answer: String(q.answer == null ? '' : q.answer).slice(0, MAX_ANSWER),
      done: !!q.done, created: +q.created > 0 ? +q.created : 0, upd: +q.upd > 0 ? +q.upd : 0, doneAt: +q.doneAt > 0 ? +q.doneAt : 0
    });
  });
  return out;
}

export function make(id, mod, unit, text, opt, now) {
  opt = opt || {};
  return clean([{ id: id, mod: mod, unit: unit, text: text, file: opt.file || '', page: opt.page || 0, due: opt.due || '', answer: '', done: false, created: now, upd: now, doneAt: 0 }])[0] || null;
}

/* A question still needs attention while it is not completed. Answered ones stay listed until the student completes them. */
export function open(list) { return list.filter(function (q) { return !q.done; }); }
export function unanswered(list) { return list.filter(function (q) { return !q.done && !q.answer.trim(); }); }

/* Lesson-date questions first (overdue, then soonest), then the rest, oldest first. */
export function order(list) {
  return list.slice().sort(function (a, b) {
    if (!!a.due !== !!b.due) return a.due ? -1 : 1;
    if (a.due !== b.due) return a.due < b.due ? -1 : 1;
    return (a.created - b.created) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
}

/* Questions for the next lesson: everything overdue plus the nearest lesson date that has not passed. */
export function nextLesson(list, today) {
  var o = open(list).filter(function (q) { return q.due; }), next = '';
  o.forEach(function (q) { if (q.due >= today && (!next || q.due < next)) next = q.due; });
  return order(o.filter(function (q) { return q.due < today || q.due === next; }));
}

/* Which questions a reminder should mention today. daily: every question without an answer.
   lesson: unanswered questions whose lesson date is today, tomorrow or already past. off: none. */
export function reminder(list, mode, today) {
  if (mode === 'off') return [];
  var un = unanswered(list);
  if (mode === 'lesson') { var lim = addDays(today, 1); return order(un.filter(function (q) { return q.due && q.due <= lim; })); }
  return order(un);
}

/* Backup merge: keep both lists, newer edit wins for the same id. */
export function merge(cur, inc) {
  var by = {}, out = [];
  cur.forEach(function (q) { by[q.id] = q; });
  inc.forEach(function (q) { if (!by[q.id] || (q.upd || 0) > (by[q.id].upd || 0)) by[q.id] = q; });
  Object.keys(by).forEach(function (k) { out.push(by[k]); });
  return out.slice(0, MAX_Q);
}
