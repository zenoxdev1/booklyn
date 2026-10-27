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
    if (stop) { failed.push({ file: f, name: f.name, reason: 'Skipped because the storage is full.', quota: true }); continue; }
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
      failed.push({ file: f, name: f.name, reason: o.explain ? o.explain(e) : 'Could not be saved.', quota: q });
      if (q) stop = true;
    }
  }
  return { added: added, dups: dups, failed: failed, hashes: hashes };
}
