import { json, sha256, randomToken, sameOrigin, validEmail, isLocal, TOKEN_MINUTES } from '../_lib.js';

// POST /api/auth/request  { email }  ->  sends a one-time sign-in link.
// Always answers { ok: true } so the response never reveals whether an address is known.
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'origin' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'json' }, 400); }
  const email = String(body && body.email || '').trim().toLowerCase();
  if (!validEmail(email)) return json({ ok: false, error: 'email' }, 400);

  const ip = (await sha256('ip:' + (request.headers.get('CF-Connecting-IP') || 'local'))).slice(0, 32);
  const since = Date.now() - 3600 * 1000;
  const perEmail = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_tokens WHERE email = ? AND created_at > ?').bind(email, since).first();
  const perIp = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_tokens WHERE ip = ? AND created_at > ?').bind(ip, since).first();
  if (perEmail.n >= 5 || perIp.n >= 15) return json({ ok: true });

  const raw = randomToken(32);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO login_tokens (hash, email, ip, created_at, expires_at, used) VALUES (?, ?, ?, ?, ?, 0)')
    .bind(await sha256(raw), email, ip, now, now + TOKEN_MINUTES * 60 * 1000).run();
  await env.DB.prepare('DELETE FROM login_tokens WHERE expires_at < ?').bind(now - 24 * 3600 * 1000).run();

  const origin = env.SITE_URL || new URL(request.url).origin;
  const link = `${origin}/app/?token=${raw}`;

  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [email],
        subject: 'Your Booklyn sign-in link',
        text: `Open this link to sign in to Booklyn. It works once and expires in ${TOKEN_MINUTES} minutes.\n\n${link}\n\nIf you did not ask for it, ignore this email.`,
      }),
    });
    if (!res.ok) return json({ ok: false, error: 'mail' }, 502);
    return json({ ok: true });
  }
  // Local testing only: no mail service configured, so hand the link back on localhost.
  if (isLocal(request)) return json({ ok: true, devLink: link });
  return json({ ok: false, error: 'mail-not-configured' }, 503);
}
