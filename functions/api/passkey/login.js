import { json, sameOrigin, tooManyAttempts } from '../_lib.js';
import { rpOf, consumeChallenge, challengeOf, openSession, isPasskeyUser } from '../_pk.js';
import { verifyAssertion } from '../_webauthn.mjs';

// POST /api/passkey/login { credential } -> signs in with a passkey.
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  if (await tooManyAttempts(env, request, 'pk-login', 30)) return json({ ok: false, error: 'limit' }, 429);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'json' }, 400); }
  const cred = body && body.credential;
  if (!cred || typeof cred.id !== 'string' || cred.id.length > 1400) return json({ ok: false, error: 'shape' }, 400);
  const kind = await consumeChallenge(env, challengeOf(cred));
  if (kind !== 'pk-auth') return json({ ok: false, error: 'expired' }, 400);
  const row = await env.DB.prepare('SELECT p.id AS id, p.user_id AS user_id, p.public_key AS public_key, p.alg AS alg, p.counter AS counter, u.email AS email FROM passkeys p JOIN users u ON u.id = p.user_id WHERE p.id = ?').bind(cred.id).first();
  if (!row) return json({ ok: false, error: 'unknown' }, 404);
  const rp = rpOf(request);
  const v = await verifyAssertion({ credential: cred, expectedChallenge: challengeOf(cred), expectedOrigin: rp.origin, rpId: rp.id, stored: { jwk: JSON.parse(row.public_key), alg: row.alg, counter: row.counter } });
  if (!v.ok) return json({ ok: false, error: 'invalid' }, 401);
  await env.DB.prepare('UPDATE passkeys SET counter = ?, last_used = ? WHERE id = ?').bind(v.counter, Date.now(), row.id).run();
  const cookie = await openSession(env, row.user_id);
  const isPk = isPasskeyUser({ email: row.email });
  return json({ ok: true, kind: row.email.startsWith('code:') ? 'code' : isPk ? 'passkey' : 'email', email: row.email.startsWith('code:') || isPk ? '' : row.email, uid: String(row.user_id) }, 200, { 'Set-Cookie': cookie });
}
