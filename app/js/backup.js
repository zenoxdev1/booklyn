/* Booklyn backups.
   Light backup: one JSON object with your progress (semesters, lights, notes, deadlines, coins, city). No files.
   Full backup: a text file with one JSON object per line: header, progress, question banks, then each imported
   file (as base64), then an "end" line. Reading goes line by line, so big backups never need one giant string.
   Restoring first reads and CHECKS the whole backup. Nothing on the device is touched until it all checks out. */

export var BACKUP_KIND = 'booklyn-full-backup';
export var BACKUP_FORMAT = 1;
var ID_OK = /^[A-Za-z0-9_-]{1,40}$/;
var BANK_KEY = /^[A-Za-z0-9_-]{1,40}:\d{1,3}$/;
var META_FIELDS = ['id', 'name', 'path', 'size', 'type', 'mtime', 'hash', 'addedAt', 'sem', 'dup', 'status', 'mod', 'unit', 'include', 'confirmed', 'flag', 'why'];

export function BackupError(message) { this.name = 'BackupError'; this.message = message; }
BackupError.prototype = Object.create(Error.prototype);

/* What is saved where. Shown in Settings so nobody has to guess. */
export var DATA_MAP = [
  { what: 'Semesters, modules, lights, notes, deadlines, coins, city and decorations', sync: true, light: true, full: true },
  { what: 'Imported files (slides, scripts, notes) and where each one belongs', sync: false, light: false, full: true },
  { what: 'Practice questions and which ones you got wrong', sync: false, light: false, full: true },
  { what: 'Sign-in and sync settings of this device', sync: false, light: false, full: false }
];

/* ---------- light backup ---------- */
export function lightBackupText(state) { return JSON.stringify(state); }

/* ---------- full backup: writing ---------- */
export function metaForBackup(rec) {
  var m = {};
  META_FIELDS.forEach(function (k) { if (rec[k] !== undefined) m[k] = rec[k]; });
  return m;
}

/* deps: { readBlob(id) -> Blob|undefined, toBase64(blob) -> Promise<string>, onProgress(i, n, name), now() }
   Returns { parts: [string], files, bytes, missing: [names] }. */
export async function buildFullBackup(input, deps) {
  var parts = [], missing = [], files = input.files || [], bytes = 0, written = 0;
  var banks = input.banks || {}, bankKeys = Object.keys(banks);
  var iso = new Date(deps.now ? deps.now() : Date.now()).toISOString();
  var header = { kind: BACKUP_KIND, format: BACKUP_FORMAT, createdAt: iso, schema: input.state.schema, files: files.length, banks: bankKeys.length };
  parts.push(JSON.stringify(header) + '\n');
  parts.push(JSON.stringify({ t: 'state', state: input.state }) + '\n');
  bankKeys.forEach(function (k) { parts.push(JSON.stringify({ t: 'bank', key: k, bank: banks[k] }) + '\n'); });
  for (var i = 0; i < files.length; i++) {
    var rec = files[i];
    if (deps.onProgress) deps.onProgress(i, files.length, rec.name);
    var blob = await deps.readBlob(rec.id);
    if (!blob) { missing.push(rec.name); continue; }
    var data = await deps.toBase64(blob);
    bytes += blob.size;
    written++;
    parts.push(JSON.stringify({ t: 'file', meta: metaForBackup(rec), data: data }) + '\n');
  }
  parts.push(JSON.stringify({ t: 'end', files: written, banks: bankKeys.length, missing: missing }) + '\n');
  return { parts: parts, files: written, bytes: bytes, missing: missing };
}

/* ---------- full backup: reading ---------- */
async function* readLines(blob, onBytes) {
  var dec = new TextDecoder('utf-8'), pos = 0, size = blob.size, step = 4 * 1024 * 1024, buf = '';
  while (pos < size) {
    var chunk = new Uint8Array(await blob.slice(pos, Math.min(size, pos + step)).arrayBuffer());
    pos += chunk.length;
    buf += dec.decode(chunk, { stream: pos < size });
    var nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      var line = buf.slice(0, nl); buf = buf.slice(nl + 1);
      if (line.trim()) yield line;
    }
    if (onBytes) onBytes(pos, size);
  }
  if (buf.trim()) yield buf;
}
function parseLine(line, what) {
  try { return JSON.parse(line); } catch (e) { throw new BackupError('The backup file is damaged (' + what + ' cannot be read). Nothing was changed.'); }
}

