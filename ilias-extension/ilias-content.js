(() => {
  const ORIGIN = 'https://elearning.hslu.ch';
  const DASHBOARD = ORIGIN + '/ilias/ilias.php?baseClass=ildashboardgui&cmd=show';
  const MAX_PAGES = 30;
  const CONCURRENCY = 4;
  const TIME_BUDGET_MS = 60000;
  const MAX_FILE_BYTES = 12 * 1024 * 1024;
  // Booklyn can read the text of these. Everything else (video, audio, images, zips, old Office files, spreadsheets) is skipped.
  const READABLE = /^(pdf|docx|pptx|txt|md|csv|tex|html?|py|java|js|json|sql)$/i;
  const UNREADABLE = /^(mp4|m4v|mov|mkv|avi|webm|wmv|flv|mpe?g|mp3|m4a|aac|wav|ogg|oga|flac|wma|png|jpe?g|gif|bmp|svg|webp|tiff?|zip|rar|7z|tar|gz|tgz|doc|ppt|pps|xls|xlsx|xlsm|ods|odp|odt|exe|dmg|iso|jar|pkt)$/i;
  const HINT = /(?<![a-z])(pdf|docx|pptx|doc|ppt|xlsx|xls|zip|rar|mp4|mov|mkv|avi|webm|mp3|m4a|wav|png|jpe?g|gif|txt|csv)(?![a-z])/i;

  function extOf(name) {
    const match = /\.([a-z0-9]{2,5})$/i.exec(String(name || '').trim());
    return match ? match[1].toLowerCase() : '';
  }
  function kindOf(ext) { return READABLE.test(ext) ? 'doc' : UNREADABLE.test(ext) ? 'skip' : 'unknown'; }
  function hintFor(anchor) {
    const box = anchor.closest('.il-item, .il-std-item, .ilContainerListItem, li, tr, [class*="ListItem"]');
    const text = (box && box.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 500) return '';
    const match = HINT.exec(text);
    return match ? match[1].toLowerCase() : '';
  }

  function safeUrl(href, base) {
    try {
      const url = new URL(href, base);
      return url.origin === ORIGIN && url.pathname.startsWith('/ilias/') ? url : null;
    } catch (_) { return null; }
  }

  function isFile(url, name) {
    const target = url.searchParams.get('target') || '';
    const cls = (url.searchParams.get('cmdClass') || '').toLowerCase();
    const cmd = (url.searchParams.get('cmd') || '').toLowerCase();
    return /^file_\d+/i.test(target) || cls === 'ilobjfilegui' || cmd === 'sendfile' ||
      /\.(pdf|docx?|pptx?|xlsx?|zip|txt|csv|png|jpe?g)(?:$|[?#])/i.test(url.href) ||
      /\.(pdf|docx?|pptx?|xlsx?|zip|txt|csv)$/i.test(name);
  }

  function isContainer(url) {
    const target = url.searchParams.get('target') || '';
    const cls = (url.searchParams.get('cmdClass') || '').toLowerCase();
    const base = (url.searchParams.get('baseClass') || '').toLowerCase();
    const cmd = (url.searchParams.get('cmd') || '').toLowerCase();
    return /^(crs|fold|grp|cat)_\d+/i.test(target) ||
      /^ilobj(course|folder|group|category)gui$/.test(cls) ||
      /notification|news/.test(cls + ' ' + base) || cmd === 'shownews' ||
      /\/go\/(crs|fold|grp|cat)\b/i.test(url.pathname);
  }

  function fileKey(url, name) {
    const target = url.searchParams.get('target');
    const ref = url.searchParams.get('ref_id');
    const obj = url.searchParams.get('obj_id');
    if (target && /^file_\d+/i.test(target)) return 'target:' + target.toLowerCase();
    if (ref && (url.searchParams.get('cmd') || '').toLowerCase() === 'sendfile') return 'target:file_' + ref;
    if (ref) return 'ref:' + ref;
    if (obj) return 'obj:' + obj;
    return 'url:' + url.pathname + '?' + [...url.searchParams.entries()]
      .filter(([key]) => !/^(sess|token|auth|phpsessid)/i.test(key))
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => key + '=' + value).join('&') + ':' + name;
  }

  function collect(doc, pageUrl, files, folders) {
    const context = (doc.querySelector('h1')?.textContent || doc.title || 'ILIAS').trim().slice(0, 160);
    for (const anchor of doc.querySelectorAll('a[href]')) {
      const url = safeUrl(anchor.getAttribute('href'), pageUrl);
      if (!url) continue;
      const name = (anchor.getAttribute('title') || anchor.getAttribute('aria-label') || anchor.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180);
      if (isFile(url, name)) {
        if (!name || /^(download|herunterladen|open|öffnen)$/i.test(name)) continue;
        const key = fileKey(url, name);
        if (!files.has(key)) {
          const ext = extOf(name) || hintFor(anchor);
          files.set(key, { key, name, url: url.href, openUrl: url.href, context, ext, kind: kindOf(ext) });
        }
      } else if (isContainer(url)) {
        folders.push(url.href);
      }
    }
    for (const button of doc.querySelectorAll('[data-action]')) {
      const url = safeUrl(button.getAttribute('data-action'), pageUrl);
      if (!url || (url.searchParams.get('cmd') || '').toLowerCase() !== 'sendfile') continue;
      const key = fileKey(url, '');
      const file = files.get(key);
      if (file) file.url = url.href;
    }
  }

  async function fetchPage(href) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const response = await fetch(href, { credentials: 'include', signal: ctl.signal });
      if (/\/login\.php/i.test(response.url)) return { login: true };
      if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) return {};
      return { doc: new DOMParser().parseFromString(await response.text(), 'text/html') };
    } catch (_) {
      return {};
    } finally {
      clearTimeout(timer);
    }
  }

  async function scan() {
    const files = new Map();
    const queue = [{ url: location.href, depth: 0 }, { url: DASHBOARD, depth: 0 }];
    const visited = new Set();
    const started = Date.now();
    let pages = 0, login = false, timeUp = false;
    while (queue.length && pages < MAX_PAGES) {
      if (Date.now() - started > TIME_BUDGET_MS) { timeUp = true; break; }
      const batch = [];
      while (queue.length && batch.length < CONCURRENCY && pages + batch.length < MAX_PAGES) {
        const next = queue.shift();
        const url = safeUrl(next.url, DASHBOARD);
        if (!url || visited.has(url.href)) continue;
        visited.add(url.href);
        batch.push({ next, url });
      }
      const results = await Promise.all(batch.map(async ({ next, url }) => {
        if (url.href === location.href) return { next, url, doc: document };
        return { next, url, ...(await fetchPage(url.href)) };
      }));
      for (const { next, url, doc, login: needsLogin } of results) {
        if (needsLogin || /\/login\.php/i.test(url.pathname)) { login = true; continue; }
        if (!doc) continue;
        pages++;
        const folders = [];
        collect(doc, url.href, files, folders);
        if (next.depth < 2) folders.sort((a, b) => Number(/cmd=showNews/i.test(b)) - Number(/cmd=showNews/i.test(a)))
          .slice(0, 24).forEach(href => queue.push({ url: href, depth: next.depth + 1 }));
      }
    }
    if (login && !pages) return { ok: false, code: 'login', message: 'Sign in to ILIAS, then scan again.' };
    const all = [...files.values()];
    const keep = all.filter(file => file.kind !== 'skip').slice(0, 300);
    const skipped = all.filter(file => file.kind === 'skip').slice(0, 200).map(({ key, name, ext, openUrl, context }) => ({ key, name, ext, openUrl, context }));
    return { ok: true, files: keep, skipped, pages, limited: timeUp || queue.length > 0 };
  }

  function filename(disposition, fallback) {
    const match = /filename\*?=(?:UTF-8''|"?)([^";]+)/i.exec(disposition || '');
    let name = match ? match[1].trim() : fallback;
    try { name = decodeURIComponent(name); } catch (_) {}
    return String(name || 'ILIAS file').replace(/[\\/\x00-\x1f]/g, '_').slice(0, 180);
  }

  function unreadable(response, fallbackName) {
    const name = filename(response.headers.get('content-disposition'), fallbackName);
    const mime = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    const ext = extOf(name);
    let skip = false;
    if (ext) skip = kindOf(ext) === 'skip';
    else skip = /^(video|audio|image)\//.test(mime) || /zip|rar|7z|msword|ms-powerpoint|ms-excel|spreadsheetml/.test(mime);
    return skip ? { ok: false, skipped: true, message: 'Skipped: Booklyn cannot read ' + (ext ? '.' + ext : mime) + ' files.' } : null;
  }

  async function download(href, fallbackName) {
    const url = safeUrl(href, DASHBOARD);
    if (!url || !isFile(url, fallbackName || ''))
      return { ok: false, message: 'This is not an ILIAS file link.' };
    let response = await fetch(url.href, { credentials: 'include' });
    if (!response.ok || /\/login\.php/i.test(response.url))
      return { ok: false, message: 'ILIAS needs a fresh login. Open ILIAS and try again.' };
    let mime = (response.headers.get('content-type') || '').split(';')[0];
    const early = unreadable(response, fallbackName);
    if (early) { try { response.body && response.body.cancel(); } catch (_) {} return early; }
    if (/text\/html/i.test(mime)) {
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const action = [...doc.querySelectorAll('[data-action]')].map(button => safeUrl(button.getAttribute('data-action'), response.url))
        .find(link => link && (link.searchParams.get('cmd') || '').toLowerCase() === 'sendfile');
      if (!action) return { ok: false, message: 'ILIAS returned a page instead of a file. Open the link in ILIAS.' };
      response = await fetch(action.href, { credentials: 'include' });
      mime = (response.headers.get('content-type') || '').split(';')[0];
      if (!response.ok || /text\/html/i.test(mime)) return { ok: false, message: 'ILIAS did not return a downloadable file.' };
      const late = unreadable(response, fallbackName);
      if (late) { try { response.body && response.body.cancel(); } catch (_) {} return late; }
    }
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_FILE_BYTES) return { ok: false, message: 'This file is over 12 MB. Open it in ILIAS and add it manually.' };
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_FILE_BYTES) return { ok: false, message: 'This file is over 12 MB. Open it in ILIAS and add it manually.' };
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { ok: true, name: filename(response.headers.get('content-disposition'), fallbackName), mime, base64: btoa(binary) };
  }

  chrome.runtime.onMessage.addListener((request, _sender, respond) => {
    if (request?.action === 'scan') {
      scan().then(respond).catch(error => respond({ ok: false, message: error.message }));
      return true;
    }
    if (request?.action === 'download') {
      download(request.url, request.name).then(respond).catch(error => respond({ ok: false, message: error.message }));
      return true;
    }
  });
})();
