(() => {
  // Thin connector: this script only fetches ILIAS pages and files for Booklyn, using your own ILIAS sign-in.
  // The logic that decides what to look at lives in Booklyn itself, so it updates without reinstalling the extension.
  const ORIGIN = 'https://elearning.hslu.ch';
  const DASHBOARD = ORIGIN + '/ilias/ilias.php?baseClass=ildashboardgui&cmd=show';
  const MAX_FILE_BYTES = 12 * 1024 * 1024;
  const MAX_PAGE_CHARS = 1500000;
  const UNREADABLE = /^(mp4|m4v|mov|mkv|avi|webm|wmv|flv|mpe?g|mp3|m4a|aac|wav|ogg|oga|flac|wma|png|jpe?g|gif|bmp|svg|webp|tiff?|zip|rar|7z|tar|gz|tgz|doc|ppt|pps|xls|xlsx|xlsm|ods|odp|odt|exe|dmg|iso|jar|pkt)$/i;
  // Links that change things in ILIAS are never fetched.
  const FORBIDDEN = /logout|cmd=(confirm)?(delete|cut|paste|copy|undelete|perform|save|update|create|post)|cmd=send(?!file)/i;

  function extOf(name) {
    const match = /\.([a-z0-9]{2,5})$/i.exec(String(name || '').trim());
    return match ? match[1].toLowerCase() : '';
  }
  function kindOf(ext) { return UNREADABLE.test(ext) ? 'skip' : ''; }

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

  async function fetchHtml(href) {
    const url = safeUrl(href, DASHBOARD);
    if (!url || FORBIDDEN.test(url.pathname + url.search)) return { ok: false, message: 'Not an ILIAS page.' };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const response = await fetch(url.href, { credentials: 'include', signal: ctl.signal });
      if (/\/login\.php/i.test(response.url)) return { ok: false, login: true, message: 'Sign in to ILIAS first.' };
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.includes('text/html')) { try { response.body && response.body.cancel(); } catch (_) {} return { ok: false, status: response.status, message: 'Not a page.' }; }
      const html = (await response.text()).slice(0, MAX_PAGE_CHARS);
      return { ok: true, url: response.url, html };
    } catch (error) {
      return { ok: false, message: error.name === 'AbortError' ? 'Timed out.' : 'Could not load the page.' };
    } finally {
      clearTimeout(timer);
    }
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
    if (request?.action === 'fetch') {
      fetchHtml(request.url).then(respond).catch(error => respond({ ok: false, message: error.message }));
      return true;
    }
    if (request?.action === 'download') {
      download(request.url, request.name).then(respond).catch(error => respond({ ok: false, message: error.message }));
      return true;
    }
  });
})();
