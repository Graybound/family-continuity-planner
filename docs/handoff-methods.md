# Handing over access without storing secrets

Status: decided 2026-11-26. Built in this change: Accounts guidance, the secret warning in the entry form, and the "Practice the handoff once" step.

## The rule

The plan never stores secrets: passwords, PINs, recovery codes, full card or account numbers, Social Security numbers. It stores pointers:

1. **Where the secret lives** ("in Bitwarden, under Bank"; "printed kit in the fire safe").
2. **Who can get it** ("Sam has emergency access"; "our lawyer holds a copy").
3. **The exact steps to get in** ("open bitwarden.com, choose Emergency access, request Alex's vault; it opens after 2 days").

Why: plans, backups and printouts are not encrypted (PRIVACY.md), and the plan is meant to be copied, printed and left where the family can find it. A secret in it is a secret on every copy.

The app warns, never blocks, when a field looks like a secret (`secretKind` and `secretWarning` in `src/core/audit.ts`). The check runs on the device and nothing is sent anywhere (the CSP blocks all requests anyway).

## Methods, ranked for a non-technical survivor acting alone

Ranked by: does it work on a bad day with no help, how much it unlocks, and how likely it is to still work years later. The in-app copy lives in `HANDOFF_METHODS` in `src/core/handoff.ts`; keep it in step with this table.

| Rank | Method | What it gives | Main catch |
|---|---|---|---|
| 1 | Password manager emergency access | Every login in the vault, with no paperwork | Must be set up and practiced while you are alive |
| 2 | Printed emergency kit in a known physical place | Works for any service, any device, no vendor process | Goes stale when the password changes; must be locked away |
| 3 | Keep the phone and number working | Sign-in codes keep arriving | Needs the phone unlock code; cancelling the line breaks it |
| 4 | Apple Legacy Contact | iCloud photos, messages, notes, files, backups for 3 years | Needs access key plus death certificate; no passwords |
| 5 | Google Inactive Account Manager | Download of chosen data to up to 10 people | Only after months of inactivity; no account access |
| 6 | Facebook legacy contact | Look after a memorialized profile; optional archive | No login, no private messages |
| 7 | Microsoft account | Nothing built in; family can close it if they can sign in | Court order otherwise; OneDrive deleted after a year unused |

Recommendation for this household and most others: do 1 and 2 together (emergency access as the main path, the printed kit as the fallback when the service or the setup fails), and write 3 into the plan as a "do not" for the first week. 4 to 7 are worth setting up but none of them hands over passwords.

