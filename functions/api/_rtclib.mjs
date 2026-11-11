// Temporary "signalling" messages that let two of a person's own devices find each other (WebRTC).
// They hold connection details only, never files, and are deleted after a few minutes.
export const SIGNAL_TTL_MS = 10 * 60 * 1000;
export const MAX_ROWS_PER_USER = 300;
export const MAX_PAYLOAD = 16000;
export const KINDS = ['hello', 'offer', 'answer', 'ice', 'bye'];
const ID = /^[A-Za-z0-9_-]{8,48}$/;

export function validSignal(b) {
  if (!b || typeof b !== 'object') return 'body';
  if (!ID.test(String(b.from || ''))) return 'from';
  if (b.to != null && b.to !== '' && !ID.test(String(b.to))) return 'to';
  if (!ID.test(String(b.session || ''))) return 'session';
  if (!KINDS.includes(b.kind)) return 'kind';
  if (typeof b.payload !== 'string' || b.payload.length > MAX_PAYLOAD) return 'payload';
  return '';
}

export async function addSignal(db, userId, b, now = Date.now()) {
  const bad = validSignal(b);
  if (bad) return { ok: false, error: bad, status: 400 };
  await db.prepare('DELETE FROM rtc_signals WHERE user_id = ? AND created_at < ?').bind(userId, now - SIGNAL_TTL_MS).run();
  const c = await db.prepare('SELECT COUNT(*) AS n FROM rtc_signals WHERE user_id = ?').bind(userId).first();
  if (c.n >= MAX_ROWS_PER_USER) return { ok: false, error: 'busy', status: 429 };
  const r = await db.prepare('INSERT INTO rtc_signals (user_id, from_dev, to_dev, session, kind, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(userId, b.from, b.to ? b.to : null, b.session, b.kind, b.payload, now).run();
  return { ok: true, id: r.meta && r.meta.last_row_id };
}

// Messages for this device that it has not seen yet: addressed to it, or sent to everyone ("hello").
export async function readSignals(db, userId, device, since, now = Date.now()) {
  if (!ID.test(String(device || ''))) return { ok: false, error: 'device', status: 400 };
  await db.prepare('DELETE FROM rtc_signals WHERE user_id = ? AND created_at < ?').bind(userId, now - SIGNAL_TTL_MS).run();
  const rows = await db.prepare(
    'SELECT id, from_dev, to_dev, session, kind, payload, created_at FROM rtc_signals WHERE user_id = ? AND id > ? AND from_dev != ? AND (to_dev IS NULL OR to_dev = ?) ORDER BY id LIMIT 100'
  ).bind(userId, Math.max(0, Number(since) || 0), device, device).all();
  return { ok: true, rows: rows.results || [], now };
}

export async function clearSignals(db, userId, device) {
  if (!ID.test(String(device || ''))) return { ok: false, error: 'device', status: 400 };
  await db.prepare('DELETE FROM rtc_signals WHERE user_id = ? AND from_dev = ?').bind(userId, device).run();
  return { ok: true };
}
