---
description: Weekly coaching from the app's "Export for Claude review" JSON
---
The owner pastes the JSON from Settings → **Export for Claude review** (`format: "shieldup-review"`).
If it is missing, ask for it. Answer in French.

1. **Adherence:** active days (7 / 28), streak, questions, card reviews and finished quizzes in the last
   7 days, against the plan in `CLAUDE.md` (hours per week, busy period, exam window).
2. **Performance:** predicted score, domain and module accuracy, recent quizzes. Name the 3 weakest tags
   (from `weakTags`) and what they have in common.
3. **Calibration:** accuracy by confidence (sure / unsure / guess) and `confidentlyWrongRate`. Say whether
   the owner is over- or under-confident, and what to do about it.
4. **Mistake causes and recent mistakes:** group them, find the root misconception, not the symptom.
   Also read `content/tutor-misses.json` if present.
5. **Feynman summaries:** point out gaps or wrong statements.
6. **Plan update:** adjust next week (modules, cards, quiz modes, hours), realistic for the busy period.
7. **Write 20–30 new practice questions** aimed at the weak tags, following the item rules in `CLAUDE.md`
   (sources, `verify`, balanced answers, no near-duplicates). Put them in the matching modules'
   `questions.practice.json` with new IDs, run `npm run content:balance -- <module>` and
   `npm run check`, bump the content version, commit and push.
8. End with **5 lines** on next week's priorities.
