# Usability test plan: can the reader act alone?

Status: ready to run. Owner: the creator (runs the session). Participant: the primary reader, a non-technical partner.

This is a 30-minute session the creator runs with the person who would actually use the plan. It is the real acceptance test for the reader experience. It produces findings and issues, not code.

## Title and problem (reader's point of view)

"Something at home broke and the person who handles it isn't here. I opened the plan. Can I find what I need, understand it, and do the next step without calling anyone?"

Today nobody has watched a non-technical reader use the plan. Every reader-facing decision (Start Here, section names, private fields withheld in print, the printed packet order) is a guess by a technical creator. Four specs are being written in parallel (reader mode, Technology, Legacy, timeline guidance) and all of them assume things about how the reader looks for information. This test checks those assumptions against one real reader before the build agent spends time on them.

### How this differs from IMPORT_ISSUES.md item 14

Item 14 tests the **creator** side: can a non-developer download the app and write a plan. This plan tests the **reader** side: can a non-technical person use a plan someone else wrote. Both are needed. The reader side matters more because the reader is the one who uses it under stress, and the reader is the one the creator can't help. Item 14 stays open.

## When to run it

Run it twice:

1. **Baseline, now**, on the current app (v0.2.x) before reader mode, Technology, Legacy, or timeline guidance are built. Tasks 4 and 5 are expected to go badly, because the sections they need don't exist yet. That is the point: it shows what the new sections must fix, in her words, before they are designed in detail.
2. **Follow-up, after reader mode and the Technology section ship**, with the same tasks and the same scoring. Compare.

Don't wait for reader mode to run the baseline. A test after the build only tells you whether the build works. A test before it tells you what to build.

## Ground rules for the creator (read these twice)

Testing with your partner has two built-in problems. She wants to please you, and you want to help her. Both ruin the data.

- **Don't help.** No hints, no pointing, no "try the menu," no leaning toward the screen. If she asks you a question, answer: "What would you do if I weren't here?" Silence is fine.
- **Don't explain or defend the app**, during or after a task. Every explanation you give is a finding you lose. Write it down instead.
- **Don't react to mistakes.** Neutral face, neutral voice. A sigh tells her she is wrong.
- **It's the app being tested, not her.** Say this at the start and mean it. If she gets stuck, that is a bug you found, and you say "that's really useful" and move on.
- **Use the "away" framing, never the death framing.** The scenario is "I'm on a two-week trip with no phone signal." It exercises the same reader path without making the session about grief. This also follows the product's no-morbid-language principle. If she brings up the real reason for the app, acknowledge it briefly and offer to stop.
- **Stop if she is upset.** The session is not worth more than how she feels about the plan. You can finish another day.
- **Optional, better:** if a friend or family member who isn't the creator can sit in and run the script, the creator stays out of the room and watches a screen recording later. This removes most of the "please him" bias. Not required.

## Setup (creator, before the session, about 1 hour)

1. **Write the content the tasks need, the way you'd really write it.** Write the entries first, then read the task list. Don't tune the wording to the tasks. Minimum content:
   - Home and utilities: the internet service, with what to do when the Wi-Fi is down.
   - Accounts: the Roth IRA (institution, support phone, where access instructions are stored, which points to the password manager and its emergency access). No passwords. The app is not a password manager.
   - Who handles what: at least one self-hosted service you run (for example photo backup or media server), written into whatever fields exist today. There is no Technology section yet. Use what you'd naturally use.
   - Who handles what, or Notes: at least one thing of yours with a keep or sell decision (for example a camera or a computer), written wherever you'd naturally put it. There is no Legacy section yet.
   - Start Here: default or your own text.
   - Trusted contacts: at least one person she'd call for tech help.
   - Emergency plans or the "First 24 hours" checklist group: at least one item, so the printout has Immediate actions.
