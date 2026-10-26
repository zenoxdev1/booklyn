# Accounts setup (Cloudflare Pages Functions + D1 + Resend)

Booklyn works without an account. Signing in is optional and only syncs the small progress data
(semesters, modules, lights, coins, notes, deadlines). Files never leave the device.

How it works: the user enters an email, the site sends a one-time link (`/?token=...`, valid 15 minutes,
usable once). Opening it signs in and sets an HttpOnly session cookie (30 days). The app then pulls and
pushes one JSON document per user. If the cloud and the device both changed, the user chooses which to keep.

## Two ways to sign in

- **Sync code (no email, no domain, free).** One button creates an account identified by a secret 20-character code
  (about 99 bits). The server keeps only a hash of it. The code is shown once and kept on the device, so the
  same browser signs in again by itself; another device types the code. If the code is lost nobody can recover it,
  so Settings also keeps "Show my sync code" and the backup file works as before.
- **Email link (optional).** Needs the Resend steps below and a domain you control. If they are not set up, the
  email form says so and the sync code keeps working.

The sync code only needs the D1 database and its `DB` binding (steps 1 and 2). Skip steps 3 and 4 until you have a domain.

## One-time setup

1. **D1 database.** Cloudflare dashboard > Storage & Databases > D1 > Create database `booklyn`.
   Open its Console and run the contents of `db/schema.sql`.
2. **Bind it to Pages.** Workers & Pages > `booklyn` > Settings > Bindings > Add > D1 database.
   Variable name `DB`, database `booklyn`. Do it for Production (and Preview if you use it).
3. **Email service (Resend).** Create a free account, add and verify a sending domain you own
   (DNS records), then create an API key with "Sending access".
4. **Variables.** Pages > Settings > Variables and Secrets (Production):
   - `RESEND_API_KEY` (Secret): the key from step 3
   - `MAIL_FROM`: for example `Booklyn <login@your-domain.ch>`
   - `SITE_URL`: `https://booklyn.pages.dev` (or the final domain)
5. **Deploy.** Push to `main`. Pages builds the `functions/` folder automatically.

## Files

- `functions/api/_lib.js` shared helpers (cookies, hashing, origin check)
- `functions/api/auth/request.js` sends the sign-in link (rate limited, never reveals if an address is known)
- `functions/api/auth/verify.js` exchanges the token for a session (POST, so mail scanners cannot use it up)
- `functions/api/auth/logout.js`, `functions/api/me.js`, `functions/api/state.js`, `functions/api/account.js`
- `db/schema.sql` tables: users, login_tokens, sessions, states

## Privacy and safety notes

- Tokens and session ids are stored only as SHA-256 hashes.
- State-changing requests must carry an `Origin` header equal to the site origin.
- One state document is limited to 512 KB. Users can delete their account and data in Settings.
- On localhost only, when no email service is configured, the request endpoint returns the link directly for testing.
- Mention in the privacy text: the email address is stored to recognise the account; nothing else is tracked.

## Practice questions and the optional AI

Questions come from the user's own files. The base layer needs no server and costs nothing:
the browser reads the text (PDF through `vendor/pdf.min.js`, PowerPoint and Word by unzipping them,
plain text directly) and builds fill-in-the-blank questions with distractors from the same unit.
Questions are cached per unit in the browser (`booklyn:bank:<module>:<unit>`).

The optional AI layer (`functions/api/quiz.js`) is off by default and needs a signed-in user who
turns on "Let an AI write extra questions" in Settings. Only a short text excerpt (max 6000 characters)
is sent; files are never uploaded.

1. Run the extra table from `db/schema.sql` in the D1 Console:
   `CREATE TABLE IF NOT EXISTS ai_usage (user_id INTEGER NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day));`
2. Pages > Settings > Bindings > Add > Workers AI. Variable name `AI`.
3. Optional variables: `AI_MODEL` (default `@cf/meta/llama-3.1-8b-instruct-fp8-fast`) and `AI_DAILY_CAP` (default 250 calls a day for everyone, 25 per user).

Cost: Workers AI includes 10,000 Neurons a day for free and fails once they are used up (it resets at 00:00 UTC).
For this model, one call (about 1,500 input and 800 output tokens) is roughly 35 Neurons, so the default cap of 250 calls
a day stays below the free allowance. When the limit is reached, Booklyn silently uses the on-device questions.
