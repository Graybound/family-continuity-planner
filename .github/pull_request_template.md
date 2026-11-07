## What this changes

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] `npm run check` passes locally (lint, types, unit tests, build, browser tests, privacy scan)
- [ ] No real personal information in code, tests, fixtures, screenshots, or commit messages. Sample data uses Morgan family names, 555-01xx numbers, and example.com addresses
- [ ] No network requests, analytics, remote fonts, or external scripts added
- [ ] User text is rendered with `h()` from `src/ui/dom.ts`, never as HTML
- [ ] If the data format changed: `SCHEMA_VERSION` bumped, migration added, fixture and tests added, `docs/backup-format.md` updated
- [ ] If readiness or audit rules changed: `docs/readiness-and-audit.md` updated
- [ ] Works with the keyboard alone, and new controls have visible labels
- [ ] `CHANGELOG.md` updated for user-visible changes

## How I tested it

<!-- Browsers, screen sizes, screen reader if relevant. -->
