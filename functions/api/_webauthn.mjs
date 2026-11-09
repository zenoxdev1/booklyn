// Minimal WebAuthn (passkey) verification with the Web Crypto API. No libraries.
// Supports "none" attestation, ES256 (P-256) and RS256 keys: what browsers, phones and Windows Hello produce.
// Pure functions: easy to test in Node and they run unchanged in Cloudflare Workers.

export function b64uEncode(bytes) {
  let s = '';
  bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64uDecode(str) {
  str = String(str || '');
  if (!/^[A-Za-z0-9_-]*$/.test(str)) throw new Error('b64u');
  const b = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

/* ---------- CBOR (only what WebAuthn uses) ---------- */
export function cborDecode(bytes, offset = 0, depth = 0) {
  if (depth > 8) throw new Error('cbor depth');
  const b = bytes[offset];
  if (b === undefined) throw new Error('cbor end');
  const major = b >> 5, info = b & 31;
  let pos = offset + 1, val;
  if (info < 24) val = info;
  else if (info === 24) { val = bytes[pos]; pos += 1; }
  else if (info === 25) { val = (bytes[pos] << 8) | bytes[pos + 1]; pos += 2; }
  else if (info === 26) { val = ((bytes[pos] << 24) >>> 0) + (bytes[pos + 1] << 16) + (bytes[pos + 2] << 8) + bytes[pos + 3]; pos += 4; }
  else if (info === 27) {
    const hi = ((bytes[pos] << 24) >>> 0) + (bytes[pos + 1] << 16) + (bytes[pos + 2] << 8) + bytes[pos + 3];
    const lo = ((bytes[pos + 4] << 24) >>> 0) + (bytes[pos + 5] << 16) + (bytes[pos + 6] << 8) + bytes[pos + 7];
    val = hi * 4294967296 + lo; pos += 8;
    if (!Number.isSafeInteger(val)) throw new Error('cbor big');
  } else if (major === 7 && (info === 20 || info === 21 || info === 22)) {
    return { value: info === 20 ? false : info === 21 ? true : null, offset: pos };
  } else throw new Error('cbor info');
  if (val === undefined || Number.isNaN(val)) throw new Error('cbor value');
  switch (major) {
    case 0: return { value: val, offset: pos };
    case 1: return { value: -1 - val, offset: pos };
    case 2: if (pos + val > bytes.length) throw new Error('cbor len'); return { value: bytes.slice(pos, pos + val), offset: pos + val };
    case 3: if (pos + val > bytes.length) throw new Error('cbor len'); return { value: new TextDecoder().decode(bytes.slice(pos, pos + val)), offset: pos + val };
    case 4: {
      if (val > 64) throw new Error('cbor array');
      const arr = []; let o = pos;
      for (let i = 0; i < val; i++) { const r = cborDecode(bytes, o, depth + 1); arr.push(r.value); o = r.offset; }
      return { value: arr, offset: o };
    }
    case 5: {
      if (val > 64) throw new Error('cbor map');
      const map = Object.create(null); let o = pos;
      for (let i = 0; i < val; i++) {
        const k = cborDecode(bytes, o, depth + 1); const v = cborDecode(bytes, k.offset, depth + 1);
        map[String(k.value)] = v.value; o = v.offset;
      }
      return { value: map, offset: o };
    }
    default: throw new Error('cbor major');
  }
}

/* ---------- helpers ---------- */
async function sha256Bytes(data) { return new Uint8Array(await crypto.subtle.digest('SHA-256', data)); }
function eq(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
function concat(a, b) { const o = new Uint8Array(a.length + b.length); o.set(a, 0); o.set(b, a.length); return o; }

export function parseAuthData(ad) {
  if (!(ad instanceof Uint8Array) || ad.length < 37) throw new Error('authData');
  const flags = ad[32];
  const out = { rpIdHash: ad.slice(0, 32), flags, up: !!(flags & 1), uv: !!(flags & 4), at: !!(flags & 64), counter: new DataView(ad.buffer, ad.byteOffset + 33, 4).getUint32(0) };
  if (out.at) {
    if (ad.length < 55) throw new Error('authData at');
    const len = (ad[53] << 8) | ad[54];
    if (len < 1 || len > 1023 || ad.length < 55 + len) throw new Error('credId');
    out.credId = ad.slice(55, 55 + len);
    out.cose = cborDecode(ad, 55 + len).value;
  }
  return out;
}

/* COSE key -> { jwk, alg } or null. */
export function coseToJwk(c) {
  if (!c) return null;
  const kty = c['1'], alg = c['3'];
  if (kty === 2 && c['-1'] === 1 && alg === -7 && c['-2'] instanceof Uint8Array && c['-3'] instanceof Uint8Array && c['-2'].length === 32 && c['-3'].length === 32) {
    return { alg: -7, jwk: { kty: 'EC', crv: 'P-256', x: b64uEncode(c['-2']), y: b64uEncode(c['-3']), ext: true } };
  }
  if (kty === 3 && alg === -257 && c['-1'] instanceof Uint8Array && c['-2'] instanceof Uint8Array && c['-1'].length >= 128 && c['-1'].length <= 512) {
    return { alg: -257, jwk: { kty: 'RSA', alg: 'RS256', n: b64uEncode(c['-1']), e: b64uEncode(c['-2']), ext: true } };
  }
  return null;
}

async function importPublic(jwk, alg) {
  if (alg === -7) return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  if (alg === -257) return crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  throw new Error('alg');
}

/* ECDSA signatures in WebAuthn are DER encoded; Web Crypto wants r || s (64 bytes). */
export function derToRaw(sig) {
  if (sig[0] !== 0x30) throw new Error('der');
  let p = 2; if (sig[1] & 0x80) p = 2 + (sig[1] & 0x7f);
  const readInt = () => {
    if (sig[p] !== 0x02) throw new Error('der int');
    const len = sig[p + 1]; let v = sig.slice(p + 2, p + 2 + len); p += 2 + len;
    while (v.length > 32 && v[0] === 0) v = v.slice(1);
    if (v.length > 32) throw new Error('der len');
    const o = new Uint8Array(32); o.set(v, 32 - v.length); return o;
  };
  const r = readInt(), s = readInt();
  return concat(r, s);
}

function parseClient(b64, type, expectedChallenge, expectedOrigin) {
  const raw = b64uDecode(b64);
  let c;
  try { c = JSON.parse(new TextDecoder().decode(raw)); } catch { throw new Error('client json'); }
  if (!c || c.type !== type) throw new Error('type');
  if (typeof c.challenge !== 'string' || c.challenge !== expectedChallenge) throw new Error('challenge');
  if (c.origin !== expectedOrigin) throw new Error('origin');
  if (c.crossOrigin === true) throw new Error('cross origin');
  return raw;
}

/* Registration. credential = { id, response: { clientDataJSON, attestationObject } } (strings are base64url).
   Returns { ok:true, credentialId, jwk, alg, counter } or { ok:false, error }. */
export async function verifyRegistration({ credential, expectedChallenge, expectedOrigin, rpId }) {
  try {
    const r = credential && credential.response;
    if (!r || typeof credential.id !== 'string') return { ok: false, error: 'shape' };
    parseClient(r.clientDataJSON, 'webauthn.create', expectedChallenge, expectedOrigin);
    const att = cborDecode(b64uDecode(r.attestationObject)).value;
    if (!att || !(att.authData instanceof Uint8Array)) return { ok: false, error: 'attestation' };
    const ad = parseAuthData(att.authData);
    if (!eq(ad.rpIdHash, await sha256Bytes(new TextEncoder().encode(rpId)))) return { ok: false, error: 'rp' };
    if (!ad.up) return { ok: false, error: 'presence' };
    if (!ad.at || !ad.credId) return { ok: false, error: 'no key' };
    if (b64uEncode(ad.credId) !== credential.id) return { ok: false, error: 'id' };
    const k = coseToJwk(ad.cose);
    if (!k) return { ok: false, error: 'key type' };
    await importPublic(k.jwk, k.alg);
    return { ok: true, credentialId: credential.id, jwk: k.jwk, alg: k.alg, counter: ad.counter, uv: ad.uv };
  } catch (e) { return { ok: false, error: 'invalid' }; }
}

/* Sign-in. credential = { id, response: { clientDataJSON, authenticatorData, signature } }.
   stored = { jwk, alg, counter }. Returns { ok:true, counter } or { ok:false, error }. */
export async function verifyAssertion({ credential, expectedChallenge, expectedOrigin, rpId, stored }) {
  try {
    const r = credential && credential.response;
    if (!r) return { ok: false, error: 'shape' };
    const clientRaw = parseClient(r.clientDataJSON, 'webauthn.get', expectedChallenge, expectedOrigin);
    const adRaw = b64uDecode(r.authenticatorData), ad = parseAuthData(adRaw);
    if (!eq(ad.rpIdHash, await sha256Bytes(new TextEncoder().encode(rpId)))) return { ok: false, error: 'rp' };
    if (!ad.up) return { ok: false, error: 'presence' };
    const key = await importPublic(stored.jwk, stored.alg);
    const signed = concat(adRaw, await sha256Bytes(clientRaw));
    let sig = b64uDecode(r.signature);
    const ok = stored.alg === -7
      ? await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, derToRaw(sig), signed)
      : await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, sig, signed);
    if (!ok) return { ok: false, error: 'signature' };
    // A counter that does not go up can mean a cloned authenticator. Many synced passkeys always send 0, which is fine.
    if ((stored.counter || 0) > 0 || ad.counter > 0) { if (ad.counter <= (stored.counter || 0)) return { ok: false, error: 'counter' }; }
    return { ok: true, counter: ad.counter, uv: ad.uv };
  } catch (e) { return { ok: false, error: 'invalid' }; }
}
