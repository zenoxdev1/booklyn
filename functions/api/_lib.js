// Shared helpers for the Booklyn account API (Cloudflare Pages Functions + D1).
export const SESSION_DAYS = 30;
export const TOKEN_MINUTES = 15;
export const MAX_STATE_BYTES = 512 * 1024;

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
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

export function sessionCookie(value, maxAgeSeconds) {
  return `bk_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

// State-changing requests must come from our own pages (CSRF guard on top of SameSite=Lax).
export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

export async function currentUser(env, request) {
  const raw = cookieValue(request, 'bk_session');
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
