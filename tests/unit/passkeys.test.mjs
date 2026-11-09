import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDB } from '../support/d1shim.mjs';
import { Authenticator } from '../support/authenticator.mjs';
import * as W from '../../functions/api/_webauthn.mjs';
import { onRequestPost as optionsPost } from '../../functions/api/passkey/options.js';
import { onRequestPost as registerPost } from '../../functions/api/passkey/register.js';
import { onRequestPost as loginOptionsPost } from '../../functions/api/passkey/login-options.js';
import { onRequestPost as loginPost } from '../../functions/api/passkey/login.js';
import { onRequestGet as listGet, onRequestDelete as listDelete } from '../../functions/api/passkey/index.js';
import { onRequestGet as meGet } from '../../functions/api/me.js';
import { onRequestDelete as accountDelete } from '../../functions/api/account.js';

const ORIGIN = 'https://booklyn.pages.dev', RPID = 'booklyn.pages.dev';
function req(path, body, cookie, method = 'POST') {
  const h = { 'Content-Type': 'application/json', Origin: ORIGIN };
  if (cookie) h.Cookie = cookie;
  return new Request(ORIGIN + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
}
const cookieOf = (res) => (res.headers.get('Set-Cookie') || '').split(';')[0];
const call = async (fn, env, path, body, cookie, method) => { const r = await fn({ request: req(path, body, cookie, method), env }); return { status: r.status, body: await r.json(), cookie: cookieOf(r) }; };

async function createAccount(env, name) {
  const a = await new Authenticator().init();
  const o = await call(optionsPost, env, '/api/passkey/options', { mode: 'create', name });
  assert.equal(o.status, 200);
  const cred = await a.create({ challenge: o.body.publicKey.challenge, rpId: RPID, origin: ORIGIN, user: o.body.publicKey.user });
  const r = await call(registerPost, env, '/api/passkey/register', { credential: cred, name });
  return { a, o, r };
}

test('CBOR decodes maps, ints, bytes and text', () => {
  const v = W.cborDecode(new Uint8Array([0xa3, 0x01, 0x02, 0x20, 0x41, 0xff, 0x63, 0x61, 0x62, 0x63, 0x18, 0x64])).value;
  assert.equal(v['1'], 2); assert.deepEqual([...v['-1']], [255]); assert.equal(v['abc'], 100);
  assert.throws(() => W.cborDecode(new Uint8Array([0x5f])));
});
test('create an account with a passkey, then sign in with it', async () => {
  const env = { DB: makeDB() };
  const { a, r } = await createAccount(env, 'My laptop');
  assert.equal(r.status, 200); assert.equal(r.body.created, true); assert.equal(r.body.kind, 'passkey'); assert.ok(r.cookie.startsWith('__Host-bk_session='));
  const me = await meGet({ request: req('/api/me', undefined, r.cookie, 'GET'), env });
  assert.equal((await me.json()).kind, 'passkey');
  const lo = await call(loginOptionsPost, env, '/api/passkey/login-options', {});
  const cred = await a.get({ challenge: lo.body.publicKey.challenge, rpId: RPID, origin: ORIGIN });
  const li = await call(loginPost, env, '/api/passkey/login', { credential: cred });
  assert.equal(li.status, 200); assert.equal(li.body.kind, 'passkey'); assert.equal(li.body.uid, r.body.uid); assert.ok(li.cookie);
});
test('a challenge works only once', async () => {
  const env = { DB: makeDB() };
  const { a } = await createAccount(env, 'x');
  const lo = await call(loginOptionsPost, env, '/api/passkey/login-options', {});
  const cred = await a.get({ challenge: lo.body.publicKey.challenge, rpId: RPID, origin: ORIGIN });
  assert.equal((await call(loginPost, env, '/api/passkey/login', { credential: cred })).status, 200);
  const again = await a.get({ challenge: lo.body.publicKey.challenge, rpId: RPID, origin: ORIGIN });
  assert.equal((await call(loginPost, env, '/api/passkey/login', { credential: again })).status, 400);
});
test('sign-in is refused for a wrong origin, wrong site, bad signature, missing presence and a replayed counter', async () => {
  const env = { DB: makeDB() };
  const { a } = await createAccount(env, 'x');
  const tryLogin = async (opts, mutate) => {
    const lo = await call(loginOptionsPost, env, '/api/passkey/login-options', {});
    const cred = await a.get({ challenge: lo.body.publicKey.challenge, rpId: RPID, origin: ORIGIN, ...opts, mutate });
    return (await call(loginPost, env, '/api/passkey/login', { credential: cred })).status;
  };
  assert.equal(await tryLogin({ origin: 'https://evil.example' }), 401);
  assert.equal(await tryLogin({ rpId: 'evil.example' }), 401);
  assert.equal(await tryLogin({ flags: 0x04 }), 401);
  assert.equal(await tryLogin({}, (c) => { const s = W.b64uDecode(c.response.signature); s[s.length - 1] ^= 1; c.response.signature = W.b64uEncode(s); }), 401);
  const before = a.counter; assert.equal(await tryLogin({}), 200);
  // replay: a counter that does not go up is refused
  const lo = await call(loginOptionsPost, env, '/api/passkey/login-options', {});
  a.counter = 0; const stale = await a.get({ challenge: lo.body.publicKey.challenge, rpId: RPID, origin: ORIGIN });
  assert.equal((await call(loginPost, env, '/api/passkey/login', { credential: stale })).status, 401);
  assert.ok(before >= 0);
});
test('an unknown passkey cannot sign in', async () => {
  const env = { DB: makeDB() };
  const stranger = await new Authenticator().init();
  const lo = await call(loginOptionsPost, env, '/api/passkey/login-options', {});
  const cred = await stranger.get({ challenge: lo.body.publicKey.challenge, rpId: RPID, origin: ORIGIN });
  assert.equal((await call(loginPost, env, '/api/passkey/login', { credential: cred })).status, 404);
});
test('registration rejects a wrong origin and a forged id', async () => {
  const env = { DB: makeDB() };
  const a = await new Authenticator().init();
  let o = await call(optionsPost, env, '/api/passkey/options', { mode: 'create' });
  let cred = await a.create({ challenge: o.body.publicKey.challenge, rpId: RPID, origin: 'https://evil.example', user: o.body.publicKey.user });
  assert.equal((await call(registerPost, env, '/api/passkey/register', { credential: cred })).status, 400);
  o = await call(optionsPost, env, '/api/passkey/options', { mode: 'create' });
  cred = await a.create({ challenge: o.body.publicKey.challenge, rpId: RPID, origin: ORIGIN, user: o.body.publicKey.user });
  cred.id = W.b64uEncode(new Uint8Array(32));
  assert.equal((await call(registerPost, env, '/api/passkey/register', { credential: cred })).status, 400);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first()).n, 0);
});
test('add a second passkey to a signed-in account, list it and remove it', async () => {
  const env = { DB: makeDB() };
  const { r } = await createAccount(env, 'Laptop');
  const b = await new Authenticator().init();
  const o = await call(optionsPost, env, '/api/passkey/options', { mode: 'register', name: 'Phone' }, r.cookie);
  assert.equal(o.status, 200); assert.equal(o.body.publicKey.excludeCredentials.length, 1);
  const cred = await b.create({ challenge: o.body.publicKey.challenge, rpId: RPID, origin: ORIGIN, user: o.body.publicKey.user });
  const add = await call(registerPost, env, '/api/passkey/register', { credential: cred, name: 'Phone' }, r.cookie);
  assert.equal(add.status, 200); assert.equal(add.body.created, false);
  const l = await listGet({ request: req('/api/passkey', undefined, r.cookie, 'GET'), env });
  const list = (await l.json()).passkeys; assert.deepEqual(list.map((x) => x.name), ['Laptop', 'Phone']);
  assert.equal((await call(listDelete, env, '/api/passkey', { id: list[1].id }, r.cookie, 'DELETE')).status, 200);
  const last = await call(listDelete, env, '/api/passkey', { id: list[0].id }, r.cookie, 'DELETE');
  assert.equal(last.status, 409); assert.equal(last.body.error, 'last');
});
test('registering needs a signed-in account and the same user', async () => {
  const env = { DB: makeDB() };
  assert.equal((await call(optionsPost, env, '/api/passkey/options', { mode: 'register' })).status, 401);
  const one = await createAccount(env, 'One'), two = await createAccount(env, 'Two');
  const b = await new Authenticator().init();
  const o = await call(optionsPost, env, '/api/passkey/options', { mode: 'register' }, one.r.cookie);
  const cred = await b.create({ challenge: o.body.publicKey.challenge, rpId: RPID, origin: ORIGIN, user: o.body.publicKey.user });
  assert.equal((await call(registerPost, env, '/api/passkey/register', { credential: cred }, two.r.cookie)).status, 401);
});
test('someone else cannot remove my passkey; deleting the account removes its passkeys', async () => {
  const env = { DB: makeDB() };
  const one = await createAccount(env, 'One'), two = await createAccount(env, 'Two');
  const id = one.a.id;
  assert.equal((await call(listDelete, env, '/api/passkey', { id }, two.r.cookie, 'DELETE')).status, 404);
  const del = await accountDelete({ request: req('/api/account', {}, one.r.cookie, 'DELETE'), env });
  assert.equal(del.status, 200);
  assert.equal(await env.DB.prepare('SELECT id FROM passkeys WHERE id = ?').bind(id).first(), null);
});
test('requests from another site are refused', async () => {
  const env = { DB: makeDB() };
  const r = await optionsPost({ request: new Request(ORIGIN + '/api/passkey/options', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' }), env });
  assert.equal(r.status, 403);
});
test('RS256 passkeys (Windows Hello) verify too', async () => {
  const { webcrypto: c } = await import('node:crypto');
  const { cborEncode } = await import('../support/authenticator.mjs');
  const keys = await c.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = await c.subtle.exportKey('jwk', keys.publicKey);
  const raw = (s) => new Uint8Array(Buffer.from(s, 'base64url'));
  const sha = async (d) => new Uint8Array(await c.subtle.digest('SHA-256', d));
  const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; a.forEach((x) => { o.set(x, p); p += x.length; }); return o; };
  const credId = c.getRandomValues(new Uint8Array(32)), id = W.b64uEncode(credId);
  const cose = cborEncode({ 1: 3, 3: -257, '-1': raw(jwk.n), '-2': raw(jwk.e) });
  const authData = cat(await sha(new TextEncoder().encode(RPID)), new Uint8Array([0x45]), new Uint8Array(4), new Uint8Array(16), new Uint8Array([0, 32]), credId, cose);
  const cd = (type, ch) => new TextEncoder().encode(JSON.stringify({ type, challenge: ch, origin: ORIGIN }));
  const reg = await W.verifyRegistration({ credential: { id, response: { clientDataJSON: W.b64uEncode(cd('webauthn.create', 'abc')), attestationObject: W.b64uEncode(cborEncode({ fmt: 'none', attStmt: {}, authData })) } }, expectedChallenge: 'abc', expectedOrigin: ORIGIN, rpId: RPID });
  assert.equal(reg.ok, true); assert.equal(reg.alg, -257);
  const ad = cat(await sha(new TextEncoder().encode(RPID)), new Uint8Array([0x05]), new Uint8Array([0, 0, 0, 1]));
  const client = cd('webauthn.get', 'xyz');
  const sig = new Uint8Array(await c.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, keys.privateKey, cat(ad, await sha(client))));
  const res = await W.verifyAssertion({ credential: { id, response: { clientDataJSON: W.b64uEncode(client), authenticatorData: W.b64uEncode(ad), signature: W.b64uEncode(sig) } }, expectedChallenge: 'xyz', expectedOrigin: ORIGIN, rpId: RPID, stored: { jwk: reg.jwk, alg: reg.alg, counter: 0 } });
  assert.equal(res.ok, true);
});
