# Product specification

## Vision

Most estate-planning products answer "What do I own?" Family Continuity Planner answers **"How does my family keep functioning when I am no longer available to help?"**

It is a private, local-first application for documenting the practical knowledge a family may need if its creator dies, becomes seriously ill, or otherwise cannot manage family responsibilities. The emphasis is roughly **75 percent knowledge transfer and continuity, 25 percent asset and account documentation.**

It is not an asset inventory, password vault, legal document generator, estate checklist, financial planning tool, or replacement for a will.

## Audience

Single people, married and unmarried couples, parents and people without children, caregivers, adult children helping parents, blended families, pet owners, homeowners and renters, small business owners, people with complicated technology, and anyone who wants to make things easier for the people they leave behind. The product assumes no particular family structure, religion, country, gender, financial situation, legal arrangement, homeownership status, or technical ability. Language is inclusive, calm, and plain.

The creator enters the information. The output is primarily for the reader: a partner, children, other family, an executor, a caregiver, a trusted friend, or a professional helper.

## Principles

1. **Local first.** Works without a cloud service, account, subscription, backend, internet access, or proprietary service. Runs from a computer, USB drive, external drive, NAS, a static download, or as a printed packet. No analytics, telemetry, tracking, remote fonts, external scripts, CDNs, or required remote APIs. Remains useful if development stops.
2. **Privacy by design.** Storage, data flows, backups, and encryption status are documented honestly. No raw passwords by default; document the password manager, emergency access, recovery documents, and who can help instead.
3. **Reduce overwhelm.** Guide and encourage. No walls of questions, no required sections, no forced linear flow, no shaming, no morbid language, no claims of completeness, no misleading overall percentage. A basic plan is useful on its own.
4. **Design for the survivor.** The family-facing output opens with a reassuring Start Here section that explains what the document is, that not everything is urgent, that help exists, to focus on the next step, and that it is guidance, not a legal instruction. The creator can keep, edit, or replace it and add messages for different audiences.
5. **Knowledge before assets.** Operational knowledge and helpful relationships come before lists of property.
6. **Progressive usefulness.** Readiness levels (Getting Started, Basic Emergency Plan Ready, Core Continuity Plan Ready, Thorough Plan Ready) and module states (Not Started, In Progress, Completed, Review Later, Does Not Apply). Rules are deterministic, explainable, documented, and tested. No legal, financial, medical, or safety guarantees.

## Status of functionality

### Implemented (tested)

- Single-file offline app with hash-based CSP and no network access
- Sections: Who handles what (responsibilities), People, Trusted contacts, Health, Home and utilities, Accounts (locator only), Documents, Emergency plans, Notes
- Add, edit, delete records with labelled forms, required-field validation, private-field marking
- Per-section filter and type filter; global search (Ctrl/Cmd+K) that skips private fields in privacy mode
- Module status per section, including Completed, Review later, Does not apply
- Readiness levels with explained requirements
- Onboarding: why this matters, family continuity assessment (who handles 14 areas), risk discovery (15 "what would stop working" items), tiered recommendations with reasons
- Continuity review: 11 deterministic rules, each explained, linked, dismissible, and deferrable
- Start Here with default, edited, or replaced introduction; personal messages by audience
- Checklist with four groups (plus any custom groups from older data), add, edit, check, delete, due dates
- Versioned schema (v2), validation of all input, v1 migration, protection against malformed and malicious files
- Backup export, restore with non-destructive preview (version, dates, counts, migration actions, problems fixed), export-first option, explicit confirmation
- Recovery of damaged browser storage without overwriting it; upgrade of v1 browser storage without modifying it
- Printed packet on US Letter: cover, Start Here, immediate actions, trusted contacts, sections, checklists, messages; private details withheld by default
- Privacy mode that removes private text from the screen
- Light and dark themes, following the system until chosen
- Sample data (load, banner while active, remove), erase all local data
- Keyboard operation, visible focus, labelled controls, accessible dialogs and notifications, reduced motion, responsive layout down to phone width
- Release packaging (single HTML, zip with plain-text guide, checksums), CI, draft-release workflow, privacy scan

### Partially implemented

- **Life domains.** Nine sections cover the spec's domains through fields and types (vehicles under Home and utilities and Who handles what; pets, children, technology, taxes, insurance, and work as areas in Who handles what). Dedicated sections for Pets, Vehicles, Children, Technology, Work or Business, Service Providers, Community, Collections, Family History, and Legacy are planned.
- **Trusted helpers and relationships.** Captured as Trusted contacts and People, without explicit links between records.
- **Timeline guidance.** First 24 hours checklist and emergency plans exist; a broader "first week, first month, first year" structure does not.
- **Accessibility.** Automated axe checks and keyboard tests pass; no manual screen-reader audit has been done yet.
- **Cross-browser.** Automated tests run in Chromium only.

### Planned

- Audience-specific packets: partner, executor, emergency helper, technology helper, caregiver, messages only
- Review reminders and a guided yearly review
- Additional dedicated sections listed above
- Links between records (for example, an account's helper is a trusted contact)
- A4 print layout
- Firefox and WebKit in automated tests; manual screen-reader testing
- Activity history view (data is already recorded)

### Future ideas (need design and discussion)

- Encrypted backups using Web Crypto, only with clear warnings about permanent loss if a passphrase is forgotten
- Optional, clearly separated AI assistance for memory joggers. Never required, never part of the core audit
- Translations
- Import from common formats (CSV contacts)

### Explicitly out of scope

- Storing passwords, PINs, or recovery codes (a password manager does this better)
- Generating wills or other legal documents
- Cloud sync, accounts, or any hosted backend
- Financial planning or investment advice
- Analytics or telemetry of any kind

## Onboarding flow

1. **Why this matters.** "You do not need to document your entire life today. Start with the information only you know."
2. **Family continuity assessment.** For finances, household operations, technology, home maintenance, vehicles, taxes, insurance, children, pets, healthcare, family coordination, work or business, important records, and digital services: who handles it today (mostly me, shared, someone else, does not apply). Areas marked "mostly me" are shown as where the family depends heavily on the creator.
3. **Risk discovery.** "If you were unavailable tomorrow, what would stop working?"
4. **Recommendations.** Priority, Helpful, Optional, with reasons, and a quick way to mark a section as not applying.

All steps are optional and can be visited in any order.

## Printing requirements

US Letter, clear page breaks, readable type, a cover page, Start Here, immediate actions, trusted contacts, clear headings, optional hiding of sensitive details, no navigation or controls, graceful long notes, a printed-on date, a last-reviewed date, and a reminder to confirm the plan is current. The printout must make sense without the app.

## Disclaimer

An organizational and knowledge-transfer tool. Not a will, and not legal, financial, or medical advice. Does not replace estate planning or advice from an attorney, accountant, financial professional, healthcare professional, or other qualified professional.
