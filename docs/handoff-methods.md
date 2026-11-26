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

## Acceptance (wife test)

- Holding only the Accounts entry for the password manager, she can say which app has the passwords, how she requests access, and how long it takes. She has done it once before.
- When the creator types a password into any entry, a warning appears right under that field in plain words, and saving still works.
- Nothing in the guidance tells anyone to write a secret into the plan (unit test: `secretKind` of every "In your plan, write" line is null).
