import { json, sameOrigin, tooManyAttempts } from '../_lib.js';
import { rpOf, newChallenge } from '../_pk.js';

// POST /api/passkey/login-options -> a challenge for signing in. No username: the passkey says who you are.
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  if (await tooManyAttempts(env, request, 'pk-options', 30)) return json({ ok: false, error: 'limit' }, 429);
  const rp = rpOf(request);
  const challenge = await newChallenge(env, request, 'pk-auth');
  return json({ ok: true, publicKey: { challenge, rpId: rp.id, timeout: 120000, userVerification: 'preferred', allowCredentials: [] } });
}
