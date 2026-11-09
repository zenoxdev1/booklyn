import { json, currentUser, sameOrigin, tooManyAttempts } from '../_lib.js';
import { rpOf, newChallenge, handleFor, cleanName, MAX_PASSKEYS } from '../_pk.js';
import { b64uEncode } from '../_webauthn.mjs';

// POST /api/passkey/options { mode: 'create' | 'register', name }
//   create   -> options for making a NEW account that is opened with a passkey (not signed in yet)
//   register -> options for adding a passkey to the account you are signed in to
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  if (await tooManyAttempts(env, request, 'pk-options', 30)) return json({ ok: false, error: 'limit' }, 429);
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const rp = rpOf(request), label = cleanName(body && body.name) || 'Booklyn account';
  const user = await currentUser(env, request);
  let kind, handle, exclude = [];
  if (body && body.mode === 'register') {
    if (!user) return json({ ok: false }, 401);
    const have = await env.DB.prepare('SELECT id FROM passkeys WHERE user_id = ?').bind(user.id).all();
    const list = (have && have.results) || [];
    if (list.length >= MAX_PASSKEYS) return json({ ok: false, error: 'max' }, 409);
    exclude = list.map((r) => ({ type: 'public-key', id: r.id }));
    handle = await handleFor(env, user);
    kind = 'pk-reg:' + user.id;
  } else {
    handle = b64uEncode(crypto.getRandomValues(new Uint8Array(16)));
    kind = 'pk-new:' + handle;
  }
  const challenge = await newChallenge(env, request, kind);
  return json({
    ok: true,
    publicKey: {
      challenge, rp: { id: rp.id, name: rp.name },
      user: { id: handle, name: label, displayName: label },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      timeout: 120000, attestation: 'none', excludeCredentials: exclude,
      authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'preferred' },
    },
  });
}
