# Spec: Belongings section (roadmap item "Legacy")

Status: ready for build. Roadmap: Phase 4, "Dedicated sections ... Legacy" ([ROADMAP.md](../../ROADMAP.md)).

## Decisions this spec makes (review these first)

1. **Name it "Belongings", not "Legacy".** "Legacy" reads as a big, emotional or financial idea, and the reader has to guess what goes in it. "Belongings" says what it is. The section description carries the keep, sell or give framing. A second reason for the internal id: the codebase already uses "legacy" for the version 1 app (`legacy/`, `KEYS.legacy`, the `migrated-legacy` load status, `legacy-v1-export.json`). A section id `legacy` would make every search for v1 code noisy and invite mistakes. The section id is `belongings`. The roadmap line keeps working as a pointer to this spec.
2. **Bump the schema to version 3.** Adding a section is additive, so one could argue no bump is needed. It is needed anyway: `normalizePlan` in `src/core/normalize.ts` only reads known section keys, so a version 2 build opening a file that has `records.belongings` silently drops those records with no warning. With a bump, `detectVersion` in `src/core/migrate.ts` makes an older build refuse the file with the existing "made by a newer version" message instead. This also follows the project rule: any schema change gets a version bump, a migration, fixtures and tests.
3. **Reuse the generic section machinery.** `SECTIONS` in `src/core/sections.ts` already drives the form, cards, filter, search and print. The section needs no custom view.
4. **No new readiness requirement and no new audit rule.** See "Deliberately left out".

## Problem, from the reader's side

When the creator is gone, the reader faces rooms of things they don't understand: computers, a server rack, camera gear, tools, collections. They don't know what any of it is worth, what is safe to sell, who was meant to get what, or whether selling something will break the Wi-Fi or erase the family photos. People in this position either freeze and keep everything for years, or sell things too early for too little, sometimes with personal data still on the drives.

The creator knows the answers. This section lets them write down, for each thing or group of things: what to do with it, who should get it, roughly what it is worth, how to sell or pass it on, and what must happen first.

For the test household: the creator owns a lot of technology, some of which runs household services. The reader must be able to tell which items she can sell this month, which ones must wait until a service is moved (see [technology-section.md](technology-section.md)), and which ones must have their drives wiped first.

## What the reader sees

A section titled **Belongings**, with this description:

> Your things and what you would like done with them: keep, sell, or give away. Suggestions, not instructions.

And this callout, shown at the top of the section like the existing Accounts and Documents callouts:

> **A will comes first.** If a will names who gets something, the will wins. Use this for everyday things a will usually does not mention, and for the reasons behind your choices. Group things where you can, for example "Camera gear" or "Workshop tools", instead of listing every item.

Each entry shows its decision as the subtitle, and the section can be filtered by decision, so the reader can choose "Sell" and see only the things to sell.

## Fields

Add to `SECTIONS` in `src/core/sections.ts`. All values are strings, as for every section.

| Key | Label | Type | Notes |
|---|---|---|---|
| `name` | Item or group of items | text, required, wide | Help: "For example: Gaming PC in the office, Camera gear, Grandpa's watch." Title field. |
| `decision` | What to do with it | select | Options: `Keep in the family`, `Sell`, `Give to someone`, `Donate`, `Recycle or throw away`, `Your choice`. Subtitle and filter field. |
| `recipient` | Who should get it | text | Help: "A name, or who to ask." |
| `location` | Where it is | text, wide, private | Private like other physical locations (`home.location`, `documents.location`), because some entries will point to a safe or jewelry. |
| `value` | Rough value | text | Help: "A range and when you checked, for example: $300 to $500 used, checked eBay sold listings in 2026." Free text, not a number. |
| `firstSteps` | Do this first | textarea, wide | Help: "Anything that must happen before it leaves the house: copy photos off, wipe the drives, move a service that runs on it, remove it from an account." |
| `howTo` | How to sell or pass it on | textarea, wide | Help: "Where to list it, who could help, what to include (cables, boxes, manuals), and a fair price to accept." |
| `note` | Note for your family | textarea, wide | Help: "Why it matters, or permission to let it go." |

Section definition values: `id: 'belongings'`, `title: 'Belongings'`, `singular: 'item'`, `titleField: 'name'`, `subtitleField: 'decision'`, `filterField: 'decision'`. Icon: pick a single plain Unicode glyph in the style of the existing ones (for example `❖`); the build agent checks it renders in the bundled font stack and is announced sensibly or hidden from screen readers like the others.

Why `Your choice` is an option: the reader needs explicit permission. "Your choice" tells her the creator does not mind, which removes guilt. It is not the same as an empty decision, which means the creator has not decided.

