/* Booklyn source notes: a note attached to an imported file and, where the file type allows, to a place in it
   (PDF page, slide, or a time in audio/video). Notes point at the file's id, so moving the file to another module
   or floor never breaks the link. Pure logic, no page access.
   A note: {id, file, text, page (0 = whole file), at (seconds, 0 = none), unsure, created, upd}. */
export var MAX_N = 2000, MAX_TEXT = 2000;
var ID_OK = /^[A-Za-z0-9_-]{1,40}$/;

/* What kind of place a file can point to. */
export function kindOf(name) {
  var n = String(name || '').toLowerCase();
  if (/\.pdf$/.test(n)) return 'page';
  if (/\.(pptx|ppt|pps|ppsx|odp|key)$/.test(n)) return 'slide';
  if (/\.(mp3|m4a|aac|wav|ogg|oga|flac|mp4|m4v|mov|webm|mkv)$/.test(n)) return 'time';
  return 'none';
}

/* "90", "1:30" or "1:02:03" -> seconds. Anything else -> 0. */
export function parseAt(s) {
  s = String(s == null ? '' : s).trim();
  if (!s) return 0;
  var p = s.split(':');
  if (p.length > 3 || p.some(function (x) { return !/^\d{1,5}$/.test(x); })) return 0;
  var sec = 0;
  p.forEach(function (x) { sec = sec * 60 + (+x); });
  return Math.min(sec, 86400 * 2);
}
export function fmtAt(sec) {
  sec = Math.max(0, Math.floor(+sec || 0));
  var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return (h ? h + ':' + (m < 10 ? '0' : '') + m : m) + ':' + (s < 10 ? '0' : '') + s;
}

export function clean(list) {
  if (!Array.isArray(list)) return [];
  var seen = {}, out = [];
  list.forEach(function (n) {
    if (out.length >= MAX_N || !n || typeof n !== 'object') return;
    var text = String(n.text == null ? '' : n.text).replace(/\r/g, '').trim().slice(0, MAX_TEXT);
    if (!text || !ID_OK.test(String(n.id)) || seen[n.id] || !ID_OK.test(String(n.file))) return;
    seen[n.id] = 1;
    out.push({
      id: String(n.id), file: String(n.file), text: text,
      page: Math.min(9999, Math.max(0, Math.floor(+n.page || 0))), at: Math.min(172800, Math.max(0, Math.floor(+n.at || 0))),
      unsure: !!n.unsure, created: +n.created > 0 ? +n.created : 0, upd: +n.upd > 0 ? +n.upd : 0
    });
  });
  return out;
}

/* loc: what the student typed in the place field (page number, slide number or a time). */
export function make(id, file, fileName, text, loc, now) {
  var k = kindOf(fileName), page = 0, at = 0;
  if (k === 'page' || k === 'slide') page = Math.floor(+loc) > 0 ? Math.floor(+loc) : 0;
  else if (k === 'time') at = parseAt(loc);
  return clean([{ id: id, file: file, text: text, page: page, at: at, unsure: false, created: now, upd: now }])[0] || null;
}

/* The notes of one file, in reading order: whole-file notes first, then by page or time, then oldest first. */
export function forFile(list, file) {
  return list.filter(function (n) { return n.file === file; }).sort(function (a, b) {
    return (a.page - b.page) || (a.at - b.at) || (a.created - b.created) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
}
export function count(list, file) { var c = 0; list.forEach(function (n) { if (n.file === file) c++; }); return c; }

/* Drop the notes of files that no longer exist. fileIds: {id: true} */
export function prune(list, fileIds) { return list.filter(function (n) { return fileIds[n.file]; }); }

/* A new version of a file may have moved things around: mark the notes of that file as needing a look. */
export function flagFile(list, file, now) {
  list.forEach(function (n) { if (n.file === file && (n.page || n.at)) { n.unsure = true; n.upd = now; } });
  return list;
}

export function merge(cur, inc) {
  var by = {};
  cur.forEach(function (n) { by[n.id] = n; });
  inc.forEach(function (n) { if (!by[n.id] || (n.upd || 0) > (by[n.id].upd || 0)) by[n.id] = n; });
  return Object.keys(by).map(function (k) { return by[k]; }).slice(0, MAX_N);
}
