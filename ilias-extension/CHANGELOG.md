# Changelog

## 0.4.0 (beta) - 27 Oct 2026
- The extension is now a thin bridge: it only fetches ILIAS pages and files using your own sign-in. The scanning logic lives in Booklyn, so scan fixes arrive without reinstalling.
- Fixed: calendar and settings links were mistaken for courses.
- Pages that change things in ILIAS (logout, delete, paste...) are never fetched.

## 0.3.1 (beta) - 27 Oct 2026
- Fixed: the scan could spend its whole page budget on one course and never reach the others. Every course now gets its own budget (20 pages each, up to 14 courses).
- Starts from "My courses and groups" as well as the dashboard, and ignores menu and breadcrumb links.
- Files are labelled with their course name, so Booklyn matches them to the right module.
- Booklyn now shows how many files and pages each course gave.

## 0.3.0 (beta) - 26 Oct 2026
- Skips files Booklyn cannot read (video, audio, images, zips, old Office files, spreadsheets). Only PDF, Word (.docx), PowerPoint (.pptx) and text files are listed.
- Faster scan: four pages at a time, up to 30 pages, one minute limit.
- New toolbar popup with version, ILIAS status and quick links.
- Icons, description and homepage in the extension details.
- Booklyn now shows the installed connector version.

## 0.2.0 - 26 Oct 2026
- Parallel scanning and a time limit to avoid time-outs.

## 0.1.0
- First version: scan ILIAS for file links and add chosen files to the Booklyn Port.
