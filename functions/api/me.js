import { json, currentUser } from './_lib.js';

export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false }, 401);
  const isCode = user.email.startsWith('code:');
  return json({ ok: true, kind: isCode ? 'code' : 'email', email: isCode ? '' : user.email, uid: String(user.id) });
}
