# Spec: Reader view

Status: ready for build (slice 1), ready for build after slice 1 (slice 2)
Roadmap item: Phase 4, "Digital reader mode: a calm read-only view of the plan for the family" ([ROADMAP.md](../../ROADMAP.md)). Replaces issue draft 9 in [IMPORT_ISSUES.md](../../IMPORT_ISSUES.md).

## The problem, from the reader's side

The person reading the plan opens the app and lands on the creator's workspace: an Overview with readiness levels, "Get started", a continuity review full of suggestions, open checklist counts, status dropdowns, "Add" and "Edit" buttons on every card, and an "Export backup" button. None of that is for her. It tells her the plan is unfinished, invites her to change things she should not change, and makes her hunt for the one thing she came for (who to call about the Wi-Fi, where the will is).

The printed packet solves this on paper, but paper goes stale, private details are withheld by default, and it cannot be searched.

The reader needs one calm screen that opens on Start Here, shows only what was written down, and cannot be changed by accident.

## Why not just the printout

Keep the printout. It is the fallback when no computer works. The reader view adds three things paper cannot: it is always the current plan, it can show private details behind one deliberate click instead of on paper, and it can be searched. If neither the reader view nor the printout passes the wife test, the printout is still the safer bet, so both must stay in sync. That is why this spec reuses the printed packet's structure instead of inventing a second one.

## Definitions

- **Creator**: the person writing the plan. Uses the existing app.
- **Reader**: the person who uses the plan, under stress, without technical help.
- **Part**: one page of the reader view. Same units as the printed packet parts in `PACKET_ORDER` ([src/ui/print.ts](../../src/ui/print.ts)).

## Slice 1 (smallest useful version): read the plan in this browser

### What the reader sees

1. **Header.** The plan name (or "Our plan" when blank), then one line: "Last checked by its author on {date}." or "Its author has not marked it as checked yet." Then: "If something looks wrong or out of date, ask {trustedContact} before acting on it." (sentence left out when there is no trusted contact). Then a short reassurance: "You can't change anything here by accident."
2. **Contents.** A list of the parts that have something in them, in this order:
   1. Start Here (always shown)
   2. Do this first (emergency plans)
   3. Who to call (trusted contacts, with the "first person to contact" at the top)
   4. Who handles what
   5. People
   6. Health
   7. Home and utilities
   8. Accounts
   9. Documents
   10. Notes
   11. Personal messages (always last)

   Desktop: a left column replacing the current navigation. Phone width: a "Contents" button at the top that opens the same list. The current part is marked.
3. **One part per page.** Each part has a heading, its records as plain cards (same field labels as print), and at the bottom a "Next: {part}" button and a smaller "Back to Start Here" link. Start Here's "Next" goes to "Do this first", or the next non-empty part.
4. **Personal messages.** Each message is listed by title and "For: {audience}". The body opens only when she picks one. A message is never shown on the first screen.
5. **Top bar.** Search, Light/Dark, Print, and a "Show private details" / "Hide private details" button. Nothing else.
6. **Phone numbers and email addresses** are links (`tel:`, `mailto:`), so a tap on a phone calls. UNVERIFIED: that the strict CSP allows navigating to `tel:` and `mailto:` from a `file://` page in Chromium, Firefox and WebKit. The build agent must check this in the e2e run before relying on it.
7. **Footer.** "Switch to editing" as a plain small link. No confirmation dialog: this is not a security boundary, and pretending it is would mislead the creator.

### What the reader never sees

