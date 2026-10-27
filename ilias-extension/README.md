# Booklyn ILIAS Connector

A Chrome/Edge extension (Manifest V3) that lets Booklyn find course files on HSLU ILIAS, using your own signed-in browser session.

## What it does
- Fetches ILIAS pages and files for Booklyn, using your own ILIAS sign-in. Booklyn decides what to look at (dashboard, My courses, folders), so improvements arrive without reinstalling the extension.
- Lists only files Booklyn can read: PDF, Word (.docx), PowerPoint (.pptx) and text files (txt, md, csv, tex, html, code).
- Skips videos, audio, images, zips, spreadsheets and old Office formats (.doc, .ppt). Skipped files are shown in Booklyn under "Not readable" and are never downloaded.
- Downloads a file into Booklyn's local storage only when you press "Add to Port". Files over 12 MB must be added by hand.
- Never asks for or stores your credentials. Nothing is sent to Booklyn's servers.

## Install
See https://booklyn.pages.dev/connector/ for the steps. In short: unzip, open edge://extensions or chrome://extensions, turn on Developer mode, press "Load unpacked" and choose this folder.

## Versions
See CHANGELOG.md. The toolbar popup and Booklyn's Port page both show the installed version.

## For local testing
Start Booklyn with `python -m http.server 8000` in the project folder and open http://localhost:8000/app/ . The extension also matches https://booklyn.pages.dev, https://booklyn.ch and https://www.booklyn.ch. Add another origin to both `manifest.json` and `background.js` if you deploy elsewhere.