function cleanMeta(raw, stateSemIds) {
  if (!raw || typeof raw !== 'object') throw new BackupError('A file entry in the backup is not valid. Nothing was changed.');
  if (!ID_OK.test(String(raw.id))) throw new BackupError('A file in the backup has an invalid id. Nothing was changed.');
  var m = { id: String(raw.id) };
  m.name = String(raw.name || 'file').slice(0, 300);
  m.path = String(raw.path || '').slice(0, 600);
  m.size = Math.max(0, +raw.size || 0);
  m.type = String(raw.type || '').slice(0, 120);
  m.mtime = +raw.mtime || 0;
  m.hash = typeof raw.hash === 'string' && /^[0-9a-f]{64}$/.test(raw.hash) ? raw.hash : null;
  m.addedAt = +raw.addedAt || 0;
  m.sem = ID_OK.test(String(raw.sem)) ? String(raw.sem) : '';
  m.dup = raw.dup && ID_OK.test(String(raw.dup)) ? String(raw.dup) : null;
  m.status = raw.status === 'imported' ? 'imported' : 'pending';
  m.mod = raw.mod && ID_OK.test(String(raw.mod)) ? String(raw.mod) : '';
  m.unit = Math.max(0, Math.min(99, Math.floor(+raw.unit || 0)));
  m.include = raw.include !== false;
  m.confirmed = !!raw.confirmed;
  m.flag = !!raw.flag;
  m.why = String(raw.why || '').slice(0, 300);
  return m;
}

/* deps: { prepareState(obj) -> cleaned state (throws on bad data or newer schema),
           fromBase64(str) -> Uint8Array, sha256(Uint8Array) -> Promise<hex>, upgradeBank(b), validQuestion(q), onProgress(done, total) }
   Returns { kind, state, banks, files: [{meta, blob}], createdAt, notes: [string] } and never modifies anything. */
