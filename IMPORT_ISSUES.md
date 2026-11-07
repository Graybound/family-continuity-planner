# Suggested initial issues

Create these after the repository is public. Each has a title, description, acceptance criteria, dependencies, and labels.

## 1. Manual screen-reader audit

Run the main workflows (guided start, add and edit a record, checklist, restore, print dialog) with NVDA on Windows and VoiceOver on macOS and iOS. Record findings as separate issues.
- **Acceptance:** written results for each workflow and screen reader; blocking problems filed.
- **Depends on:** none. **Labels:** accessibility, testing, help-wanted

## 2. Run browser tests in Firefox and WebKit

Add Firefox and WebKit projects to `playwright.config.ts` and CI. Note `file://` storage differences per browser in PRIVACY.md.
- **Acceptance:** CI runs all browser tests in three engines; any browser-specific limitations documented.
- **Depends on:** none. **Labels:** testing, good-first-issue

## 3. A4 print layout

Add an A4 option (or automatic sizing) and test that page breaks still work.
- **Acceptance:** packet prints cleanly on A4 and Letter; choice is saved per device.
- **Depends on:** none. **Labels:** printing, enhancement

## 4. Audience-specific packets

Let the creator print a packet for a specific reader: partner, executor, emergency helper, technology helper, caregiver, or messages only. Build on `PACKET_ORDER` in `src/ui/print.ts`.
- **Acceptance:** each packet type has a documented list of parts; tests check included and excluded content; private-field rules respected.
- **Depends on:** none. **Labels:** printing, survivor-experience, enhancement

## 5. Guided yearly review and reminders

A step-by-step review that walks each section, asks "still accurate?", and marks the plan reviewed. Show an in-app reminder when the last review or backup is old (no notifications that require a server).
- **Acceptance:** review flow sets `info.lastReviewedAt`; reminders follow documented rules; unit tests.
- **Depends on:** none. **Labels:** enhancement, user-experience

## 6. Dedicated Pets section

Fields for name, species, care routine, food, medications (private), vet contact, who can take the pet, and records location.
- **Acceptance:** schema version bumped with migration, form, print, search, tests, docs.
- **Depends on:** none. **Labels:** enhancement

## 7. Dedicated Vehicles section

Make, model, where the title and keys are, insurance, maintenance schedule, trusted mechanic, what to do with it later.
- **Acceptance:** as for issue 6. **Labels:** enhancement

## 8. Timeline guidance for the reader

A "first day, first week, first month, first year" structure in Start Here and print, built from the checklist and plans.
- **Acceptance:** creator can assign items to timeframes; printed packet shows them in order; plain-language default content.
- **Depends on:** none. **Labels:** survivor-experience, enhancement

## 9. Read-only family view

A calm, read-only digital view of the plan for the family, starting from Start Here, with no editing controls.
- **Acceptance:** keyboard and screen-reader friendly; opens from a clear button; respects privacy settings.
- **Labels:** survivor-experience, accessibility, enhancement

## 10. Link records to trusted contacts

Let a responsibility or account point to a contact ("who can help") instead of free text.
- **Acceptance:** schema migration; deleting a contact handles links safely; print shows the linked name and phone.
- **Labels:** enhancement, backup-and-restore

## 11. Activity history view

Show the last 30 changes already stored in `activity`, with an option to clear them.
- **Acceptance:** accessible list; clear requires confirmation. **Labels:** good-first-issue, enhancement

## 12. Encrypted backup design proposal

Write a design (not code) for optional encrypted backups with Web Crypto, covering key derivation settings, file format, recovery implications, and wording that makes the "forgotten passphrase means permanent loss" risk unmistakable.
- **Acceptance:** design document reviewed by at least one other contributor before any implementation.
- **Labels:** security, privacy, backup-and-restore

## 13. Translations groundwork

Move user-facing strings into one module so they can be translated later.
- **Acceptance:** no visible change; all strings in one place; tests pass. **Labels:** enhancement, help-wanted

## 14. Usability test with non-technical users

Ask three to five people who are not developers to download a release and create a basic plan. Note where they get stuck.
- **Acceptance:** written findings; issues filed. **Labels:** user-experience, help-wanted
