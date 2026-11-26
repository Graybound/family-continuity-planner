# Spec: Technology section

Status: ready for build. Roadmap item: Phase 4, "Dedicated sections: ... Technology" ([ROADMAP.md](../../ROADMAP.md)).

## Problem, from the reader's point of view

"The internet is down, the TV app says it can't reach the server, and the photo backup sent an email I don't understand. I don't know where the box is, what it does, whether it matters today, or who to call. I don't want to keep any of this running. I want to know what to do now, what can wait, and what to replace it with."

Today the app has no home for this. The creator can put a Wi-Fi note in "Who handles what" or an "Internet" record in "Home and utilities" (`src/core/sections.ts`), but there is nowhere to say, per home-run service: what it does for the family, who depends on it, what keeps it alive, what replaces it, what that costs, and how to move. A household that runs its own services (photos, media, password manager, email on its own domain, home automation, backups) is exactly where the reader is most stuck, because nobody else can explain it.

## What to build

A new section, **Technology**, with one record per thing: the home network, each self-hosted service, a domain or custom email, or anything else technical the family relies on. Every record answers three reader questions, in this order:

1. What is this and does it affect me? (what it does, who uses it)
2. Do I have to do anything soon? (when to act, what keeps it running, what to do if it stops)
3. What happens to it later? (long-term plan, paid replacement, cost, migration steps)

Plus a one-click **Wi-Fi starter** so the most common emergency is covered in the first minute of using the section.

### Section definition (`src/core/sections.ts`)

