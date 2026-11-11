import { json, currentUser } from '../_lib.js';

// GET /api/rtc/ice -> { ok, iceServers }
// Free public STUN lets two devices on different networks find each other. If you create a Cloudflare TURN key
// (Cloudflare dashboard > Realtime > TURN) and set TURN_KEY_ID and TURN_API_TOKEN in Pages settings, a relay is added
// for networks where a direct connection is impossible. The relay only passes encrypted packets.
export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);
  if (!user) return json({ ok: false }, 401);
  const servers = [{ urls: ['stun:stun.cloudflare.com:3478'] }];
  if (env.TURN_KEY_ID && env.TURN_API_TOKEN) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 3000);
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.TURN_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: 3600 }),
        signal: ctl.signal,
      });
      clearTimeout(t);
      if (r.ok) {
        const j = await r.json();
        const list = Array.isArray(j.iceServers) ? j.iceServers : j.iceServers ? [j.iceServers] : [];
        for (const s of list) if (s && s.urls && s.username && s.credential) servers.push({ urls: s.urls, username: s.username, credential: s.credential });
      }
    } catch { /* STUN alone still works on most home networks */ }
  }
  return json({ ok: true, iceServers: servers });
}
