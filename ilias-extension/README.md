# Booklyn ILIAS Connector

This Chrome/Edge extension lets Booklyn find file links on HSLU ILIAS pages you can access in your signed-in browser session. It checks the dashboard, linked courses, folders, groups, and notification or news pages, up to 18 pages per scan. Booklyn remembers which links it has seen and labels newly discovered links. Scanning starts only when you click **Check ILIAS**.

## Install for local testing

1. Start Booklyn with `python -m http.server 8000` in the project folder and open `http://localhost:8000`.
2. In Edge, open `edge://extensions`; in Chrome, open `chrome://extensions`. Enable **Developer mode** and choose **Load unpacked**.
3. Select this `ilias-extension` folder.
4. Open `https://elearning.hslu.ch/ilias/ilias.php?baseClass=ildashboardgui&cmd=show` and sign in normally. Reload any ILIAS tab that was already open before the extension was installed.
5. Reload Booklyn, create/select a semester, open **Port**, and click **Check ILIAS**. Use **Add to Port** for a file you want to review and import.

The extension also matches `https://booklyn.pages.dev`, `https://booklyn.ch`, and `https://www.booklyn.ch`. Add another Booklyn origin to both `manifest.json` and `background.js` if you deploy elsewhere.

The connector does not ask for or store credentials. It uses your existing ILIAS browser session. It downloads a selected file into Booklyn's local IndexedDB only when you click **Add to Port**. Files over 12 MB must be added manually. ILIAS may use different page templates or link formats; links the connector cannot recognize may not appear. “New” means not seen by this Booklyn browser before, rather than an ILIAS unread status.

