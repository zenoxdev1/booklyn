import { json, currentUser, sameOrigin } from '../_lib.js';
import { addSignal, readSignals, clearSignals } from '../_rtclib.mjs';

// GET    /api/rtc/signal?device=ID&since=N -> { ok, rows } messages for this device (same account only)
// POST   /api/rtc/signal { from, to?, session, kind, payload } -> { ok, id }
// DELETE /api/rtc/signal { device }        -> removes what this device sent
export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false }, 401);
  const u = new URL(request.url);
  const r = await readSignals(env.DB, user.id, u.searchParams.get('device'), u.searchParams.get('since'));
  return json(r.ok ? { ok: true, rows: r.rows, now: r.now } : { ok: false, error: r.error }, r.ok ? 200 : r.status);
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'json' }, 400); }
  const r = await addSignal(env.DB, user.id, body);
  return json(r.ok ? { ok: true, id: r.id } : { ok: false, error: r.error }, r.ok ? 200 : r.status);
}

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'json' }, 400); }
  const r = await clearSignals(env.DB, user.id, body && body.device);
  return json(r.ok ? { ok: true } : { ok: false, error: r.error }, r.ok ? 200 : r.status);
}
