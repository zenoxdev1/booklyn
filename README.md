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
      js/final.js       whole-house final practice: balanced sessions, missed questions, review plan (kept apart from floor status)
      js/lot.js         where each decoration of a building stands (no overlaps)
      js/voyage.js      import voyage: ship and delivery-boat routes and timing (pure maths)
      js/quiz-core.js   chunking with headings and pages, definition questions, quality rules, question bank, 5-question and 80 % rules
      js/backup.js      progress backup, full backup, checked restore, merge rules
      js/search.js      search across modules, floors, files and notes
      js/today.js       "Study today": picks one task and groups reviews
      js/questions.js   lesson questions: order, reminders, merge
      js/snotes.js      notes linked to a file and a page, slide or time
      js/versions.js    detect a new version of a file, compare pages, reconnect notes
      js/objectives.js    learning objectives linked to files, notes and quiz practice
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

## Languages

The app is available in English, German, Spanish and French. The language is picked from the browser on the first visit and can be changed in Settings (or on the welcome screen); the choice is kept in `localStorage['booklyn:lang']`.

English text in `app/app.js` is the source and also the dictionary key. Wrap every visible string with `_t('...')` (plurals: `_pl(n, 'one', 'many')`, placeholders: `_tf('{n} files', {n: 3})`), then add the German, Spanish and French versions to `app/js/i18n-dict.js`. `tests/unit/i18n.test.mjs` checks that every key exists in all languages and keeps its placeholders. Demo content and the legal pages stay in English.

