// A software passkey authenticator for tests: makes the same bytes a real one would (ES256, "none" attestation).
import { webcrypto as crypto } from 'node:crypto';
import { b64uEncode } from '../../functions/api/_webauthn.mjs';

function enc(v) {
  const head = (major, n) => {
    if (n < 24) return [major << 5 | n];
    if (n < 256) return [major << 5 | 24, n];
    if (n < 65536) return [major << 5 | 25, n >> 8, n & 255];
    return [major << 5 | 26, (n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  if (typeof v === 'number') return v >= 0 ? head(0, v) : head(1, -1 - v);
  if (typeof v === 'string') { const b = [...new TextEncoder().encode(v)]; return [...head(3, b.length), ...b]; }
  if (v instanceof Uint8Array) return [...head(2, v.length), ...v];
  if (Array.isArray(v)) return [...head(4, v.length), ...v.flatMap(enc)];
  const keys = Object.keys(v); return [...head(5, keys.length), ...keys.flatMap((k) => [...enc(/^-?\d+$/.test(k) ? +k : k), ...enc(v[k])])];
}
export const cborEncode = (v) => new Uint8Array(enc(v));
const sha = async (d) => new Uint8Array(await crypto.subtle.digest('SHA-256', d));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; a.forEach((x) => { o.set(x, p); p += x.length; }); return o; };
function derOf(raw) {
  const part = (x) => { let i = 0; while (i < x.length - 1 && x[i] === 0) i++; x = x.slice(i); if (x[0] & 0x80) x = cat(new Uint8Array([0]), x); return cat(new Uint8Array([2, x.length]), x); };
  const r = part(raw.slice(0, 32)), s = part(raw.slice(32));
  return cat(new Uint8Array([0x30, r.length + s.length]), r, s);
}

export class Authenticator {
  constructor() { this.credId = crypto.getRandomValues(new Uint8Array(32)); this.counter = 0; this.userHandle = null; }
  async init() {
    this.keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    this.jwk = await crypto.subtle.exportKey('jwk', this.keys.publicKey);
    return this;
  }
  get id() { return b64uEncode(this.credId); }
  async create({ challenge, rpId, origin, user }) {
    this.userHandle = user && user.id;
    const cose = cborEncode({ 1: 2, 3: -7, '-1': 1, '-2': new Uint8Array(Buffer.from(this.jwk.x, 'base64url')), '-3': new Uint8Array(Buffer.from(this.jwk.y, 'base64url')) });
    const len = new Uint8Array([this.credId.length >> 8, this.credId.length & 255]);
    const authData = cat(await sha(new TextEncoder().encode(rpId)), new Uint8Array([0x45]), new Uint8Array(4), new Uint8Array(16), len, this.credId, cose);
    const clientDataJSON = new TextEncoder().encode(JSON.stringify({ type: 'webauthn.create', challenge, origin, crossOrigin: false }));
    return { id: this.id, type: 'public-key', response: { clientDataJSON: b64uEncode(clientDataJSON), attestationObject: b64uEncode(cborEncode({ fmt: 'none', attStmt: {}, authData })) } };
  }
  async get({ challenge, rpId, origin, flags = 0x05, mutate }) {
    this.counter++;
    const c = new Uint8Array(4); new DataView(c.buffer).setUint32(0, this.counter);
    const authenticatorData = cat(await sha(new TextEncoder().encode(rpId)), new Uint8Array([flags]), c);
    const clientData = new TextEncoder().encode(JSON.stringify({ type: 'webauthn.get', challenge, origin, crossOrigin: false }));
    const raw = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, this.keys.privateKey, cat(authenticatorData, await sha(clientData))));
    const out = { id: this.id, type: 'public-key', response: { clientDataJSON: b64uEncode(clientData), authenticatorData: b64uEncode(authenticatorData), signature: b64uEncode(derOf(raw)), userHandle: this.userHandle || null } };
    if (mutate) mutate(out);
    return out;
  }
}
