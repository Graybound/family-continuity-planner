# Roadmap

Phases are ordered by dependency, not by date. Items marked done are implemented and tested in the current code.

## Phase 0: Preserve and understand (done)

- [x] Archive the recovered build unchanged in `legacy/`
- [x] Audit behavior, data structures, storage keys, import and export ([EXISTING_APPLICATION_AUDIT.md](EXISTING_APPLICATION_AUDIT.md))
- [x] Check for personal information (none in the file; file name sanitized)
- [x] Generate a genuine v1 backup fixture from the legacy app
- [x] Confirm legacy bugs in a real browser

## Phase 1: Repository foundation (done)

- [x] TypeScript and Vite source structure with no runtime dependencies
- [x] Reproduce all existing behavior
- [x] Linting, type checking, unit tests, browser tests, CI
- [x] Backup compatibility with v1 files and v1 browser storage
- [x] Offline release artifacts: single HTML, zip, checksums

## Phase 2: Reliable core planner (mostly done)

- [x] Versioned schema with validation and migrations
- [x] Safer backup and restore with preview and confirmation
- [x] Recovery from damaged local data
- [x] Printed packet with cover, Start Here, and withheld private fields
- [x] Accessibility fixes and automated checks
- [ ] Manual screen-reader pass (NVDA, VoiceOver)
- [ ] Firefox and WebKit in the browser test matrix
- [ ] A4 print layout

## Phase 3: Guided continuity planning (done, refine with feedback)

- [x] Onboarding, continuity assessment, risk discovery
- [x] Module recommendations and module states
- [x] Readiness levels
- [ ] Usability testing with people who are not developers

## Phase 4: Survivor experience

- [x] Start Here with default, edited, or custom introduction
- [x] Personal messages for different audiences
- [ ] Timeline guidance: first day, first week, first month, first year
- [ ] Digital "reader mode": a calm read-only view of the plan for the family
- [ ] Dedicated sections: Pets, Vehicles, Children, Technology, Work or Business, Service Providers, Legacy

## Phase 5: Continuity audit and maintenance

- [x] Explainable gap detection with dismiss and defer
- [ ] Review reminders and a guided yearly review
- [ ] Audience-specific printed packets (partner, executor, emergency helper, technology helper, caregiver, messages only)
- [ ] Activity history view

## Under consideration

- Encrypted backups (see SECURITY.md for the conditions)
- Translations
- Optional, separate AI memory joggers (never part of the core)

Suggested issues for each open item are in [IMPORT_ISSUES.md](IMPORT_ISSUES.md).
