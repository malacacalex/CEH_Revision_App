---
description: Research and build the full content package for CEH module N
argument-hint: <module number 1-20>
---
Build module **M$ARGUMENTS** end to end. The owner provides nothing: do all research yourself.
Read `CLAUDE.md` first (hard rules, conventions, volumes) and follow them exactly.

1. **Scope.** Read `content/modules/mXX/meta.json` (sections, effortUnits, domain) and
   `content/config/blueprint.json`. Compute targets: cards ≥ max(25, round(35·units·0.9)),
   practice ≥ max(35, round(50·units·0.9)), 10 pretest, mock share of the 500-question pool
   (domain weight, split by effort units inside the domain). Say the targets before writing.
2. **Research** (`research/mXX.md`): one table per section: fact · source 1 · source 2 · verify.
   Source priority: EC-Council public pages / exam blueprint (scope and terms only), then official tool
   docs, RFCs, OWASP, NIST, MITRE, FIRST, vendor docs, then reputable study resources for framing only.
   Every exam-relevant fact needs 2 independent sources; otherwise `verify: true`. Check every URL
   (curl with a browser UA; 403/429 from bot protection is fine, 404 is not). No braindumps, no
   courseware text, no Scribd or pirated copies.
3. **Write** in your own words, following §7.1–7.2 of the spec as summarized in `CLAUDE.md`:
   `meta.json` (status `built`, 5–10 objectives, Reading Map by section title, 2–4 labs with a free
   alternative marked `verify: true`, 3 Feynman prompts), `notes.md` (1,500–3,000 words, one `##` per
   section, Plain English first, attack → tool → countermeasure tables, Exam traps, 1–3 Mermaid
   diagrams), `flashcards.json`, `questions.pretest.json`, `questions.practice.json`,
   `questions.mock.json`. Mix: 35% recall, 35% scenario, 15% tool ID, 10% command/output, 5% terminology;
   practice 40/45/15 easy/medium/hard, mock 30/50/20. New IDs continue after the highest existing one.
   Generate large files with a script in the scratchpad, correct answer at index 0, then
   `npm run content:balance -- <module>` to spread the answers.
4. **Blocked content.** If an item or section cannot be written (refused, no reliable source, owner set it
   aside), do not stop and do not work around it: add a row to `research/deferred.md` (date, item, target
   file, scope in one line, status) and carry on with the rest. List those rows in the final report.
5. **Check:** `npm run check`, `npm run content:stats`, fix every error and warning that applies.
   Bump `content/content-version.json` (minor) and the date.
6. **Update `CLAUDE.md`:** content status row, session log line. Commit (`content: build MXX`) and push.
7. **Report** (in French): volumes vs targets, `verify: true` count, deferred items, anything the owner
   should read first.
