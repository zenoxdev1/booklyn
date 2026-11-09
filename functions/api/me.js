import { json, currentUser, isAdmin } from './_lib.js';

export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false }, 401);
  const isCode = user.email.startsWith('code:'), isPk = user.email.startsWith('passkey:');
  return json({ ok: true, kind: isCode ? 'code' : isPk ? 'passkey' : 'email', email: isCode || isPk ? '' : user.email, uid: String(user.id), admin: isAdmin(env, user) });
}
