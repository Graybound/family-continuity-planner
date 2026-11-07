# Privacy

## What leaves your device

**In normal use of the downloaded planner: nothing.**

- The app makes no network requests. There is no server, account, analytics, telemetry, tracking, remote font, external script, or content delivery network.
- The built file carries a Content Security Policy with `connect-src 'none'` and `default-src 'none'`, so the browser itself refuses any attempt to load or send anything over the network, even if a bug tried to.
- Automated browser tests fail if the app makes any request that is not to the local file, and the build fails if any external URL appears in the output.

The only ways information leaves the planner are actions you take: exporting a backup, printing or saving a PDF, or copying text.

## Where your information is stored

| What | Where | Encrypted? |
|---|---|---|
| Your plan | Browser `localStorage`, key `familyContinuityPlanner.v2` | No |
| A plan saved by the original version of the app | `familyContinuityPlanner.v1` (read once, never changed) | No |
| Damaged data that could not be read | `familyContinuityPlanner.recovery.<time>` | No |
| Light or dark theme choice | `familyContinuityPlanner.theme` | No |
| Exported backups | Wherever you save the `.json` file | No |
| Printouts and saved PDFs | Paper, or wherever you save the PDF | No |

`localStorage` is part of your browser profile on your computer. It is not synced by the planner. Some browsers can sync or back up browser profiles; check your browser's settings if that matters to you.

**Nothing is encrypted.** The planner does not claim otherwise. Treat the browser profile, every backup, and every printout as sensitive.

## Limits of browser storage

- Data belongs to one browser on one device. Another browser, another device, or another user account sees an empty plan.
- For a downloaded file, some browsers tie saved data to the file's location. Moving or renaming the file can make the plan appear empty. It is not deleted; open the file from its original location or restore a backup.
- In Chromium-based browsers, every local HTML file opened from disk shares one storage area. Another HTML file you open from disk in the same browser could, in principle, read the planner's data. Avoid opening untrusted HTML files in the browser profile you use for the planner.
- Clearing browsing data, "site data," or cookies can erase the plan. Private or incognito windows usually erase everything when closed; the app warns you if it cannot save.
- Browsers can limit storage size. A typical plan is well under 1 MB.

## Backups

- An export is a complete, readable copy of your plan in JSON. Anyone who gets the file can read everything in it, including details marked private.
- Store backups somewhere only you and trusted people can reach: an encrypted USB drive, an encrypted folder or disk image, or a password-protected archive made with a well-known tool.
- Keep at least one copy off the computer, and tell a trusted person where it is.
- Delete old backups you no longer need.

## Shared computers

- Turn on "Start in privacy mode" (Settings) so private fields are hidden when the planner opens. This is a screen shield only, not security: the data is still in the browser.
- When you are finished on a computer that is not yours, use **Erase all plan data in this browser** in Settings. It removes the plan, any copy from the original version, and recovery copies.
- Use your own user account on the computer if you can.

## Removable media (USB drives, external drives, NAS)

- The planner file itself contains no personal data. Your plan is in the browser, not on the drive, unless you also save backups there.
- Backups saved to removable media can be lost or stolen. Use encrypted drives where possible.
- A network drive may be backed up or readable by other people on the network. Check who has access.

## Printing

- Printed packets leave out fields marked private unless you choose to include them. Withheld fields are clearly labeled so the reader knows something exists.
- Paper is easy to lose track of. Store printouts securely, tell a trusted person where they are, and shred old copies when you print a new one.
- "Save as PDF" creates a file as sensitive as a backup.
- Shared or office printers may keep copies of print jobs.

## Passwords and secrets

The planner is not a password vault and asks you not to use it as one. Record which password manager you use, how a trusted person can get emergency access, and where recovery documents are kept. The continuity review flags text that looks like a password, PIN, or full card number.

## The optional hosted demo (GitHub Pages)

If maintainers publish a demo on GitHub Pages, it is the same static file served from GitHub. Your plan still stays in your browser and is never sent to GitHub. However:

- GitHub receives normal web server information when the page loads (such as your IP address and browser type), as it does for any website. The planner adds no tracking of its own.
- Browser storage on `<account>.github.io` is shared by **every** GitHub Pages site under that account. Another project published by the same account could read the planner's data.

For these reasons the hosted demo is meant for trying the app with sample data. Use the downloaded version for a real plan. See [docs/github-pages.md](docs/github-pages.md).

## Changes to this document

If a future version adds any optional feature that changes what leaves your device, it will be off by default, described here separately, and listed in the changelog.