2. **Put the app where she would really find it.** The README says family reads the plan through the printed packet, a saved PDF, or by opening the planner on the creator's computer. Use the real path: your computer, your browser, the file in the place it actually lives. Close the app first. Don't leave it open on screen.
3. **Leave the pointer you'd really leave.** Whatever you've actually told her (or plan to tell her) about where the plan is. If you haven't told her anything yet, that is the honest baseline: tell her only "it's on my laptop."
4. **Print the packet** with the default settings (private details withheld). Put it face down.
5. **Prepare recording.** A notes sheet (the template below, printed or on a second device) and a timer. Optional: a local screen recording with the OS's built-in recorder, with her permission. Don't use any cloud recording or transcription service; the session shows household details.
6. **Pick the device she'd really use.** If the honest answer is "her phone," note that the plan lives in your laptop browser, and that this is a finding before the session starts.

### A note on data

The test plan holds real household details, so treat it as a real plan for privacy: keep it on your machine, shred the printout after.

It is not yet a "real plan" for compatibility purposes. The rename to When I'm Gone changes the storage keys and the backup schema id (`SCHEMA_ID = 'family-continuity-planner'` in `src/core/plan.ts`). Export a backup after setup anyway. Expect to re-enter the content or restore it by hand after the rename. Losing it is acceptable now. Don't let this session become the reason to promise backward compatibility early.

## The session (30 minutes)

| Time | Block |
|------|-------|
| 0 to 3 | Intro script |
| 3 to 25 | Six tasks, about 3 to 4 minutes each, hard stop per task |
| 25 to 30 | Debrief questions |

### Intro script (read it, don't improvise)

> "I want to see if the plan I wrote actually works for you. I'm testing the plan, not you. If something is confusing, that's my fault and exactly what I need to find.
>
> Pretend I'm on a two-week trip with no phone signal. You can't reach me. I'll read you a situation, and you try to handle it with the plan. Please say out loud what you're looking for and what you're thinking, even if it feels silly.
>
> I'm not going to help, not because I'm being mean, but because I won't be there. If you'd give up or call someone in real life, just say so. That's a fine answer.
>
> We can stop anytime."

### Tasks

Read each task aloud and hand her a card with the same words. Start the timer when you finish reading. Stop it when she says she's done, says she'd give up or call someone, or the time limit hits. Don't run over: a timed-out task is a result.

Each task lists what success means. "Find" is enough. She does not log in to anything or change any setting during the test.

**Task 1. Open the plan (limit 3 min).**
> "The Wi-Fi is acting up and you want to check my plan. It's on my laptop. Open it."

- Success: the plan is on screen with her data showing.
- Watch for: does she know which browser, where the file is, what it's called? Does she find the sample data or an empty plan instead? Does the app name mean anything to her? Does the "this is not saved / other tab" banner show up and confuse her?
- If she fails, open it for her after the time limit and note it as failed. The remaining tasks still run.

**Task 2. Wi-Fi is down (limit 4 min).**
> "The internet is down at home. Use the plan to figure out what to do."

- Success: she reaches your Wi-Fi or internet entry and says the first step out loud.
- Watch for: where she looks first (search, Home and utilities, Who handles what, Start Here). Words she uses that the app doesn't (for example "internet," "router," "the box"). Whether she understands the steps you wrote or stalls on a term.

**Task 3. The Roth IRA (limit 4 min).**
> "You need to get into our Roth IRA. Use the plan to find out how."

- Success: she names the institution, finds the support phone, and says where the access instructions are (for example "the password manager, and he set up emergency access").
- Watch for: does she know a Roth IRA is a "retirement" account? Does she understand "locator, not a secret"? Does she know what "emergency access" means and how to use it, or does that send her somewhere the plan doesn't explain?

**Task 4. A home service stopped (limit 4 min).**
> "The [name she would use for one self-hosted service, for example 'photo backup'] stopped working. Use the plan to figure out what to do."

- Success: she finds the entry and can say whether to fix it, replace it, or leave it, and who could help.
- Expected baseline: hard, because there is no Technology section. Record exactly where she looked and what word she used for the service. That is direct input to `docs/specs/technology-section.md`.
- Watch for: does she know the service is something you run at home, not an app she pays for? Does she know it costs nothing today and something later?

**Task 5. Keep or sell (limit 3 min).**
> "Someone offered to buy your [item you wrote a decision for]. Does the plan say whether to sell it?"

- Success: she finds your decision and any instructions (price, who to ask, where it is).
- Expected baseline: hard, because there is no Legacy section. Record where she looked. Input to `docs/specs/legacy-section.md`.

