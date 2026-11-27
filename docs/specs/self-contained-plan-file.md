# Spec: Self-contained plan file

Status: proposed, waiting for Noah's approval. No code until approved.
Related: reader view ([reader-mode.md](reader-mode.md), PR #13), first-run welcome screen (the "Make the flow obvious for anyone" work), Cloudflare hosting ([cloudflare.md](../cloudflare.md), PR #15), restore and schema fixes (PR #17), schema v3 claims (PRs #11 and #14).

Everything marked UNVERIFIED was not tested. Everything marked "Tested" was run in this session against the current `main` build in headless Chromium 158 on Linux over `file://`. No phone, mail app, Safari or Firefox was tested.

## The problem, from the reader's side

After the creator dies, the things the plan depends on go away one by one: the domain lapses, the Cloudflare and GitHub accounts close, the creator's computer gets wiped. Today the reader needs the app (from the website, or a copy of `index.html` someone remembered to keep) plus a JSON backup, and has to know how to put them together. She also can't keep the plan up to date without the website.

She needs one file. Open it and the plan is there, offline. She can read it on any device, and change it on a computer, with no website, no account and no upload.

## The idea

**Save** produces one HTML file: the full app with the plan inside it. Double-click it on a computer and it is the normal, editable app, opened on that plan. Open it somewhere scripts can't run (a phone preview, a mail app) and it still shows the whole plan as a plain readable page, with instructions at the top for opening it properly. The same file imports into any copy of the app, like a JSON backup today.

## Decisions for Noah

Recommended answers first. Each is argued in the section named.

1. **Each file is self-contained; no plan id** (Noah, 26 November 2026, replacing the earlier plan id design). Opening a file always shows the plan inside it. Browser storage only holds a crash-safety draft keyed to the file's own address. There is no newer/older comparison between files. See "2".
2. **Save always makes a new, uniquely named file** (`WhenImGone_2026-11-26_1432.html`, Noah's naming decision). By default it downloads. On Chrome and Edge desktop, an optional setup lets Save write the new file straight into a chosen folder instead of Downloads. **Saving over the same file is dropped**: it would leave an old date in the name of the newest copy, which breaks "the latest date in the name is the newest". See "2" and "10".
3. **iPhone: read in the preview, edit on a computer.** There is no built-in way to run a local HTML file's scripts on iPhone. The only free route found (an Apple Shortcut) can't keep changes between visits. See "5. Running it on phones".
4. **No .webarchive.** It doesn't open on Windows, Android, Chrome or Firefox, and nothing shows it runs scripts on iPhone. See "7".
5. **No passphrase.** Decided by Noah, 26 November 2026: no passphrase by default, and the plan never stores secrets. Final call from the secrets handoff work (PR #26): no passphrase, not even optional. This spec builds none. See "8".
6. **Save makes an export set** (Noah's decision, 26 November 2026): the HTML file plus a PDF from the browser's print dialog, with the same timestamp in both names. Same HTML for every browser, no per-browser builds. Plus an in-app step to open the copy once on the family's own device, with a checkbox to record that it worked. The checkbox is a plan field, so it rides in schema v3. See "6".

## 1. How the data is embedded

### File layout

Every saved file is the running app's own HTML with two additions:

```html
<body>
<div id="static-plan" class="static-plan">...readable plan plus opening instructions, section 3...</div>
...the app's normal markup...
<script type="application/json" id="when-im-gone-plan">{ ...backup JSON, escaped... }</script>
</body>
```

- The JSON is exactly what JSON export writes (`serializeBackup` in [src/core/backup.ts](../../src/core/backup.ts)), including `schema`, `schemaVersion`, `exportedAt` and `exportedBy`. No wrapper.
- `type="application/json"` makes it a data block. Browsers never run it, so it needs no CSP hash and the CSP is unchanged: `connect-src 'none'`, `default-src 'none'`, script and style hashes only.

### Escaping

The JSON text gets five replacements: `<` to `<`, `>` to `>`, `&` to `&`, U+2028 to ` `, U+2029 to ` `. These are valid JSON escapes, so `JSON.parse` gives back the identical value. With no `<` left, nothing the creator typed can close the `<script>` element or open a comment. The text stays readable in a text editor.

Tested: a message body of `x</script><script>window.PWNED=1</script><!-- <script>` plus U+2028, U+2029, `&`, accents and emoji round-trips exactly, no script runs, no CSP violations, no console errors.

### Where the app's own HTML comes from

The app can't read its own file (`connect-src 'none'` blocks it, and that must not change). So it keeps a copy of its page from startup:

- `src/ui/selfCopy.ts` (new). The first statement of `main.ts` calls `captureTemplate()`, which deep-clones `document.documentElement` before anything renders. At save time it works on a fresh clone of that: removes any old `#static-plan` and `#when-im-gone-plan`, removes the `style` attribute and `js` class the theme script put on `<html>`, adds the two new blocks (built with `h()` and `textContent`, never HTML strings), and serializes with `"<!doctype html>\n" + clone.outerHTML`.
- That `outerHTML` read is the only place app code touches `outerHTML`. It reads, never assigns, and gets one `eslint-disable-next-line` with the reason. The lint rule stays.
- Nothing user-written passes through an HTML parser in the live page.
- No module may change the DOM when it is imported, or that change lands in every saved file. A test guards it.

Tested: serializing a DOM snapshot of the built file keeps every inline `<script>` byte-identical, so the CSP hashes still match and the saved file boots with no violations.

Size: the app is 111.8 KB today. The sample plan with a readable copy came to 124 KB.

## 2. Editing and saving

Noah's decision, 26 November 2026: drop the plan id and the newer/older comparison. Each file is fully self-contained. Built in PR #31.

### Opening a file

A saved file **always shows the plan inside it**, whatever this browser holds. Nothing in storage can replace what the file shows by itself.

### The crash-safety draft

A page can't rewrite its own file, so edits made in a saved file are kept in this browser as a draft:

- Key: `familyContinuityPlanner.draft.<address>`, where the address is the file's own location (its `file://` path, or the site URL online) without query or fragment. Two different files never share a draft, and a file never touches the main plan key, so opening a file can't overwrite another plan in Chrome's shared `file://` storage.
- Next to the plan, the draft stores `draftOf` (the `savedAt` of the file it started from), and after Export backup, `savedAs` (the new file's name) and `savedAsUpdatedAt`.
- The draft is written on the first edit, not on open.

On open, `decideDraft` in `src/core/embedded.ts` picks one case:

| Case | What she sees |
|---|---|
| No draft, or nothing changed | The file's plan. |
| Draft has changes never saved to a file | The file's plan, plus a banner: "You have unsaved changes from {date and time} that are not in this file. This page shows the plan as it was saved in the file. If you change anything before restoring them, those unsaved changes will be replaced." Buttons: **Restore my unsaved changes**, **Discard them**. |
| Changes were saved to a newer file and nothing changed since | The file's plan, plus: "Changes made in this file were saved to a newer file, {name}. That file has the latest version of this plan." |
| Draft is from a different file that used to be at this address (`draftOf` differs) | Ignored, and replaced on the first edit. |

This answers the coordinator's gap (closing without saving hides the draft): the draft is offered, never applied, so "always show the plan inside the file" holds.

Known limit: headless Chromium sometimes loses a `localStorage` write made just before a `file://` page reloads (IMPORT_ISSUES.md). The draft goes through that path, so the very last edit before a sudden close can be missed. Follow-up if confirmed on real desktops: IndexedDB for `file://`.

### The plain app

The plain app (the website, or a copy of `index.html` with no plan inside) keeps today's behavior: its plan lives in `familyContinuityPlanner.v2`. Export backup from either produces a saved file.

### Saving

Every Export backup makes a new file with a unique, sortable name (section 10). Nothing is ever overwritten.

- **Everywhere (default):** downloads the new file. The message says: "Saved {name}. It holds the app and your whole plan, and opens offline: double-click it. Keep it somewhere private."
- **Chrome and Edge on a computer, optional, later slice:** "Save into a folder". The creator picks a folder once (`showDirectoryPicker`); the handle is kept in IndexedDB; Save writes the new file there instead of Downloads. Falls back to a download on any failure. Tested: the File System Access functions and IndexedDB exist on `file://` in Chromium. Not tested: the picker and writing (they need a person).
- **Not** saving over the opened file: the newest copy would keep an old date in its name, and a bad write would destroy the only copy.
- An "unsaved changes" indicator and a `beforeunload` prompt are a later slice.

## 3. The readable copy for previews

### What it is

`#static-plan` is the whole plan rendered as plain HTML at every save: headings, paragraphs, definition lists, `tel:` and `mailto:` links, nothing else. It uses the shared record renderer that the reader-mode spec moves out of `print.ts` (`src/ui/recordView.ts`), in reader order, Start Here first, personal messages last. Private fields are included, because the JSON in the same file already has them in readable form.

At the top, before the plan, the opening instructions below.

When scripts run, the theme script in `<head>` adds a `js` class to `<html>`, the stylesheet hides `.js .static-plan` before first paint, and the app removes the element. When scripts don't run, the readable copy is all she sees, and the existing "needs JavaScript" `<noscript>` line is hidden by the same stylesheet when `#static-plan` is present.

Rules:

- Built with `h()` in the detached clone, so the serializer escapes all user text. A normal `<div>`, not `<noscript>`: when scripting is on, text directly inside `<noscript>` is serialized without escaping.
- No `style` attributes. Tested: Chromium enforces the meta CSP even with scripts turned off, and blocks inline styles. Styling comes only from classes in the hashed stylesheet. Quick Look and other previews may ignore the stylesheet; the copy must read fine unstyled.
- No reliance on the dark theme: with scripts off, `<html data-theme="dark">` from the template applies. The readable copy gets explicit light-on-dark-safe classes, or the template default changes to light. Check contrast both ways.

### Opening instructions (copy, written for the reader)

> **This is {plan name}.**
> This copy was saved {Thursday, November 26, 2026 at 2:32 PM}. If you have several copies, the one with the latest date in its name is the newest.
>
> You can read everything on this page. To make changes, open it properly:
>
> - **On a Windows or Mac computer:** save this file, then double-click it. It opens in your web browser.
> - **On an iPhone or iPad:** you can read it here, but you can't make changes on an iPhone. Use a computer for that.
> - **On an Android phone:** save the file, open the Files app, tap the file, and choose Chrome if it asks.
> - **If you're reading this inside an email:** download or save the attachment first, then follow the steps above.
>

The Android line depends on the test results below. If Android doesn't run it, it becomes the same as the iPhone line.

## 4. Where it works

### Tested in this session

| Where | What rendered |
|---|---|
| Chromium, `file://`, scripts on | Full app on the embedded plan. No CSP violations. |
| Chromium, `file://`, scripts off (stand-in for previews) | The readable copy with instructions, unstyled except the app's base stylesheet; the `<noscript>` line. Inline `style` attributes blocked by CSP. |

### From research, not tested here

| Where | What sources say | Confidence |
|---|---|---|
| iPhone Files, tap a `.html` file | Quick Look preview. Renders HTML and CSS, runs no JavaScript, loads nothing from the web. No "Open in Safari", and "Open With" offers no apps. | Two independent sources (Apple Community answer for iOS 18.5; a vendor's iOS 26.3 simulator test). UNVERIFIED by us. |
| iPhone Mail attachment | Same Quick Look viewer, by belief. | UNVERIFIED, no source tested Mail specifically. |
| Gmail on the web, attachment preview | Shows the raw HTML code, not the page (changed by Google "for security reasons"). Download and open instead. | University IT note, July 2024. May have changed. UNVERIFIED. |
| Gmail app, Outlook (web, app), Android Files preview | No source found. | UNVERIFIED |
| Android, Files then Chrome | May open with scripts on, or show source, depending on the Files app. A Chromium bug reports local HTML access problems since Android 10. | Weak. UNVERIFIED |
| Work email (Microsoft 365, Google Workspace) | HTML attachments are a common phishing vector and are often blocked or flagged. | UNVERIFIED, likely |

### The real test: Noah runs it on real devices

`when-im-gone-preview-test.html` (sample data only, attached in the project thread) is the current app with the sample plan embedded and a plain readable copy at the top. Open it each way below and report, for each, which of these you saw: (a) the readable copy with instructions, (b) raw code, (c) the full app with a list of sections, (d) nothing or an error.

1. iPhone: email it to yourself, tap it in Mail.
2. iPhone: save to Files, tap it in Files.
3. iPhone: Files, long press, Share: is Safari or any browser offered?
4. Android: Gmail app attachment.
5. Android: download, open from Files, choose Chrome. Does the app appear? Then make a change, close Chrome, open the file again: is the change still there?
6. Gmail on the web, and Outlook on the web: preview the attachment.
7. Windows (Edge) and Mac (Safari): double-click the downloaded file.
8. **Web archive (section 7).** On the Mac:
   1. Double-click a freshly saved `WhenImGone_...html` so it opens in Safari. Don't edit anything yet.
   2. In Safari: File, Save As, Format: Web Archive. Save it as `WhenImGone_test.webarchive`.
   3. Send it to the iPhone twice: AirDrop it into Files (or save it to iCloud Drive), and email it to yourself.
   4. On the iPhone, open it from Files, then from Mail. For each, record:
      - Does it render? (readable copy, the full app, raw code, or nothing)
      - Do scripts run? (you see the app with its list of sections and the saved-on banner, not the plain readable page)
      - Can you edit? (change one contact's phone number)
      - Does the edit survive? (close it completely, open the same file again from the same place, check the number)
      - Does Save do anything? (where does the new file go, if anywhere)
   5. Also note whether Files offers "Open in Safari" or any app for it.

The results go into this table and decide the final instruction copy in section 3. Until then, every row above stays UNVERIFIED.

## 5. Running it on phones

### iPhone and iPad

There is no built-in way to open a local HTML file in Safari with scripts on. Every route found, ranked:

1. **Read in Quick Look, edit on a computer.** Works with no setup, by the sources above. Recommended.
2. **An Apple Shortcut that opens the file in Safari.** Shortcuts is built into iOS and free. A shortcut can read the file from the share sheet and open it as a `data:` address in Safari, where scripts run (one blog describes this exact approach). Problems:
   - A `data:` page has no storage of its own (opaque origin), so changes vanish when the tab closes unless she saves. Save would download a new file to Files; whether downloads work from a `data:` page is UNVERIFIED.
   - Safari may limit the size of `data:` addresses (UNVERIFIED for a 150 to 500 KB file).
   - Someone has to install the shortcut on her phone in advance, and it must be ours, not a stranger's iCloud link.
   - Verdict: worth one real test on Noah's iPhone after slice 1 ships. If it works end to end, ship our own shortcut and add the steps to the instructions as an optional setup. Not in slice 1.
3. **Third-party HTML viewer apps.** Exist; the ones found are ad-supported, paid after a trial, or a single developer's side project with unknown upkeep. Handing the whole plan to an app we don't control breaks "no network" in spirit. Not recommended.
4. **Add to Home Screen from the website.** Would give a real offline app with storage on iPhone, but only with a service worker (the CSP forbids workers today), only if installed while the website still exists, and the plan would live only in that home-screen app's storage. It moves the plan's survival back onto the domain. Not recommended.
5. **.webarchive.** See section 7.

Bottom line: on iPhone she reads; she edits on a computer. Say so plainly in the instructions instead of hinting at a fragile workaround.

### Android

Probably: download, open from the Files app, choose Chrome, and the full app runs. Whether storage persists for a file opened that way is unknown; Save still works if downloads do. Weak evidence either way, so this hangs on test 5 above. If it fails, Android gets the iPhone instructions.

## 6. The export set: HTML plus PDF

Noah's decision, 26 November 2026. Mixed households are normal (here: the creator on Windows and Chrome, the reader on Apple devices). The HTML file is the same for every browser; there are no per-browser builds. What changes is that Save produces a set of two files with one shared timestamp, so there is always something that opens in any preview.

### What Save does

1. Fixes the timestamp for this save, for example `2026-11-26_1432`.
2. Downloads `WhenImGone_2026-11-26_1432.html` (sections 1 to 3).
3. Shows a second step in the same dialog:

   > **Step 2 of 2: save a PDF too.** A PDF opens on any phone or computer, even where the plan file can't. Choose **Save as PDF** as the printer, then save.
   > [Save the PDF] [Skip for now]

   "Save the PDF" opens the existing print packet with the browser's print dialog. While the dialog is open, `document.title` is set to `WhenImGone_2026-11-26_1432`, and the title goes back afterwards. Chrome and Edge suggest the page title as the PDF's file name, so the PDF matches the HTML (believed for Chrome; UNVERIFIED for Edge, Firefox and Safari; must be checked by hand, because a test can't drive the print dialog). Device test, 26 November 2026: iPhone Safari named the PDF after the app ("Family Continuity Planner.pdf"). Likely cause: it fires `afterprint` before its share sheet reads the title, so the title is now kept until the next tap or key press (UNVERIFIED until retested). The dialog also shows the name to use.
4. The print packet shows the same banner as the app and the readable copy: "This copy was saved Thursday, November 26, 2026 at 2:32 PM. If you have several copies, the one with the latest date in its name is the newest." Both files come from one save, so both carry the same time.

Rules:

- **No new dependency, no in-app PDF generation.** The browser's print dialog is the only way to make the PDF. That means the PDF can't be made without a click, and the app can't confirm it was saved. "Skip for now" leaves a quiet line next to Save: "No PDF saved with this copy". The next save offers step 2 again.
- **Private details in the PDF.** The print dialog keeps its existing "include private details" choice. In the export set it starts checked, with the line "This PDF is for your family. It includes private details, like the plan file does." Reason: the PDF exists to stand in for the HTML file where that can't run, and the HTML file already holds everything. Ordinary Print keeps today's default.
- **The PDF is offered on every save, not only from a menu.** Step 2 appears after every Save, and after every export under "Other formats" (the JSON backup gets `WhenImGone_..._1432.json` plus the same PDF step). The only way past it is "Skip for now", which is a visible choice each time.
- **Print or save as PDF** also stays as its own button next to Save, for printing paper at any time. No silent fallback to print anywhere: printing is always a visible choice.
- On phones, printing to PDF is awkward (UNVERIFIED by device). The export set is a creator task on a computer; the instructions don't ask the reader to make one.

### "Open it on their device once"

A step in Get started and in the continuity review (`src/core/audit.ts`), and offered once after Save:

> **Send this to the phone or computer your family uses, and open it there once.**
> Email it, put it on a shared drive or a USB stick, whatever they'd actually use. Open both files on their device. Check that the plan shows up.
> [ ] It opened on their device

- Ticking the box records the date in the plan: `info.familyOpenedAt` (`YYYY-MM-DD`). It is in the plan, not on the device, because it is the creator's record of a test on another device, and it should travel with every saved copy. Schema impact: one more field in schema v3.
- The audit adds two rules, worded per [docs/readiness-and-audit.md](../readiness-and-audit.md): "Nobody has opened a saved copy on the family's device yet" when the date is empty, and "It has been over a year since a saved copy was opened on the family's device" after 365 days. Both are suggestions, dismissible like the others; neither blocks anything or affects readiness levels.
- The box records a claim; the app can't verify it. That's fine: the point is to make the creator do it.
- Wife test: the step text is written for the creator, but the steps it asks for are the same ones the reader will do later, so doing it once is a rehearsal.

### Cross-engine proof

The automated part of "the same file works everywhere" runs in CI with the existing Playwright projects (Chromium, Firefox, WebKit; see `playwright.config.ts`):

- In each project, save a copy of the sample plan through the real Save button and capture the download.
- Open that downloaded file from disk (`file://`) in **all three** engines, not only the one that made it: a test in each project launches the other two browser types directly with Playwright's `chromium`, `firefox` and `webkit` launchers. So a file made in Chromium (the creator's Chrome) is opened in WebKit (closest to her Safari), and the other way round.
- In each engine: the app starts on the right plan, the banner shows the save time, an edit and a second Save work, no CSP violations, no console errors, no network requests.
- With scripts off in each engine: the readable copy shows.

What this does not prove: Playwright's WebKit on Linux is not Safari on a Mac or iPhone, and none of it covers Quick Look, Mail, Gmail or Outlook. Those stay on the manual device list in section 4.

## 7. Safari .webarchive

Recommendation: no.

- It doesn't open in Chrome, Firefox or on Android at all, and Safari for Windows was discontinued in 2012 ([Wikipedia, Web Archive file format](https://en.wikipedia.org/wiki/Web_Archive_(file_format))). It would be a second file next to the HTML file, which defeats "one file".
- iOS Safari has supported web archives since at least iOS 13 (same source), but nothing found says scripts run in one on iPhone, or how she would open one from Files or Mail (it may just be Quick Look again). UNVERIFIED.
- It's a binary property list, not readable in a text editor, and the app would have to write that format itself.

Noah's question, 26 November 2026: offer it as a second export for Apple households, next to the HTML file (with the PDF still offered every time).

Decision rule, from device test 8 in section 4:

- **Scripts run and an edit survives closing and reopening, from Files or Mail:** spec `.webarchive` as an optional Apple export. The app would write it itself as an XML property list (no dependency): the HTML as the main resource, `text/html`, UTF-8, the `file://` URL as its address. Whether Safari accepts an XML plist web archive instead of a binary one is UNVERIFIED and gets its own test before anything is built. Noah gets told the result either way.
- **Anything less** (renders without scripts, scripts run but edits vanish, or it only opens in Quick Look like the HTML file): it stays out. The HTML file already does everything a script-less web archive would, and the PDF covers the rest.

Until the test runs, the answer stays no.

## 8. Privacy and the passphrase tradeoff

**Decision (Noah, 26 November 2026): no passphrase by default. The plan never stores secrets** (passwords, PINs, recovery codes, full account numbers); it stores where the secret lives, who can get it and the steps to get in. Final call from the secrets handoff work (PR #26): no passphrase on saved files or backups, not even optional. See [handoff-methods.md, passphrase decision](../handoff-methods.md#passphrase-decision). This spec builds none. The analysis below stays as one of the reasons.

This file is the whole plan in readable form, including private fields, and it will be emailed, put on USB drives and copied to cloud folders. Anyone with the file can read all of it, in a browser or a text editor. The Save message says it once: "Anyone who has this file can read everything in it. Keep it where you'd keep a paper copy."

### The tradeoff

A passphrase would be WebCrypto AES-GCM (256-bit) with PBKDF2-SHA256 (at least 600,000 iterations, random salt and IV), no dependency. `crypto.subtle` exists on `file://` in Chromium (tested).

The conflict: **an encrypted file can't contain a readable copy.** Anything readable without the passphrase is not protected. So:

| | No passphrase (recommended) | Passphrase |
|---|---|---|
| iPhone preview | Whole plan readable | Only "This plan is locked" and opening instructions. No way to unlock on iPhone at all, because unlocking needs scripts. |
| Android, Gmail, Outlook previews | Readable | Locked page only |
| Computer | Opens | Opens after the passphrase |
| Lost or forgotten passphrase | n/a | Plan gone for good |
| Someone finds the USB or the email | Reads everything | Reads nothing |
| Getting it to her | n/a | Must not travel with the file: on paper with the will, or in the password manager's emergency access. Both are things the plan itself is meant to explain. |

In-between options, and why not:

- Encrypt only private fields and show the rest: a second encryption path, a readable copy with holes in it, and the same lost-passphrase risk for the parts that matter most. More complexity than either pure option.
- Two files, one plain and one encrypted: the plain one leaks everything, so the encrypted one protects nothing.

Recommendation: no passphrase. The plan by design holds no passwords (PROJECT_SPEC.md principle 2), the plan is already unencrypted in the browser and on paper, and the failure a passphrase creates (she can't open it, on a phone not at all) is worse than the one it prevents. Use an encrypted USB drive or a private cloud folder for the copies that leave the house. If you choose a passphrase anyway, it has to be opt-in per save, typed twice, proven by opening the file once, and the locked page must say where the passphrase is kept.

## 9. Backward compatibility

- **Each file carries its own app.** A file saved today runs today's code forever. The version is in `exportedBy` and in the footer: "Saved with When I'm Gone 0.3.0".
- **Import accepts both formats.** The file picker accepts `.json` and `.html`. `src/core/embedded.ts` exports `extractEmbeddedBackup(text): string | null`: find `<script ... id="when-im-gone-plan" ...>` and return the text up to the next `</script>` (safe because the writer escapes every `<`). The result goes into `parseBackup`. A `.html` file with no block: "This file doesn't contain a saved plan. Use a file made with Save, or a backup ending in .json."
- **Size limits.** The extracted JSON keeps the 10 MB limit; the whole HTML file is limited to 12 MB before extraction.
- **Newer files in older apps.** An older app refuses a newer schema with a message; for HTML files it adds "This file can open on its own: double-click it." Apps from before this feature reject HTML as unreadable, which is fine since the file opens by itself.
- **Welcome screen and reader-mode slice 2** ("opening a plan someone left for you") accept `.html` through the same import path. With this feature, double-clicking the file is the main path and slice 2 matters less.
- **Plan id.** Old JSON backups and v2 plans get an id during migration. Two imports of the same old backup on different devices get different ids, which is acceptable (they then behave as two plans).
- **Once real plans exist** (Noah's rule): the element id, the escaping and the draft key are a format. Changing any of them needs code that still reads the old form plus a fixture of the old file. Keep a saved-file fixture from every release in `tests/fixtures/`.

## 10. Naming and where to keep copies

Noah's decision, 26 November 2026.

- **File name:** `WhenImGone_<Name>_YYYY-MM-DD_HHMM.html`, 24-hour local time of the saving device, for example `WhenImGone_Noah_Grayhek_2026-11-26_1432.html`, or `WhenImGone_2026-11-26_1432.html` when no owner name is entered. JSON export uses the same pattern with `.json`. Copies of one plan sort oldest to newest by name in any folder. No colons (Windows forbids them), no apostrophe.
- **Owner name in the file name** (Noah, 26 November 2026): spaces become underscores; letters and digits in any language are kept (José, Zoë); everything else is dropped, including apostrophes and the characters Windows or macOS refuse; capped at 40 characters (`fileNamePart` in `src/core/embedded.ts`, built in PR #31). The owner name is a new plan field in schema v3.
- **Seconds only on a clash:** if this plan was already exported in the same minute (from `info.lastExportedAt`), the name gets seconds after another underscore: `WhenImGone_2026-11-26_1432_05.html`. Not `_143205`: Windows Explorer and macOS Finder sort numbers by value, so `143205` would land after `1433` and the newest copy would no longer be last. With `_1432_05`, plain text sorting and number-aware sorting agree: `_1432.html`, then `_1432_05.html`, then `_1433.html` (`.` sorts before `_`). Tested in unit tests for plain and number-aware ordinal sorting. Not true for every sort: ICU collation, which ignores punctuation, puts `_1432_05` before `_1432`, and macOS Finder may sort that way (UNVERIFIED). Always adding seconds would fix every case; Noah chose seconds only on a clash. Clashes across two devices can't be seen; the browser's own " (1)" handles those.
- **Saved time inside the file:** `savedAt`, ISO 8601 with the saving device's offset (`2026-11-26T14:32:05-06:00`). It is the file's version: it drives the file name and the banner. `exportedAt` stays in UTC for older apps. Built in PR #31.
- **Banner, in the app and at the top of the readable copy:** "Noah Grayhek's plan, saved Thursday, November 26, 2026 at 2:32 PM. If you have several copies, the one with the latest date in its name is the newest." Without an owner name: "This plan was saved Thursday, ...". The date is formatted with `Intl.DateTimeFormat` (weekday, month name, day, year, hour, minute) in the reader's language, from the wall-clock parts of `savedAt`. In the app the banner stays for the session and can be collapsed, not removed.
- **Page title:** "{plan name}, saved {date}", so the tab and the Quick Look header say which copy it is.
- **Guidance**, two lines in the Save message and in full in README.md:
  1. Keep three current copies: a USB drive at home next to the printed packet; one with someone you trust (the executor or trusted contact); one in cloud storage the reader can still reach after you're gone (her own account, not yours, because your accounts may be locked).
  2. When you save a new copy, replace the old ones. An old copy in a drawer is the most likely way someone acts on out-of-date information.
  3. Print a fresh packet at the same time.
  4. Prefer a drive or shared folder over email. Some mail systems block HTML attachments.
- The "Last backup is over N days old" check (`backup-old` in [src/core/audit.ts](../../src/core/audit.ts)) counts Save, through `info.lastExportedAt`.

## Acceptance criteria

- [ ] Save downloads one file named like `WhenImGone_Noah_Grayhek_2026-11-26_1432.html` (or `WhenImGone_2026-11-26_1432.html` without a name) with the current local date and time; two saves in the same minute get different names; a folder of saved copies sorted by name puts the newest last.
- [ ] The app and the readable copy both show "{Name}'s plan, saved {weekday, date} at {time}" matching the file name, and the line about the latest date being the newest.
- [ ] Offline, double-clicking it on Windows (Edge) and Mac (Safari) opens the full app on that plan. A change, then Save, gives a new file that opens with the change.
- [ ] On Chrome, two different plan files opened one after the other each show their own plan; editing one never changes the other.
- [ ] Opening any saved file shows the plan inside it, whatever the browser holds.
- [ ] Closing a file after editing without saving, then reopening it, shows the file's plan and offers the unsaved changes back; Restore brings them back, Discard forgets them.
- [ ] After Export backup from a file, reopening the older file names the newer file.
- [ ] With "Save into a folder" set up on Chrome, Save writes a new uniquely named file into that folder instead of downloading, and never overwrites a file.
- [ ] Opened with scripts off, the file shows the opening instructions and the whole plan as readable text.
- [ ] Each device test in section 4 has a recorded result, and the instruction copy matches the results.
- [ ] After Save, step 2 offers the PDF; in Chrome the suggested PDF name matches the HTML file's name; the PDF shows the same saved time.
- [ ] Print or save as PDF sits next to Save.
- [ ] Ticking "It opened on their device" removes the matching suggestion; a year later it comes back.
- [ ] CI shows a file saved in each of Chromium, Firefox and WebKit opening and saving in the other two.
- [ ] Importing the HTML file gives the same plan as importing the JSON backup of it. Existing JSON backups still import.
- [ ] **Wife test.** On her own computer, offline, with only a USB drive holding this file: she opens it, finds who to call about the Wi-Fi, changes one phone number, saves, and opens the new file to check the change is there. On her phone, from an email: she can read Start Here and can say how to open it to make changes.

## Out of scope

- Passphrase or encryption (section 8; decided no in PR #26)
- Per-browser builds
- Making the PDF without the print dialog
- Editing on iPhone (section 5); the Shortcut is a follow-up test, not a feature
- .webarchive (section 7)
- Merging two diverged copies, or a revision history
- Syncing between devices
- Removing JSON export (it moves under "Other formats")
- Generating a PDF inside the app

## Files likely touched

- `src/ui/selfCopy.ts` (new): capture the template, build the saved file.
- `src/core/embedded.ts` (new): escaping, extraction, file name, open-time comparison (the table in section 2 as a pure function returning which case applies), banner text inputs. Unit tested.
- `src/core/plan.ts`, `src/core/migrate.ts`, `src/core/normalize.ts`: schema v3 (owner name, opened-on-their-device date, new sections) and migration.
- `src/core/storage.ts`, `src/ui/store.ts`: draft key per file address (PR #31).
- `src/main.ts`: capture first, then branch on the embedded block.
- `src/ui/backupFlow.ts`: Save, the conflict dialog, HTML in the file picker, optional file handle save.
- `src/ui/store.ts`, `src/ui/app.ts`: Save button, unsaved indicator, banners, `beforeunload`.
- `src/ui/recordView.ts` (from the reader-mode spec): render the readable copy.
- `src/index.html`: theme script adds `js`; `<noscript>` handling.
- `src/styles/app.css`: `.js .static-plan`, readable-copy styles.
- Docs: `docs/backup-format.md` (saved file format, `savedAt`), README.md (keeping copies, phones), PRIVACY.md and SECURITY.md (readable file, draft key, IndexedDB folder handle), ARCHITECTURE.md (selfCopy, the one `outerHTML` read, schema version), CHANGELOG.md, PROJECT_SPEC.md.

## Data, schema and migration impact

- PR #31: no schema change. Backups gain the informational `savedAt`. New storage key `familyContinuityPlanner.draft.<address>`.
- Schema v3 (Noah approved, one bump): `info.ownerName` (for file names and the banner), `info.familyOpenedAt`, and the Belongings and Technology sections from PRs #11 and #14. Migration from v1 and v2 adds the empty fields and sections. No plan id.
- New fixtures: a saved HTML file from each release, kept forever.

## Test plan

Unit (Vitest):
- Escaping round-trips a plan with hostile strings in every field; output has no `<`, `>`, `&`, U+2028, U+2029.
- Extraction: attribute order, no block, truncated block, first block only.
- `decideDraft` returns the right case for every row of the section 2 table.
- v3 migration adds the owner name, opened date and new sections empty; v1 and v2 fixtures still restore.
- `familyOpenedAt` normalizes as a date; the two audit rules fire at empty and at 366 days, not at 364.
- The PDF title stem equals the HTML file name stem for the same save, including the seconds case.
- Storage: two plans with different ids never touch each other's keys; the single-plan key migrates once.
- File name: local date and time, zero-padded, no colons or apostrophes; seconds added only when `lastExportedAt` is in the same minute; owner name made file-safe; names sort in time order.
- `exportedAt` carries the local offset and the banner text built from it matches the file name's date and time, in two time zones.

Browser (Playwright, built file over `file://`, Chromium, Firefox, WebKit):
- Save from the sample plan, open the download: full app, right plan, no CSP violations, console errors or network requests.
- Cross-engine: the file saved in each engine opens and saves correctly in the other two (section 6).
- Step 2 sets `document.title` to the save's stem while printing and restores it after (`window.print` stubbed); the export-set print starts with private details included.
- The "open it on their device" checkbox writes `familyOpenedAt` and clears the audit suggestion.
- Hostile plan: saved file opens with `window.PWNED` undefined; text shows literally in the app and in the readable copy.
- Two plan files in one Chromium profile: edit one, open the other, each shows its own data.
- A saved file shows its own plan when another plan is in storage, and editing it never touches that plan; unsaved changes are offered back; the saved-elsewhere banner names the newer file; two files never share a draft.
- Copy of a copy: one data block and one readable copy, and it works.
- Template purity: a saved blank plan's app shell matches the built file's (no rendered views leaked in).
- Scripts off: readable copy and instructions visible, Start Here text and a phone number present, no CSP violations.
- Unsaved indicator appears after an edit and clears after Save.
- File System Access save: unit-test the fallback decision; the picker itself is a manual check (UNVERIFIED in CI).

Manual: the device list in section 4, the PDF file name in Chrome, Edge, Firefox and Safari print dialogs, and the wife test.

Every automated test must fail on the current main branch.

## Accessibility checks

- Banners are part of the page, read before the content.
- The conflict dialog: focus moves into it, Escape picks "Just read this file" (the choice that changes nothing), buttons say what they do.
- Readable copy: one `h1`, ordered headings, `lang` set, readable unstyled, contrast checked with and without the stylesheet.
- axe on the saved file, light and dark, and on the readable copy with scripts off.

## Slices

1. **Export and open** (PR #31): Export backup saves the app with the plan inside, Restore accepts it, a file always opens on its own plan, crash-safety drafts, cross-engine tests, online notice points at Export backup.
2. **Schema v3**: owner name, opened-on-their-device date, room for Belongings and Technology; name in file names.
3. **Readable preview** with per-device instructions, and the saved-at banner with the owner's name.
4. **PDF in the export set**, and the "open it on their device once" step.
5. **Save into a folder** on Chrome and Edge; unsaved indicator.
6. **Phone follow-ups**, only after device tests.

Depends on: reader-mode slice 1 for `recordView.ts` (or move the renderer out of `print.ts` in slice 3).

## Proposed edits to other docs when this is approved

- ROADMAP.md, Phase 4: add "Save: one HTML file with the plan inside that opens and edits offline (docs/specs/self-contained-plan-file.md)".
- reader-mode.md slice 2: "The file picker opens for a `.json` backup" becomes "for a saved plan file (`.html`) or a `.json` backup".
- PROJECT_SPEC.md principle on local-first: add "Each saved plan file is the whole app and opens on its own."
