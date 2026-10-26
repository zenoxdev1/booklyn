import { json, sha256, readSession, sameOrigin, sessionCookie } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false }, 403);
  const raw = readSession(request);
  if (raw) await env.DB.prepare('DELETE FROM sessions WHERE hash = ?').bind(await sha256(raw)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
}
