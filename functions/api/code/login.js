import { json, sha256, randomToken, sameOrigin, sessionCookie, SESSION_DAYS, normalizeCode, tooManyAttempts } from '../_lib.js';

// POST /api/code/login { code } -> signs in with a sync code.
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  if (await tooManyAttempts(env, request, 'code-login', 30)) return json({ ok: false, error: 'limit' }, 429);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'json' }, 400); }
  const code = normalizeCode(body && body.code);
  if (!code) return json({ ok: false, error: 'code' }, 400);
  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind('code:' + (await sha256(code))).first();
  if (!user) return json({ ok: false, error: 'code' }, 404);
  const now = Date.now();
  const session = randomToken(32);
  await env.DB.prepare('INSERT INTO sessions (hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(session), user.id, now, now + SESSION_DAYS * 864e5).run();
  return json({ ok: true, uid: String(user.id) }, 200, { 'Set-Cookie': sessionCookie(session, SESSION_DAYS * 86400) });
}
