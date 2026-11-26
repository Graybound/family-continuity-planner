# Changelog

All notable changes are listed here. The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- **Export backup saves the app and your plan as one file** (`WhenImGone_YYYY-MM-DD_HHMM.html`) that opens offline by double-clicking it. Restore accepts these files as well as `.json` backups. A saved file always opens on its own plan; changes made in it are kept as a draft tied to that file and offered back if it is closed without saving. **Export .json** in Settings still saves the plan data alone
- The online-version notice points at Export backup instead of a GitHub download page
- Backup file names now include the time: `WhenImGone_YYYY-MM-DD_HHMM.json`

- On phones, the top bar shows short words (Menu, Privacy, Backup, Print) instead of bare symbols, and search fits on one line
- While privacy mode is on, a banner says so on every screen, with a "Show hidden details" button
- Overview buttons say where they lead ("Open Trusted contacts") instead of "Go"
- Section pages show entries first; the filter appears only once a section has more than five entries, and Section status moves to the end of the page
- Larger help text and record labels; record labels are no longer all caps
- Checklist Edit and Delete sit under the task on phones
- The "This is not a will" notice on the overview sits below the next steps

### Fixed

- Long text could be cut short after a reload; fields now stop at the length a reload keeps
- Escape, Close, or Cancel in a form with typed changes now asks before discarding them
- Privacy mode no longer shows private fields in the edit dialog until "Show private details" is pressed; saving keeps them
- A restore too big for browser storage no longer looks like it worked; the current plan stays and the dialog says why
- Exporting while storage is full no longer shows a contradictory "export a backup" error
- Ctrl+K is ignored while another dialog is open
- The damaged-data message no longer claims a copy was kept when there was no room for one, and "Download damaged data" also downloads the unreadable data left in place
- When browser storage was completely full, the app showed an empty plan and said it could not save, even though the plan was still there. Exporting at that point produced an empty backup. The saved plan now loads; only new changes fail to save, with a clear message.
- Saved data that could not be read could be overwritten by the next change if there was no room to keep a recovery copy. The app now refuses to save over it.
- A backup containing a section this version does not know (for example from a newer copy of the app) lost that section without a word. The restore preview now names the section and how many entries were not loaded.
- "Password: in the password manager" and similar notes that only say where a secret is kept are no longer flagged as possible passwords.
- Firefox's "storage full" error is now reported as storage being full.

## [0.2.0] - 2026-11-07

The first open-source release. The original single-file app was recovered, audited, and rebuilt as a maintainable repository.

### Compatibility

- **Backups from the original app (format version 1) restore** and are upgraded automatically, with a preview of what changes.
- **Plans saved in the browser by the original app are upgraded on first launch.** The original saved copy is left untouched.
- **New backups (format version 2) cannot be opened by the original app.** It shows an error rather than loading them partially. Keep using this version once you upgrade.
- The theme choice carries over (same storage key).

### Added

- "Who handles what" section for everyday responsibilities, how they work, who could take over, and what to do with them later
- Guided start: why this matters, a continuity assessment, "what would stop working," and tiered recommendations
- Readiness levels with explained requirements, replacing the percentage score
- Section status: Completed, Review later, Does not apply
- Continuity review with explained, dismissible, and deferrable suggestions, including detection of text that looks like a password or card number
- Start Here introduction (default, edited, or custom) and personal messages
- Printed packet with cover page, Start Here, immediate actions, trusted contacts, printed-on and last-reviewed dates, and clearly labelled withheld private fields; option to include private details
- Restore preview with contents, migration steps, and problems fixed; export-first option; explicit confirmation
- Recovery of saved data that cannot be read, instead of overwriting it
- Sample data with a visible banner, and an "erase all plan data" option
- Checklist item editing; custom checklist groups are shown instead of hidden
- Strict Content Security Policy that blocks all network access
- Release zip with a plain-text START-HERE guide, sample backups, and checksums
- A clear "This is not a will" notice on the Overview, in Get started, in Documents, in the printed packet, and in the README, recommending a will alongside the planner
- Free online version at https://graybound.github.io/family-continuity-planner/, deployed automatically after all checks pass, with a notice explaining where data is stored

### Changed

- "Key contacts" is now "Trusted contacts"; "Household or plan name" is now "Plan name"
- The theme follows the system setting until you choose one (it was always dark before)
- Privacy mode removes private text from the screen instead of blurring it
- Confirmation dialogs are in-page and accessible instead of browser pop-ups

### Fixed

- A crafted backup file could run script in the page
- An invalid date in a backup stopped a section from displaying
- Damaged saved data was replaced by an empty plan on the next save
- Restoring replaced the plan immediately without warning
- Records without valid IDs could not be edited
- Printing silently dropped private fields and the checklist
- The closed mobile menu could still receive keyboard focus
- Twelve form fields had no associated label; toggles had no names
- Small accent text did not meet contrast requirements in light mode

### Known limitations

- No encryption of browser storage, backups, or printouts
- Automated tests cover Chromium only; no manual screen-reader audit yet
- Audience-specific packets, review reminders, and several dedicated life-area sections are planned, not built

## [0.1.0] - Recovered original

The single-file prototype preserved in `legacy/`. Never published.
