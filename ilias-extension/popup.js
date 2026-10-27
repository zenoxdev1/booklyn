const SITE = 'https://booklyn.pages.dev';
document.getElementById('ver').textContent = 'Version ' + chrome.runtime.getManifest().version_name;
function open(url) { chrome.tabs.create({ url }); window.close(); }
document.getElementById('open-booklyn').addEventListener('click', () => open(SITE + '/app/#/port'));
document.getElementById('open-ilias').addEventListener('click', () => open('https://elearning.hslu.ch/ilias/ilias.php?baseClass=ildashboardgui&cmd=show'));
document.getElementById('whatsnew').addEventListener('click', (e) => { e.preventDefault(); open(SITE + '/connector/#changelog'); });
document.getElementById('privacy').addEventListener('click', (e) => { e.preventDefault(); open(SITE + '/privacy/'); });
chrome.tabs.query({ url: 'https://elearning.hslu.ch/ilias/*' }).then((tabs) => {
  const el = document.getElementById('status');
  const signedIn = tabs.some((t) => !/login\.php/i.test(t.url || ''));
  if (signedIn) { el.textContent = 'ILIAS is open and signed in. Ready to scan.'; el.className = 'status ok'; }
  else if (tabs.length) { el.textContent = 'ILIAS is open but you are not signed in.'; el.className = 'status warn'; }
  else { el.textContent = 'ILIAS is not open. Open it and sign in first.'; el.className = 'status warn'; }
});
