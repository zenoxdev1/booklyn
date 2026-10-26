import { json, currentUser } from './_lib.js';

export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false }, 401);
  return json({ ok: true, email: user.email });
}