## Tests

    node --test tests/unit/*.test.mjs                 # fast, no installs
    pip install playwright && playwright install chromium
    python3 tests/e2e/batch1.py                       # starts its own local server
    python3 tests/e2e/batch2.py

What they cover: failed imports and retries without duplicates, import confirmation only after a successful write, complete chunking (no truncated text), cache refresh when files are added or removed, the 5-question and 80 % rule, wrong answers coming back first, full backup and restore (merge and replace), damaged and hostile backups.

## Final practice (whole house)

- Every house (module) has "Practise this house for the final": sessions of 20 or 25 questions drawn from all floors, about the same number from each floor (floors with less material give fewer). Nothing is invented: with fewer than 20 good questions the practice is not offered.
- Wrong answers show the right answer, the explanation and a link to the source file (page when known).
- The result lists floors and topics to review with direct links, and offers a retry of the missed questions or a focused review (10 questions from the weakest floors).
- Results live in `state.final[houseId]` (small: counts, ids, sessions) and **never** light a floor or mark it as reviewed. The questions themselves stay in the floor question banks on the device.

## Quiz quality

- Every quiz has 5 questions; 4 right pass (80 %). Fewer than 5 good questions: Booklyn says why and offers the self-check, it never pads or invents.
- **With AI** (optional, needs a sync account and the setting): a few pages at a time (with their heading and page range) go to `/api/quiz`. The server first analyses the material (subject, concepts with exact quotes, relations, objectives; it stops with a reason if the text is unreadable or too thin), then writes candidate questions, then checks each one with fixed rules (4 distinct options, no "all of the above", answer not in the question, no length giveaway, supporting quote must really occur in the material, answer words must be supported) and a second strict AI review. Failed ones are replaced once. Nothing unchecked is returned. The answer shows the explanation, the supporting quote and the source (file and page).
- **Without AI**: only clear definitions found in the files ("X is …", "X ist …") become questions, with the definitions or terms of other concepts as wrong options. Random-word blanks are no longer made.
- Each question can be reported as unclear, wrong or not relevant (kept on the device, nothing is sent).
- Limits: 30 AI requests per user and 90 in total per day (`GLOBAL_DAILY` in `functions/api/quiz.js`; the free Workers AI allowance is about 10,000 neurons a day, and one request costs roughly 400). When Cloudflare itself reports the allowance as used up, the app shows the 'limit' message instead of a generic error, each request makes 3 to 5 model calls. The model is `AI_MODEL` (default Llama 3.1 8B on Workers AI).

## Courses without weeks
Each module has a unit label: Weeks (default), Topics or Chapters (`module.ul`, set in setup or on the module page). Floors are then called Topic 1, Topic 2... Custom floor names are kept when the label changes. A file with no week stays in "Check this" until it is put on a floor.

## Landing pages (4 languages)
The public pages `index.html`, `de/`, `es/`, `fr/` are generated. Edit `site/landing.template.html` and `site/landing.strings.mjs` (one row per text: en, de, es, fr), then run `node tools/build-landing.mjs`. A unit test fails if the files on disk are out of date or a text is missing in a language. `?lang=xx` on `/app/` opens the app in that language. Screenshots in `assets/shot-*.webp` come from `python3 tools/shots.py`. Landing browser tests: `python3 tests/e2e/landing.py`.

## Import voyage (Port and campus)

The port in the city is a button: tapping it opens the Learning Port, and the Port page has a "← Campus" button to go back. When you import files, a card on the Port page shows the island: one ship per subject (in the colour of that subject) sails to the port, unloads, and a small boat carries the files over the bridge and along the streets to that subject's building, which lights up when it arrives. At most 8 ships are shown, the whole thing takes under 20 seconds, there is a "Skip the animation" button, and it is not shown at all when the device asks for reduced motion. Paths and timing are in `app/js/voyage.js` (pure maths, tested in `tests/unit/voyage.test.mjs`); the browser test is `tests/e2e/voyage.py`.

## One island for all semesters

With more than one semester, every semester is a district of the same island, side by side, with a shared port at the east end (the port button opens the Learning Port from any semester, and "← Campus" brings you back). The semester dropdown picks the district: the view glides to it, only that district is clickable, the others stay visible but dimmed. "See all semesters" shows the whole island, "Focus on this semester" goes back. Each district has its own pier, beach spot and name label on the south shore; the sand rim and the streets run through the whole island. With a single semester nothing changes. Anything that moves through the city (the import boats now, pedestrians and cars later) is placed among the buildings by depth (`moverPlace` in `app.js`), so it is never drawn over a building in front of it.

## Look of the island: horizon, weather, shop, decorations

The island sits in open water that reaches a hazy horizon with two low mountain ranges and a few tiny sailboats (`backdropSVG`); there is no floating slab any more, the shore has sand, shallows, foam and rocks. A look (Evening park, Autumn, Cherry blossom, Snow, Desert, Rain, Fireflies, Mist, Golden hour) is chosen once for the whole island (`state.scenery['*']`; an older per-semester choice is still used until a new one is made) and brings its own sky, colours and weather. The weather particles (`ambSVG`) live in the picture's own space, so they cover every district; they are hidden when the device asks for reduced motion. The Shop has four sections (for buildings, island looks, cars and people, useful), icons, a "Try" button that previews an item on the building (or a look on the whole island) before anything is paid, and shows how many coins are missing.

Decorations never overlap: `app/js/lot.js` gives every item its own fixed spot around the building (16 spots; what you buy goes to the spots the front of the building shows, plain trees fill the rest). `tests/unit/lot.test.mjs` checks every combination of items for overlaps and for staying on the lawn. Cars and pedestrians are separate (next section).

## Cars and people

`app/js/traffic.js` is the simulation; `app/app.js` only draws it. Cars drive in their lane on the street grid (the ring road included), people walk on the pavement beside it; at crossings they take turns (people give way to cars), a car stops behind the one in front, and a stuck one re-plans or, after a few seconds, slips through so nothing jams for good. Six car types (sedan, hatchback, delivery van, taxi, bus, sports car) and four kinds of people (walker, child, jogger, dog walker) cost 1 coin each, in the Shop's "Cars and people" section, with a Try button (a dashed marker shows the one you are previewing), a colour choice, and "Send away". What you own is saved in `state.traffic` (`{cars:[{id,t,h}], peds:[{id,k,h}]}`) and travels in backups; positions are not saved. How many fit depends on the length of your streets (`capacity()`: roughly one car per 8 and one person per 4 street units, at most 12 and 16); when full, buying is disabled with a reason. Everything is sorted by depth among the buildings in `#deptg`, so a car is never drawn over a building in front of it. The animation stops while the picture is off-screen or the tab is hidden, and shows a still picture under `prefers-reduced-motion`. Tests: `tests/unit/traffic.test.mjs`, `tests/e2e/traffic.py`.

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

## Admin account (unlimited coins)

Admins are declared only in Cloudflare Pages → Settings → Environment variables (Production), never in the app:

- `ADMIN_EMAILS`: comma-separated email addresses (case-insensitive). Does not match sync-code accounts.
- `ADMIN_UIDS`: comma-separated account ids, for accounts created with a sync code.

After redeploying, sign in with that account: Settings → "Admin tools" lets you switch on unlimited coins, set an exact balance or add coins. The server tells the app who is an admin through `/api/me`; nothing in the browser can grant it. On the public site `?dev=1` does nothing; it only works on `localhost`.

## Deploy to Cloudflare Pages

Connected to the GitHub repository: every push to `main` deploys. Manual option: `npx wrangler pages deploy . --project-name booklyn` after `wrangler login`.

## Before the public launch

- Check the name again (pages.dev address, domain, app stores, Swissreg).
- Fill the `[...]` placeholders in the legal pages and `.well-known/security.txt`.
- Saved-data schema is 1. Add a function to `MIGRATIONS` in `app.js` for every schema change. The new `how` field (quiz or self-check) is additive and needs no migration.