Money is a different path. Retirement accounts and life insurance pass by beneficiary designation, not by logging in. The plan should say who is named and the phone number for beneficiary services (content review spec, recommendation 4, in PR #16). General knowledge, not vendor-verified here.

### 1. Password manager emergency access

**Bitwarden Emergency Access** (verified 2026-11-26, [About Emergency Access](https://bitwarden.com/help/emergency-access/), [Add and manage trusted emergency contacts](https://bitwarden.com/help/add-and-manage-trusted-emergency-contacts/)):

- The account owner needs Premium or a paid organization plan (Families, Teams, Enterprise). The trusted contact needs any Bitwarden account, free is fine, on the same server region.
- Two levels: **View** (read all items in the owner's individual vault, including passwords and attachments) or **Takeover** (the contact sets a new master password, which also removes the owner's two-step login methods).
- The owner sets a wait time per contact; minimum one day. When the contact requests access, the owner gets an email and can approve or reject. If the owner does not respond, access is approved automatically after the wait.
- The invitation expires after five days, and the owner must confirm the contact (fingerprint phrase check) to finish setup.
- If the owner's Premium lapses, existing contacts can still request and get access.
- The docs do not describe a test mode. Practicing means a real request that the owner then rejects; rejecting does not remove the contact.

**1Password** (verified 2026-11-26, [Emergency Kit](https://support.1password.com/emergency-kit/), [Recover accounts for family or team members](https://support.1password.com/recovery/), [Family recovery plan](https://support.1password.com/family-recovery-plan), [Recovery codes](https://support.1password.com/recovery-codes/)):

- The Emergency Kit is a PDF with the sign-in address, email, Secret Key, a Setup Code, and a space to handwrite the account password. 1Password suggests a printed copy in a safe deposit box or giving a copy "to someone you trust, like your spouse or someone in your will".
- Family organizers can recover a member's account: the member gets a new Secret Key and password and regains their vaults. The pages do not say the organizer can see the vault. An organizer cannot recover their own account; 1Password advises adding a second organizer.
- Trap (inferred from the recovery steps, UNVERIFIED in practice): recovery sends an email to the member, so a survivor recovering the deceased's account needs access to the deceased's email. If that email password is only in the vault, recovery is circular. The printed kit avoids this.
- None of the pages read describe a waiting-period emergency access feature like Bitwarden's, or give guidance for an account holder's death. "1Password has no such feature" is UNVERIFIED (absence in four pages, not a statement).

**Others** (LastPass, Proton Pass, Dashlane, Keeper): not checked. Several advertise emergency access; UNVERIFIED.

### 2. Printed emergency kit in a known physical place

No vendor to verify. The pattern: the password manager's printed kit (or a handwritten sheet) with the main password, kept in a home safe, a safe deposit box the survivor can open, or with an attorney. The plan records where it is, how to get into that place, and when it was last updated. Risks: theft (it is the key to everything), staleness after a password change, and a safe deposit box that the survivor cannot open without probate (varies by place and by how the box is titled; UNVERIFIED).

### 3. Keep the phone and number working

Many accounts send sign-in codes by text or to an app on the phone. A survivor who cancels the line in week one loses those codes. The plan records where the phone unlock code is kept and says not to cancel the number for at least a year. PR #16 adds a "Sign-in codes go to" field and asks the Start Here thread to say this on the first page. General practice, not vendor-specific.

### 4. Apple Legacy Contact

Verified 2026-11-26, [How to add a Legacy Contact](https://support.apple.com/102631), [Request access as a Legacy Contact](https://support.apple.com/102678), [Request access to a deceased family member's account](https://support.apple.com/102431):

- Setup needs iOS 15.2, iPadOS 15.2 or macOS Monterey 12.1 or later. The contact needs no Apple device or account and must be over 13 (varies by region).
- The owner shares an access key by iMessage or a printed copy. To request access the contact needs the access key and a death certificate, by device or at digital-legacy.apple.com. Apple reviews each request. Apple cannot replace a lost key.
- Gives: photos, messages, notes, files, device backups and more. Does not give: purchased movies, music, books, subscriptions, or iCloud Keychain (payment information, passwords, passkeys).
- Access lasts three years from the first approval, then the account is deleted. Any one Legacy Contact can delete it sooner.
- Without a Legacy Contact, Apple generally needs a death certificate and may need a court order naming the requester as heir (US and others).
- Not stated: how long Apple takes to approve.

### 5. Google Inactive Account Manager

Verified 2026-11-26, [About Inactive Account Manager](https://support.google.com/accounts/answer/3036546?hl=en):

- Up to 10 trusted contacts. Each gets an email once the account has been inactive for the period the owner set, with a download link for the data the owner chose to share. Each contact needs a verification phone number.
- Google may delete accounts inactive for two years or more. Google says it can sometimes work with immediate family to close a deceased person's account.
- Not stated on that page: the timeout choices (commonly reported as 3 to 18 months; UNVERIFIED), how long the download link lasts.

### 6. Facebook legacy contact

Verified 2026-11-26 against [Meta's announcement](https://about.fb.com/news/2015/02/adding-a-legacy-contact/) only. The current Meta help center refused automated reading, so current wording is UNVERIFIED.

- The legacy contact can pin a post on the memorialized profile, respond to friend requests, and update the profile and cover photo. With permission, they can download an archive of posts, photos and profile info.
- They cannot log in as the person or see private messages. The owner can instead choose deletion after death.

### 7. Microsoft accounts

Verified 2026-11-26, [Accessing Outlook.com, OneDrive and other Microsoft services when someone has died](https://support.microsoft.com/en-us/topic/ebbd2860-917e-4b39-9913-212362da6b2f):

- No legacy contact feature. Microsoft is "generally unable to provide information to non-account holders".
- With the credentials, the family can close the account themselves (it can be reopened within 60 days). Without them, it closes after two years of inactivity. Outlook.com and OneDrive are frozen after one year inactive, and their content is deleted shortly after.
- Access without credentials needs a subpoena or court order served on Microsoft, with no guarantee.
- Cancel Microsoft subscriptions, for example by stopping the card they bill to.

Consequence for a Windows household: the Microsoft login must be in the password manager, and important OneDrive files need copying out within the first year.

## Practice the handoff

Every method above fails silently if it was never tried. "Practice the handoff once" asks the creator to sit with the person who would take over and have them actually use what was set up: request emergency access (then reject it), open the printed kit and sign in, or open the safe. Fix what did not work.

How it is built (smallest useful version):

- A checklist item with the fixed id `practice-handoff` (`PRACTICE_HANDOFF_ID`, `src/core/handoff.ts`). New plans get it in the starter checklist. Older plans get an "Add this to my checklist" button in Accounts. The fixed id survives backup and restore (`SAFE_ID` allows it).
- Accounts shows the state: not on the checklist, on the checklist, or done.
- No schema change and no new field. The checklist already stores done state.

Left out on purpose: a readiness requirement (it would demote existing plans and depends on another person's time; reconsider after usability testing with the reader), a "last practiced" date, and reminders to re-practice (belongs to the review reminders roadmap item).

Note for PR #16: its new starter checklist has "Set up emergency access to your password manager, and test it". Reuse `practiceHandoffItem()` for that row so Accounts can find it.

## Passphrase decision

**Decision: no passphrase on exports or backups, not even an optional one.** This supersedes the "Encrypted backups" future idea in PROJECT_SPEC.md and the conditions in SECURITY.md.

Reasons:

1. **It locks out the person the plan is for.** The reader opens the plan on the worst day, possibly years after it was written. A forgotten or unrecorded passphrase means permanent loss, with no reset. An "off by default" option still lets a creator turn it on and forget to tell anyone.
2. **There is nothing in the plan that needs it.** With the no-secrets rule, the file holds names, phone numbers, the last four digits of accounts, and where things are kept. That is sensitive, but a thief holding it still cannot sign in to anything, because the keys are behind the password manager, the safe, or the lawyer.
3. **It breaks the readable preview.** The self-contained plan file spec (PR #24, section 8) relies on a phone or mail app showing readable text without running scripts. An encrypted file shows nothing until decrypted by script.
4. **The passphrase has to be handed over too.** Writing it next to the file defeats it; putting it in the password manager makes the plan depend on the thing it is meant to explain.
5. **Better tools exist for the remaining risk.** A creator who must keep the file on an untrusted drive can use an encrypted USB drive, an encrypted disk image, or a locked safe. Those are already recommended in PRIVACY.md and keep the passphrase problem with tools people already know.

Revisit only if the no-secrets rule changes, which it should not.

## Proposal under evaluation: a Locked section

Status: **not built, awaiting Noah's decision** (issue linked in PR #26). Recommendation: **do not build it now.** Build the printed key sheet below instead, and revisit Locked only if the kill criteria at the end are met.

### Framing: two paths, chosen by the creator

1. **Pointers only (default).** The plan holds where each secret lives, who can get it, and the steps. This is the rule today.
2. **Locked section (opt in).** For creators who want secrets in the plan. Secrets go only into the Locked section, encrypted.

There is no third path of secrets stored unencrypted. One honest caveat: the app cannot enforce that. The secret warning never blocks, so a creator can still type a password into an ordinary field. The product stance is what the warning offers: once Locked exists, the warning gains a "Move this to the Locked section" option next to the existing advice to write a pointer instead. Before then it offers only the pointer advice.

**Locked is a fallback, not an equal choice.** The app always recommends keeping secrets out of the plan, in something more secure, and says why in plain words. Draft copy, used wherever the app talks about secrets (the Accounts guidance, the secret warning, and Locked setup):

> Keep passwords out of this plan. A password manager with emergency access, or a printed kit in a safe, is safer and stays up to date, and your family can use it even if this file is lost.

Locked setup flow (only if B is chosen):

1. The first screen shows that recommendation, with two buttons that go straight to the secure options: "Set up emergency access" and "Print an emergency kit" (both open the matching method in the Accounts guidance, expanded). A third, quieter button: "I still want a Locked section".
2. Only after that choice does setup continue: generate the card, print two copies, name where they are kept.
3. The secret warning lists its options in the same order: write where it is kept instead (first), then "Move this to the Locked section" (second, only once Locked is set up). It never offers to set Locked up from the warning, so nobody lands in Locked without seeing the recommendation.

PROJECT_SPEC principle 2 must match the decision:

- **If pointers only (A or C below):** keep today's wording: "The plan never stores secrets (passwords, PINs, recovery codes, full card or account numbers). It stores pointers: where the secret lives, who can get it, and the exact steps to get in."
- **If Locked is built (B):** "The plan never stores secrets unencrypted. By default it stores pointers: where the secret lives, who can get it, and the exact steps to get in. The app always recommends keeping secrets in something more secure, such as a password manager with emergency access or a printed kit in a safe. As a fallback for creators who will not do that, secrets can go only in the optional Locked section, which is encrypted and opened with a printed card. The app warns, never blocks, when ordinary text looks like a secret, and offers to move it to the Locked section." Also remove "Storing passwords, PINs, or recovery codes" from "Explicitly out of scope" and replace it with "Storing secrets outside the Locked section", and reword PRIVACY.md "Nothing is encrypted" to "Nothing outside the Locked section is encrypted".

### The idea

An optional Locked section for households with no password manager. A few rarely changing keys go in it (phone PIN, computer login, email password, a password manager master password later). It is encrypted with WebCrypto AES-GCM. The app generates the passphrase (the creator does not choose it), prints it on a card, and the plan names where the card is kept (safe, drawer, attorney). Everything else stays readable, so the phone preview still works for the rest.

### Compared with a printed emergency kit

| | Printed kit or key sheet | Locked section |
|---|---|---|
| What the reader needs | One thing: the paper | Two things: the latest file and the card, plus a device that runs the app |
| Works on her iPhone alone | Yes | Likely not. The self-contained plan file spec (PR #24) found that iPhone Quick Look does not run scripts and Files offers no route to Safari, so the section probably cannot be decrypted on the phone. Device test pending, so UNVERIFIED. Plan on her needing a computer |
| Stays current | Only if rewritten by hand | Yes, edits are digital |
| Lost carrier | Paper lost: same as losing the card, the keys are gone | Card lost: the keys are gone. File lost or only an old copy found: old keys |
| Security code in the app | None | Key generation, encryption, locking, and every path that could leak plaintext |
| Fits the spec | Yes | No. It reverses the rule adopted today ("the plan never stores secrets"), PROJECT_SPEC "Explicitly out of scope: storing passwords, PINs, or recovery codes", and "not a password manager" |

The main upside is weaker than it looks. The keys proposed are exactly the ones that rarely change (phone PIN, computer login, email password, master password). Stale paper is a real risk for a list of 80 logins; it is a small risk for five keys that change once every few years. And the card itself is paper in a safe: if the household keeps a card in the safe, they can keep the five keys on paper in the same safe and skip the file dependency.

### Requirements if it were ever built

These are the minimum. Each one is a place a bug leaks a secret or locks the family out.

1. **Never stored unlocked.** Ciphertext only in localStorage, backups and exported files. The decrypted text lives only in memory while the section is open, and the key is never written anywhere. Locks on a timer, on leaving the section, and when the tab is hidden.
2. **Every existing plaintext path must be closed**, with a test each: search (`src/core/search.ts`), print (`src/ui/print.ts`), the activity log (`mutate` writes `log` text in `src/ui/store.ts`), the damaged-data recovery copies (`familyContinuityPlanner.recovery.*` in `src/core/storage.ts`), the possible-secret audit (which must skip the section rather than read it), undo, and the static phone preview of PR #24.
3. **Key and format.** App-generated passphrase with at least 80 bits of entropy (for example 7 words from a fixed 2,048-word list, or 16 base32 characters in groups), so a slow key-derivation function matters less. PBKDF2-SHA-256 or HKDF to an AES-GCM 256 key, a fresh random 96-bit IV for every encryption, a stored salt, and a format version inside the encrypted blob. A schema bump with a migration, fixtures and tests (PROJECT_SPEC backup rule).
4. **Last-updated date per entry**, stored outside the ciphertext (so it shows while locked) and shown on the printed plan: "Locked: email password, updated March 2027". No names of services beyond what the creator types as the label.
5. **The card.** Printed with the plan name, the date it was made, a short fingerprint of the key (so the reader can tell which card matches which file), and plain steps: "Open the plan on a computer. Choose Locked. Type these words." Print two: one at home, one with the attorney.
6. **Lost card.** While the creator is alive and the section is unlocked: generate a new card, re-encrypt, and the old card stops working (warn that old exported files still open with the old card). If the creator is alive and the section is locked: the keys inside are gone; the creator types them again under a new card. If the creator has died: permanent loss for those keys, by design. The plan must say so in plain words at setup and on the card, and the readable plan must still say what to do without them (call the carrier, use vendor recovery, Apple Legacy Contact).
7. **Cross-engine proof.** Decrypt tests in Chromium, Firefox and WebKit from a file opened from disk. Verified here: Chromium treats `file://` as a secure context and `crypto.subtle` works there (2026-11-26). Firefox and WebKit on `file://`: UNVERIFIED.
8. **An outside security review** before release. Rough size: 600 to 1,000 lines of code and tests (UNVERIFIED estimate), most of it in item 2.

### Recommended instead: a printed key sheet, filled in by hand

Smallest useful version, no secrets in the app:

- A "Print a key sheet" button in Accounts that prints a blank form: rows for phone unlock code, computer login, email account and password, password manager master password, Wi-Fi, each with a "last changed" date line. Filled in with a pen. The app never sees what is written.
- A pointer in the plan: where the sheet is kept and the date it was last checked (an Accounts entry, existing fields, no schema change).
- When review reminders ship (roadmap), include "Check the key sheet is still right".

This keeps one thing to find, works on any phone, and gets most of the "stays current" benefit through the review reminder.

### Kill criteria: when to revisit Locked

Revisit only if all of these hold: usability testing shows the reader can find and use a key sheet but households do not keep it current; the reader reliably has a computer, not only a phone; and someone commits to the security review in item 8. Otherwise, a household with no password manager is better served by the key sheet plus a nudge to get a password manager with emergency access.

## Acceptance (wife test)

- Holding only the Accounts entry for the password manager, she can say which app has the passwords, how she requests access, and how long it takes. She has done it once before.
- When the creator types a password into any entry, a warning appears right under that field in plain words, and saving still works.
- Nothing in the guidance tells anyone to write a secret into the plan (unit test: `secretKind` of every "In your plan, write" line is null).