- id: `technology`, title: `Technology`, singular: `technology item`, icon: a single plain glyph consistent with the others (builder's choice, no emoji, no icon font).
- description: `The network and home-run services your family uses, what to do if they stop, and what to replace them with.`
- titleField: `name`, subtitleField: `kind`, filterField: `kind`.
- Insert `technology` in `SECTION_IDS` directly after `home`.
- callout (creator-facing):
  - title: `Write it for someone who has never opened the router`
  - body: `Start with the Wi-Fi. Then add each service you run yourself. For each one, say plainly what it does and what it should turn into later. Most families will want to move to a paid service or turn things off, and that is fine.`

### Fields

Order matters: plain-language fields first, replacement fields next, the technical field last so the reader can stop reading early.

| key | label | type | private | help text |
|---|---|---|---|---|
| `name` | Name | text, required, wide | no | `Use the name your family knows it by, for example: Home Wi-Fi, Photo backup, Movie server, Our email.` |
| `kind` | Kind | select: `Home network`, `Self-hosted service`, `Domain or email`, `Other` | no | |
| `whatItDoes` | What it does for the family | textarea, wide | no | `One or two plain sentences. For example: Keeps a copy of every photo from our phones.` |
| `dependsOnIt` | Who uses it and what stops without it | textarea, wide | no | `For example: The kids watch shows on it. Nothing important breaks if it is off.` |
| `actWhen` | When to act | select: `First day`, `First week`, `First month`, `First year`, `No rush` | no | `How soon someone needs to do something about it.` |
| `location` | Where it is | wide | yes | `The room or shelf it sits on, or the company that hosts it.` |
| `access` | Where the login is stored | wide | yes | `The name of the entry in your password manager, or for Wi-Fi where the network name and password are written (such as a sticker on the router). Do not type passwords here.` |
| `keepsRunning` | What it needs to keep working | textarea, wide | no | `Power, internet, a paid subscription, a domain renewal, a card on file. Include renewal dates.` |
| `ifItStops` | If it stops working, steps one per line | textarea, wide, steps | no | |
| `longTerm` | What should happen to it later | select: `Move to a paid replacement`, `Turn it off`, `Ask a helper to keep it running`, `Decide later` | no | |
| `replacement` | Paid replacement | text | no | `The service to switch to, for example: Google Photos, Netflix, 1Password.` |
| `replacementCost` | Replacement cost | text | no | `For example: about $10 a month.` |
| `migrationSteps` | How to move to the replacement, steps one per line | textarea, wide, steps | no | `Start with saving anything that cannot be replaced, such as photos.` |
| `whoCanHelp` | Who can help | wide | no | `A friend, family member, or paid service who understands this.` |
| `helperNotes` | Technical notes for a helper | textarea, wide | no | `Details only a technical helper needs, such as the machine, software, and where its data is stored.` |

Field rules:

- `replacementCost` is free text on purpose. No currency parsing, no totals (see Out of scope).
- `location` and `access` are private, so privacy mode hides them and print withholds them by default, same as every other private field.
- The existing secret check (`looksLikeSecret` in `src/core/audit.ts`) already covers these records, because rule 7 loops over `SECTION_IDS`. No change needed; add a test that proves it fires on a Technology record.

### Steps fields render as numbered lists

Today only `plans.steps` prints as an ordered list, through a hard-coded check in `recordBlock` (`src/ui/print.ts`). Replace that check with a field flag:

- Add `steps?: boolean` to `FieldDef`. Set it on `plans.steps`, `technology.ifItStops` and `technology.migrationSteps`.
- Print and the record card render a `steps` field as an `<ol>`, one item per non-empty line. Plans output must not change.

This is the only shared-code change the section needs. Do not add conditional fields (fields that appear only for some kinds). It was considered and rejected: it touches form, card, print, search and normalize for a modest gain, and empty fields are already hidden on cards and in print.

### Order within the section

The reader should see the urgent things first. Add `src/core/technology.ts` with a pure function:

```ts
export function orderTechnology(records: RecordItem[]): RecordItem[]
```

Sort by `actWhen` in the order `First day`, `First week`, `First month`, `First year`, `No rush`, then empty, then by `name` (case-insensitive), with original order as the final tiebreaker so the sort is stable. The section view and the print packet both use it. Do not reorder the stored array.

### Wi-Fi starter

When the Technology section has no records, the empty state shows a primary button, `Start with the Wi-Fi`, next to the usual add button. It opens the normal add form prefilled (using the existing `prefill` mechanism on `Target` in `src/core/readiness.ts`) with:

- name: `Home Wi-Fi`
- kind: `Home network`
- actWhen: `First day`
- whatItDoes: `Internet for every phone, TV, and computer in the house.`
- ifItStops:

  ```
  Check whether the internet is down on every device or only one. If only one, restart that device.
  Find the internet boxes. "Where it is" above says where they are.
  Unplug the power from every box. Wait 30 seconds.
  Plug in the box that the provider's cable goes into first. Wait about 5 minutes, until its lights stop blinking.
  Plug in the other boxes. Wait another 5 minutes.
  If it still does not work, call the internet provider. Their number is under "Who can help".
  ```

The prefill text lives in `src/core/technology.ts` as a constant with a unit test, not in UI code. Nothing is saved until the creator presses Save, so the creator reviews and edits it first. No bracketed placeholders: placeholder text left unedited would show up in front of the reader.

### Integration with existing logic

- **Recommendations** (`src/core/recommend.ts`): `AREA_TO_SECTIONS.technology` becomes `['technology', 'responsibilities', 'accounts']`. Add `technology` as the last entry for `digital`. The risks `internet` and `access` already map to the technology area through `RISK_TO_AREA`, so they now point at this section.
- **Audit rule 1, `area-undocumented`** (`src/core/audit.ts`): for the technology area, count the area as covered if there is any Technology record, or a responsibility with that domain as today. Its target becomes the Technology section, with the Wi-Fi starter prefill when the section is empty. Without this change the rule keeps nagging after the creator documents everything in the new section.
- **New audit rule, `technology-no-plan`**: one finding (not one per record) when one or more records with kind `Self-hosted service` or `Domain or email` have an empty `longTerm`, or have `Move to a paid replacement` with an empty `replacement`. Title: `Technology: N items have no plan for later`, with "1 item has" for one. Why: `If these stop working, your family will not know whether to replace them or let them go.` Target: the Technology section. It is dismissible and deferrable like every other finding.
- **Readiness** (`src/core/readiness.ts`): no code change. The new section joins "Address every section" for the Thorough level automatically through `SECTION_IDS`. Consequence: a plan that was Thorough drops to Core until the creator adds a record or marks Technology as not applicable. That is correct behavior; mention it in the CHANGELOG.
- **Search** (`src/core/search.ts`): no change; it loops `SECTION_IDS` and already skips private fields in privacy mode. Add a test.
- **Print** (`src/ui/print.ts`): add `technology` to `PACKET_ORDER` directly after `home`, rendered through `orderTechnology`.
- **Sample plan** (`src/core/sample.ts` and `examples/sample-plan.json`): add three fictional records: Home Wi-Fi (Home network, First day), a photo server (Self-hosted service, First month, move to a paid replacement, with migration steps that start with exporting photos), and a family domain email (Domain or email, First week, with the renewal date in `keepsRunning`). Keep the existing Wi-Fi responsibility in the sample; it shows that the two sections complement each other.

## Data, schema and migration

This is a schema change and needs a version bump.

- **Why a bump is required:** `normalizePlan` (`src/core/normalize.ts`) only reads record keys listed in `SECTION_IDS`. If release 0.2.0 opened a backup containing `records.technology`, it would silently drop every Technology record. Bumping `SCHEMA_VERSION` to 3 makes 0.2.0 refuse the file with its "made by a newer version" message instead (`detectVersion` in `src/core/migrate.ts`).
- **Migration v2 to v3:** add `migrateV2toV3` and register it in `MIGRATIONS`. It sets `schemaVersion: 3`, leaves everything else as is, and records the action `Added the new Technology section. It starts empty.` Normalization already turns a missing `records.technology` into an empty list. Do not edit `migrateV1toV2`.
- **Fixtures:** add a v2 fixture (copy of the current `examples/sample-plan.json` before this change) under `tests/fixtures/`, and update `examples/sample-plan.json` to v3.
- **Docs:** `docs/backup-format.md` gets the v3 example, a `technology` row in the field table with (P) on `location` and `access`, and a "Migration from version 2" note.
- **Coordination with other schema work:** Legacy and the other new sections also add record keys. If more than one lands before the next release, they share version 3 and one migration rather than stacking v3, v4, v5 on unreleased code. The rename pass changes `SCHEMA_ID` and storage keys separately and is not part of this work. Plans and backups from the github.io site do not need to carry over, but until the rename ships the normal migration rules still apply.

## Acceptance criteria

A non-developer can check each of these in the built app.

1. A section named Technology appears in the navigation directly after Home and utilities.
2. With the section empty, there is a `Start with the Wi-Fi` button. Pressing it opens a filled-in form; pressing Save creates a Home Wi-Fi record whose steps appear as a numbered list.
3. A record can be added for a self-hosted service with every field above, edited, and deleted.
4. Records appear ordered First day, then First week, First month, First year, No rush, then anything without a choice. The same order appears in the printed packet.
5. In the printed packet, Technology appears after Home and utilities. "Where it is" and "Where the login is stored" say "Withheld from this printout (private)" unless private details are included.
6. Privacy mode hides "Where it is" and "Where the login is stored" on screen, and search does not find text that is only in those fields.
7. Typing `password: hunter2` in any Technology field produces the "may contain a password" finding in the continuity review.
8. A self-hosted service with no "What should happen to it later" produces one finding titled "Technology: 1 item has no plan for later" (and "2 items have" when there are two).
9. Answering "mostly me" for Technology and devices in the guided start recommends the Technology section, and the "how it works is not written down" finding goes away once a Technology record exists.
10. A backup made before this change restores with the preview line "Added the new Technology section. It starts empty." and no data lost. A backup made after this change is refused by release 0.2.0 with the "newer version" message.
11. **Wife test.** Using only the printed packet or the app, with the creator not in the room, the reader can:
    - get the internet working again after a router restart, following the Wi-Fi record alone;
    - say in one sentence, for each Technology record, what it does and whether she needs to do anything this month;
    - name the paid replacement for at least one service, what it costs, and the first migration step;
    - find who to call when she is stuck.
    If she has to ask what a word means, the wording fails the test. Record results in the usability test plan (`docs/specs/usability-test-plan.md`).

## Test plan

Unit (vitest, `tests/unit/`), each failing without the change:

- `orderTechnology`: timeframe order, empty last, name tiebreak, stability, input array not mutated.
- Wi-Fi starter constant: kind `Home network`, actWhen `First day`, steps non-empty, contains no `[` placeholder.
- Migration: the v2 fixture migrates to v3 with the expected action text and identical records in every existing section; a v3 file round-trips; a file claiming schema 4 is refused.
- Normalize: unknown fields on a Technology record are dropped with a warning; select values outside the option list are handled exactly like other selects.
- Audit: `technology-no-plan` fires once for several qualifying records, not for `Home network` or `Other`, not when every service has a plan; plural wording. `area-undocumented` for technology is cleared by a Technology record. `possible-secret` fires on a Technology record.
- Recommend: technology area "mostly me" ranks Technology first among its sections.
- Search: private Technology fields are skipped when `includePrivate` is false.

Browser (Playwright, `tests/e2e/`, built file over `file://`):

- Wi-Fi starter flow: empty state, button, prefilled form, save, numbered steps on the card.
- Add a self-hosted service, reload, record persists, order is by "When to act".
- Print packet contains Technology after Home and utilities with private fields withheld.
- Restore the v2 fixture: preview shows the new migration line.
- axe check on the Technology section (empty state, form open, with records), matching the existing a11y spec in `tests/e2e/backup-print-a11y.spec.ts`.

Accessibility checks:

- The starter button and the add button have distinct accessible names.
- Steps render as real `<ol>` lists, not line breaks, so screen readers announce the count.
- Help text is connected to its field the same way as existing help text.
- Keyboard only: reach the starter, fill, save, filter by kind.

## Files likely touched

- `src/core/sections.ts` (section, fields, `steps` flag)
- `src/core/technology.ts` (new: `orderTechnology`, Wi-Fi starter)
- `src/core/plan.ts` (`SCHEMA_VERSION = 3`)
- `src/core/migrate.ts` (`migrateV2toV3`)
- `src/core/recommend.ts`, `src/core/audit.ts`, `src/core/sample.ts`
- `src/ui/views/section.ts` (empty-state starter button, ordering, steps rendering), `src/ui/print.ts`
- `examples/sample-plan.json`, `tests/fixtures/` (v2 fixture), `tests/unit/`, `tests/e2e/`
- `docs/backup-format.md`, `PROJECT_SPEC.md` (move Technology from planned to implemented), `ROADMAP.md`, `CHANGELOG.md`

No new runtime or dev dependency.

## Smallest useful version

Everything above is the smallest useful version, with one optional cut if time is short: ship without the `technology-no-plan` audit rule. Do not cut the Wi-Fi starter, the ordering, or the migration. The starter is the fastest path to the single most likely emergency, and the ordering is what makes a long list readable on a bad day.

## Out of scope

- Totals or monthly cost summaries. Costs are free text; parsing currencies is complexity the reader does not need. Revisit only if the usability test shows she wants a total.
- Conditional fields per kind (rejected above).
- Links from a Technology record to a Trusted contact or Account record. That is IMPORT_ISSUES.md item 10 and should apply to every section at once.
- Devices (phones, laptops, the server hardware itself) as things to keep, sell, or give away. That belongs in the Legacy section (`docs/specs/legacy-section.md`). Technology covers what a thing does for the family, not what it is worth.
- Mapping "When to act" onto timeline guidance. The five values are chosen to match the timeframes in `docs/specs/timeline-guidance.md` (first day, week, month, year) so that spec can pull Technology items in later without a schema change. If that spec settles on different labels, align here before building.
- Storing passwords, admin URLs with credentials, recovery codes, or Wi-Fi passwords. The `access` field points to where they live.
- Any network check, router discovery, or status probe. The app makes no network requests.

## Open questions for Noah

Not blockers for the build agent; they affect how useful this is for your household.

1. **Is your password manager self-hosted?** (UNVERIFIED, I don't know your setup.) If it is, the whole app's "point to the password manager" approach fails the day that server dies, and your wife loses access to everything else at once. No section design fixes that. Move it to a hosted manager with emergency access, or make sure an offline export exists and she knows where. This is the highest-risk item on the list.
2. **Does any account recovery go through email on your own domain?** If the domain lapses or the mail host stops, password resets for her bank and Roth IRA stop arriving. Record the domain's renewal date and auto-renew card in `keepsRunning`, set `actWhen` to `First week`, and consider whether her critical accounts should recover to an address she controls without you.
3. **Shrink the list while you're here.** The section makes your self-hosted stack legible, but the cheapest plan for her is fewer things to migrate. Any service whose answer is "Move to a paid replacement" and that she actually uses is a candidate to migrate now rather than document.
