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

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

export function buildAll(template = readFileSync(join(root, 'site/landing.template.html'), 'utf8')) {
  const out = {};
  for (const L of LANGS) {
    const dict = Object.fromEntries(ROWS.map((r) => [r[0], r[L.idx]]));
    const hreflang = LANGS.map((o) => `<link rel="alternate" hreflang="${o.code}" href="${ORIGIN}${o.path}">`).join('\n')
      + `\n<link rel="alternate" hreflang="x-default" href="${ORIGIN}/">`;
    const switcher = LANGS.map((o) => (o.code === L.code
      ? `<a href="${o.path}" lang="${o.code}" hreflang="${o.code}" aria-current="true">${o.name}</a>`
      : `<a href="${o.path}" lang="${o.code}" hreflang="${o.code}">${o.name}</a>`)).join('');
    const extra = {
      lang: L.code, canon: ORIGIN + L.path, hreflang, ogLocale: L.og, switcher,
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
