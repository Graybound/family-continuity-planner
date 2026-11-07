# Changelog

All notable changes are listed here. The project follows [Semantic Versioning](https://semver.org/).

## [0.2.0] - Unreleased

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
