# Booklyn: decisions

Last updated: 2026-10-26. Decided by Hugo and Nils. Add a dated line for every new decision.

## 1. Promise
A study app for students that turns each week's course material into a city you light up as you learn, so you always know what to study next.

## 2. Name and motto
- Name: Booklyn (book as the content, book as in reserving a room once its contents are reviewed).
- Motto: Keep your lights on.
- To do before the public launch: check the name again (pages.dev address, domain, app stores, Swissreg).

## 3. Core metaphor: light
- Lights on means a floor has been reviewed. A light fades gently if you stop reviewing.
- No cleaning or dust. No cranes, ships or coins in the first versions.

## 4. City rules
- The degree is the city.
- A semester is a district. An old semester stays as a finished district.
- A module is a building.
- A teaching unit (a week or a chapter) is a floor.
- The size of a district comes from the modules chosen at setup, not from the number of files.

## 5. Scope
- All 43 functions in Nils's list are the final product.
- The graded prototype is a slice: dashboard, city, module houses, weekly floors, Learning Port, library, focus timer, deadlines, progress.
- The rest ships in four releases: (1) study tools and free AI, (2) accounts and sync, (3) smart learning and city growth, (4) groups and handwriting.

## 6. One codebase
The ITPRB prototype and the public app are the same project.

## Open questions
- HSLU IT: ILIAS interface for students? SWITCH edu-ID login for a student project? May HSLU module and file names be shown publicly?
- Angie Born: is a coded prototype accepted instead of Figma? How should AI use be mentioned?
- AI provider: leaning towards Cloudflare Workers AI behind a Worker with daily limits.
- Funding: no ads at the start.

## 7. Courses without weeks, landing in four languages (Nov 2026)
- A module can be organised by Weeks, Topics or Chapters. Same floors, different label; no new data model.
- The landing is generated from one template and one string table, so the four languages cannot drift apart. Legal pages stay English.
- Free AI cap lowered to 90 requests a day: the free Workers AI allowance (about 10,000 neurons) is shared by everyone, and a quota error now shows the normal "limit" message.

## 8. Share to Booklyn and merging after offline use (Nov 2026)
- Android "Share > Booklyn": the manifest declares a `share_target` (POST, files). The service worker keeps the files in the cache `booklyn-share` and redirects to the Port; the app imports them through the normal `addFiles` path and empties the cache only afterwards. Files stay on the device, as before. Needs the installed app (PWA/TWA).
- Offline stays local-first: progress is saved on the device and pushed when the connection returns. If the cloud copy changed meanwhile, the student can now choose "Combine both" (same rules as restoring a backup with Merge) instead of replacing one copy. Deletions made on another device are not carried over by a merge.

## 9. Moving files between your own devices (Nov 2026)
- Problem: files live only on the device where they were added, so a phone showed "Waiting for files" for everything. Storing PDFs in D1/R2 was rejected (database size, a card for R2, and the "files never leave your device" promise).
- Solution: direct device-to-device transfer over a WebRTC data channel (js/xfer.js). Both devices sign in with the same account; one presses "Receive files", the other "Send my files". The receiver tells the sender which files it already has (SHA-256) and which semesters it knows, the sender offers only what is missing, the receiver confirms, and every file is checked (size and SHA-256) before it is stored. File ids, module, floor and status are kept, so progress that already syncs (seen files, lit floors) matches.
- Server: only short-lived signalling messages in the D1 table rtc_signals (functions/api/rtc, max 300 rows per account, deleted after 10 minutes and on account deletion). No file ever reaches the server.
- Connectivity: free Cloudflare STUN. A TURN relay is optional (set TURN_KEY_ID and TURN_API_TOKEN in Pages settings); without it, the transfer needs a network path between the two devices (same Wi-Fi works almost always).
- Run once in the D1 console: the rtc_signals block at the end of db/schema.sql.
