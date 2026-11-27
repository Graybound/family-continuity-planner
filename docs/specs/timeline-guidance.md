# Timeline guidance: first day, week, month, year

Status: proposed. Roadmap: Phase 4, "Timeline guidance: first day, first week, first month, first year" ([ROADMAP.md](../../ROADMAP.md)). Supersedes issue draft 8 in [IMPORT_ISSUES.md](../../IMPORT_ISSUES.md) (see "Why not timeframes on checklist items" below).

## Problem, from the reader's side

The reader opens the plan on a bad day and has one question: **what do I have to deal with now, and what can wait?**

Today the plan answers only the first few hours. The printed packet has "Immediate actions" (emergency plans plus the "First 24 hours" checklist group, `src/ui/print.ts`), and the default Start Here text says "very little here is urgent" (`DEFAULT_START_HERE` in `src/core/plan.ts`). After that, everything is a flat list of sections. The reader can't tell whether the Roth IRA, the self-hosted services, the car registration and the Wi-Fi are a this-week problem or a next-year problem, so everything feels urgent. That is the overwhelm the product exists to reduce.

The creator already knows the answer for each job they do. There is just nowhere to write it down.

## What we build

1. **One new field on "Who handles what" records:** "When does this need attention?" with the options First day, First week, First month, First year, No rush. Blank means "not on the timeline".
2. **A "What to do, and when" part of the printed packet** that replaces "Immediate actions". It has four fixed timeframes, each opening with two or three sentences of plain default guidance, followed by what the creator assigned to it. A short "No rush" list closes it.
3. **A pure core function** `buildTimeline(plan)` that produces that structure, so print uses it now and reader mode (`docs/specs/reader-mode.md`) renders the same thing on screen later.

### What goes in each timeframe

| Timeframe | Contents, in this order |
|---|---|
| First day | Default guidance. Every emergency plan (full steps, as today). Every checklist item in the "First 24 hours" group. Responsibilities set to First day. |
| First week | Default guidance. Responsibilities set to First week. |
| First month | Default guidance. Responsibilities set to First month. |
| First year | Default guidance. Responsibilities set to First year. |
| No rush | One sentence, then the titles of responsibilities set to No rush. Left out entirely when there are none. |

Within a timeframe, records keep their stored order. A responsibility shows its name, "What to do with it later" (`guidance`), "Who could take it over" (`backupPerson`) and "Who can help" (`whoCanHelp`), each only when filled in, plus the line "Full details: Who handles what". No private field of a responsibility appears in the timeline, whatever the print setting, because the full record still prints in its own section with the normal privacy rules. Emergency plans print in full under First day and follow the normal print privacy setting, exactly as they do under Immediate actions today.

The four timeframe headings always print, even in an empty plan, because the default guidance on its own ("money and paperwork can wait today") is the most useful sentence a blank plan can give. This matches principle 6, progressive usefulness.

### Default guidance copy (draft, to be checked in the usability test)

Fixed text, not editable in this version. Region neutral, family neutral, no legal or financial instruction. It names grief and loss plainly: sadness is allowed, only gratuitous or graphic language is not. It has to work whether the creator has died or is alive but can't help, so where the two differ it says so in one plain clause instead of avoiding the subject.

- **First day.** Today is about people, not paperwork. You may be in shock or grieving, and that is allowed to take up the whole day. Make sure everyone at home, including children and pets, is safe and looked after, and call the first person to contact. Money, accounts and decisions can wait.
- **First week.** Let the people who need to know, know. If they have died, this is often the week of planning a funeral or memorial, and you can ask a trusted contact to take on parts of it. Keep the basics running: food, medicine, care routines. Keep phones, email and the internet working, because they are often how you get into everything else. You do not need to cancel, sell or close anything this week.
- **First month.** Grief often hits harder once the first rush is over, so go slowly. Make sure essential bills keep getting paid and the home stays running. Gather the papers listed under Documents. If there is a will or other legal paperwork, this is a good time to talk to the person named in it or a professional you trust.
- **First year.** Bigger decisions belong here, not earlier: what to keep, simplify, hand over, cancel or sell. Yearly things like taxes and renewals will come around. The first birthdays, holidays and anniversaries can be hard; it helps to plan for them and let people in. Take the rest one at a time, and ask for help.
- **No rush.** These have no deadline. Come back to them when you are ready, or when something needs fixing.

Section intro, under the heading "What to do, and when": "A rough order for what needs attention. It is fine to go slower than this. Nothing here replaces a will or advice from a professional."

### Field definition

In `SECTIONS.responsibilities.fields` (`src/core/sections.ts`), placed directly after `guidance`:

```ts
{ key: 'timeframe', label: 'When does this need attention?', type: 'select', options: TIMEFRAMES,
  help: 'If you could not help tomorrow, how soon would someone need to deal with this? Leave blank to keep it off the timeline.' }
```

with an exported constant in the same file:

```ts
export const TIMEFRAMES = ['First day', 'First week', 'First month', 'First year', 'No rush'] as const;
```