**Task 6. The printout, first day (limit 4 min).** Close the laptop. Hand her the printed packet.
> "You only have this paper. It's the first day I'm out of reach. What do you do first, and who do you call for help with tech?"

- Success: she names a first step from Start Here or Immediate actions, and names a trusted contact.
- Watch for: does she read Start Here or skip it? Does she find Immediate actions? How does she react to "withheld" private fields: does she understand something exists and where to get it, or does she think the plan is broken? Does she try the Roth IRA again and hit the withheld access field? Input to `docs/specs/timeline-guidance.md` and `docs/specs/reader-mode.md`.

### Per-task follow-up (10 seconds, after each task)

> "On a scale of 1 to 5, how sure are you that you could do that alone, on a bad day?"

Write the number. Don't discuss it.

### Debrief (5 minutes)

Ask these in order. Write her words verbatim.

1. "What was the hardest part?"
2. "Was there a word or a screen that made no sense?"
3. "Was there anything you expected to find and didn't?"
4. "If you opened this for real, what would you want to see first?"
5. "Is there anything in it that felt upsetting or too much?"
6. "If you could change one thing, what would it be?"

Then thank her and stop. Explaining the app now is fine, and often useful, but nothing she says after you explain counts as a finding.

## What to watch for (all tasks)

Tally these on the notes sheet as they happen:

- **First click.** Where she went first. A wrong first click predicts failure better than anything else.
- **Wrong turns.** Each time she opens a screen that isn't the answer and backs out.
- **Search.** Did she use search? What did she type? Did it find anything?
- **Her words versus the app's words.** Every time she names something differently from the label on screen. This is the most useful output for copy and section names.
- **Hesitation over 10 seconds** with nothing happening, and what was on screen.
- **Creator-facing UI** she touched or was confused by: readiness levels, Continuity review, Get started, edit buttons, Privacy mode, Export backup. Each one is evidence for what reader mode should hide.
- **Fear of breaking something.** Did she avoid a button because she thought it would change or delete the plan?
- **Emotional moments.** Anything that made her pause, sigh, or go quiet. Note what was on screen.
- **Asking the creator.** Every time she asked you something, even rhetorically.

## How to record results

### Scoring each task

| Score | Meaning |
|-------|---------|
| Pass | Done alone, no hints, within the time limit |
| Struggle | Done alone, but with 3 or more wrong turns, or over half the time limit stalled |
| Fail | Not done in time, gave up, said she'd call someone, or the creator helped |

Creator help, even a look, makes a task a Fail. Be honest. A generous score helps nobody.

### Notes sheet (copy once per session)

```
Session: baseline | follow-up     Date:          App version:
Device / browser:                  Recorded on screen: yes | no

Task | Score | Time | Confidence 1-5 | First click | Wrong turns | Searched for
1 Open           |      |      |   |            |    |
2 Wi-Fi          |      |      |   |            |    |
3 Roth IRA       |      |      |   |            |    |
4 Home service   |      |      |   |            |    |
5 Keep or sell   |      |      |   |            |    |
6 Printout       |      |      |   |            |    |

Her words vs app words (her word -> app label):

Quotes (verbatim, with task number):

Creator-facing UI she touched:

Debrief answers 1-6:
```

### Where results go

- **Raw notes and any recording stay off the repo.** They contain real household details, and the PR checklist forbids real personal information in the repo. Keep them on your machine and delete the recording once findings are written up.
- **Findings go into the repo** as `docs/research/YYYY-MM-DD-reader-usability.md`, written in general terms ("the reader looked for the internet entry under Accounts"), with no names, institutions, account details, or service names that identify the household.
- **Each finding that needs a change becomes an issue** labeled `user-experience`, with a severity:
  - **Blocker:** she could not complete a task the plan exists for (open it, Wi-Fi, Roth IRA, first day).
  - **Major:** she completed it but struggled, or it made her doubt herself.
  - **Minor:** a word or layout issue that slowed her down without stopping her.
- **Feed the specs.** For tasks 4, 5, and 6, add the relevant findings directly to the open specs (technology, legacy, timeline, reader mode) as a "Usability evidence" note, or comment on their PRs if they haven't merged.

