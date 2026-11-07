# Readiness levels and the continuity review

Both are deterministic: the same plan on the same date always gives the same result. Source: [src/core/readiness.ts](../src/core/readiness.ts) and [src/core/audit.ts](../src/core/audit.ts). Tests: [tests/unit/readiness-audit.test.ts](../tests/unit/readiness-audit.test.ts). Update this page whenever a rule changes.

Neither ever says a plan is complete. They describe usefulness and likely gaps.

## Module (section) status

| Status | Meaning |
|---|---|
| Not started | Automatic: no entries |
| In progress | Automatic: one or more entries |
| Completed | Chosen by the user |
| Review later | Chosen by the user |
| Does not apply | Chosen by the user |

A section is **addressed** when it has at least one entry, or is marked Completed or Does not apply.

## Readiness levels

Levels are cumulative: a level is reached only when all of its requirements **and all requirements of lower levels** are met.

**Getting Started:** every plan starts here.

**Basic Emergency Plan Ready**
1. At least one trusted contact entry, or a "First person to contact" in plan details.
2. At least one emergency plan.
3. At least one document location.
4. A backup has been exported at least once.

**Core Continuity Plan Ready**
1. At least three entries in Who handles what.
2. People, Home and utilities, Accounts, and Health are each addressed.

**Thorough Plan Ready**
1. Every section is addressed.
2. No section is marked Review later.
3. The plan was marked reviewed within the last 365 days.
4. A backup was exported within the last 90 days.

Checklist completion does not affect readiness (in v1, checking off starter items raised the score).

## Continuity review rules

Each finding has a stable ID so it can be dismissed (hidden permanently) or deferred (hidden for 30 days). "Show them again" clears both.

| Rule ID | Appears when | Links to |
|---|---|---|
| `area-undocumented:<area>` | An area is marked "Mostly me" in the assessment, or a selected "what would stop working" item maps to it, and no Who handles what entry has that area. Risks in areas marked "Does not apply" are ignored | Who handles what, new entry with the area filled in |
| `no-contacts` | No trusted contacts and no "First person to contact" | Trusted contacts |
| `account-no-access:<id>` | An account has no "Where access instructions are stored" | Accounts |
| `document-expired:<id>` | A document's expiration or review date is before today | Documents |
| `plan-stale:<id>` | An emergency plan's last reviewed date is more than 365 days ago | Emergency plans |
| `checklist-overdue:<id>` | An unchecked item's due date is before today | Checklist |
| `possible-secret:<id>` | An entry contains the word password, passcode, or PIN followed by a colon or equals sign and a value, or 13 to 19 digits that look like a card number | That section |
| `review-later:<section>` | A section is marked Review later | That section |
| `backup-never` | The plan has entries and no backup was ever exported | Settings |
| `backup-old` | The last export was more than 90 days ago | Settings |
| `plan-not-reviewed` | The plan has entries and was never marked reviewed, or not within 365 days | Settings |

### Risk to area mapping

bills, autopay, investments: Finances and bills. taxes: Taxes. insurance: Insurance. access, internet: Technology and devices. photos: Digital services and photos. maintenance, seasonal: Home maintenance. vehicles: Vehicles. children: Children. pets: Pets. healthcare: Healthcare coordination. business: Work or business.

## Recommendations (Get started, step 4)

Each section gets a score:

- Base: Trusted contacts 3, Who handles what 2, Emergency plans 2, others 0.
- For each assessment area: "Mostly me" adds 3 to the area's primary section and 2 to its other sections; "Shared" adds 1 to the primary section.
- For each selected risk: 2 to the mapped area's primary section, 1 to its other sections.

Sections marked Does not apply are excluded. Sort by score, then by section order. **Priority:** up to 4 sections scoring 3 or more. **Helpful:** up to 4 of the rest scoring 1 or more. **Optional:** everything else. Each recommendation lists up to three reasons. Area to section mapping is `AREA_TO_SECTIONS` in [src/core/recommend.ts](../src/core/recommend.ts) (first section listed is the primary one).