export async function readBackup(blob, deps) {
  var first = true, kind = null, header = null, state = null, banks = {}, files = [], ids = {}, end = null, notes = [];
  var lines = readLines(blob, function (pos, size) { if (deps.onProgress) deps.onProgress(pos, size); });
  var count = 0;
  for await (var line of lines) {
    count++;
    if (first) {
      first = false;
      if (line.length > 40 * 1024 * 1024) throw new BackupError('That file is not a Booklyn backup.');
      var obj;
      try { obj = JSON.parse(line); }
      catch (e) {
        /* an old or hand-edited light backup may be spread over several lines */
        if (blob.size > 20 * 1024 * 1024) throw new BackupError('That file is not a Booklyn backup. Nothing was changed.');
        try { obj = JSON.parse(await blob.text()); } catch (e2) { throw new BackupError('That file is not a valid Booklyn backup. Nothing was changed.'); }
        if (!obj || obj.kind === BACKUP_KIND || typeof obj.schema !== 'number') throw new BackupError('That file is not a valid Booklyn backup. Nothing was changed.');
        try { state = deps.prepareState(obj); } catch (e3) { throw new BackupError('That file is not a valid Booklyn backup. Nothing was changed.'); }
        kind = 'light'; break;
      }
      if (obj && obj.kind === BACKUP_KIND) {
        if (obj.format > BACKUP_FORMAT) throw new BackupError('That backup was made by a newer version of Booklyn. Update the app first. Nothing was changed.');
        kind = 'full'; header = obj; continue;
      }
      if (obj && typeof obj === 'object' && typeof obj.schema === 'number') {
        kind = 'light';
        try { state = deps.prepareState(obj); }
        catch (e) { throw new BackupError(e && e.newer ? 'That backup is from a newer version of Booklyn. Nothing was changed.' : 'That file is not a valid Booklyn backup. Nothing was changed.'); }
        continue;
      }
      throw new BackupError('That file is not a Booklyn backup. Nothing was changed.');
    }
    if (kind === 'light') { throw new BackupError('That file is not a valid Booklyn backup. Nothing was changed.'); }
    var rec = parseLine(line, 'line ' + count);
    if (!rec || typeof rec !== 'object') throw new BackupError('The backup file is damaged. Nothing was changed.');
    if (end) throw new BackupError('The backup file has extra data after its end. Nothing was changed.');
    if (rec.t === 'state') {
      try { state = deps.prepareState(rec.state); }
      catch (e) { throw new BackupError(e && e.newer ? 'That backup is from a newer version of Booklyn. Nothing was changed.' : 'The progress inside the backup is not valid. Nothing was changed.'); }
    } else if (rec.t === 'bank') {
      if (!BANK_KEY.test(String(rec.key))) { notes.push('One question set was skipped (invalid name).'); continue; }
      var b = deps.upgradeBank(rec.bank);
      var before = b.q.length;
      b.q = b.q.filter(function (q) { return deps.validQuestion(q); }).slice(0, 2000);
      if (b.q.length < before) notes.push(before - b.q.length + ' incomplete question(s) were skipped.');
      banks[rec.key] = b;
    } else if (rec.t === 'file') {
      var meta = cleanMeta(rec.meta);
      if (ids[meta.id]) throw new BackupError('The backup lists the same file twice. Nothing was changed.');
      ids[meta.id] = 1;
      var bytes;
      try { bytes = deps.fromBase64(String(rec.data || '')); } catch (e) { throw new BackupError('The file “' + meta.name + '” in the backup is damaged. Nothing was changed.'); }
      if (meta.size && bytes.length !== meta.size) throw new BackupError('The file “' + meta.name + '” in the backup is incomplete. Nothing was changed.');
      if (meta.hash && deps.sha256) {
        var h = await deps.sha256(bytes);
        if (h !== meta.hash) throw new BackupError('The file “' + meta.name + '” in the backup does not match its checksum. Nothing was changed.');
      }
      meta.size = bytes.length;
      files.push({ meta: meta, blob: new Blob([bytes], { type: meta.type || 'application/octet-stream' }) });
    } else if (rec.t === 'end') {
      end = rec;
    } else {
      throw new BackupError('The backup contains something this version does not understand. Nothing was changed.');
    }
  }
  if (!kind) throw new BackupError('That file is empty. Nothing was changed.');
  if (!state) throw new BackupError('The backup has no progress data. Nothing was changed.');
  if (kind === 'full') {
    if (!end) throw new BackupError('The backup file is cut off (it was probably not fully copied). Nothing was changed.');
    if (end.files !== files.length || end.banks !== Object.keys(banks).length) throw new BackupError('The backup file is incomplete. Nothing was changed.');
    if (end.missing && end.missing.length) notes.push(end.missing.length + ' file(s) could not be saved when the backup was made: ' + end.missing.slice(0, 3).join(', ') + (end.missing.length > 3 ? '…' : '') + '.');
  }
  /* files pointing at a semester the backup does not contain cannot be placed */
  var semIds = {}; state.sems.forEach(function (s) { semIds[s.id] = 1; });
  files = files.filter(function (f) { if (semIds[f.meta.sem]) return true; notes.push('“' + f.meta.name + '” was skipped (its semester is not in the backup).'); return false; });
  return { kind: kind, state: state, banks: banks, files: files, createdAt: header ? header.createdAt : '', notes: notes };
}

/* ---------- merge: add what is missing, keep what is here ---------- */
function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
function union(a, b) { return Object.assign({}, b || {}, a || {}); }   /* this device wins */
function maxMap(a, b) { var o = Object.assign({}, b || {}); Object.keys(a || {}).forEach(function (k) { o[k] = Math.max(+a[k] || 0, +o[k] || 0); }); return o; }

/* Rules, as shown to the student:
   semesters, modules and deadlines that exist only in the backup are added; items with the same id stay as they are here.
   A light turned on in either place stays on (the newer time wins). Coins and shields: the higher number.
   Decorations: counts take the higher number, everything else keeps this device's choice.
   Modules whose id clashes with a different semester here are left out. */