- Readiness levels, percentages, "Not started", counts of entries or open items
- Get started, Continuity review, Settings, Export backup
- Add, Edit, Delete, status selects, filters, any form field other than search
- Sections with no records, and sections marked "Does not apply" (even if they have records)
- The checklist (see "Checklist decision" below)
- The online-version notice (it is about where the creator's typing is saved; the reader view saves nothing). The sample-data banner, the "cannot save" banner and the damaged-data banner still show, because hiding them would be dishonest.

### Private details

- The reader view starts with private details shown or hidden according to the existing session privacy state (`ui.privacy`, which starts from `preferences.privacyDefault`).
- A hidden private value reads: "Hidden. Use Show private details at the top to see it." The current "Hidden while privacy mode is on" assumes the reader knows what privacy mode is. She doesn't.
- Search must not match hidden private text, as today ([src/core/search.ts](../../src/core/search.ts)).

### How to get into it

1. **A "Reader view" button** in the creator's top bar. This is also how the creator checks what the reader will see, which is the cheapest usability test there is.
2. **`#read` in the address.** Opening `.../planner.html#read` (or the hosted URL with `#read`) starts in the reader view at Start Here. The creator can make a desktop shortcut or bookmark named something like "Our plan". The hash is read once at startup; no hash routing beyond that.
3. **A device setting** in Settings: "Open in reader view on this device". Off by default. Stored in a new localStorage key `KEYS.openIn` (value `reader`), next to `KEYS.theme`, not in the plan. When on, every start opens the reader view. This covers the most likely real case: she double-clicks the planner on the creator's computer without a shortcut.

Why a device key and not a plan preference: a plan preference needs schema v3, a migration, fixtures and tests (see [ARCHITECTURE.md](../../ARCHITECTURE.md), "To add schema version 3"). The case it would add (a restored backup on another device opening in reader view) is covered better by slice 2. No schema change in this spec.

### Search

Ctrl/Cmd+K and the search button work as today, but in the reader view a result opens the reader part that holds it and moves focus to that record's heading. It never opens an edit dialog. Checklist hits are excluded, since the checklist isn't shown. Messages open the message.

### Checklist decision

The checklist is the creator's to-do list. The starter items ([src/core/plan.ts](../../src/core/plan.ts), `starterChecklist`) are things like "Choose two trusted backup contacts" and "Export an updated backup". Showing those to the reader under "First 24 hours", as the printed packet does today, fails the wife test: it reads as instructions to her.

So the reader view leaves the checklist out entirely. Reader-facing steps by timeframe come from the timeline guidance spec ([timeline-guidance.md](timeline-guidance.md)), which should plug in as its own part after "Do this first". The same problem exists in the printed packet; that's a separate fix, listed under Follow-ups.

### Acceptance criteria (a non-developer can check these)

- [ ] From the creator's Overview, pressing "Reader view" shows Start Here first, with the plan name and the last-checked line at the top.
- [ ] There is no button, field or menu in the reader view that changes the plan. (Search box and the private-details button are the only controls besides navigation, theme and print.)
- [ ] Browsing every part, searching, toggling private details and pressing Print leaves the saved plan byte-for-byte unchanged, including `info.updatedAt`.
- [ ] Empty sections and sections marked "Does not apply" do not appear in Contents.
- [ ] No percentages, readiness levels, counts or "not started" wording appear anywhere in the reader view.
- [ ] "Next" on each part goes to the next part in Contents order; the last part has no Next.
- [ ] Personal messages appear last, as a list, and a message body shows only after it is picked.
- [ ] Opening the planner with `#read` at the end of the address starts in the reader view.
- [ ] With "Open in reader view on this device" on, closing and reopening the planner starts in the reader view. With it off, it starts on the Overview as today.
- [ ] "Switch to editing" returns to the Overview with the full creator app.
- [ ] A private value is hidden or shown by the one button at the top, and the hidden text explains how to show it.
- [ ] A phone number on a contact card is a link that starts a call on a phone.
- [ ] The sample-data banner still appears in the reader view when sample data is loaded.
- [ ] **Wife test.** Hand the reader the creator's computer with the planner open in reader view and no other help. Without asking anyone, she can, each within about two minutes: find who to call if the internet stops working; find where the will is kept; find who could take over a named monthly bill; read a personal message addressed to her; get back to Start Here. Afterward she says she did not worry about breaking anything. Run it as part of the usability test plan ([usability-test-plan.md](usability-test-plan.md)).

### Out of scope for slice 1

- Opening a backup file to read (slice 2)
- Ticking off checklist items or any other writing from the reader view
- Reader-specific text size controls (browser zoom must work instead; see accessibility)
- Audience-specific views (partner, executor, technology helper). The parts list is the hook for them later; build nothing for it now.
- Hiding parts or records from the reader by creator choice
- A password or PIN on "Switch to editing". It would be fake security on data that sits unencrypted in the browser.
- Timeline guidance, Technology and Legacy sections. They are separate specs. The reader view must pick up new sections automatically (see unit tests).

### Files likely touched

- `src/core/reader.ts` (new): `readerParts(plan): ReaderPart[]`, the ordered list of non-empty parts. Pure, no DOM. This is where the "which parts show" decision lives, so it gets unit tests.
- `src/core/search.ts`: an option to exclude checklist hits.
- `src/core/storage.ts`: `KEYS.openIn`.
- `src/ui/store.ts`: `View` gains `{ name: 'reader'; part: ReaderPartId }`.
- `src/ui/app.ts`: reader shell (Contents instead of nav, reduced top bar), startup reading `#read` and `KEYS.openIn`, banner filtering in reader view.
- `src/ui/views/reader.ts` (new): renders one part.
- `src/ui/print.ts`: move `recordBlock` and `paragraphs` into a shared module (for example `src/ui/recordView.ts`) so print and the reader view render records the same way. The withheld label differs per medium; pass it in.
- `src/ui/searchDialog.ts`: reader-view result handling.
- `src/ui/dom.ts`: `maybePrivate` takes the mask text, or a reader variant.
- `src/ui/views/settings.ts`: the device toggle.
- `src/styles/app.css`: reader layout (readable line length around 70 characters, base text at least 18px, generous spacing).
- Docs: PROJECT_SPEC.md (move reader view to Implemented), ROADMAP.md (tick the item), ARCHITECTURE.md and PRIVACY.md (new storage key), CHANGELOG.md, README.md (one line on the reader view and the `#read` shortcut), IMPORT_ISSUES.md (remove draft 9).

### Data, schema and migration impact

- No schema change. `schemaVersion` stays 2. No migration, no new fixtures.
- One new localStorage key, `familyContinuityPlanner.openIn`. It holds no plan data. "Erase all plan data" removes it like the other non-theme keys, which is fine. The rename pass renames it with the other `familyContinuityPlanner.*` keys; use `KEYS.openIn` everywhere so the rename is one line.

### Test plan

Unit (Vitest, `tests/unit/reader.test.ts`):
- `readerParts` on a blank plan returns only Start Here.
- Empty sections and `not-applicable` sections are excluded; a section with records but status `not-applicable` is excluded too.
- Order matches the Contents order above; messages are last; checklist never appears.
- Every id in `SECTION_IDS` is placed in the reader order. This test fails when a new section (Technology, Legacy) is added without a decision about where readers see it.
- Search with checklist excluded returns no checklist hits; private fields are not matched when privacy is on (extends existing search tests).

Browser (Playwright, built file over `file://`, in every engine CI runs):
- Reader view from the top bar opens on Start Here and focus lands on its heading.
- No element matching `button, input, select, textarea, [contenteditable]` exists in the reader `main` other than the allowed ones (Next, Back to Start Here, message openers).
- Snapshot `localStorage` before; browse all parts with the sample plan, search, toggle private details, open the print dialog and cancel; snapshot after; they are identical.
- `#read` starts in reader view; the device setting persists across reload; turning it off restores the Overview.
- Empty and "Does not apply" sections are absent from Contents.
- Search result opens the right part and focuses the record heading; no dialog opens.
- Private toggle hides private text from the page and from search.
- Phone link has `href` starting `tel:`; clicking it produces no network request (the existing fixture fails on any request).
- Mobile width: Contents button opens and closes, Escape closes it, closed list is not keyboard reachable (reuse the pattern in `backup-print-a11y.spec.ts`).
- axe checks of the reader view, light and dark.

Every test above must fail on the current main branch.

### Accessibility checks

- Landmarks: `header`, `nav` labelled "Contents" with `aria-current="page"` on the current part, `main`.
- One `h1` per page (the part title); records are `h2` or `h3` in order, no skipped levels.
- After any navigation, focus moves to the part heading (existing `focusHeading` behavior).
- Fully usable by keyboard alone; visible focus on every control.
- Text reflows at 200% browser zoom and at 320px width with no horizontal scrolling.
- Contrast meets WCAG AA in both themes (axe covers this).
- The private-details button is a toggle with `aria-pressed`.
- Manual NVDA and VoiceOver passes belong to the screen-reader audit item, not this spec. Add the reader view to that audit's workflow list.

## Slice 2: open a plan to read on another device

### The problem

The plan lives in one browser on the creator's device ([PRIVACY.md](../../PRIVACY.md)). If the reader can't get into that computer, she has a backup file and the planner file, probably on a USB drive. Today her only path is Settings, "Restore a backup", a migration preview and an acknowledgement checkbox that warns about replacing data. That is a creator workflow. She would have to understand it on the worst day of her life.

### What it does

- On an empty plan, the Overview and Get started show a clear button: "I was given a plan to read". The reader view's own Start Here, when the plan is empty, shows the same button.
- It opens the file picker for a `.json` backup. The file goes through the existing pipeline (`parseBackup` in [src/core/backup.ts](../../src/core/backup.ts)): size limit, safe parse, version detection, migration, normalization. Nothing new decides anything about the data.
- On success, the plan opens straight into the reader view, held in memory only. Nothing is written to localStorage. A calm banner says: "You are reading a plan from a file. Nothing is saved on this computer. To read it again later, open the same file again."
- On failure, the existing plain-language error shows, ending with: "If you have another copy of the file, try that one."
- "Switch to editing" is not shown while reading a file. Editing a file-only plan is the restore flow's job.

### Acceptance criteria

- [ ] On a fresh browser, "I was given a plan to read" plus picking a backup shows that plan's Start Here in the reader view.
- [ ] localStorage is empty before and after reading a backup this way, including after browsing every part.
- [ ] Reloading the page returns to the empty planner, and the banner explained that beforehand.
- [ ] A v1 backup opens the same way.
- [ ] A malformed or malicious file shows the plain error and does not run script (reuse the existing malicious fixture).
- [ ] Wife test: given a USB drive with the planner file and a backup, on her own computer, she gets from double-clicking the planner to reading Start Here without help.

### Out of scope for slice 2

- Saving the file-opened plan into this browser (use Restore in Settings)
- Encrypted backups
- Remembering the file between visits

### Files likely touched

- `src/ui/store.ts`: a read-only session flag. While it is set, `persist()` refuses to write and `mutate()` is unreachable from the reader view anyway. Add a test that `persist()` does not write when the flag is set.
- `src/ui/backupFlow.ts`: `openBackupForReading()`, reusing the file picker and `parseBackup`.
- `src/ui/views/dashboard.ts`, `src/ui/views/getStarted.ts`, `src/ui/views/reader.ts`: the entry button.
- Docs: PRIVACY.md ("Reading a plan from a file" section: nothing is stored), README.md, CHANGELOG.md.

### Data, schema and migration impact

None. Reads existing v1 and v2 backups through the existing migrations.

### Test plan

- Unit: a store-level test that a read-only session never calls `setItem`.
- Browser: fresh context, open a v2 backup and the v1 fixture for reading; assert reader view content; assert `localStorage.length === 0` throughout; malicious fixture shows the error and no dialog or script effect; reload returns to the empty app.

## Setup the creator does (docs, not code)

Add to README.md under the reader view: on the computer the reader would use, turn on "Open in reader view on this device", or make a shortcut to the planner with `#read` at the end; keep a current backup and a copy of the planner file together on a drive, and tell the reader where it is. Without this step the feature doesn't help her.

## Follow-ups (separate issues, not part of this spec)

1. **Printed packet shows the creator's checklist as "First 24 hours".** Same problem as above. Fix alongside timeline guidance.
2. **Audience-specific views.** Once `readerParts` exists, an audience filter is a parameter on it. Decide after the usability test, not before.

## Decisions for Noah

1. "Open in reader view on this device" off by default, turned on by you on the computer she'd use. Recommended, because a default-on setting would drop you into reader view every time you open the planner to write.
2. Checklist left out of the reader view until timeline guidance lands. Recommended for the reason in "Checklist decision".
3. Slice 2 follows slice 1 rather than being cut. Recommended: if she can't get into your computer, slice 1 alone doesn't help her.
