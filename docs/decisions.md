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
