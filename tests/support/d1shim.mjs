// A tiny stand-in for Cloudflare D1, built on Node's own SQLite, so the account API can be tested without Cloudflare.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function makeDB() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(fileURLToPath(new URL('../../db/schema.sql', import.meta.url)), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => { const r = db.prepare(sql).get(...args); return r === undefined ? null : { ...r }; },
    all: async () => ({ results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }),
    run: async () => { const i = db.prepare(sql).run(...args); return { meta: { changes: Number(i.changes) } }; },
    _run: () => { const i = db.prepare(sql).run(...args); return { meta: { changes: Number(i.changes) } }; },
  });
  return { prepare: (sql) => stmt(sql), batch: async (list) => list.map((s) => s._run()), raw: db };
}