Why no "Decide later" option: an entry without a decision already means that, and the module status "Review later" exists for the section as a whole.

Placement: insert `belongings` into `SECTION_IDS` after `documents` and before `plans`, so it sits with the other "what we have" sections in the navigation. Add it to `PACKET_ORDER` in `src/ui/print.ts` after `documents` and before `notes`.

## Acceptance criteria

A non-developer can check each of these in the built file.

1. A **Belongings** section appears in the navigation and on the dashboard section grid.
2. The section shows the description and the "A will comes first" callout above.
3. Adding an entry with only a name works. No other field is required.
4. The "What to do with it" filter narrows the list to one decision, for example only "Sell".
5. Search (Ctrl/Cmd+K) finds an entry by text in any non-private field, and does not match the "Where it is" field while privacy mode is on.
6. Privacy mode hides "Where it is" on screen.
7. The printed packet has a Belongings section after Documents when there is at least one entry, and leaves the section out when there are none. "Where it is" is withheld unless the user chose to include private details.
8. The section can be marked Completed, Review later, or Does not apply, like the others.
9. Restoring a backup made before this change works, keeps every existing entry, shows Belongings as empty, and the restore preview lists the action "Added the new Belongings section. It starts empty." The app's own saved plan from before the change loads the same way, with no error banner.
10. Opening a backup that has Belongings entries in a build from before this change shows the existing "made by a newer version" message and does not change the current plan. (Checked by the unit test on `detectVersion`, since an old build cannot be run by a non-developer.)
11. The sample plan includes these two fictional Belongings entries, and loading it shows them:
    - "Desktop computer in the office": Sell; firstSteps "Copy the Photos folder to the backup drive, then ask Pat Lee to wipe the drive."; value "$200 to $400, checked 2026"; howTo "Local listing site or Pat Lee can sell it for you."
    - "Grandmother's quilt": Give to someone; recipient "Jordan"; note "It kept everyone warm for fifty years. Use it, don't store it."
12. **Wife test**: without help, the reader can open Belongings, filter to "Sell", pick one entry, and say out loud what she must do before selling it and roughly what price is fair. She can also find one item meant for a named person and say who. Run this as a task in [usability-test-plan.md](usability-test-plan.md).

## Data, schema and migration

