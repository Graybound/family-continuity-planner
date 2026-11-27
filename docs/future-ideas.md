# Future Feature Ideas

A parking lot for ideas we are not building now. Each entry says what it is, why it might be worth it, and what would make us revisit it. When we decide to defer an idea, it goes here instead of being built or forgotten. When we pick one up, it moves to [ROADMAP.md](../ROADMAP.md) and gets a spec.

## Plan identity and version history

**What:** a hidden, permanent plan id stored in every saved file, so the app can recognize copies of the same plan and warn when someone opens an older copy than one it has already seen.

**Why it might be worth it:** a family can end up with several saved copies and pick the wrong one. Today each file stands alone: opening a file always shows the plan inside it, and the file name and banner carry the saved date and time.

**Revisit if:** people get confused by multiple copies, for example in usability testing ([usability-test-plan.md](specs/usability-test-plan.md)).

## Locked section for secrets

**What:** an optional, encrypted part of the plan for a few rarely changing keys (phone PIN, computer login), opened with a printed card. Evaluated in [handoff-methods.md](handoff-methods.md) and [issue #27](https://github.com/Graybound/family-continuity-planner/issues/27). The current rule is that the plan never stores secrets; it points to where they are kept.

**Why it might be worth it:** households with no password manager have nowhere safer to put those few keys.

**Revisit after:** testing the plan with the primary reader.

## Safari .webarchive export

**What:** a second export for Apple households, next to the single HTML file, so the plan might open and run on an iPhone. Analysis in [self-contained-plan-file.md](specs/self-contained-plan-file.md), section 7.

**Why it might be worth it:** an iPhone shows a saved HTML file without running it, so the reader can read the plan there but not use it as the app.

**Revisit only if:** the iPhone device test shows a web archive runs the app and keeps edits after closing and reopening.
