import { _t } from './i18n.js';
/* Booklyn storage: IndexedDB access for imported files (stores "meta" and "blobs").
   Every write helper resolves only after the transaction has completed, so a caller that
   awaits it knows the data is really on disk. Multi-record helpers use ONE transaction:
   either all records are written or none. */

var dbp = null;

export function idb() {
  if (dbp) return dbp;
  dbp = new Promise(function (res, rej) {
    if (typeof indexedDB === 'undefined') { rej(new Error('no indexedDB')); return; }
    var r = indexedDB.open('booklyn', 1);
    r.onupgradeneeded = function () { var d = r.result; d.createObjectStore('meta', { keyPath: 'id' }); d.createObjectStore('blobs'); };
    r.onsuccess = function () { res(r.result); };
    r.onerror = function () { rej(r.error); };
  });
  dbp.catch(function () { dbp = null; });
  return dbp;
}

export function run(stores, mode, fn) {
  return idb().then(function (d) {
    return new Promise(function (res, rej) {
      var t = d.transaction(stores, mode), out;
      try { out = fn(t); } catch (e) { try { t.abort(); } catch (x) { /* already finished */ } rej(e); return; }
      t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); };
      t.onerror = function () { rej(t.error); };
      t.onabort = function () { rej(t.error || new Error('aborted')); };
    });
  });
}

export function dbAll() { return run(['meta'], 'readonly', function (t) { return t.objectStore('meta').getAll(); }); }
export function dbPut(m) { return run(['meta'], 'readwrite', function (t) { t.objectStore('meta').put(m); }); }
export function dbPutMany(list) {
  if (!list.length) return Promise.resolve();
  return run(['meta'], 'readwrite', function (t) { var s = t.objectStore('meta'); list.forEach(function (m) { s.put(m); }); });
}
export function dbAdd(m, b) { return run(['meta', 'blobs'], 'readwrite', function (t) { t.objectStore('meta').put(m); t.objectStore('blobs').put(b, m.id); }); }
export function dbAddMany(items) {
  /* items: [{meta, blob}] written in one transaction */
  if (!items.length) return Promise.resolve();
  return run(['meta', 'blobs'], 'readwrite', function (t) {
    var ms = t.objectStore('meta'), bs = t.objectStore('blobs');
    items.forEach(function (it) { ms.put(it.meta); bs.put(it.blob, it.meta.id); });
  });
}
export function dbBlob(id) { return run(['blobs'], 'readonly', function (t) { return t.objectStore('blobs').get(id); }); }
export function dbDelMany(ids) {
  if (!ids.length) return Promise.resolve();
  return run(['meta', 'blobs'], 'readwrite', function (t) {
    var ms = t.objectStore('meta'), bs = t.objectStore('blobs');
    ids.forEach(function (id) { ms.delete(id); bs.delete(id); });
  });
}
export function dbDel(id) { return run(['meta', 'blobs'], 'readwrite', function (t) { t.objectStore('meta').delete(id); t.objectStore('blobs').delete(id); }); }

/* Turns a storage error into a short sentence a student can act on. */
export function explainStorageError(e) {
  var n = e && e.name;
  if (n === 'QuotaExceededError') return _t("Not enough storage left on this device.");
  if (n === 'InvalidStateError' || n === 'SecurityError') return _t("This browser blocked file storage (private mode?).");
  if (n === 'NotFoundError') return _t("The file could not be read. Pick it again.");
  return _t("The browser could not save this file.");
}
export function isQuota(e) { return !!e && e.name === 'QuotaExceededError'; }
