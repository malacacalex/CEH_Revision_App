---
description: Analyze a mock exam and produce a 3–4 day remediation plan
---
The owner pastes a review export (Settings → **Export for Claude review**) taken right after a mock, or a
full progress export. If neither is present, ask for it. Answer in French.

1. Identify the latest mock in `recentQuizzes` (full or half mock mode; until milestone 5 adds them, use the
   latest `mixed` quiz the owner names) and its score against the
   pass mark in `content/config/blueprint.json`.
2. Break it down **by domain** (vs the blueprint weights), **by tag** and **by question type**
   (recall, scenario, tool ID, command/output, terminology), and by confidence: right-but-guessed and
   confidently wrong are the priorities.
3. Compare with previous mocks: trend per domain, and whether the same tags keep failing.
4. Decide: ready to book / keep the date / move the date, using the predicted score and the trend.
5. Give a **3–4 day remediation plan**: each day lists modules and sections to reread, card decks,
   quiz modes (weak areas, mistakes) and the number of questions, sized to the owner's weekly hours in
   `CLAUDE.md`.
