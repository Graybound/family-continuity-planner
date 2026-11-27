# Content review: what the reader actually needs

Status: proposed. No code in this change. Each numbered recommendation below is sized to be one issue for the build agent.

Scope: every prompt, field, label, help text, onboarding question, risk item, readiness rule, Start Here default, checklist group and sample record in the app today, checked against what the reader needs to act alone. Sources read: `src/core/sections.ts`, `src/core/plan.ts`, `src/core/sample.ts`, `src/core/readiness.ts`, `src/core/audit.ts`, `src/core/recommend.ts`, `src/core/search.ts`, `src/ui/print.ts`, `src/ui/printDialog.ts`, `src/ui/views/*.ts`, `PROJECT_SPEC.md`, `docs/readiness-and-audit.md`.

## What this spec does not cover

These open specs already own their topics. This review references them and only adds what they leave out.

| Topic | Spec | What this review adds |
|---|---|---|
| Reader view | [reader-mode.md](reader-mode.md) | One header line (recommendation 2) |
| Home network, self-hosted services, domain email | [technology-section.md](technology-section.md) | A "phone and computer" kind (recommendation 2), wording notes (section "Consistency across the open specs") |
| Keep, sell or give | [legacy-section.md](legacy-section.md) (Belongings) | Nothing |
| First day, week, month, year | [timeline-guidance.md](timeline-guidance.md) | Starter checklist (recommendation 7) |
| Start Here as a last message | Separate Start Here thread (owns `DEFAULT_START_HERE` and the editor hint) | Two practical facts to include (recommendation 3) |
| Testing with the reader | [usability-test-plan.md](usability-test-plan.md) | Extra tasks (end of this doc) |

A note on tone: the app may be sad. None of the recommendations here soften or cut content because it is sad. The emergency plan starter (recommendation 6) says "or I have died" on purpose: the reader is most likely reading it for exactly that reason, and a euphemism makes her guess.

## The reader's six jobs, and where the app stands today

| Job | Where it lives today | Verdict |
|---|---|---|
| Get online, fix the Wi-Fi | A "Who handles what" entry or a Home "Internet" record | Covered by the Technology spec |
| Get into accounts (password manager, emergency access, sign-in codes) | An Accounts entry of type "Digital", like any other | **Missing.** The master key has no home, no prompt, and is withheld from the default printout |
| Reach the Roth IRA and other money | Accounts (type Retirement), free text | **Weak.** No beneficiary, no "whose name is it in", no "what bills depend on this card" |
| Find documents and things | Documents (papers), Home (shutoffs) | **Weak.** Locations are withheld from the default printout. No home for "where things are" that are not papers |
| Decide what to keep or sell | Nothing | Covered by the Belongings spec |
| Replace self-hosted services | Nothing | Covered by the Technology spec |

The biggest finding is not a missing feature. It is that the default printout hides the answers the reader needs most (recommendation 1).

---

## Priority 0: without these the plan fails her on day one

### 1. The default printout withholds the answers she needs

**Problem (reader).** She prints the plan, or finds the printout. Under the bank account it says "Where access instructions are stored: Withheld from this printout (private)". Under the will: location withheld. Under the water shutoff: location withheld. Every Note is withheld, because a note's only text field is private. She has the paper in her hand and still can't act.

**Why it happens.** `recordBlock` in `src/ui/print.ts` replaces every field marked `private: true` with "Withheld from this printout (private)" unless the creator ticks "include private details", which is off by default (`preferences.includePrivateInPrint: false` in `blankPlan`, `src/core/plan.ts`). The fields marked private in `src/core/sections.ts` mix real secrets (account numbers, addresses, health details) with **pointers** that are useless without a key the reader already holds (the name of a password manager entry, "fire safe, top shelf").

