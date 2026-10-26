import { json, sha256, randomToken, sameOrigin, sessionCookie, SESSION_DAYS, newSyncCode, formatCode, tooManyAttempts } from '../_lib.js';

// POST /api/code/create -> makes an account that is identified only by a secret sync code.
// The server stores a hash of the code. If the code is lost, nobody can recover it.
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  if (await tooManyAttempts(env, request, 'code-create', 8)) return json({ ok: false, error: 'limit' }, 429);
  const code = newSyncCode();
  const now = Date.now();
  await env.DB.prepare('INSERT INTO users (email, created_at) VALUES (?, ?)').bind('code:' + (await sha256(code)), now).run();
  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind('code:' + (await sha256(code))).first();
  const session = randomToken(32);
  await env.DB.prepare('INSERT INTO sessions (hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(session), user.id, now, now + SESSION_DAYS * 864e5).run();
  return json({ ok: true, code: formatCode(code), uid: String(user.id) }, 200, { 'Set-Cookie': sessionCookie(session, SESSION_DAYS * 86400) });
}