The Technology and Legacy sections (`docs/specs/technology-section.md`, `docs/specs/legacy-section.md`) should reuse `TIMEFRAMES` with the same field key if they want their records on the timeline. That is a follow-up for those specs, not part of this one.

### Small fixes this depends on

- **Starter checklist.** `starterChecklist()` puts "Choose two trusted backup contacts" in "First 24 hours". That is a job for the creator, but the packet prints it under the reader's first-day actions today. Move it to "People to brief" and add a real first-day item in its place: title "Call the first person to contact", note "Their name is on the cover page and under Trusted contacts." Affects new plans only.
- **Default Start Here text.** `DEFAULT_START_HERE` is owned by the separate "Start Here as a last message" work, not this spec. Its practical part points readers at "Immediate actions". Whichever of the two changes ships second updates that one reference to "What to do, and when", and touches nothing else in the text. Custom Start Here text that still says "Immediate actions" keeps it; acceptable before real plans exist.
- **Copy that names "immediate actions".** The print dialog description (`src/ui/printDialog.ts`) and the Settings print card (`src/ui/views/settings.ts`) change to say "what to do, and when".
- **Sample plan.** Give the sample responsibilities timeframes so the feature shows up in the demo: monthly bills First month, taxes First year, Wi-Fi No rush, furnace First year, Biscuit First day.

## Acceptance criteria

A non-developer can check each of these with the built app and a printout.

1. Editing a "Who handles what" entry shows "When does this need attention?" with First day, First week, First month, First year and No rush, and a blank choice. Saving keeps the choice, and the entry's card shows it.
2. Printing any plan, including an empty one, shows "What to do, and when" right after Start Here and before Trusted contacts, with First day, First week, First month and First year in that order, each with its default guidance.
3. An entry set to First month appears under First month in the printout, with its "what to do with it" and "who can help" if they were filled in, and nowhere else in the timeline. An entry left blank does not appear in the timeline. Both still appear in full under "Who handles what".
4. Emergency plans and "First 24 hours" checklist items appear under First day, as they did under Immediate actions.
5. Other checklist groups (Information to gather, People to brief, Quarterly upkeep) do not appear in the timeline.
6. "No rush" appears only when at least one entry uses it.
7. No private detail from a "Who handles what" entry appears in the timeline, even when the printout includes private details. Emergency plans follow the print setting, as today.
8. A backup exported after setting timeframes restores with the timeframes intact. A backup from before this change restores with no warnings and no timeframes set.
9. A new blank plan's "First 24 hours" list says "Call the first person to contact", not "Choose two trusted backup contacts".
10. **Wife test.** Given the printed sample packet (or her own), the reader can answer, alone and in under a minute each: "What do I need to do today?", "What can wait until next month?", and "Does [a named account or service] have to be dealt with this week?" This is checked in the usability test (`docs/specs/usability-test-plan.md`), not by the build agent, and copy changes that come out of it are expected.

## Out of scope

- Editing or hiding the default guidance text. Revisit after the usability test if the creator or reader needs it.
- Timeframes on any section other than "Who handles what" (accounts, documents, home, and the planned dedicated sections).
- Timeframes on checklist items, and any change to checklist groups beyond the starter item fix.
- An on-screen timeline view. Reader mode renders `buildTimeline()`; until then the creator sees the result in print preview.
- Dates. Timeframes are relative to "when something happens", which the app cannot know. No countdowns, reminders or "overdue".
- New audit rules or readiness requirements (for example "mostly me" areas with no timeframe). Possible later, deliberately left out to keep this small.
- Event-based guidance ("if the Wi-Fi stops working"). That is a lookup problem for reader mode and the Technology section, not a timeline problem.
- Audience-specific packets.

### Why not timeframes on checklist items

Issue draft 8 proposed assigning checklist items to timeframes. The checklist is mostly the creator's own to-do list ("Information to gather", "Quarterly upkeep", items with done boxes and due dates). The knowledge the reader needs, like "the Roth IRA can wait a few months, here is who helps", already lives in "Who handles what" records, which have owner, backup, who can help and what to do later. Putting the timeframe there means one field, no new record type, and no duplicate entry for each job. "First 24 hours" stays as it is for one-off first-day actions. If a creator needs a one-off later action ("tell my employer"), it fits as a "Who handles what" entry with area Work and a timeframe.

The checklist mixing creator to-dos with reader actions is a wider design problem. It is noted here, not fixed here.

## Files likely touched

