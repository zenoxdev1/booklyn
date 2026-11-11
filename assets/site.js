/* Mobile menu for the landing and legal pages. */
document.documentElement.classList.add('js');
document.addEventListener('DOMContentLoaded', function () {
  var dd = document.getElementById('langdd');
  if (dd) {
    document.addEventListener('click', function (e) { if (dd.open && !dd.contains(e.target)) dd.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dd.open) { dd.open = false; dd.querySelector('summary').focus(); } });
  }
  var btn = document.getElementById('menu-btn'), nav = document.getElementById('site-nav');
  if (!btn || !nav) return;
  function set(open) { if (open && dd) dd.open = false; btn.setAttribute('aria-expanded', open ? 'true' : 'false'); nav.classList.toggle('open', open); }
  btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { set(false); btn.focus(); } });
  document.addEventListener('click', function (e) { if (!e.target.closest('.top')) set(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) set(false); });
});