- `SCHEMA_VERSION` becomes `3` in `src/core/plan.ts`.
- Add `migrateV2toV3` in `src/core/migrate.ts` and register it as `MIGRATIONS[2]`. It returns the input with `schemaVersion: 3`, sets `records.belongings` to `[]` only if `records` is a plain object without that key, and pushes the action "Added the new Belongings section. It starts empty." Do not edit `migrateV1toV2`. A v1 file then migrates 1 to 2 to 3.
- `normalizePlan` needs no change: it iterates `SECTION_IDS`, so the new section is validated, length-limited and given an empty list automatically. `emptyRecords()` and `blankPlan()` pick it up the same way.
- Commit a version 2 fixture before changing `SCHEMA_VERSION`: copy the current `examples/sample-plan.json` to `tests/fixtures/v2-sample-backup.json`. Then regenerate `examples/sample-plan.json` with `UPDATE_EXAMPLES=1 npx vitest run tests/unit/examples.test.ts`.
- Storage keys do not change. The stored plan is read through `parseBackup` in `loadPlan` (`src/core/storage.ts`), so it is migrated on load the same way a backup is.
- Readiness side effect, accepted: `thorough-all-sections` in `src/core/readiness.ts` requires every section in `SECTION_IDS` to be addressed. A plan at "Thorough Plan Ready" drops to "Core Continuity Plan Ready" until Belongings has an entry or is marked Completed or Does not apply. The existing requirement text already names the open section, which is the right explanation. No real plans exist yet, so nobody is affected today. Note it in CHANGELOG under Compatibility.
- Coordination with other new sections: the Technology section spec ([technology-section.md](technology-section.md)) may also add a section and a schema bump. Whichever lands first takes version 3 and the other takes version 4, each with its own migration and fixture. Do not merge two migrations into one after either has shipped in a release.
- The rename pass (When I'm Gone) will change `SCHEMA_ID`. This spec does not touch the schema id, storage keys or file names.

## Files likely touched

- `src/core/sections.ts`: new `SECTION_IDS` entry and `SECTIONS.belongings`.
- `src/core/plan.ts`: `SCHEMA_VERSION = 3`.
- `src/core/migrate.ts`: `migrateV2toV3`, `MIGRATIONS[2]`.
- `src/core/sample.ts`: two sample entries.
- `src/ui/print.ts`: `PACKET_ORDER`.
- `examples/sample-plan.json`: regenerated.
- `tests/fixtures/v2-sample-backup.json`: new.
- `tests/unit/backup.test.ts` (or a new `tests/unit/migrate-v3.test.ts`), `tests/e2e/core.spec.ts`, `tests/e2e/backup-print-a11y.spec.ts`.
- Docs: `docs/backup-format.md` (version 3 section, migration table row, field table row `belongings | name, decision, recipient, location (P), value, firstSteps, howTo, note`), `ARCHITECTURE.md` ("Data schema (version 2)" heading and `schemaVersion`), `PROJECT_SPEC.md` (move Legacy from planned to implemented as Belongings), `ROADMAP.md` (tick Legacy, note it shipped as Belongings), `CHANGELOG.md` (Added, Compatibility).

No change to `src/core/normalize.ts`, `src/core/recommend.ts`, `src/core/audit.ts`, or storage keys.

## Test plan

Every test below must fail on `main` before the change.

### Unit (vitest)

- `migrateToCurrent` on the v2 fixture: result is version 3, every existing record is unchanged, `records.belongings` is `[]`, actions include the Belongings message, `normalizePlan` produces no warnings.
- `migrateToCurrent` on the v1 fixture (`tests/fixtures/legacy-v1-export.json`): result is version 3 and both migration actions are present.
- `detectVersion` on a file with `schemaVersion: 4` returns the "newer version" error (guards the forward-compat path this bump relies on).
- A v3 file with a Belongings entry round-trips through `serializeBackup` and `parseBackup` with all eight fields intact.
- A Belongings entry with an unknown `decision` value, an unknown extra field, and a 30,000 character `note` normalizes with the existing warnings and limits (same behavior as other sections; this proves the section is wired into normalization).
- Search: a term in `howTo` is found; a term only in `location` is not found when privacy mode filtering is on (use the existing search test pattern).
- Readiness: a plan that met every Thorough requirement before, with Belongings empty and status auto, is at Core and the `thorough-all-sections` text names "Belongings". Marking Belongings "Does not apply" restores Thorough.
- `examples.test.ts` passes with the regenerated sample.

### Browser (Playwright, built file over file://)

- Add an entry with name, decision "Sell", firstSteps and value. It appears with "Sell" as the subtitle. Filter to "Give to someone" hides it; filter to "Sell" shows it.
- Privacy mode hides the location value.
- Print packet: with one entry, `#print-packet` contains a "Belongings" heading after "Documents"; with private details off, the location value is absent; with no entries, there is no Belongings heading.
- Restore the v2 fixture through the restore flow: preview lists the Belongings action, existing counts match, plan loads.
- Seed localStorage with a v2 plan, reload: status is ok, no damaged-data banner, Belongings is empty.
- Existing rule: no network requests and no console errors during these tests.

### Accessibility

- Add the Belongings view to the existing axe sweep in light and dark themes.
- Keyboard only: reach the section from navigation, add an entry, change the filter, all with visible focus.
- The decision select has a visible label; help text is linked to its field the same way existing help text is.
- The callout is read as text, not as an alert.

## Out of scope

- Storing serial numbers, receipts, photos or attachments. The app stores text only.
- Appraisals or price lookups. No network, ever. The creator writes a rough range and when they checked.
- Links between records (for example, recipient as a People record, or "Do this first" pointing at a Technology entry). Planned separately; plain text names are enough for now.
- A "who gets what" summary view or a per-recipient printout. That belongs with audience-specific packets.
- Legal effect of any kind. The callout and the existing print cover notice already say a will comes first.
- Collections and Family History as separate sections (listed separately in PROJECT_SPEC.md). Collections can live here as grouped entries until real use shows otherwise.

## Smallest useful version, and what we leave out on purpose

The smallest useful version is exactly the above: one generic section with eight fields, a callout, a filter, print, and the version 3 migration. It needs no new UI code beyond `PACKET_ORDER`.

Deliberately left out, with reasons:

- **Audit rule for "Give to someone" with no recipient.** Deterministic and cheap, but it adds a rule, docs and tests for a gap the creator will usually notice while typing. Add it only if the usability test shows readers stuck on it.
- **Readiness requirement for Belongings.** Belongings is not part of a basic or core emergency plan. Making it required would push creators toward inventory work, which the product says to avoid (knowledge before assets).
- **Recommendation mapping.** `AREA_TO_SECTIONS` in `src/core/recommend.ts` has no area that clearly maps to belongings, so the section will rank as Optional. That is correct for most people.
- **A numeric value field or totals.** A total invites estate math the product explicitly does not do, and ranges are more honest than single numbers.
- **Reader-specific layout.** Reader mode ([reader-mode.md](reader-mode.md)) should render Belongings like any other section. If reader mode groups by a field, `decision` is the natural grouping here.