A finding needs one observation, not a pattern. With one participant there are no statistics. Weigh it by severity and by whether it would hit her on a bad day.

## Acceptance criteria

A non-developer can check each of these:

- [ ] The baseline session was run with the primary reader, all six tasks attempted, within 35 minutes.
- [ ] The creator gave no help during tasks, or every task where help was given is scored Fail.
- [ ] A filled notes sheet exists for the session (kept off the repo).
- [ ] A findings file exists at `docs/research/YYYY-MM-DD-reader-usability.md` with a score, confidence, and the top observation for each task, and no identifying household details.
- [ ] Every Blocker and Major finding has an issue filed.
- [ ] Findings for tasks 4, 5, and 6 are linked from the Technology, Legacy, timeline, and reader-mode specs.
- [ ] Wife test on the test itself: she was told the purpose, knew she could stop, and left the session not feeling tested. Ask her the next day. If she felt judged, fix the framing before the follow-up session.
- [ ] Follow-up session after reader mode and Technology ship, same tasks, results compared in the same findings file. The bar for "reader mode is done": tasks 1, 2, 3, and 6 Pass with confidence 4 or higher.

## Out of scope

- Testing the creator side (writing a plan). That is IMPORT_ISSUES.md item 14.
- Recruiting other participants. One real reader first. Add 2 or 3 other non-technical readers later if the findings are ambiguous.
- Any analytics, telemetry, session replay, or click tracking in the app to support testing. The product has none and testing doesn't change that.
- Real logins, real money, real settings changes. Tasks stop at "find it and say the next step."
- Accessibility or screen-reader testing (separate roadmap item).
- Testing on a phone, unless that is the device she'd really use, in which case it's a finding.

## Files likely touched

- `docs/specs/usability-test-plan.md` (this file).
- After the session: new `docs/research/YYYY-MM-DD-reader-usability.md`, new issues, and short "Usability evidence" notes in the four parallel specs under `docs/specs/`.
- `ROADMAP.md`: when the baseline is done, add a line under Phase 3 or 4, "Reader usability baseline (see docs/research/...)". Tick "Usability testing with people who are not developers" only after item 14 is also done.

**Data or schema impact:** none. **Migration needs:** none. **Code changes:** none. There is nothing here for the build agent to build. If the findings call for code, they arrive as separate issues.

## Test plan

This is a test plan, so there are no unit or e2e tests for it. Checks on the plan itself:

- **Dry run (10 minutes, before the real session):** run tasks 1 to 3 on yourself with the laptop closed and the printout face down, timing each. If you can't finish a task in half its limit, the content you wrote is the problem, not her. Fix the content, not the task.
- **Script check:** read the intro and each task aloud once. If you find yourself adding words, put them in the script or cut them.
- **Accessibility checks during the session:** note text size she had to zoom, contrast in the theme she chose (light or dark follows the system), and whether she used the keyboard or only the mouse or touch. These feed the separate screen-reader and accessibility roadmap items.

## Smallest useful version and what's left out

**Smallest useful version:** tasks 1, 2, 3, and 6, scored, with the debrief. About 20 minutes. This covers what she most needs: getting in, Wi-Fi, the Roth IRA, and the first day on paper.

**Deliberately left out:**

- A full first-day-to-first-year walkthrough. Timeline guidance doesn't exist yet. Task 6 covers the first day only.
- Simulating stress. You can't, and you shouldn't try. The "away" framing and the per-task confidence question ("alone, on a bad day") are the honest substitute.
- Standard usability questionnaires (SUS and similar). With one participant they add paperwork and no signal.
- A participant consent form. She's your partner. Tell her what you'll write down and where it goes, and that's enough. If you later test with people outside the household, add a one-paragraph consent note then.

## Known weaknesses of this plan

- **One participant who knows the creator.** Familiarity inflates success (she can guess how you think) and politeness inflates confidence scores. Treat Passes with some suspicion and Fails as real.
- **The creator wrote the content and the tasks.** Writing content first and reading tasks second reduces this but doesn't remove it.
- **Practice effect on the follow-up.** She will remember the tasks. For the follow-up, swap the specific service in task 4 and the item in task 5, and keep the rest the same.
