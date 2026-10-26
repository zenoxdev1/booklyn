import { json, currentUser, sameOrigin, sessionCookie } from './_lib.js';

// DELETE /api/account -> removes the user, the stored progress, sessions and pending links.
export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false }, 403);
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false }, 401);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM states WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM login_tokens WHERE email = ?').bind(user.email),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ]);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
}
