// Local test server: serves the site and runs the real Cloudflare Pages Functions (functions/api) on an in-memory database.
// Usage: node tests/support/api-server.mjs [port]   (prints "READY <port>")
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { makeDB } from './d1shim.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const env = { DB: makeDB(), ADMIN_UIDS: process.env.ADMIN_UIDS || '' };

async function api(req, res, url) {
  let p = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
  const tryFiles = [p + '.js', p + '/index.js'];
  let mod = null;
  for (const f of tryFiles) {
    try { mod = await import(pathToFileURL(path.join(ROOT, 'functions', 'api', f)).href); break; } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
  }
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const fn = mod && mod['onRequest' + req.method[0] + req.method.slice(1).toLowerCase()];
  if (!fn) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{"ok":false}'); }
  const origin = `http://${req.headers.host}`;
  const request = new Request(origin + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
  const r = await fn({ request, env });
  const headers = {}; r.headers.forEach((v, k) => { headers[k] = v; });
  const sc = r.headers.get('Set-Cookie'); if (sc) headers['set-cookie'] = sc;
  res.writeHead(r.status, headers); res.end(Buffer.from(await r.arrayBuffer()));
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let f = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try { if ((await stat(f)).isDirectory()) f = path.join(f, 'index.html'); } catch {}
    const data = await readFile(f);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(data);
  } catch (e) {
    if (e.code === 'ENOENT') { res.writeHead(404); return res.end('not found'); }
    console.error(e); res.writeHead(500); res.end('error');
  }
}).listen(+process.argv[2] || 0, '127.0.0.1', function () { console.log('READY ' + this.address().port); });
