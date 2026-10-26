# Booklyn

Keep your lights on. A study app: your degree is a city, a semester is a district, a module is a building, a teaching unit is a floor. A light goes on when you have reviewed a unit.

Unofficial student project, not affiliated with HSLU. Files and progress stay on the device (IndexedDB and localStorage). Nothing is tracked.

## Files

- `index.html`, `styles.css`, `app.js`: the app (no build step, no dependencies)
- `manifest.webmanifest`, `icon.svg`: for installing it on a phone
- `robots.txt` and a `noindex` meta tag: keep it out of search results while testing

## Run it locally

    python -m http.server 8000

Then open http://localhost:8000. Opening index.html directly from disk may block file storage in some browsers.

## Deploy to Cloudflare Pages (pages.dev)

Option 1, dashboard: Workers & Pages > Create > Pages > Upload assets, then drop this folder.

Option 2, command line (log in yourself with `wrangler login` first):

    npx wrangler pages deploy . --project-name booklyn

The address will be https://booklyn.pages.dev if the name is free, otherwise Cloudflare tells you to pick another.

## Before the public launch

- Check the name again (pages.dev address, domain, app stores, Swissreg).
- Remove `noindex` and `robots.txt` when you want search engines to find it.
- Saved-data schema is 1. Add a function to `MIGRATIONS` in `app.js` for every schema change.
