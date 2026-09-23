---
description: Re-verify module N's flagged items (and a 10% sample) with an independent reviewer
argument-hint: <module number 0-20>
---
Fact-check module **M$ARGUMENTS**.

1. Collect every item of the module with `verify: true` (meta labs, flashcards, all question pools, and
   reference sheets or glossary entries listing this module), plus a **random 10% sample** of the others
   (at least 5). List the IDs.
2. Launch a **separate reviewer subagent** that did not write the items. Give it only the items (stem,
   options, answer, explanation, card text) and the instruction: check each claim against at least two
   fresh, independent, authoritative sources (official tool docs, RFCs, NIST, OWASP, MITRE, vendor docs,
   official law texts); for EC-Council framing, check public EC-Council pages only. For each item return:
   `correct` / `wrong` (with the right fact) / `unsure`, and the source URLs. No courseware, no braindumps.
3. Apply the verdicts:
   - `correct` with 2 sources → set `verify: false`, add the sources.
   - `wrong` → fix the item, bump its `rev`, keep or add sources.
   - `unsure` → keep `verify: true`.
   Keep answers balanced (`npm run content:balance -- <module>` if you changed an answer index).
4. Anything that cannot be checked or rewritten goes to `research/deferred.md`.
5. `npm run check`, bump the content version, commit (`content: fact-check MXX`) and push.
6. Report in French: items checked, cleared, fixed (old → new), still flagged.
