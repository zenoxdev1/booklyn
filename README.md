# Booklyn

Keep your lights on. A study app: your degree is a city, a semester is a district, a module is a building, a teaching unit is a floor. A light goes on when you pass the 5-question check for a unit (4 right, 80 %).

Unofficial student project, not affiliated with HSLU. Files stay on the device (IndexedDB). Progress stays in localStorage unless you turn on optional sync. Nothing is tracked.

## Folder structure

    index.html, privacy/, terms/, imprint/, connector/   public pages (landing, legal, ILIAS connector page)
    app/
      index.html, styles.css, manifest.webmanifest, sw.js   the app shell and its service worker
      app.js            screens, routing, city drawing, sync, wiring (being split up step by step)
      js/storage.js     IndexedDB access: every write resolves only after the browser confirmed it
      js/imports.js     when a file counts as "added" or "imported" (failed writes never count)
      js/quiz-core.js   chunking with headings and pages, definition questions, quality rules, question bank, 5-question and 80 % rules
      js/backup.js      progress backup, full backup, checked restore, merge rules
      vendor/, fonts/, icons
    functions/api/      Cloudflare Pages Functions: sync, sign-in, optional AI questions
      quiz.js           the /api/quiz endpoint (limits, auth)
      _quizlib.mjs      the AI quiz pipeline: analyse, write, check, replace (pure logic, tested in Node)
    db/schema.sql       D1 schema for sync accounts
    ilias-extension/    the browser extension that reads ILIAS (thin bridge)
    tests/unit/         Node tests, no dependencies
    tests/e2e/          browser tests (Playwright for Python)
    docs/               setup notes

The app has no build step. `app.js` is loaded as an ES module (`<script type="module">`) and imports the files in `app/js/`. New files in `app/js/` must also be listed in `SHELL` in `app/sw.js`, and `VERSION` there must be raised when the shell changes.

## Run it locally

    npx serve .

Then open http://localhost:3000/app/ (the port is printed). Opening the files directly from disk does not work: modules and file storage need http.

## Tests

    node --test tests/unit/*.test.mjs                 # fast, no installs
    pip install playwright && playwright install chromium
    python3 tests/e2e/batch1.py                       # starts its own local server
    python3 tests/e2e/batch2.py

What they cover: failed imports and retries without duplicates, import confirmation only after a successful write, complete chunking (no truncated text), cache refresh when files are added or removed, the 5-question and 80 % rule, wrong answers coming back first, full backup and restore (merge and replace), damaged and hostile backups.

## Quiz quality

- Every quiz has 5 questions; 4 right pass (80 %). Fewer than 5 good questions: Booklyn says why and offers the self-check, it never pads or invents.
- **With AI** (optional, needs a sync account and the setting): a few pages at a time (with their heading and page range) go to `/api/quiz`. The server first analyses the material (subject, concepts with exact quotes, relations, objectives; it stops with a reason if the text is unreadable or too thin), then writes candidate questions, then checks each one with fixed rules (4 distinct options, no "all of the above", answer not in the question, no length giveaway, supporting quote must really occur in the material, answer words must be supported) and a second strict AI review. Failed ones are replaced once. Nothing unchecked is returned. The answer shows the explanation, the supporting quote and the source (file and page).
- **Without AI**: only clear definitions found in the files ("X is …", "X ist …") become questions, with the definitions or terms of other concepts as wrong options. Random-word blanks are no longer made.
- Each question can be reported as unclear, wrong or not relevant (kept on the device, nothing is sent).
- Limits: 30 AI requests per user and 250 in total per day (`AI_DAILY_CAP`), each request makes 3 to 5 model calls. The model is `AI_MODEL` (default Llama 3.1 8B on Workers AI).

## ILIAS import

The scan knows which ILIAS course every file comes from. The module is taken from the course: automatically when the course name contains the module code (e.g. `I.BA_CONWB.H2601` and module `CONWB`), otherwise Booklyn asks once and remembers (`iliasCourseMap`). The week comes from the folder or file name; if there is none the file is marked "Check this". Ready files are collapsed in the Port: open the list to review or correct each file's module and week, or import directly.

## Backups

- **Progress backup** (`.json`): one JSON object with semesters, modules, lights, notes, deadlines, coins, city and decorations. No files.
- **Full backup** (`.ndjson`): one JSON object per line: header, progress, question sets, then every imported file (base64) with its module and unit, and an `end` line. Reading goes line by line, so large backups do not need one giant string.
- **Restore** first reads and checks the whole backup (structure, ids, file sizes, SHA-256 checksums, `end` line). Nothing on the device changes until that passes. Then you choose:
  - *Merge*: adds what is missing, keeps what is here; same item on both sides: this device wins; coins and shields take the higher number; a light on in either place stays on.
  - *Replace*: makes the device match the backup. With a full backup, files that are not in it are removed; with a progress backup, files on the device stay.
- Files are written first, in one transaction (all or nothing). Progress and question sets change only after that succeeded.
- **Synced vs device-only:** with sync on, only the progress data is sent to the account. Imported files, practice questions and sign-in settings never leave the device; only the full backup contains the files and questions. Settings shows this table.

## Backend configuration (optional, for sync and AI questions)

Booklyn works without any backend. For sync accounts and AI questions see `docs/accounts-setup.md`: a D1 database bound as `DB` (run `db/schema.sql`), optional Resend variables for email sign-in, and an optional Workers AI binding for `/api/quiz`. Deploy by pushing to `main`; Cloudflare Pages builds `functions/` automatically.

## Deploy to Cloudflare Pages

Connected to the GitHub repository: every push to `main` deploys. Manual option: `npx wrangler pages deploy . --project-name booklyn` after `wrangler login`.

## Before the public launch

- Check the name again (pages.dev address, domain, app stores, Swissreg).
- Fill the `[...]` placeholders in the legal pages and `.well-known/security.txt`.
- Saved-data schema is 1. Add a function to `MIGRATIONS` in `app.js` for every schema change. The new `how` field (quiz or self-check) is additive and needs no migration.
