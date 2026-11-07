# Audit of the recovered application

The recovered build is preserved unchanged (byte for byte) at [legacy/family-continuity-planner-recovered-v1.html](legacy/family-continuity-planner-recovered-v1.html), SHA-256 `c8e756a82fac94ca2c9be1b5915fe47ddb95b32691899f190ce40274033decd0`. Only its file name was changed, because the original file name contained a family surname.

## How it was audited

1. Read the full source (one HTML file: about 50 lines of CSS, 40 lines of JavaScript, minified by hand).
2. Ran it in headless Chrome from `file://` and drove every feature with Playwright: adding records, checklist, settings, export, restore, print, mobile width.
3. Ran axe-core accessibility checks on each view and the record dialog.
4. Fed it crafted backups (unsafe IDs, invalid dates, unknown checklist groups) and corrupted storage to confirm suspected bugs.
5. Generated a real v1 backup with fictional data through the legacy UI: [tests/fixtures/legacy-v1-export.json](tests/fixtures/legacy-v1-export.json). Compatibility tests use this file, not a hand-written imitation.
6. Searched the file for personal data (names, emails, phones, URLs, addresses). **None found.** The file contains no embedded plan data; the only personal detail was the uploaded file name.

## Existing behavior

| Feature | Behavior in v1 |
|---|---|
| Navigation | Sidebar: Overview, People, Key contacts, Health, Home and utilities, Accounts, Documents, Emergency plans, Checklist, Notes, Settings. Counts per section |
| Records | Add, edit, delete in eight sections via one dialog. Field lists defined in a `SCHEMAS` object. `confirm()` before delete |
| Record cards | Title, subtitle, and the first four non-empty fields |
| Filtering | Per-section text filter and type filter (first select field) |
| Checklist | Four fixed groups (First 24 hours, Information to gather, People to brief, Quarterly upkeep). Four starter items. Add (no edit), check, delete with `confirm()` |
| Search | Ctrl/Cmd+K dialog over all records; opens the record's edit dialog |
| Overview | Hero with a weighted "plan readiness" percentage ring, a "continuity map" of eight sections with per-section percentages, "Best next steps," and "Continuity risks" |
| Theme | Dark by default; toggle in top bar and Settings; stored in `familyContinuityPlanner.theme` |
| Privacy | Top-bar toggle and "Start in privacy mode" setting. CSS blur over fields marked private |
| Settings | Household name, region, primary trusted contact |
| Backup | Export JSON download `family-continuity-backup-YYYY-MM-DD.json`; restore from file |
| Print | Builds a print-only section: title, updated date, each non-empty section with non-private fields |
| Activity | Last 30 actions recorded in data, never displayed |
| Responsive | Off-canvas sidebar under 760px |

## Data structures and storage

Storage key `familyContinuityPlanner.v1` holds the whole state as JSON:

```json
{
  "version": 1,
  "meta": { "householdName": "", "region": "", "meetup": "", "trustedContact": "",
            "updatedAt": "ISO", "createdAt": "ISO", "includePrivatePrint": false, "privacyDefault": false },
  "people": [], "contacts": [], "health": [], "home": [],
  "accounts": [], "documents": [], "plans": [], "notes": [],
  "checklist": [{ "id": "", "group": "", "title": "", "note": "", "due": "YYYY-MM-DD", "done": false }],
  "activity": [{ "id": "", "text": "", "at": "ISO" }]
}
```

Each record is `{ "id": "<base36 time + random>", ...field keys from SCHEMAS }`, all values strings. Field keys per section are preserved exactly in v2 ([src/core/sections.ts](src/core/sections.ts)).

**Export format** is the same object, pretty-printed. **Import** accepted any JSON with a `meta` object and a `checklist` array, then copied known top-level keys over a blank state.

## Bugs and fragile areas (confirmed in a browser unless noted)