**Rule to adopt.** A field is private when a stranger reading it could cause harm or embarrassment. A pointer to where something is kept is not private when the thing itself is behind a lock (a password manager, a safe, a lawyer's office).

**Change these field flags** (all in `SECTIONS`, `src/core/sections.ts`):

| Field | Today | Proposed | Why |
|---|---|---|---|
| `responsibilities.recordsLocation` | private | not private | Pointer |
| `accounts.access` | private | not private | Pointer to a password manager entry. Useless without the master password |
| `accounts.notes` | private | not private | Holds "most bills autopay from here", exactly what she needs. Help text (recommendation 5) tells the creator not to write balances or numbers |
| `documents.location` | private | not private | "Original with the lawyer, copy in the safe" is the whole point of the section |
| `home.location` | private | not private | A burst pipe needs the shutoff location now. Help text moves spare-key and lockbox details out (recommendation 5) |
| `notes.details` | private | not private | Otherwise every note prints as withheld |
| `plans.meetup` | private | not private | A meeting point is for sharing |

Stay private: `people.address`, `health.details`, `health.instructions`, `home.account`, `accounts.identifier`, `documents.notes`.

**Reword the print choice** (`src/ui/printDialog.ts`, owned by the UI thread, so as copy only):

- Legend: `Who is this copy for?`
- Option A: `My family. Includes private details such as addresses, account hints and health information. Store it somewhere safe.`
- Option B: `Someone outside the family. Private details are left out.`

Keep the stored preference as is (`includePrivateInPrint`), no schema change.

**Decided by Noah (November 2026):** how to get into the accounts must be printed when the creator has written it. The flag changes above make `accounts.access` and the other pointers not private, so they print in the default printout. Option B stays the default, so real secrets (the fields that stay private) are still left out unless the creator ticks Option A. Flipping the default later is a one-line change in `blankPlan`.

**Data impact.** None. Field flags are code, not data. Privacy mode on screen will also show these fields; update PRIVACY.md's list of private fields and `docs/backup-format.md` where it marks fields with (P).

**Tests.** Unit: a test in `tests/unit` that pins the set of private field keys, so a future change is deliberate. E2E: print the sample with defaults and assert the printout contains the sample's water shutoff location and the password manager's access text, and does not contain the sample address.

**Wife test.** With the default printout only, she can say where the water shutoff is and where the will is.

### 2. Make "how to get into everything" a first-class part of the plan

**Problem (reader).** Almost every other answer in the plan sits behind a login. Today the password manager is one Accounts card among many, typed "Digital", with no prompt to say how emergency access works, how long it takes, or that sign-in codes go to the creator's phone. If she cancels his phone line in week one, which is a common first-week chore, every account that texts a code to that number locks her out.

**What to change.**

a. **New Accounts type option** `Password manager or login list` (add to `accounts.type` options in `src/core/sections.ts`). "Login list" keeps it inclusive for households that use a notebook. Additive select option, no migration: `normalizeRecord` does not check options (noted in [timeline-guidance.md](timeline-guidance.md)).

b. **Accounts callout rewrite** (`accounts.callout` in `src/core/sections.ts`):

> **Start with the key to everything else**
> Add your password manager first, or wherever your logins are kept. Say who already has emergency access, how they use it, and how long it takes. Do not save passwords, PINs, full card numbers or recovery codes here.

c. **New Accounts field** `signInCodes`, label `Sign-in codes go to`, select: `Text message to my phone`, `An app on my phone`, `Email`, `A security key`, `No codes`, `Not sure`. Help: `If codes go to your phone, your family will need the phone and a way to unlock it. Write where the unlock code is kept, not the code.` Not private.

d. **New readiness requirement, Basic level** (decided by Noah, November 2026), id `basic-access`, label `Say how your family can get into your accounts`. Met when at least one Accounts record has type `Password manager or login list` and a non-empty `access`. Target: Accounts, new entry, prefilled with that type. Rationale: this is more basic than an emergency plan for most households. Update `docs/readiness-and-audit.md`. Consequence: existing plans at Basic drop to Getting Started until they add it. Acceptable before real plans exist; say so in the CHANGELOG.

e. **Cover page and reader header line.** Below "First person to contact" on the printed cover (`src/ui/print.ts`, cover part), add `How to get into accounts: {name}. {access}` from the first `Password manager or login list` record, left out when there is none. The reader view header in [reader-mode.md](reader-mode.md) should show the same line under its trusted contact sentence. That is the whole change to that spec.

f. **Technology spec amendment** (for the owner of [technology-section.md](technology-section.md), not edited here): add a kind `Phone, computer or tablet`, and a second starter next to "Start with the Wi-Fi" called `Add my phone`, prefilled:

- name: `My phone`
- whatItDoes: `Many sign-in codes and account recovery messages come to this phone.`
- actWhen: `First day`
- ifItStops (steps):
  ```
  Keep the phone charged and somewhere safe.
  Do not cancel the phone number or the phone plan yet, for at least a year. Many accounts send sign-in codes to it.
  Do not reset or wipe the phone.
  "Where the login is stored" above says where the unlock code is kept.
  ```
- longTerm: `Decide later`

Also add `Password manager` to that spec's examples so a self-hosted manager is documented there with its own "if it stops" steps. Its open question 1 (is the password manager self-hosted) is the highest-risk item in the whole project; this review agrees and does not repeat it.

g. **Sample data** (`src/core/sample.ts`, `examples/sample-plan.json`): change the sample "Family password manager" record to the new type and make it teach the pattern:

- access: `Jordan has emergency access. To use it: open the password manager website, choose "Emergency access", and request access to Alex's vault. It opens automatically after 7 days. The recovery kit is in the fire safe.`
- signInCodes: `An app on my phone`
- notes: `This is where every other login lives. Start here.`

Vendor facts are verified with sources in `docs/handoff-methods.md` (PR #26): Bitwarden emergency access has a waiting period of at least one day and auto-approves if the owner does not respond, so the sample's 7 days is valid; Apple Legacy Contact excludes Keychain passwords, passkeys and payment information; 1Password documents no waiting-period emergency access. The sample stays product-neutral on purpose.

**Schema impact.** One new field (`signInCodes`). See "Schema" at the end.

**Tests.** Unit: readiness `basic-access` met and unmet cases, including type set with empty `access`. Unit: sample plan reaches Basic. E2E: cover page shows the access line for the sample, and omits it for a plan with no such record.

**Wife test.** Holding only the cover page, she can say which app has the passwords, who can open it, and how long that takes.

### 3. Start Here: two practical sentences that prevent the worst first-week mistakes

**Ownership.** The wording of `DEFAULT_START_HERE` (`src/core/plan.ts`) and the Start Here editor hint belong to the separate Start Here thread, which is rewriting it as a last message followed by short practical guidance. This review does not propose full text. It asks that thread to include two facts in the practical part.

**Problem (reader).** The current default text misses the two things most likely to make the reader's situation worse in week one:

1. Cancelling the phone number, email or internet, which cuts off account recovery (see recommendation 2).
2. Scams aimed at people who just lost someone.

**Ask for the Start Here thread** (meaning, not exact words):

- `Please do not cancel the phone number, email or internet service yet. They are often how you get into everything else. Keep the phone charged.`
- `Be careful with anyone you do not know who calls, texts or emails asking for passwords, codes or payments. Real banks and offices do not ask for those.`
- Name "how to get into accounts" in the list of what the plan collects, alongside who to call and where papers are.

**Tests.** Owned by that thread. Suggested: a unit test that the default text mentions not cancelling the phone number.

**Wife test.** After reading Start Here, she can say one thing she should not do this week.

---

## Priority 1: makes the money, papers and routines usable

### 4. Accounts: answer "can I get to this money, and how?"

**Problem (reader).** For the Roth IRA, the reader needs four facts: who it belongs to, whether she is named on it, who to call, and whether anything is urgent. Today she gets a free-text "Owner" and a support phone. Retirement accounts and life insurance usually pass to whoever is named on the beneficiary form, not through the will, so the beneficiary is the most useful single fact on the card (true in the US; UNVERIFIED for every country, so the copy says "often"). A second trap: bills and subscriptions charged to a card in only the creator's name fail when that card is closed.

**Changes** (all `accounts` in `src/core/sections.ts`):

- Add type options: `Credit card`, `Investment`, `Loan`. Keep the existing ones.
- Relabel `owner` to `Whose name it is in`. Help: `Only you, joint with someone, or someone else. This changes what your family can do with it.`
- New field `beneficiary`, label `Who is named to receive it`, help: `For retirement accounts, life insurance and some bank accounts. The money often goes to whoever is on this form, whatever the will says. Write "No one named" or "Not sure" if that is the answer.` Not private.
- Relabel `notes` to `What your family should know` (see recommendation 1 for the privacy flag). Help: `What it is for, bills or subscriptions paid from it, and what happens if it is closed. Do not write balances or full numbers.`
- Relabel `phone` to `Phone number to call`. Help: `For money accounts, look for a number for "beneficiaries", "estates" or "bereavement". It is often different from general support.`

**Sample data.** Add a retirement account:

- name: `Example Brokerage, retirement account`, type: `Retirement`, owner: `Alex only`, beneficiary: `Jordan Morgan (primary). Riley Morgan (backup).`, website: `Example Brokerage app`, phone: `555-0135 (beneficiary services)`, access: `Password manager entry "Example Brokerage"`, signInCodes: `An app on my phone`, notes: `Nothing here is urgent. Jordan can call beneficiary services after the first month. Ask Casey Rivera before moving or cashing out anything, because there can be tax rules.`

And a credit card:

- name: `Sample Bank credit card`, type: `Credit card`, owner: `Alex only`, identifier: `Ends 0000`, notes: `Streaming, phone bill and car insurance are charged to this card. If the card is closed, move them to a card in Jordan's name first.`

**Data impact.** One new field (`beneficiary`). Relabels change no stored data.

**Tests.** Unit: normalize accepts records with and without the new field. E2E: the sample retirement account prints its beneficiary.

**Wife test.** For the sample retirement account, she can say who it goes to, which number to call, and whether it has to be dealt with this month.

### 5. Help text for every field, and plainer labels

**Problem (creator and reader).** Only one field in the whole app has help text (`responsibilities.name`). The creator guesses what to write, so the reader gets inconsistent, thin entries. Some labels are jargon or ambiguous.

All in `SECTIONS`, `src/core/sections.ts`. Label changes do not change stored keys, so no migration.

**Who handles what**

| Key | Label | Help |
|---|---|---|
| `name` | `What you do` (was Responsibility) | keep the current help |
| `domain` | `Area` | none |
| `frequency` | `How often` | none |
| `owner` | `Who does it today` | none |
| `backupPerson` | `Who could take it over` | `A name, or "Hire someone" if nobody could.` |
| `howItWorks` | `How it works` | `Write it the way you would explain it out loud, one step per line. Include the website or app it happens in.` |
| `recordsLocation` | `Where the related papers or files are` | none |
| `whoCanHelp` | `Who can help` | `A person or company, with a phone number.` |
| `guidance` | `What to do with it later` | `Your honest advice. "Safe to ignore" is a kind thing to tell someone.` |
| `notes` | `Notes` | none |

**People**

| Key | Label | Help |
|---|---|---|
| `relationship` | `Relationship` | `For example: partner, child, my mother, neighbor.` |
| `needs` | `Care or communication needs` | `Anything a helper needs to know: a schedule, a medical need, the best way to reach them, who they trust.` |

**Trusted contacts**

| Key | Label | Help |
|---|---|---|
| `role` | `How they can help` (was Role) | `For example: knows our finances, has a spare key, can help with the computer.` |
| `priority` | `Call order` (was Priority) | `Primary: call first. Backup: if the first person can't help. Service: a company or professional.` |
| `instructions` | `When to call them` | `For example: "Anything about the house", "After the first week, about taxes".` |

Also add a callout to Trusted contacts: title `Include someone who is good with technology`, body `A friend or relative who can help with the internet, the computer and logins. Ask them first, and tell them this plan exists.`

**Health**

| Key | Label | Help |
|---|---|---|
| `recordType` | `Type` | none |
| `name` | `Name or item` | `For example: Dr. Lee, Penicillin allergy, Blood pressure medication.` |
| `details` | `Details` | `Dose, policy number, or what the condition means day to day.` |

**Home and utilities**

| Key | Label | Help |
|---|---|---|
| `account` | `Account number or customer ID` | none |
| `phone` | `Phone number to call` | none |
| `location` | `Where it is` (was Shutoff, key, or access location) | `Where the shutoff, meter, breaker panel or equipment is. For a hidden spare key or lockbox, write who to ask instead.` |
| `instructions` | `How to use it` | `Steps one per line. For example: Turn the red handle a quarter turn clockwise to close.` |

**Accounts**: see recommendations 2 and 4. Also relabel `identifier` to `How to recognize it` with help `Last four digits or a nickname. Never the full number.` and `access` to `How to get in` with help `Name the password manager entry, for example "Bank: Sample Credit Union". Do not type passwords.`

**Documents**

| Key | Label | Help |
|---|---|---|
| `location` | `Where it is` | `Be specific: "Fire safe, top shelf, blue folder" or "Original with Example Law Office, copy in the safe".` |
| `expires` | `Expires or needs review` | none |

Extend the Documents callout body with: `Other papers your family is likely to need: power of attorney, healthcare directive, life insurance policies, beneficiary forms, deeds and vehicle titles, birth and marriage certificates, recent tax returns.`

**Emergency plans**

| Key | Label | Help |
|---|---|---|
| `trigger` | `When to use this plan` | none |
| `lead` | `Who takes charge` (was Primary lead) | none |
| `backup` | `If they can't` (was Backup lead) | none |
| `meetup` | `Where to meet` | `Only if it matters for this plan, such as a fire.` |
| `steps` | keep | `Short, one action per line. The reader may be upset. Write it so a tired person can follow it.` |

**Notes**: add category option `Where things are` (additive). `details` help: `Do not write passwords or codes here.`

**Tests.** Unit: every field in `SECTIONS` with `type: 'textarea'` or `private` status as pinned above. Snapshot tests of labels are not worth it; skip them.

**Wife test.** Covered indirectly: entries the creator writes with this help are what she reads. Check in the usability test by reading two real entries aloud.

### 6. An emergency plan starter: "If I am suddenly unavailable"

**Problem (creator).** Emergency plans is required for Basic readiness, and the empty section gives no example. The sample shows the most useful plan of all ("If Alex is suddenly unavailable"), but a new user never sees it.

**Change.** Same pattern as the Wi-Fi starter in [technology-section.md](technology-section.md): when Emergency plans is empty, show `Start with "If I am suddenly unavailable"` next to the add button. It opens the add form prefilled from a constant in `src/core/` (unit tested), and saves nothing until the creator presses Save:

- name: `If I am suddenly unavailable`
- trigger: `I am in the hospital, I cannot be reached for more than a day, or I have died.`
- steps:
  ```
  Call the first person to contact. Their name is on the first page.
  Make sure everyone at home, including children and pets, is looked after today.
  Keep my phone charged and safe. Do not cancel my phone, email or internet.
  Nothing about money has to be decided this week.
  When you are ready, open "What to do, and when".
  ```

No bracketed placeholders, so unedited text is still correct for the reader. If timeline guidance has not shipped, the last step reads `When you are ready, read the rest of this plan one section at a time.`

**Tests.** Unit: the constant has no `[` or `{`. E2E: the starter button appears only when the section is empty and saves a plan with the prefilled steps.

### 7. Replace the starter checklist

**Problem (creator).** The four starter items in `starterChecklist()` (`src/core/plan.ts`) are generic. "Record utility shutoff locations" duplicates the Home section. The two actions that most change the reader's day one are missing: setting up and testing emergency access, and telling the family where the plan is. [timeline-guidance.md](timeline-guidance.md) already moves "Choose two trusted backup contacts" out of "First 24 hours" and adds "Call the first person to contact"; this builds on that.

**New starter list** (new plans only, six items):

| Group | Title | Note |
|---|---|---|
| First 24 hours | `Call the first person to contact` | `Their name is on the cover page and under Trusted contacts.` (from the timeline spec) |
| Information to gather | `Set up emergency access to your password manager, and test it` | `Have your trusted person request access once, confirm it works, then cancel the request.` Build this row with `practiceHandoffItem()` from `src/core/handoff.ts` (PR #26) so it keeps the fixed id `practice-handoff` that Accounts looks up. Adjust that function's title and note rather than adding a second item. |
| Information to gather | `Check who is named on retirement accounts and life insurance` | `The money often goes to whoever is on the form, whatever the will says. Make sure the forms are current.` |
| People to brief | `Choose two trusted backup contacts` | `Confirm how they should be reached.` |
| People to brief | `Tell your family where this plan is kept` | `Show one person how to open it and where the printout and backup are.` |
| Quarterly upkeep | `Export an updated backup` | `Keep an offline copy somewhere protected.` |

Dropped: `Record utility shutoff locations` (the Home section covers it). Merged: `Walk one trusted person through the plan` into "Tell your family where this plan is kept".

**Tests.** Update tests that count or name starter items.

---

## Priority 2: helps, but she can manage without it

### 8. Memory joggers for "Who handles what"

**Problem (creator).** The callout asks for "one thing you do every month that nobody else could pick up easily". Creators blank on this. The hidden jobs are the ones nobody thinks of.

**Change.** Add a short "Ideas" list under the callout (static text, `src/core/sections.ts` as data, rendered by the section view). Each idea is plain text, not a button. Keep it to ten:

- Paying bills that are not on autopay
- Moving money into savings or retirement each year
- Renewing the car registration, driver's licenses and passports
- Paying property tax or renewing the lease
- Renewing a website or email domain name
- Keeping the home internet, router and computers updated
- Backing up family photos
- Managing the children's devices and accounts
- Booking yearly checkups for people and pets
- Filing taxes and keeping the records

Add one more line under the list: `Also think about what happens to the household budget if your income stops: what comes in, what goes out, and how long savings would last.`

### 9. "Where things are"

**Problem (reader).** Not everything she needs to find is a document: the safe key, the spare car key, the backup drive, the box of tax papers, the tool for the water shutoff. Documents is for papers; Belongings is for keep or sell decisions.

**Change.** The new Notes category `Where things are` from recommendation 5, plus sample note: name `Where things are`, category `Where things are`, details:

```
Fire safe key: kitchen drawer left of the stove, in the small tin.
Spare car key: hook inside the coat closet.
External backup drive: office, bottom desk drawer.
Water shutoff tool: basement, hanging next to the shutoff.
```

No new section. If the usability test shows she can't find these, revisit.

### 10. Search should treat "wifi" and "Wi-Fi" as the same word

**Problem (reader).** `search()` in `src/core/search.ts` matches lowercase substrings. She types "wifi"; the plan says "Wi-Fi"; nothing is found. Same for "e-mail", "401(k)", "check-up".

**Change.** Normalize both the query and the searched text by lowercasing and removing hyphens, apostrophes and periods before matching. No synonym list (that is complexity for little gain once the password manager has its own type, which search already matches).

**Tests.** Unit: "wifi" finds a record containing "Wi-Fi"; "wi-fi" finds "WiFi". This touches `src/core`, which the bug hunt thread owns this round, so file it as an issue rather than bundle it into a content PR.

### 11. Sample plan rewrite

The sample (`src/core/sample.ts`) is how new creators learn what a good entry looks like. Collect the sample changes from recommendations 2, 4 and 9 into one change, plus:

- Home: a breaker panel record (`Electric`, location `Garage, left wall behind the bikes.`, instructions `Each switch is labeled. If power goes out in one room, find the switch pointing the other way and flip it fully off, then on.`).
- Keep everything fictional (555-01xx numbers, example.com).
- Update `examples/sample-plan.json` in the same change.

---

## Priority 3: worth doing, low urgency

### 12. Onboarding risks

Add two "what would stop working" items to `RISK_LABELS` (`src/core/plan.ts`), with mappings in `RISK_TO_AREA` (`src/core/audit.ts`):

- `servers`: `Computers or servers I run at home` maps to `technology`. Helps technical creators, who are the ones most likely to have this gap.
- `income`: `Money coming in, such as a paycheck` maps to `finances`.

Note: `normalize` drops unknown risk ids, so an older build silently drops these from a newer backup. Ship them with the next schema version.

### 13. Area labels are stored data; don't rename them casually

`AREA_LABELS` values are written into `responsibilities.domain`, and the `area-undocumented` audit rule matches on the label text (`src/core/audit.ts`, `r.domain === label`). Renaming "Technology and devices" or "Digital services and photos" (which overlap and confuse) would silently break that match for existing entries. If you want clearer area names, do it in the rename window with a migration that rewrites stored `domain` values, or switch the stored value to the area id. Not urgent. Recorded here so nobody renames them as a "copy fix".

### 14. Cut "Home city or region"

`plan.info.region` is collected in Settings (`src/ui/views/settings.ts`) and shown nowhere: not on the cover, not in print, not on the dashboard. Remove the input. Keep the field in the schema so backups still validate.

### 15. Prompts for personal messages

The message dialog could offer two optional prompts as help text: `What would you want them to know about money?` and `What are they allowed to let go of?` The second one reduces the guilt of selling or cancelling things, which pairs with Belongings' "permission to let it go" note.

### 16. Other families

Things checked for family neutrality, no change needed: no religion, no assumed partner, renters covered by Home "Property". Two gaps:

- **No password manager.** Covered by the `Password manager or login list` type (recommendation 2).
- **Creator writing for someone else** (an adult child documenting a parent's household). All copy assumes "you" own the accounts. Not worth a mode. Add one sentence to the "Why this matters" step: `If you are writing this for someone else, such as a parent, answer as if you were them.`

---

## Consistency across the open specs

Not blocking, but cheaper to fix now than after they ship:

1. **Two names for the same field.** [timeline-guidance.md](timeline-guidance.md) adds `timeframe` ("When does this need attention?") to Who handles what. [technology-section.md](technology-section.md) adds `actWhen` ("When to act") with the identical options. Use one exported `TIMEFRAMES` constant and one label, "When does this need attention?", in both. Keys can differ, but the reader should see one phrase.
2. **Plain words for the reader.** The Technology kind `Self-hosted service` shows on cards the reader sees. Suggest the label `Something running at home or on our own server`. Same for "2FA" anywhere: say "sign-in codes".
3. **One schema version.** Technology, Belongings, the timeline field and this review's two new Accounts fields (`signInCodes`, `beneficiary`) should share one version 3 and one migration, folded into the rename pass that changes `SCHEMA_ID` and storage keys. The Technology spec already says this; this review just adds two fields to the list.

## Schema summary for this review

| Change | Type | Migration |
|---|---|---|
| `accounts.signInCodes`, `accounts.beneficiary` | New fields | None needed (`normalizeRecord` stores `''` for missing fields). Ship inside version 3 so older builds refuse newer backups instead of dropping the fields |
| New select options (`accounts.type`, `notes.category`) | Additive | None |
| New risk ids (`servers`, `income`) | Additive | None, ship inside version 3 |
| Private flags, labels, help, callouts, Start Here, starter checklist, sample | Code only | None |

## Extra tasks for the usability test

Add to [usability-test-plan.md](usability-test-plan.md) after recommendations 1 to 4 ship:

1. "The bank's app is asking for a code. Where would it be sent, and how do you get it?" Pass: she names the phone or app and where its unlock code is kept.
2. "Using only the printout, where is the will?" Pass: she reads a location, not "withheld".
3. "Is the retirement account something you have to deal with this month? Who do you call?" Pass: she says no, and reads the number.

## Suggested order of work

1 and 5 are copy and field flags only, and 3 is a handoff to the Start Here thread: one small PR, no schema change, largest effect. Then 2 and 4 together inside the version 3 schema change. Then 6 and 7. The rest as issues.
