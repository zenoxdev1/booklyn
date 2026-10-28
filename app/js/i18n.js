/* Booklyn language support. English is the source text; the other languages are looked up by it.
   _t(text)               translate one piece of text (falls back to English)
   _pl(n, one, many)      pick the singular or plural form, then translate
   _tf(text, {x: 1})      translate text with {x} placeholders and fill them in
   LOC()                  date locale for the current language */
import { DICT } from './i18n-dict.js';

export const LANGS = [['en', 'English', 'en-GB'], ['de', 'Deutsch', 'de-CH'], ['es', 'Español', 'es-ES'], ['fr', 'Français', 'fr-FR']];
var KEY = 'booklyn:lang';
var lang = 'en';

function known(l) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0] === l) return true; return false; }
function detect() {
  try { var s = localStorage.getItem(KEY); if (s && known(s)) return s; } catch (e) {}
  try {
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
    for (var i = 0; i < list.length; i++) { var c = String(list[i]).slice(0, 2).toLowerCase(); if (known(c)) return c; }
  } catch (e) {}
  return 'en';
}
function apply() { try { document.documentElement.lang = lang; } catch (e) {} }
lang = detect(); apply();

export function getLang() { return lang; }
export function setLang(l) {
  if (!known(l)) return;
  lang = l; apply();
  try { localStorage.setItem(KEY, l); } catch (e) {}
}
export function LOC() { for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0] === lang) return LANGS[i][2]; return 'en-GB'; }
export function _t(s) {
  if (lang === 'en') return s;
  var d = DICT[lang], v = d && d[s];
  return v === undefined ? s : v;
}
export function _pl(n, one, many) { return _t(n === 1 ? one : many); }
export function _tf(s, vars) {
  var r = _t(s);
  return r.replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] !== undefined ? vars[k] : m; });
}
