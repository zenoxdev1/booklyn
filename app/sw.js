/* Booklyn service worker: lets the app open without a connection.
   App files: network first, so a new version always wins when online; cached copy when offline.
   Big libraries and icons: cache first. The API is never cached. */
const VERSION = 'booklyn-v25';
const SHARE = 'booklyn-share'; /* files shared from Android; must survive version changes */
const SHELL = ['./', 'index.html', 'app.js', 'js/storage.js', 'js/imports.js', 'js/quiz-core.js', 'js/final.js', 'js/voyage.js', 'js/lot.js', 'js/traffic.js', 'js/backup.js', 'js/search.js', 'js/today.js', 'js/questions.js', 'js/snotes.js', 'js/versions.js', 'js/objectives.js', 'js/i18n.js', 'js/i18n-dict.js', 'styles.css', 'manifest.webmanifest', 'fonts/fonts.css', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== SHARE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

/* Share target: Android "Share > Booklyn" sends a multipart POST here. Keep the files in the cache, then open the Port. */
async function receiveShare(req) {
  try {
    const form = await req.formData();
    const files = form.getAll('files').filter((f) => f && typeof f === 'object' && f.size > 0).slice(0, 50);
    const cache = await caches.open(SHARE);
    const stamp = Date.now();
    await Promise.all(files.map((f, i) => cache.put('shared/' + stamp + '-' + i, new Response(f, {
      headers: { 'Content-Type': f.type || 'application/octet-stream', 'X-Name': encodeURIComponent(f.name || 'shared'), 'X-Mtime': String(f.lastModified || stamp) }
    }))));
  } catch (e) { /* nothing stored: the app simply opens */ }
  return Response.redirect(self.registration.scope + '?shared=1#/port', 303);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method === 'POST' && new URL(req.url).pathname === new URL('share-target', self.registration.scope).pathname) {
    event.respondWith(receiveShare(req));
    return;
  }
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  const heavy = url.pathname.includes('/vendor/') || /\.(png|svg|woff2)$/.test(url.pathname);
  if (heavy) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }
  event.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