- `src/core/sections.ts`: `TIMEFRAMES` constant, new `timeframe` field on responsibilities.
- `src/core/timeline.ts` (new): `buildTimeline(plan)` and the default guidance strings. Pure, no DOM.
- `src/core/plan.ts`: `starterChecklist()` fix only (plus the one "Immediate actions" reference in `DEFAULT_START_HERE` if this ships second, see above).
- `src/core/sample.ts`: timeframes on sample responsibilities.
- `src/ui/print.ts`: replace the `immediate` packet part with `timeline` rendered from `buildTimeline()`; `PacketPart` and `PACKET_ORDER` updated.
- `src/ui/printDialog.ts`, `src/ui/views/settings.ts`: copy only.
- `src/styles/print.css`: only if the timeline needs `break-inside: avoid` on entries.
- `tests/unit/timeline.test.ts` (new), `tests/e2e/backup-print-a11y.spec.ts`.
- Docs: `docs/backup-format.md` (field table), `PROJECT_SPEC.md` (move timeline guidance from Partially implemented to Implemented), `ROADMAP.md` (tick the item), `CHANGELOG.md`, `IMPORT_ISSUES.md` (mark draft 8 as superseded by this spec).

Suggested shape of the core output, so print and reader mode agree:

```ts
export type TimeframeId = 'day' | 'week' | 'month' | 'year' | 'no-rush';
export interface TimelineEntry { section: 'plans' | 'responsibilities'; id: string; title: string }
export interface TimelineGroup {
  id: TimeframeId; label: string; guidance: string;
  plans: RecordItem[];          // First day only
  firstDayChecklist: ChecklistItem[]; // First day only
  entries: TimelineEntry[];     // responsibilities, stored order
}
export function buildTimeline(plan: Plan): TimelineGroup[];
```

The UI looks up the responsibility by id for the extra lines. Exact names are up to the build agent; the rule is that every decision about what goes where lives in `src/core/timeline.ts`.

## Data, schema and migration

- **Ships inside schema version 3.** Version 3 is already on main (it carries Belongings, Technology and the "opened on their device" checkbox) but has not shipped in a release (v0.2.0 is version 2). So `timeframe` joins version 3 instead of needing its own bump: older builds refuse version 3 files with the clear "made by a newer version" message rather than silently dropping the field. `normalizeRecord` (`src/core/normalize.ts`) stores `''` for a missing field, so the existing v2 to v3 migration needs no extra step for it. Add `timeframe` to the version 3 notes in `docs/backup-format.md`. If a release ships version 3 before this is built, this needs a version 4 instead.
- **Decision:** fold into version 3 (approved to proceed in November 2026, replacing the earlier "no bump" recommendation).
- **Unknown values.** `normalizeRecord` does not check select options, so a hand-edited backup could hold `timeframe: "Next Tuesday"`. `buildTimeline` ignores any value not in `TIMEFRAMES`: the entry stays off the timeline and still shows in its section. No crash, no warning needed.
- **v1 backups.** v1 had no responsibilities section (`src/core/migrate.ts`), so no impact.
- **Fixtures.** Add a v3 fixture with timeframes set (including one unknown value) for the round-trip and unknown-value tests. Existing fixtures without the field stay as the "before this change" case.

## Test plan

Each test must fail without the change.

**Unit (`tests/unit/timeline.test.ts`, vitest)**
- Blank plan: four groups in order (day, week, month, year), each with non-empty guidance, no entries, no "no-rush" group.
- Emergency plans and "First 24 hours" items land in First day, in stored order, ahead of responsibilities; other checklist groups are excluded.
- Each of the five timeframe values lands in the matching group; blank and unknown values land nowhere.
- "No rush" group present only when used.
- Done state of checklist items does not filter them out (the checklist's done box is the creator's tracking, not the reader's).
- `starterChecklist()`: First 24 hours contains "Call the first person to contact" and not "Choose two trusted backup contacts".
- Normalize: a record without `timeframe` gets `''` and produces no problem messages; a record with `timeframe` round-trips through export and normalize unchanged.

**E2E (`tests/e2e/backup-print-a11y.spec.ts`, Playwright over `file://`)**
- Replace the "Immediate actions" order assertions with: "Start here" before "What to do, and when" before "Trusted contacts"; "First day", "First week", "First month", "First year" appear in order.
- With the sample plan loaded: "Paying the monthly bills" appears between the "First month" and "First year" headings; "Home Wi-Fi and devices" appears under "No rush".
- Set a timeframe through the edit form, reload, confirm it persisted and shows on the card.
- Print with private details included: the private `recordsLocation` text of a timed entry does not appear inside the timeline part.
- Export, erase, restore: timeframes survive.

**Accessibility**
- The new select has a visible label and help text tied with `aria-describedby`, like other fields (axe check on the edit dialog passes).
- Packet structure: one `h2` for "What to do, and when", `h3` per timeframe, entries in lists. No heading levels skipped (axe check on the packet passes).
- Timeline entries do not split across printed pages (`break-inside: avoid`), checked by eye in print preview on US Letter.
- No meaning carried by color alone; timeframe names are text.

## Smallest useful version

One select field, one core function, one print part, four paragraphs of default copy, and a starter checklist fix. That gets the reader a printed answer to "what now, what later" and gives reader mode something to render.

Deliberately left out: editable guidance, timeframes on other sections or checklist items, an on-screen view, audit nudges, and anything date-based. Each one waits for evidence from the usability test that the reader needs it.
