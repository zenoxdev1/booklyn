# Store listing for the Booklyn ILIAS Connector

Use this text when publishing to the Microsoft Edge Add-ons store (free) or the Chrome Web Store (one-time 5 USD developer fee).

## Name
Booklyn ILIAS Connector

## Short description (max 132 characters)
Finds new course files on HSLU ILIAS and sends the ones you choose to Booklyn. Your sign-in never leaves your browser.

## Long description
Booklyn turns your semester into a city you light up as you study. This optional connector finds the course files on HSLU ILIAS that Booklyn can read (PDF, Word, PowerPoint and text files) and lets you add the ones you choose to Booklyn with one click.

- Uses your own signed-in ILIAS session. It never asks for or stores your password.
- Skips videos, audio, images and zip files, which Booklyn cannot turn into questions.
- Nothing is uploaded to any server. Files go from ILIAS into your own browser storage, and only when you press "Add to Port".
- Works only on elearning.hslu.ch and the Booklyn page.

Booklyn and this connector are an unofficial student project and are not affiliated with HSLU.

## Category
Productivity (Chrome) / Education (Edge)

## Privacy policy URL
https://booklyn.pages.dev/privacy/

## Support / homepage URL
https://booklyn.pages.dev/connector/

## Permission justifications
- `tabs`: to find an open, signed-in ILIAS tab and to open ILIAS or Booklyn from the toolbar popup.
- Host access to `https://elearning.hslu.ch/ilias/*`: to read the file links on the pages you can already see and to download the files you choose.
- Content script on the Booklyn site: to pass the scan results to the Booklyn page you have open.

## Data use declaration
Collects no personal data. No data is sold, shared or transferred. Nothing leaves the browser except requests to elearning.hslu.ch made with the user's own session.

## Screenshots to prepare (1280x800)
1. Booklyn Port with the ILIAS list (To add / Already in Booklyn filters).
2. The toolbar popup.
3. A lit city after importing.
