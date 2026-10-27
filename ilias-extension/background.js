const ILIAS = 'https://elearning.hslu.ch/ilias/';
const DASHBOARD = ILIAS + 'ilias.php?baseClass=ildashboardgui&cmd=show';
const BOOKLYN_ORIGINS = new Set([
  'https://booklyn.pages.dev', 'https://booklyn.ch', 'https://www.booklyn.ch',
  'http://localhost:8000', 'http://127.0.0.1:8000'
]);

async function iliasTab() {
  const tabs = await chrome.tabs.query({ url: 'https://elearning.hslu.ch/ilias/*' });
  return tabs.find(tab => !/login\.php/i.test(tab.url || '')) || tabs[0];
}

async function relay(request) {
  let tab = await iliasTab();
  if (!tab) {
    await chrome.tabs.create({ url: DASHBOARD, active: true });
    return { ok: false, code: 'opened', message: 'ILIAS opened. Sign in there, then return to Booklyn and scan again.' };
  }
  if (/login\.php/i.test(tab.url || '')) {
    await chrome.tabs.update(tab.id, { active: true });
    return { ok: false, code: 'login', message: 'Sign in to ILIAS, then return to Booklyn and scan again.' };
  }
  // A long scan must not let the service worker go to sleep.
  const keepAlive = setInterval(() => { try { chrome.runtime.getPlatformInfo(() => {}); } catch (_) {} }, 20000);
  try {
    return await chrome.tabs.sendMessage(tab.id, request);
  } catch (error) {
    await chrome.tabs.update(tab.id, { active: true });
    return { ok: false, code: 'reload', message: 'Reload the ILIAS tab after installing the connector, then scan again.' };
  } finally {
    clearInterval(keepAlive);
  }
}

chrome.runtime.onMessage.addListener((request, sender, respond) => {
  let origin;
  try { origin = new URL(sender.url || '').origin; } catch (_) { return; }
  if (!BOOKLYN_ORIGINS.has(origin) || !['fetch', 'download'].includes(request?.action)) return;
  relay(request).then(respond).catch(error => respond({ ok: false, code: 'error', message: error.message }));
  return true;
});
