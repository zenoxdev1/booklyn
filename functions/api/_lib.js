// Shared helpers for the Booklyn account API (Cloudflare Pages Functions + D1).
export const SESSION_DAYS = 30;
export const TOKEN_MINUTES = 15;
export const MAX_STATE_BYTES = 512 * 1024;

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 32) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  let s = '';
  a.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function cookieValue(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

export function readSession(request) {
  return cookieValue(request, '__Host-bk_session') || cookieValue(request, 'bk_session');
}

export function sessionCookie(value, maxAgeSeconds) {
  // The __Host- prefix makes browsers refuse the cookie unless it is Secure, set for the whole site and has no Domain.
  return `__Host-bk_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

// State-changing requests must come from our own pages (CSRF guard on top of SameSite=Lax).
export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

export async function currentUser(env, request) {
  const raw = readSession(request);
  if (!raw) return null;
  const hash = await sha256(raw);
  const row = await env.DB.prepare(
    'SELECT u.id AS id, u.email AS email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.hash = ? AND s.expires_at > ?'
  ).bind(hash, Date.now()).first();
  return row || null;
}

export function validEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function isLocal(request) {
  const h = new URL(request.url).hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

// Sync codes: 20 characters from an alphabet without look-alike letters (about 99 bits).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newSyncCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let c = '';
  bytes.forEach((b) => (c += CODE_ALPHABET[b % CODE_ALPHABET.length]));
  return c;
}
export function normalizeCode(input) {
  const c = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 20 && [...c].every((ch) => CODE_ALPHABET.includes(ch)) ? c : '';
}
export function formatCode(c) {
  return c.match(/.{5}/g).join('-');
}
// Counts attempts per IP in login_tokens (rows are marked used so they can never sign anyone in).
export async function tooManyAttempts(env, request, kind, limit) {
  // Only a one-way hash of the address is kept, and only for an hour or so.
  const ip = (await sha256('ip:' + (request.headers.get('CF-Connecting-IP') || 'local'))).slice(0, 32);
  const now = Date.now();
  await env.DB.prepare('DELETE FROM login_tokens WHERE created_at < ?').bind(now - 24 * 3600 * 1000).run();
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_tokens WHERE email = ? AND ip = ? AND created_at > ?').bind(kind, ip, now - 3600 * 1000).first();
  if (row.n >= limit) return true;
  await env.DB.prepare('INSERT INTO login_tokens (hash, email, ip, created_at, expires_at, used) VALUES (?, ?, ?, ?, ?, 1)')
    .bind(randomToken(16), kind, ip, now, now).run();
  return false;
}
