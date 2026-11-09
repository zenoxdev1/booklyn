import { sha256, randomToken, sessionCookie, SESSION_DAYS } from './_lib.js';
import { b64uDecode, b64uEncode } from './_webauthn.mjs';

export const CHALLENGE_MINUTES = 5;
export const MAX_PASSKEYS = 10;

// The relying party is the address the page is served from (booklyn.pages.dev, or a custom domain later).
// A passkey only works on the address where it was made.
export function rpOf(request) {
  const u = new URL(request.url);
  return { id: u.hostname, origin: u.origin, name: 'Booklyn' };
}

// One-time challenges live in login_tokens (hash of the challenge, kind in the email column, used = 0 until consumed).
export async function newChallenge(env, request, kind) {
  const raw = randomToken(32), now = Date.now();
  const ip = (await sha256('ip:' + (request.headers.get('CF-Connecting-IP') || 'local'))).slice(0, 32);
  await env.DB.prepare('INSERT INTO login_tokens (hash, email, ip, created_at, expires_at, used) VALUES (?, ?, ?, ?, ?, 0)')
    .bind(await sha256('pkc:' + raw), kind, ip, now, now + CHALLENGE_MINUTES * 60 * 1000).run();
  return raw;
}
// Returns the kind the challenge was made for, or null. A challenge works once.
export async function consumeChallenge(env, raw) {
  if (typeof raw !== 'string' || raw.length < 20 || raw.length > 100) return null;
  const hash = await sha256('pkc:' + raw), now = Date.now();
  const row = await env.DB.prepare("SELECT email FROM login_tokens WHERE hash = ? AND used = 0 AND expires_at > ? AND email LIKE 'pk-%'").bind(hash, now).first();
  if (!row) return null;
  const claim = await env.DB.prepare('UPDATE login_tokens SET used = 1 WHERE hash = ? AND used = 0').bind(hash).run();
  if (!claim.meta || claim.meta.changes !== 1) return null;
  return row.email;
}
// The challenge the browser signed is inside clientDataJSON.
export function challengeOf(credential) {
  try {
    const c = JSON.parse(new TextDecoder().decode(b64uDecode(credential.response.clientDataJSON)));
    return typeof c.challenge === 'string' ? c.challenge : '';
  } catch { return ''; }
}
export async function openSession(env, userId) {
  const session = randomToken(32), now = Date.now();
  await env.DB.prepare('INSERT INTO sessions (hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(session), userId, now, now + SESSION_DAYS * 864e5).run();
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run();
  return sessionCookie(session, SESSION_DAYS * 86400);
}
export async function handleFor(env, user) {
  const row = await env.DB.prepare('SELECT user_handle FROM passkeys WHERE user_id = ? LIMIT 1').bind(user.id).first();
  if (row && row.user_handle) return row.user_handle;
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bk-user:' + user.id))).slice(0, 16);
  return b64uEncode(h);
}
export function cleanName(n) {
  return String(n == null ? '' : n).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}
export function isPasskeyUser(user) { return String(user.email || '').startsWith('passkey:'); }
