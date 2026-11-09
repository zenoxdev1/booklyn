import { json, currentUser, sameOrigin, tooManyAttempts } from '../_lib.js';
import { rpOf, consumeChallenge, challengeOf, openSession, cleanName, MAX_PASSKEYS } from '../_pk.js';
import { verifyRegistration } from '../_webauthn.mjs';

// POST /api/passkey/register { credential, name } -> saves the passkey. For 'create' it also makes the account and signs in.
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  if (await tooManyAttempts(env, request, 'pk-register', 20)) return json({ ok: false, error: 'limit' }, 429);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'json' }, 400); }
  const cred = body && body.credential;
  if (!cred || typeof cred.id !== 'string' || cred.id.length > 1400) return json({ ok: false, error: 'shape' }, 400);
  const kind = await consumeChallenge(env, challengeOf(cred));
  if (!kind || !(kind.startsWith('pk-reg:') || kind.startsWith('pk-new:'))) return json({ ok: false, error: 'expired' }, 400);
  const rp = rpOf(request);
  const v = await verifyRegistration({ credential: cred, expectedChallenge: challengeOf(cred), expectedOrigin: rp.origin, rpId: rp.id });
  if (!v.ok) return json({ ok: false, error: 'invalid' }, 400);
  const now = Date.now(), name = cleanName(body.name) || 'Passkey';
  const taken = await env.DB.prepare('SELECT id FROM passkeys WHERE id = ?').bind(v.credentialId).first();
  if (taken) return json({ ok: false, error: 'exists' }, 409);

  if (kind.startsWith('pk-reg:')) {
    const user = await currentUser(env, request);
    if (!user || String(user.id) !== kind.slice(7)) return json({ ok: false }, 401);
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM passkeys WHERE user_id = ?').bind(user.id).first();
    if (n.n >= MAX_PASSKEYS) return json({ ok: false, error: 'max' }, 409);
    const h = await env.DB.prepare('SELECT user_handle FROM passkeys WHERE user_id = ? LIMIT 1').bind(user.id).first();
    const handle = h && h.user_handle ? h.user_handle : await userHandleFor(user.id);
    await env.DB.prepare('INSERT INTO passkeys (id, user_id, user_handle, public_key, alg, counter, name, created_at, last_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)')
      .bind(v.credentialId, user.id, handle, JSON.stringify(v.jwk), v.alg, v.counter, name, now).run();
    return json({ ok: true, created: false });
  }
  const handle = kind.slice(7);
  await env.DB.prepare('INSERT INTO users (email, created_at) VALUES (?, ?)').bind('passkey:' + handle, now).run();
  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind('passkey:' + handle).first();
  await env.DB.prepare('INSERT INTO passkeys (id, user_id, user_handle, public_key, alg, counter, name, created_at, last_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(v.credentialId, user.id, handle, JSON.stringify(v.jwk), v.alg, v.counter, name, now, now).run();
  const cookie = await openSession(env, user.id);
  return json({ ok: true, created: true, kind: 'passkey', uid: String(user.id) }, 200, { 'Set-Cookie': cookie });
}

async function userHandleFor(id) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bk-user:' + id))).slice(0, 16);
  let s = ''; h.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