| # | Problem | Impact | v2 resolution |
|---|---|---|---|
| 1 | Unreadable stored data was silently replaced by a blank plan, then **overwritten on the next save** | Permanent data loss after any storage corruption | Damaged data is copied to a recovery key before anything is written; banner offers download |
| 2 | Restore replaced the whole plan immediately, **no confirmation or preview** | One wrong file click erased a plan | Preview dialog, offer to export first, explicit acknowledgement required |
| 3 | Record and checklist IDs were inserted into HTML attributes **unescaped**. A crafted backup with an ID like `x" onfocus="..."` ran script (verified: script executed) | Stored XSS through a shared backup file | IDs validated against `[A-Za-z0-9_-]{1,64}` and replaced otherwise; all rendering uses DOM text nodes; strict CSP |
| 4 | An invalid date in a backup threw `RangeError: Invalid time value` and **the section would not render** | App unusable for that section | Dates validated on import; formatting never throws |
| 5 | Checklist items with a group outside the four fixed names were **invisible** but still counted | Hidden tasks, confusing counts | Unknown groups are shown under their own heading |
| 6 | Records without IDs (from hand-edited files) could not be edited: the save wrote to array index `-1`, which JSON export drops | Silent loss of edits | Every record gets a unique valid ID; duplicates are replaced |
| 7 | `meta.includePrivatePrint` existed but **was never used**; print always dropped private fields silently | Printed packet missing key information without saying so | Print option with clear "Withheld" labels |
| 8 | Print omitted the checklist, trusted contact, meeting point, and had no Start Here, cover, or review date | Weak family-facing output | New packet structure (see ARCHITECTURE.md) |
| 9 | "Plan readiness" percentage reached 100% after about 12 records, and checking off 2 starter checklist items counted | Misleading sense of completeness | Readiness levels with explained requirements |
| 10 | `meta.meetup` was stored but no UI could edit it | Dead field | Migrated into a note if non-empty |
| 11 | Activity log recorded but never shown | Dead data | Kept (bounded to 30) for a future history view |
| 12 | `URL.revokeObjectURL` ran immediately after `click()` | Can cancel downloads in some browsers (not reproduced in Chrome) | Revoked after 60 seconds |
| 13 | Filtering re-rendered on every keystroke and patched focus back by hand | Screen readers lost context | General focus restoration by stable keys |
| 14 | Theme switch in Settings did not update when toggled from the top bar | Stale control | Single render path |
| 15 | Hover reduced the privacy blur from 6px to 3px | Privacy mode partly defeated by mouse movement | Private text is removed from the page entirely in privacy mode |
| 16 | `Object.assign(blank().meta, s.meta)` with an imported `__proto__` key | Prototype of the meta object replaced (local, not global pollution) | Forbidden keys removed at parse; values copied field by field |

## Accessibility findings

- axe-core: 5 unlabeled inputs in Settings (labels not associated) and 7 in the record dialog.
- Settings toggles were checkboxes with no accessible name.
- Search input had only a placeholder.
- The off-canvas mobile menu stayed **keyboard focusable while closed** (verified: Tab moved into the hidden menu).
- Decorative glyph icons (♙, ☎, ✚) were read aloud by screen readers.
- Blurred private text was still read aloud by screen readers.
- Checklist rows put the delete button inside the checkbox's `<label>`.
- Readiness ring used `aria-label` on a plain `div`, which is ignored.
- Theme button used `aria-pressed` with a label describing the opposite action.
- Accent orange `#e65f2b` as small text on the light background is about 3.4:1, below AA for small text.
- Toast notifications used one polite region for both success and errors.

All are fixed in v2 and covered by automated axe checks (light and dark) plus keyboard tests.

## Privacy and security findings

- No network requests, analytics, remote fonts, or external scripts (verified with request logging). This is preserved and now enforced.
- No CSP. Inline script and style everywhere. Now a hash-based CSP.
- No encryption, and the app did not claim any. Accurate; still true.
- Accounts callout already discouraged storing passwords. Preserved and strengthened with secret detection.
- Backups and printouts carried no sensitivity warnings. Added.

## Features preserved

Every v1 feature is present in v2: all eight sections with identical field keys, record add/edit/delete, filters, checklist with the same groups and starter items, Ctrl/Cmd+K search, light and dark themes on the same storage key, privacy mode and its default setting, plan name, region, trusted contact, JSON export with the same file name pattern, restore, printing, and the responsive layout.

Deliberate changes, each with a replacement:

| v1 | v2 | Why |
|---|---|---|
| Dark theme always the default | Follows the system light or dark setting until the user chooses | More predictable; saved choice still wins |
| Percentage readiness ring | Four readiness levels with listed requirements | The percentage implied completeness it could not measure |
| "Key contacts" | "Trusted contacts" | Matches the survivor-focused language of the product |
| "Household or plan name" | "Plan name" | Not every plan is for a household |
| CSS blur in privacy mode | Text replaced with "Hidden while privacy mode is on" | Blur was readable on hover and by screen readers |
| `confirm()` dialogs | Accessible in-page confirmation dialogs | Consistent, testable, and styled |

## Compatibility

- **v1 backups restore** through the migration in [src/core/migrate.ts](src/core/migrate.ts), with a preview listing what changed. Tested with a backup generated by the real v1 app.
- **v1 browser storage is upgraded on first launch.** v2 reads `familyContinuityPlanner.v1` only if `familyContinuityPlanner.v2` does not exist, and never modifies the v1 key, so the original app keeps working with its own data if someone goes back to it.
- **v2 backups do not open in v1, and v1 now says so.** Testing showed that v1 accepted any file with a `meta` object and a `checklist` array, so an early v2 draft (which also had `meta`) was "restored" by v1 with every record silently dropped. v2 therefore stores plan details under `info`; v1 now rejects v2 files with its error message, verified by a browser test against the legacy file. The upgrade is one-way and documented in the changelog.
