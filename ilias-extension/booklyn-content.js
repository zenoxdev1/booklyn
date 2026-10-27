(() => {
  const ORIGIN = location.origin;
  window.postMessage({ source: 'booklyn-ilias-extension', type: 'ready', version: chrome.runtime.getManifest().version }, ORIGIN);
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== ORIGIN) return;
    const data = event.data;
    if (data?.source !== 'booklyn-app' || !['fetch', 'download', 'ping'].includes(data.type)) return;
    if (data.type === 'ping') {
      window.postMessage({ source: 'booklyn-ilias-extension', type: 'ready', version: chrome.runtime.getManifest().version }, ORIGIN);
      return;
    }
    chrome.runtime.sendMessage({ action: data.type, url: data.url, name: data.name }, response => {
      const error = chrome.runtime.lastError;
      window.postMessage({
        source: 'booklyn-ilias-extension', type: data.type,
        requestId: data.requestId,
        response: error ? { ok: false, message: error.message } : response
      }, ORIGIN);
    });
  });
})();
