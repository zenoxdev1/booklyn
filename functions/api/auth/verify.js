import { json, sha256, randomToken, sameOrigin, sessionCookie, SESSION_DAYS } from '../_lib.js';

// POST /api/auth/verify  { token }  ->  signs in and sets the session cookie.
// This is a POST on purpose: mail scanners that prefetch links must not use up the token.
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'json' }, 400); }
  const raw = String(body && body.token || '');
  if (raw.length < 20 || raw.length > 200) return json({ ok: false, error: 'token' }, 400);

  const now = Date.now();
  const hash = await sha256(raw);
  const row = await env.DB.prepare('SELECT email FROM login_tokens WHERE hash = ? AND used = 0 AND expires_at > ?').bind(hash, now).first();
  if (!row) return json({ ok: false, error: 'expired' }, 400);
  const claim = await env.DB.prepare('UPDATE login_tokens SET used = 1 WHERE hash = ? AND used = 0').bind(hash).run();
  if (!claim.meta || claim.meta.changes !== 1) return json({ ok: false, error: 'expired' }, 400);

  await env.DB.prepare('INSERT INTO users (email, created_at) VALUES (?, ?) ON CONFLICT(email) DO NOTHING').bind(row.email, now).run();
  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(row.email).first();

  const session = randomToken(32);
  await env.DB.prepare('INSERT INTO sessions (hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(session), user.id, now, now + SESSION_DAYS * 864e5).run();
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run();
  return json({ ok: true, email: row.email }, 200, { 'Set-Cookie': sessionCookie(session, SESSION_DAYS * 86400) });
}
