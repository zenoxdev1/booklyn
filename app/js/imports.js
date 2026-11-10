import { _t } from './i18n.js';
/* Booklyn imports: the logic that decides when a file counts as "added" or "imported".
   Rule: nothing is shown as done until the browser confirmed the write.
   The storage layer is passed in (store), so these functions can be tested without a browser. */

/* Applies a change to several file records and saves them in ONE transaction.
   In-memory records change only after the save succeeded, so a failure leaves
   everything exactly as it was and the student can simply try again.
   patchFn(file) returns an object of fields to set, or null to skip the file. */
export async function commitPatch(store, files, patchFn) {
  var next = [], targets = [];
  files.forEach(function (f) {
    var p = patchFn(f);
    if (!p) return;
    targets.push(f);
    next.push(Object.assign({}, f, p));
  });
  if (!next.length) return { ok: true, changed: [] };
  try { await store.putMany(next); }
  catch (e) { return { ok: false, error: e, changed: [] }; }
  next.forEach(function (n, i) { Object.assign(targets[i], n); });
  return { ok: true, changed: targets.map(function (f) { return f.id; }) };
}

/* Removes records and blobs in one transaction; the in-memory list is changed by the caller
   only when ok is true. */
export async function removeFiles(store, ids) {
  try { await store.delMany(ids); return { ok: true }; }
  catch (e) { return { ok: false, error: e }; }
}

/* Adds files one by one. A file is pushed to `files` only after its write was confirmed.
   Files that cannot be saved are returned in `failed` with a reason so the app can offer a retry.
   Retrying never creates duplicates: saved files carry their hash and are skipped as duplicates.
   o = { files (live array), store {add}, hashOf, build(file, hash, dup) -> record, onProgress(i, n), isQuota(e), explain(e) } */
export async function ingest(list, o) {
  var added = [], failed = [], hashes = [], dups = 0, i, stop = false;
  for (i = 0; i < list.length; i++) {
    var f = list[i];
    if (stop) { failed.push({ file: f, name: f.name, reason: _t("Skipped because the storage is full."), quota: true }); continue; }
    if (o.onProgress) o.onProgress(i, list.length);
    var h = null;
    try { h = await o.hashOf(f); } catch (e) { h = null; }
    if (h) hashes.push(h);
    var dup = h ? o.files.filter(function (x) { return x.hash === h; })[0] : null;
    if (dup && o.skipDuplicates !== false) { dups++; continue; }
    var rec = o.build(f, h, dup);
    try {
      await o.store.add(rec, f);
      o.files.push(rec);
      added.push(rec);
    } catch (e) {
      var q = o.isQuota ? o.isQuota(e) : false;
      failed.push({ file: f, name: f.name, reason: o.explain ? o.explain(e) : _t("Could not be saved."), quota: q });
      if (q) stop = true;
    }
  }
  return { added: added, dups: dups, failed: failed, hashes: hashes };
}

/* ---------- deleting files that wait in the Port ----------
   Only files that are STILL pending are deleted. A file that was imported meanwhile (or is gone) is skipped and reported,
   so a house and floor are never touched by a Port clean-up. */
export function planDelete(files, ids) {
  var byId = {}, seen = {}, ok = [], skipped = [];
  files.forEach(function (f) { byId[f.id] = f; });
  ids.forEach(function (id) {
    if (seen[id]) return; seen[id] = 1;
    var f = byId[id];
    if (!f) skipped.push({ id: id, name: '', reason: 'missing' });
    else if (f.status !== 'pending') skipped.push({ id: id, name: f.name, reason: 'imported' });
    else ok.push(f);
  });
  return { ok: ok, skipped: skipped };
}

/* Deletes record and stored content of each file together (one transaction per try).
   First all at once; if that fails nothing was deleted, so every file is tried alone to find out which ones can go.
   A file is listed in `removed` only when the storage confirmed it. */
export async function removeEach(store, ids) {
  if (!ids.length) return { removed: [], failed: [] };
  var all = await removeFiles(store, ids);
  if (all.ok) return { removed: ids.slice(), failed: [] };
  var removed = [], failed = [];
  for (var i = 0; i < ids.length; i++) {
    var r = await removeFiles(store, [ids[i]]);
    if (r.ok) removed.push(ids[i]); else failed.push({ id: ids[i], error: r.error });
  }
  return { removed: removed, failed: failed };
}

/* Files that were marked as a duplicate of a file that has just been deleted are not duplicates any more. */
export function orphanedDups(files, goneIds) {
  var gone = {}; goneIds.forEach(function (id) { gone[id] = 1; });
  return files.filter(function (f) { return f.status === 'pending' && f.dup && gone[f.dup]; });
}
