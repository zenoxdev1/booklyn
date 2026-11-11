// Builds the four static landing pages from site/landing.template.html + site/landing.strings.mjs.
//   node tools/build-landing.mjs          write index.html, de/index.html, es/index.html, fr/index.html
//   node tools/build-landing.mjs --check  fail if the files on disk differ from what would be built
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROWS } from '../site/landing.strings.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ORIGIN = 'https://booklyn.pages.dev';
export const LANGS = [
  { code: 'en', idx: 1, name: 'English', path: '/', og: 'en_US' },
  { code: 'de', idx: 2, name: 'Deutsch', path: '/de/', og: 'de_CH' },
  { code: 'es', idx: 3, name: 'Español', path: '/es/', og: 'es_ES' },
  { code: 'fr', idx: 4, name: 'Français', path: '/fr/', og: 'fr_CH' },
];

const SVG = (inner) => `<svg viewBox="0 0 60 40" aria-hidden="true" focusable="false">${inner}</svg>`;
// Flags are inline SVG: Windows does not draw flag emoji.
export const FLAGS = {
  en: SVG('<rect width="60" height="40" fill="#012169"/><path d="M0 0L60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" stroke-width="3"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="13"/><path d="M30 0v40M0 20h60" stroke="#C8102E" stroke-width="7"/>'),
  de: SVG('<rect width="60" height="40" fill="#DD0000"/><rect width="60" height="13.4" fill="#000"/><rect y="26.6" width="60" height="13.4" fill="#FFCE00"/>'),
  es: SVG('<rect width="60" height="40" fill="#AA151B"/><rect y="10" width="60" height="20" fill="#F1BF00"/>'),
  fr: SVG('<rect width="60" height="40" fill="#fff"/><rect width="20" height="40" fill="#0055A4"/><rect x="40" width="20" height="40" fill="#EF4135"/>'),
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

export function buildAll(template = readFileSync(join(root, 'site/landing.template.html'), 'utf8')) {
  const out = {};
  for (const L of LANGS) {
    const dict = Object.fromEntries(ROWS.map((r) => [r[0], r[L.idx]]));
    const hreflang = LANGS.map((o) => `<link rel="alternate" hreflang="${o.code}" href="${ORIGIN}${o.path}">`).join('\n')
      + `\n<link rel="alternate" hreflang="x-default" href="${ORIGIN}/">`;
    const switcher = LANGS.map((o) => (o.code === L.code
      ? `<a href="${o.path}" lang="${o.code}" hreflang="${o.code}" aria-current="true">${FLAGS[o.code]}<span>${o.name}</span></a>`
      : `<a href="${o.path}" lang="${o.code}" hreflang="${o.code}">${FLAGS[o.code]}<span>${o.name}</span></a>`)).join('');
    const extra = {
      lang: L.code, langname: L.name, langcur: `${FLAGS[L.code]}<span class="lcode">${L.code.toUpperCase()}</span>`, canon: ORIGIN + L.path, hreflang, ogLocale: L.og, switcher,
      home: L.path, app: L.code === 'en' ? '/app/' : `/app/?lang=${L.code}`,
    };
    let html = template.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (m, k) => {
      if (k in extra && !(k in dict)) return extra[k];
      if (k in dict) return /^(meta|og)\./.test(k) ? esc(dict[k]) : dict[k];
      throw new Error(`landing: unknown placeholder {{${k}}}`);
    });
    // attributes that carry text must not hold raw quotes: strings are checked in the unit test
    out[L.path === '/' ? 'index.html' : `${L.code}/index.html`] = html;
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const built = buildAll();
  const check = process.argv.includes('--check');
  let bad = 0;
  for (const [file, html] of Object.entries(built)) {
    const p = join(root, file);
    if (check) {
      if (!existsSync(p) || readFileSync(p, 'utf8') !== html) { console.error('out of date: ' + file); bad++; }
    } else {
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, html);
      console.log('wrote ' + file);
    }
  }
  if (bad) process.exit(1);
}
