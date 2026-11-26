# Spec: Self-contained plan file

Status: proposed, waiting for Noah's approval. No code until approved.
Related: reader view ([reader-mode.md](reader-mode.md), PR #13), first-run welcome screen (the "Make the flow obvious for anyone" work), Cloudflare hosting ([cloudflare.md](../cloudflare.md), PR #15), restore and schema fixes (PR #17), schema v3 claims (PRs #11 and #14).

## The problem, from the reader's side

After the creator dies, the things the plan depends on go away one by one: the domain lapses, the Cloudflare and GitHub accounts close, the creator's computer gets wiped. Today the reader needs two things to see the plan on a new device: the app (from the website, or a copy of `index.html` someone remembered to keep) and a JSON backup, plus the knowledge of how to put them together. That is two files and a technical step, on the worst week of her life.

She needs one file. Double-click it and the plan is there, with no internet, no website and no setup.

## The idea

**Save a copy** produces one HTML file: the full app with the plan embedded in it. Opened from disk it shows that plan read-only in the reader view. The same file can be imported into any copy of the app, like a JSON backup today. One file to keep instead of an app plus a backup.

What this is not: a sync mechanism, a replacement for paper, or a way to keep editing a file. The file is a snapshot. It never changes after it is saved.

## Decisions for Noah

Recommended answers first. Each is argued in the section named.

1. **No passphrase in the first version, and no passphrase by default ever.** The file's job is to open when everything else has failed. See "4. Privacy".
2. **The file shows a plain-text copy of the plan when scripts can't run** (iPhone Mail and Files previews). This is the only way the file helps on a phone. See "3. Where it works".
3. **Save a copy (HTML) becomes the main export; JSON moves under "Other formats".** Import accepts both forever. See "5. Backward compatibility".
4. **No schema change.** The embedded data is the existing backup JSON, byte for byte. See "5".

## 1. How the data is embedded

### File layout

The saved file is the running app's own HTML with two additions just before `</body>`:

```html
<div id="static-plan" class="static-plan">...plain-text copy of the plan, see section 3...</div>
<script type="application/json" id="when-im-gone-plan">{ ...backup JSON, escaped... }</script>
```

- The JSON is exactly what JSON export writes today (`serializeBackup` in [src/core/backup.ts](../../src/core/backup.ts)), including `schema`, `schemaVersion`, `exportedAt` and `exportedBy`. No wrapper, no new fields.
- `type="application/json"` makes it a data block. Browsers never run it, so it needs no CSP hash and the CSP is unchanged: `connect-src 'none'`, `default-src 'none'`, script and style hashes only.

### Escaping

Before writing, the JSON text gets five replacements: `<` to `<`, `>` to `>`, `&` to `&`, U+2028 to ` `, U+2029 to ` `. These are valid JSON escapes, so `JSON.parse` gives back the identical value. With no `<` left, user text can't close the `<script>` element or open an HTML comment, whatever the creator typed. The text stays readable in a text editor, which matches the backup-format promise that a family can recover information without the app.

Tested in this session (Chromium 158, headless, over `file://`): a message body of `x</script><script>window.PWNED=1</script><!-- <script>` plus U+2028, U+2029, `&`, accents and emoji round-trips exactly, no script runs, and there are no CSP violations or console errors.

### Where the app's own HTML comes from

The app can't read its own file (`connect-src 'none'` blocks it, and that must not change). So it keeps a copy of its own page from startup:

- `src/ui/selfCopy.ts` (new). The first statement of `main.ts` calls `captureTemplate()`, which deep-clones `document.documentElement` before any rendering. At save time, the clone gets the two blocks above (built with `h()` and `textContent`, never HTML strings), any existing `#static-plan` and `#when-im-gone-plan` removed first, and the `style` attribute that the theme script sets on `<html>` removed. Then it is serialized with `"<!doctype html>\n" + clone.outerHTML`.
- That `outerHTML` read is the one place app code touches `outerHTML`. It reads, it never assigns. It gets a single `eslint-disable-next-line` with the reason. The lint rule stays.
- The data and the plain-text copy are built in a detached clone, so nothing user-written ever passes through an HTML parser in the live page.

Tested in this session: serializing a DOM snapshot of the built file (taken before any script ran) keeps every inline `<script>` byte-identical, so the CSP hashes still match and the saved file boots with no CSP violations. Requirement for the build: no module may change the DOM at import time, because that would land in the template. A test guards it (see Test plan).

Why not a build-time copy of the HTML inside the app: a file can't contain itself, and storing a second copy doubles the size for nothing.

The file is about 112 KB plus the plan (measured: `dist/index.html` on main is 111.8 KB).

## 2. What happens on open

On startup the app looks for `#when-im-gone-plan`.

**No block (the normal app):** unchanged.

**Block found (a saved copy):**

1. The text goes through the existing pipeline: `parseBackup` (size limit, safe parse, version detection, migration, normalization). Nothing new decides anything about the data. Pure logic lives in `src/core/embedded.ts` with unit tests.
2. The plan is held in memory and shown in the reader view (reader-mode.md slice 1), opening on Start Here.
3. **The saved copy never writes the plan to storage.** In Chromium every HTML file opened from disk shares one storage area ([SECURITY.md](../../SECURITY.md); confirmed in this session with a persistent Chromium profile). If the saved copy wrote its plan to storage, opening an old copy would overwrite the creator's working plan in the same browser. Theme and other device keys may still be written. Firefox and Safari storage rules for `file://`: UNVERIFIED, and it doesn't matter because the rule is "never write the plan".
4. A banner that cannot be dismissed, at the top of every page:

   > This is a copy of the plan saved on **28 November 2026**. It doesn't change. If you have a copy with a later date, use that one instead.

   When the copy is over a year old, add: "This copy is more than a year old. Some details may have changed." Honest, no alarm. The date is `exportedAt` (shown in the reader's local date format). If `exportedAt` is missing or invalid, use `info.updatedAt` and say "last changed on" instead.

5. If storage already holds a plan, a second line: "This browser also has a plan saved in it, last changed on {date}. [Open that one]". It opens the normal app with the stored plan. The saved copy doesn't guess whether they're the same plan; there is no plan id in the schema and adding one isn't worth a schema bump.

### Editing means importing

The reader view's footer link reads **"Make changes"** instead of "Switch to editing". It opens a dialog:

> Changes are saved in this browser, not in this file. This file stays as it is. When you're done, use Save a copy to make a new file.

- **Storage is empty:** one button, "Make changes in this browser". The plan is saved to storage like a restore, and the session switches to the normal app.
- **Storage holds a plan:** the existing restore preview and acknowledgement (from `backupFlow.ts`), with both dates side by side: "In this browser: {name}, last changed {date}. In this file: {name}, saved {date}." If the stored plan changed after the file was saved, the first line of the dialog says so in bold, and the default button is "Keep the one in this browser". Replacing needs the existing acknowledgement checkbox.

Reopening the file later shows the saved copy again, read-only, with the "Open that one" link. That is the whole stale-snapshot guard: a saved copy can only replace newer data through a dialog that shows both dates and needs a checkbox.

## 3. Where it works, and the fallback

Two kinds of failure: the platform won't run the file's scripts (a preview), or it won't open an HTML file from disk at all (policy). The plain-text copy covers the first. Paper and PDF cover the second.

### The plain-text copy

Inside `#static-plan`: the plan rendered as plain HTML (headings, paragraphs, lists) using the shared record renderer the reader-mode spec moves out of `print.ts` (`src/ui/recordView.ts`), in reader order, Start Here first, personal messages last. No scripts, no forms, no links except `tel:` and `mailto:`. It starts with the same saved-on line as the banner.

- It is built with `h()` in the detached clone, so all user text is escaped by the serializer. It lives in a normal `<div>`, not `<noscript>`: when scripting is on, the serializer writes text that is a direct child of `<noscript>` without escaping, which is an injection risk.
- It is styled only by classes in the existing hashed stylesheet. No `style` attributes, which the CSP would block.
- When scripts run, it is hidden before first paint: the existing inline theme script in `<head>` also adds a `js` class to `<html>`, and the stylesheet hides `.js .static-plan`. The app then removes the element. The theme script's hash changes; post-build already recomputes it.
- Private fields are included. The JSON in the same file already contains them in readable form, so hiding them here would only pretend.
- The existing `<noscript>` "needs JavaScript" message is hidden when `#static-plan` is present.

Smallest useful version: no styling beyond readable defaults. It's a fallback.

### Platform matrix

Only the first row was tested. Everything else is UNVERIFIED and is the manual test Noah runs before release (see Acceptance criteria).

| Where | Expected | Source |
|---|---|---|
| Chromium (Chrome, Edge), Windows, Mac, Linux, double-click from disk | Full app, reader view, Make changes works. `isSecureContext` is true and `crypto.subtle` exists. | Tested in this session on Linux headless Chromium 158. Windows and Mac: UNVERIFIED but same engine. |
| Firefox desktop, from disk | Full app. Storage per file or per folder. | UNVERIFIED. CI already runs Firefox; the e2e suite covers it. |
| Safari on Mac, from disk | Full app. | UNVERIFIED. CI runs WebKit, which is close but not Safari. |
| iPhone, Mail attachment preview | Quick Look shows the page with scripts off: the plain-text copy, readable. | UNVERIFIED. Belief: iOS Quick Look does not run JavaScript in HTML. |
| iPhone, Files app | Same as Mail (Quick Look). There is no reliable way to run a local HTML file's scripts on iPhone without a third-party app. | UNVERIFIED |
| Android, Gmail attachment / Files | Probably opens in Chrome with scripts on, or in a viewer with scripts off. Either way she sees the plan. Storage from a `content://` address may not work; the saved copy doesn't need it. | UNVERIFIED |
| Chromebook, Files app | Opens in Chrome, full app. Managed (school or work) Chromebooks may block local files. | UNVERIFIED |
| Webmail in a browser (Gmail, Outlook) preview | Preview strips scripts or refuses HTML; download then open. | UNVERIFIED |
| Work email (Microsoft 365, Google Workspace) | HTML attachments are a common phishing vector and are often blocked, quarantined or flagged by policy. | UNVERIFIED, likely |
| Locked-down browser (work laptop, kiosk, policy blocks `file://`) | May not open at all. | UNVERIFIED |

**What this means for the reader:**

- On a computer: double-click works. That's the main path.
- On a phone: she can read the plan, not use the app. No search, no private-details toggle. Say so plainly in the export guidance.
- Don't rely on email to deliver the file. Email the PDF if email is the only way.
- **Print and PDF stay the guaranteed fallback.** Paper works with no device. The Save a copy dialog ends with "Also print a copy" (opens the existing print dialog), and the guidance below keeps paper in the plan.

The file is only as permanent as browsers' willingness to run local HTML. That has held for decades, but browser vendors do tighten `file://` from time to time (UNVERIFIED as a trend). Paper is the floor.

## 4. Privacy

This file is the whole plan in readable form, and it will be emailed, put on USB drives and copied to cloud folders. Anyone who gets the file can read everything in it, including private fields, with a text editor. The export dialog says that in one sentence:

> Anyone who has this file can read everything in it. Keep it where you'd keep a paper copy.

### Optional passphrase: evaluated, not recommended now

A passphrase would be WebCrypto AES-GCM (256-bit key) with PBKDF2-SHA256 (at least 600,000 iterations, random 16-byte salt, random 12-byte IV), all in the browser, no dependency. `crypto.subtle` is available on `file://` in Chromium (tested in this session); Safari, Firefox and Android: UNVERIFIED.

Against it:

1. **The failure it creates is worse than the one it prevents.** A forgotten or lost passphrase means the family loses the plan permanently, exactly when they need it. A leaked file means a stranger reads contact details, account names and where things are kept. By design it holds no passwords (PROJECT_SPEC.md principle 2).
2. **It kills the phone fallback.** An encrypted file can't carry a plain-text copy, so iPhone previews show nothing useful.
3. **The plan is already unencrypted** in the browser, on paper and in the PDF. Encrypting one copy changes little.
4. **Getting the passphrase to her is the same problem the plan already solves.** It would have to sit in the password manager (she then needs emergency access, which the plan is supposed to explain) or on paper (next to the USB drive, which defeats it).

**Recommendation:** no passphrase in this feature. Default, if ever built: off. Revisit only if usability testing or a real incident shows copies leaking. If built later, these rules apply:

- The passphrase never travels with the file (not in the same email, not on the same drive).
- It goes on the first page of the printed packet kept with the will, and in the password manager's emergency-access notes.
- The file carries a plain-text page outside the encryption: "This plan is locked. The passphrase is in {hint the creator wrote}." No plan data in it.
- A wrong passphrase gets a calm message and unlimited retries.
- Saving an encrypted copy requires typing the passphrase twice and opening the file once to prove it works.

Guidance for the unencrypted file instead: keep fewer copies in fewer places (section 6), don't email it, use the private-fields marking for the most sensitive details, and use an encrypted USB drive if you want encryption (PRIVACY.md already says this).

## 5. Backward compatibility

- **Each file carries its own app.** A file saved today runs today's code forever, regardless of what later versions change. The version is in `exportedBy` and shown in the reader footer: "Saved with When I'm Gone 0.3.0".
- **Import accepts both formats.** `chooseBackupFile` accepts `.json` and `.html` (`accept="application/json,.json,text/html,.html"`). `src/core/embedded.ts` exports `extractEmbeddedBackup(text): string | null`: find `<script ... id="when-im-gone-plan" ...>` and return the text up to the next `</script>` (safe because the writer escapes every `<`). The result goes into `parseBackup` like a JSON file. A `.html` file with no block: "This file doesn't contain a saved plan. Use a file made with Save a copy, or a backup ending in .json."
- **Size limits.** The extracted JSON keeps the existing 10 MB limit. The whole HTML file is limited to 12 MB before extraction.
- **Newer files in older apps.** An app older than the file's schema already refuses with a message. For HTML files, the message adds: "This file can open on its own: double-click it." Apps released before this feature reject HTML files as unreadable. That's acceptable because the file opens by itself.
- **The welcome screen and reader-mode slice 2** ("opening a plan someone left for you") accept `.html` too. No change to their flow; they call the same import path.
- **No schema change.** `schemaVersion` stays whatever the app is on when this ships (2 today; v3 if PR #11 or #14 lands first). The embedded JSON follows the schema of the app that saved it, and migrations apply on import as they already do. No fixture changes beyond adding HTML fixtures.
- **The rename.** The element id uses the new name from the start (`when-im-gone-plan`), so the rename pass doesn't touch it. The backup `schema` id inside the JSON is the rename pass's decision; extraction doesn't look at it.
- **Once real plans exist** (Noah's rule): the element id, the escaping and the `#static-plan` id become a format. Changing any of them needs extraction code that still reads the old form, plus a fixture of the old file.

## 6. Naming and where to keep copies

- **File name:** `when-im-gone-plan-YYYY-MM-DD.html`, local date. No plan name in the file name: the name is visible in email subjects, file lists and on shared drives. A second save on the same day gets the browser's usual " (1)".
- **Inside the file:** the `<title>` is "{plan name}, saved {date}" so the browser tab says which copy it is.
- **Guidance**, in the Save a copy dialog (two lines) and in README.md (full):

  1. Keep three current copies: a USB drive at home next to the printed packet; one with someone you trust (the executor, or the trusted contact) on a USB drive or in their own cloud storage; one in cloud storage the reader can still get into after you're gone (her own account, not yours: your accounts may be locked).
  2. When you save a new copy, replace the old ones and delete them. An old copy in a drawer is the most likely way someone acts on out-of-date information. The banner date helps, but only if they compare.
  3. Print a fresh packet at the same time. Paper doesn't need a working computer.
  4. Don't email it. If you must, email the PDF.

The existing "Last backup is over N days old" check (`backup-old` in [src/core/audit.ts](../../src/core/audit.ts)) counts Save a copy as an export, through `info.lastExportedAt`, which both formats set.

## Acceptance criteria

A non-developer can check each of these.

- [ ] In the app, "Save a copy" downloads one file named `when-im-gone-plan-<today>.html`.
- [ ] With the internet off, double-clicking that file on Windows (Edge or Chrome) and on a Mac (Safari) shows the plan's Start Here in the reader view, with the "saved on" banner and the right date.
- [ ] Nothing in the saved copy changes the plan. After browsing it, the plan in the normal app on the same computer is unchanged, including its "last changed" date.
- [ ] Opening an older saved copy while a newer plan is in the browser, then choosing Make changes, shows both dates and keeps the newer plan unless the checkbox is ticked and Replace is chosen.
- [ ] Importing the HTML file into a copy of the app (Settings, Restore) works the same as importing the JSON backup of the same plan, and gives the same plan.
- [ ] An existing JSON backup still imports.
- [ ] On an iPhone, opening the file from Mail and from the Files app shows the plan as readable text (UNVERIFIED until tried; if it fails, the release notes and guidance say phones need the PDF).
- [ ] On an Android phone, opening the file shows the plan (app or text).
- [ ] Re-saving from a saved copy that was opened with Make changes produces a working file (a copy of a copy works).
- [ ] **Wife test.** Give her a USB drive with only this file, on her own computer, offline, no help. She opens it, reads Start Here, finds who to call about the Wi-Fi, and can say how old the copy is. Run it in the usability test ([usability-test-plan.md](usability-test-plan.md)).

## Out of scope

- Passphrase or encryption (section 4)
- Editing inside the file, or writing changes back into the file
- Detecting whether two copies are the same plan (no plan id)
- Opening the app's scripts on iPhone (no reliable way without a third-party app)
- Removing JSON export
- Automatic reminders to save a new copy (review reminders is its own roadmap item)
- Generating a PDF inside the app; the browser's print to PDF stays the way

## Files likely touched

- `src/ui/selfCopy.ts` (new): capture the template at startup, build the saved file.
- `src/core/embedded.ts` (new): `escapeJsonForHtml`, `extractEmbeddedBackup`, `savedCopyFileName`, banner date and age logic. Pure, unit tested.
- `src/main.ts`: `captureTemplate()` first, then branch on the embedded block.
- `src/ui/backupFlow.ts`: `saveCopy()`, HTML in the file picker, the Make changes dialog (reusing the restore preview).
- `src/ui/store.ts`: a read-only "saved copy" mode that never calls the plan save.
- `src/ui/app.ts`: banner, "Open that one" link, Save a copy as the main export button.
- `src/ui/recordView.ts` (from the reader-mode spec): render the plain-text copy.
- `src/index.html`: theme script adds the `js` class; `<noscript>` text.
- `src/styles/app.css`: `.js .static-plan { display: none }`, plain styles for `.static-plan`.
- Docs: `docs/backup-format.md` (new section "Saved copy (HTML)"), README.md (where to keep copies), PRIVACY.md and SECURITY.md (the file is readable by anyone who has it; storage rule), ARCHITECTURE.md (selfCopy and the one `outerHTML` read), CHANGELOG.md, PROJECT_SPEC.md (status).

## Data, schema and migration impact

None. The embedded data is the current backup JSON. No new localStorage keys. New test fixtures: a saved copy HTML file from this version, kept forever.

## Test plan

Unit (Vitest, `tests/unit/embedded.test.ts`):
- `escapeJsonForHtml` output contains no `<`, `>`, `&`, U+2028 or U+2029, and `JSON.parse` of it equals the input, for a plan with hostile strings in every field type.
- `extractEmbeddedBackup` finds the block regardless of attribute order; returns null with no block; returns the first block only; handles a file truncated mid-block (null, then the "damaged" message).
- An HTML fixture and the JSON backup of the same plan give identical `parseBackup` results.
- Banner date: `exportedAt` used when valid, falls back to `updatedAt`, the over-a-year line appears at 366 days and not at 364.
- File name uses the local date.

Browser (Playwright, built file over `file://`, Chromium, Firefox and WebKit):
- Save a copy from the sample plan; open the download: reader view shows, banner date matches, no `securitypolicyviolation` events, no console errors, no network requests (existing fixture).
- Hostile plan (message body `</script><script>window.PWNED=1</script>`, `<!--`, `</div>`, `</noscript>`): saved copy opens with `window.PWNED` undefined, and the text displays literally in the reader view and in the plain-text copy.
- Storage snapshot before and after browsing the saved copy, in a context that already holds a different plan: identical.
- Make changes with empty storage saves and switches to the app; with a newer stored plan, the dialog shows both dates and Cancel leaves storage identical.
- Copy of a copy: save from a saved copy, open the result, it works and has exactly one data block and one plain-text block.
- Template purity: open the built app, save a copy of a blank plan, and check the saved file's `<head>` and app shell match the built file's (no rendered views leaked into the template).
- Scripts off (`javaScriptEnabled: false`): the plain-text copy is visible and contains Start Here text and a contact's phone number; the "needs JavaScript" message is hidden.
- Import: Restore accepts the saved copy and an HTML file with no block shows the new message.

Every test above must fail on the current main branch.

## Accessibility checks

- The saved-on banner is part of the page, read before the content (not a live region that repeats).
- The plain-text copy has one `h1`, ordered `h2`/`h3`, and `lang` from the template.
- axe on the saved copy, light and dark, and on the plain-text copy with scripts off.
- Make changes dialog: focus moves into it, Escape cancels, the default button is the safe one.

## Smallest useful version

Slice 1: Save a copy, open read-only with the banner, Import accepts HTML, Make changes with the two-date dialog, the plain-text copy. That's the whole spec minus the passphrase.

Cutting the plain-text copy would make slice 1 smaller, but then the file does nothing on a phone, which is likely where the email lands. Keep it.

Depends on: reader-mode slice 1 (the reader view and `recordView.ts`). If this ships first, open the saved copy in the normal app with editing controls hidden, and switch when the reader view lands.

## Proposed edits to other docs when this is approved

- ROADMAP.md, Phase 4: add "Save a copy: one HTML file with the plan inside that opens offline (docs/specs/self-contained-plan-file.md)".
- ROADMAP.md: change "Encrypted backups (see SECURITY.md for the conditions)" to "Encrypted backups: not planned; see docs/specs/self-contained-plan-file.md, section 4".
- reader-mode.md slice 2: "The file picker opens for a `.json` backup" becomes "for a saved copy (`.html`) or a `.json` backup".
