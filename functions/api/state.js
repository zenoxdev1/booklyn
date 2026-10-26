import { json, currentUser, sameOrigin, MAX_STATE_BYTES } from './_lib.js';

// GET  /api/state            -> { ok, state, updatedAt }  (state is null when nothing is stored yet)
// PUT  /api/state { state, base } -> { ok, updatedAt }  or 409 { conflict: true, updatedAt }
// Only the small progress data lives here. Files never leave the device.
export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false }, 401);
  const row = await env.DB.prepare('SELECT json, updated_at FROM states WHERE user_id = ?').bind(user.id).first();
  if (!row) return json({ ok: true, state: null, updatedAt: 0 });
  return json({ ok: true, state: JSON.parse(row.json), updatedAt: row.updated_at });
}

export async function onRequestPut({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false }, 401);
  const text = await request.text();
  if (text.length > MAX_STATE_BYTES * 1.2) return json({ ok: false, error: 'too-big' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ ok: false, error: 'json' }, 400); }
  const state = body && body.state;
  const base = Number(body && body.base) || 0;
  if (!state || typeof state !== 'object' || typeof state.schema !== 'number') return json({ ok: false, error: 'state' }, 400);
  const payload = JSON.stringify(state);
  if (payload.length > MAX_STATE_BYTES) return json({ ok: false, error: 'too-big' }, 413);

  const cur = await env.DB.prepare('SELECT updated_at FROM states WHERE user_id = ?').bind(user.id).first();
  const now = Math.max(Date.now(), (cur ? cur.updated_at : 0) + 1);
  if (!cur) {
    if (base !== 0) return json({ ok: false, conflict: true, updatedAt: 0 }, 409);
    const r = await env.DB.prepare('INSERT INTO states (user_id, json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO NOTHING').bind(user.id, payload, now).run();
    if (!r.meta || r.meta.changes !== 1) return json({ ok: false, conflict: true }, 409);
    return json({ ok: true, updatedAt: now });
  }
  const r = await env.DB.prepare('UPDATE states SET json = ?, updated_at = ? WHERE user_id = ? AND updated_at = ?').bind(payload, now, user.id, base).run();
  if (!r.meta || r.meta.changes !== 1) return json({ ok: false, conflict: true, updatedAt: cur.updated_at }, 409);
  return json({ ok: true, updatedAt: now });
}