export function mergeStates(cur, inc) {
  var out = JSON.parse(JSON.stringify(cur)), skipped = [];
  var haveSem = {}, haveMod = {};
  out.sems.forEach(function (s) { haveSem[s.id] = 1; s.modules.forEach(function (m) { haveMod[m.id] = 1; }); });
  var addedMods = {};
  inc.sems.forEach(function (s) {
    if (haveSem[s.id]) return;
    if (s.modules.some(function (m) { return haveMod[m.id]; })) { skipped.push(s.name || s.id); return; }
    out.sems.push(s); haveSem[s.id] = 1;
    s.modules.forEach(function (m) { haveMod[m.id] = 1; addedMods[m.id] = 1; });
  });
  var modAlive = {}; out.sems.forEach(function (s) { s.modules.forEach(function (m) { modAlive[m.id] = 1; }); });
  function keepKey(k) { return modAlive[String(k).split(':')[0]]; }
  function filt(o) { var r = {}; Object.keys(o || {}).forEach(function (k) { if (keepKey(k)) r[k] = o[k]; }); return r; }
  out.lit = maxMap(out.lit, filt(inc.lit));
  out.lvl = maxMap(out.lvl, filt(inc.lvl));
  out.seen = union(out.seen, inc.seen);
  out.tasksDone = union(out.tasksDone, inc.tasksDone);
  out.pin = union(out.pin, filt(inc.pin));
  out.paid = union(out.paid, inc.paid);
  out.how = union(out.how, filt(inc.how));
  out.notes = union(out.notes, filt(inc.notes));
  Object.keys(out.notes).forEach(function (k) { if (!out.notes[k] && inc.notes && inc.notes[k]) out.notes[k] = inc.notes[k]; });
  var haveDl = {}; out.deadlines.forEach(function (d) { haveDl[d.id] = 1; });
  inc.deadlines.forEach(function (d) { if (!haveDl[d.id] && (!d.mod || modAlive[d.mod])) out.deadlines.push(d); });
  out.deco = Object.assign({}, out.deco);
  Object.keys(inc.deco || {}).forEach(function (mid) {
    if (!modAlive[mid] || !isObj(inc.deco[mid])) return;
    var a = out.deco[mid] || {}, b = inc.deco[mid], r = Object.assign({}, b, a);
    Object.keys(b).forEach(function (k) { if (typeof a[k] === 'number' && typeof b[k] === 'number' && k !== 'hue') r[k] = Math.max(a[k], b[k]); });
    out.deco[mid] = r;
  });
  out.scenery = union(out.scenery, inc.scenery);
  out.sceneOwn = union(out.sceneOwn, inc.sceneOwn);
  out.iliasKnown = union(out.iliasKnown, inc.iliasKnown);
  out.iliasDismissed = union(out.iliasDismissed, inc.iliasDismissed);
  out.iliasHash = union(out.iliasHash, inc.iliasHash);
  out.iliasImported = union(out.iliasImported, inc.iliasImported);
  out.coins = Math.max(out.coins || 0, inc.coins || 0);
  out.shields = Math.max(out.shields || 0, inc.shields || 0);
  out.lastBackup = Math.max(out.lastBackup || 0, inc.lastBackup || 0);
  if (!out.name) out.name = inc.name || '';
  if (!out.activeSem && out.sems.length) out.activeSem = out.sems[0].id;
  return { state: out, skippedSems: skipped };
}

/* Merges two question banks of the same unit: all questions of both, the stronger answer history of each. */
export function mergeBanks(cur, inc) {
  if (!cur) return inc;
  var out = JSON.parse(JSON.stringify(cur)), have = {};
  out.q.forEach(function (q) { have[q.id] = 1; });
  inc.q.forEach(function (q) { if (!have[q.id]) { out.q.push(q); have[q.id] = 1; } });
  Object.keys(inc.stats || {}).forEach(function (id) {
    var a = out.stats[id], b = inc.stats[id];
    out.stats[id] = a ? { asked: Math.max(a.asked || 0, b.asked || 0), miss: Math.max(a.miss || 0, b.miss || 0) } : b;
  });
  Object.keys(inc.done || {}).forEach(function (k) { out.done[k] = true; });
  out.used = Array.from(new Set((out.used || []).concat(inc.used || [])));
  return out;
}

/* Plain-language summary shown before anything is restored. */
export function describeBackup(b) {
  var sems = b.state.sems.filter(function (s) { return !s.demo; });
  var mods = 0; sems.forEach(function (s) { mods += s.modules.length; });
  return { semesters: sems.length, modules: mods, lights: Object.keys(b.state.lit || {}).length, files: b.files.length, banks: Object.keys(b.banks).length, deadlines: b.state.deadlines.length, coins: b.state.coins || 0, createdAt: b.createdAt, kind: b.kind };
}
