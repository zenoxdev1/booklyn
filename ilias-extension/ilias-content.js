(() => {
  const ORIGIN = 'https://elearning.hslu.ch';
  const DASHBOARD = ORIGIN + '/ilias/ilias.php?baseClass=ildashboardgui&cmd=show';
  const MAX_PAGES = 18;
  const MAX_FILE_BYTES = 12 * 1024 * 1024;

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
        if (!files.has(key)) files.set(key, { key, name, url: url.href, openUrl: url.href, context });
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

  async function scan() {
    const files = new Map();
    const queue = [{ url: location.href, depth: 0 }, { url: DASHBOARD, depth: 0 }];
    const visited = new Set();
    let pages = 0, login = false;
    while (queue.length && pages < MAX_PAGES) {
      const next = queue.shift();
      const url = safeUrl(next.url, DASHBOARD);
      if (!url || visited.has(url.href)) continue;
      visited.add(url.href);
      let doc;
      if (url.href === location.href) {
        doc = document;
      } else {
        let response;
        try { response = await fetch(url.href, { credentials: 'include' }); }
        catch (_) { continue; }
        if (/\/login\.php/i.test(response.url)) { login = true; continue; }
        if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) continue;
        doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      }
      if (/\/login\.php/i.test(url.pathname)) { login = true; continue; }
      pages++;
      const folders = [];
      collect(doc, url.href, files, folders);
      if (next.depth < 2) folders.sort((a, b) => Number(/cmd=showNews/i.test(b)) - Number(/cmd=showNews/i.test(a)))
        .slice(0, 24).forEach(href => queue.push({ url: href, depth: next.depth + 1 }));
    }
    if (login && !pages) return { ok: false, code: 'login', message: 'Sign in to ILIAS, then scan again.' };
    return { ok: true, files: [...files.values()].slice(0, 120), pages, limited: queue.length > 0 };
  }

  function filename(disposition, fallback) {
    const match = /filename\*?=(?:UTF-8''|"?)([^";]+)/i.exec(disposition || '');
    let name = match ? match[1].trim() : fallback;
    try { name = decodeURIComponent(name); } catch (_) {}
    return String(name || 'ILIAS file').replace(/[\\/\x00-\x1f]/g, '_').slice(0, 180);
  }

  async function download(href, fallbackName) {
    const url = safeUrl(href, DASHBOARD);
    if (!url || !isFile(url, fallbackName || ''))
      return { ok: false, message: 'This is not an ILIAS file link.' };
    let response = await fetch(url.href, { credentials: 'include' });
    if (!response.ok || /\/login\.php/i.test(response.url))
      return { ok: false, message: 'ILIAS needs a fresh login. Open ILIAS and try again.' };
    let mime = (response.headers.get('content-type') || '').split(';')[0];
    if (/text\/html/i.test(mime)) {
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const action = [...doc.querySelectorAll('[data-action]')].map(button => safeUrl(button.getAttribute('data-action'), response.url))
        .find(link => link && (link.searchParams.get('cmd') || '').toLowerCase() === 'sendfile');
      if (!action) return { ok: false, message: 'ILIAS returned a page instead of a file. Open the link in ILIAS.' };
      response = await fetch(action.href, { credentials: 'include' });
      mime = (response.headers.get('content-type') || '').split(';')[0];
      if (!response.ok || /text\/html/i.test(mime)) return { ok: false, message: 'ILIAS did not return a downloadable file.' };
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
