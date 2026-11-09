import { json, currentUser, sameOrigin } from '../_lib.js';
import { isPasskeyUser } from '../_pk.js';

// GET    /api/passkey          -> the passkeys of the signed-in account
// DELETE /api/passkey { id }   -> removes one (an account that is opened only by passkeys keeps at least one)
export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false }, 401);
  const r = await env.DB.prepare('SELECT id, name, created_at, last_used FROM passkeys WHERE user_id = ? ORDER BY created_at').bind(user.id).all();
  return json({ ok: true, passkeys: ((r && r.results) || []).map((x) => ({ id: x.id, name: x.name, created: x.created_at, last: x.last_used })) });
}
export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'json' }, 400); }
  const id = String(body && body.id || '');
  const row = await env.DB.prepare('SELECT id FROM passkeys WHERE id = ? AND user_id = ?').bind(id, user.id).first();
  if (!row) return json({ ok: false, error: 'unknown' }, 404);
  if (isPasskeyUser(user)) {
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM passkeys WHERE user_id = ?').bind(user.id).first();
    if (n.n <= 1) return json({ ok: false, error: 'last' }, 409);
  }
  await env.DB.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').bind(id, user.id).run();
  return json({ ok: true });
}
