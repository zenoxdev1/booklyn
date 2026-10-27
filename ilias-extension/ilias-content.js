(() => {
  const ORIGIN = 'https://elearning.hslu.ch';
  const DASHBOARD = ORIGIN + '/ilias/ilias.php?baseClass=ildashboardgui&cmd=show';
  const MAX_PAGES = 260;        // whole scan
  const MAX_COURSES = 14;       // courses / groups followed
  const PER_COURSE_PAGES = 20;  // each course gets its own budget, so one big course cannot starve the others
  const MAX_DEPTH = 3;
  const CONCURRENCY = 6;
  const TIME_BUDGET_MS = 100000;
  const SEEDS = [
    ORIGIN + '/ilias/ilias.php?baseClass=ildashboardgui&cmd=show',
    ORIGIN + '/ilias/ilias.php?baseClass=ilmembershipoverviewgui',
    ORIGIN + '/ilias/ilias.php?baseClass=ildashboardgui&cmd=jumpToMemberships'
  ];
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

  // Returns {type, id} for a course / folder / group / category link, 'news' for news pages, or null.
  function containerOf(url) {
    const target = url.searchParams.get('target') || '';
    const cls = (url.searchParams.get('cmdClass') || '').toLowerCase();
    const base = (url.searchParams.get('baseClass') || '').toLowerCase();
    const cmd = (url.searchParams.get('cmd') || '').toLowerCase();
    const ref = url.searchParams.get('ref_id') || '';
    let m = /^(crs|fold|grp|cat)_(\d+)/i.exec(target) || /\/go\/(crs|fold|grp|cat)\/(\d+)/i.exec(url.pathname);
    if (m) return { type: m[1].toLowerCase(), id: m[2] };
    m = /^ilobj(course|folder|group|category)gui$/.exec(cls);
    if (m && ref) return { type: { course: 'crs', folder: 'fold', group: 'grp', category: 'cat' }[m[1]], id: ref };
    if (base === 'ilrepositorygui' && ref && /^(|view|render|frameset|showsummary)$/.test(cmd)) return { type: 'ref', id: ref };
    if (/notification|news/.test(cls + ' ' + base) || cmd === 'shownews') return { type: 'news', id: '' };
    return null;
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

  const CHROME_RX = 'nav, header, footer, [role="navigation"], .breadcrumb_wrapper, .il-breadcrumbs, .il-maincontrols, #il_mainmenu, .il-layout-page-header, .ilMainMenu';

  function collect(doc, pageUrl, files, found, ctx, courseName) {
    for (const anchor of doc.querySelectorAll('a[href]')) {
      if (anchor.closest(CHROME_RX)) continue; // menus and breadcrumbs point outside the course
      const url = safeUrl(anchor.getAttribute('href'), pageUrl);
      if (!url) continue;
      const name = (anchor.getAttribute('title') || anchor.getAttribute('aria-label') || anchor.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180);
      if (isFile(url, name)) {
        if (!name || /^(download|herunterladen|open|öffnen)$/i.test(name)) continue;
        const key = fileKey(url, name);
        if (!files.has(key)) {
          const ext = extOf(name) || hintFor(anchor);
          files.set(key, { key, name, url: url.href, openUrl: url.href, context: ctx, course: courseName, ext, kind: kindOf(ext) });
        }
      } else {
        const info = containerOf(url);
        if (info) found.push({ href: url.href, name, info });
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

  function titleOf(doc) { return (doc.querySelector('h1')?.textContent || doc.title || '').replace(/\s+/g, ' ').trim().slice(0, 120); }

  async function scan() {
    const files = new Map();
    const visited = new Set();
    const courses = [];
    const byKey = new Map();
    const started = Date.now();
    let pages = 0, login = false, timeUp = false;

    function addCourse(found) {
      const { info, href, name } = found;
      if (info.type === 'news') {
        if (byKey.has('news')) return;
        byKey.set('news', true);
        courses.push({ key: 'news', name: 'ILIAS news', queue: [{ url: href, depth: MAX_DEPTH }], taken: 0, limit: 3, pages: 0, news: true });
        return;
      }
      if (info.type === 'cat') return; // a category is only a shelf of courses; its courses come from the dashboard
      const key = info.type + '_' + info.id;
      const alt = 'ref_' + info.id;
      if (byKey.has(key) || byKey.has(alt) || courses.length >= MAX_COURSES) return;
      byKey.set(key, true); byKey.set(alt, true);
      courses.push({ key, name: name || key, queue: [{ url: href, depth: 0 }], taken: 0, limit: PER_COURSE_PAGES, pages: 0 });
    }

    // Phase 1: the places that list your courses (dashboard, "My courses and groups", the page you are on).
    async function readSeeds(list) {
      const results = await Promise.all(list.map(async href => {
        const url = safeUrl(href, ORIGIN);
        if (!url || visited.has(url.href)) return {};
        visited.add(url.href);
        if (url.href === location.href) return { url, doc: document };
        return { url, ...(await fetchPage(url.href)) };
      }));
      for (const { url, doc, login: needsLogin } of results) {
        if (needsLogin) { login = true; continue; }
        if (!doc) continue;
        pages++;
        const found = [];
        collect(doc, url.href, files, found, titleOf(doc) || 'ILIAS', '');
        found.forEach(addCourse);
      }
    }
    await readSeeds(SEEDS);
    // Fallback: if the dashboard lists nothing, start from the page you are on.
    if (!courses.some(c => !c.news) && !SEEDS.includes(location.href)) await readSeeds([location.href]);

    // Phase 2: crawl every course in turns, each with its own page budget.
    let cursor = 0;
    while (pages < MAX_PAGES) {
      if (Date.now() - started > TIME_BUDGET_MS) { timeUp = true; break; }
      const batch = [];
      let idle = 0;
      while (batch.length < CONCURRENCY && idle < courses.length && pages + batch.length < MAX_PAGES) {
        const course = courses[cursor++ % courses.length];
        const next = course.queue.length && course.taken < course.limit ? course.queue.shift() : null;
        if (!next) { idle++; continue; }
        idle = 0;
        const url = safeUrl(next.url, ORIGIN);
        if (!url || visited.has(url.href)) continue;
        visited.add(url.href);
        course.taken++;
        batch.push({ course, next, url });
      }
      if (!batch.length) break;
      const results = await Promise.all(batch.map(async item => ({ ...item, ...(await fetchPage(item.url.href)) })));
      for (const { course, next, url, doc, login: needsLogin } of results) {
        if (needsLogin) { login = true; continue; }
        if (!doc) continue;
        pages++; course.pages++;
        const title = titleOf(doc);
        if (course.pages === 1 && title && !course.news) course.name = title;
        const ctx = (course.name + (title && title !== course.name ? ' › ' + title : '')).slice(0, 160);
        const found = [];
        collect(doc, url.href, files, found, ctx, course.name);
        if (next.depth < MAX_DEPTH) {
          found.filter(f => f.info.type !== 'news' && !(f.info.type === 'crs' && 'crs_' + f.info.id !== course.key && 'ref_' + f.info.id !== course.key))
            .slice(0, 20).forEach(f => course.queue.push({ url: f.href, depth: next.depth + 1 }));
        }
      }
    }

    if (login && !pages) return { ok: false, code: 'login', message: 'Sign in to ILIAS, then scan again.' };
    const all = [...files.values()];
    const keep = all.filter(file => file.kind !== 'skip').slice(0, 500);
    const skipped = all.filter(file => file.kind === 'skip').slice(0, 300).map(({ key, name, ext, openUrl, context }) => ({ key, name, ext, openUrl, context }));
    const summary = courses.filter(c => !c.news).map(c => ({
      name: c.name, pages: c.pages,
      files: all.filter(f => f.course === c.name && f.kind !== 'skip').length,
      skipped: all.filter(f => f.course === c.name && f.kind === 'skip').length,
      more: c.queue.length > 0 && c.taken >= c.limit
    }));
    return { ok: true, files: keep, skipped, pages, courses: summary, limited: timeUp || pages >= MAX_PAGES || summary.some(c => c.more) };
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
