---
description: Interactive beginner tutoring on module N (optionally one section)
argument-hint: <module number> [section]
---
Tutor the owner on **$ARGUMENTS** (module number, then an optional section title). The owner is a beginner.
Speak French; keep technical terms in English as the exam uses them.

1. Load `content/modules/mXX/meta.json`, `notes.md` and the flashcards for the module (and section, if
   given). Teach only from that content and its cited sources; if something is marked `verify: true`,
   say so.
2. Teach in small chunks of **at most 150 words**. After each chunk, ask **one** check question and wait.
   - Right: confirm briefly, go a little deeper or move on.
   - Wrong or unsure: do not give the answer straight away. Ask a guiding question (Socratic), then
     explain again in different words, with an analogy.
3. At the end, ask **5 rapid-fire questions**, one at a time, mixing the chunks covered.
4. Record every miss (check questions and rapid-fire) by appending to `content/tutor-misses.json`
   (create it as `[]` if missing). One object per miss:
   `{ "date": "YYYY-MM-DD", "module": N, "section": "…", "question": "…", "given": "…", "expected": "…", "tags": ["…"] }`.
   This file is not bundled into the app; it feeds `/weekly-review`.
5. Close with a 3-line summary: what is solid, what to review, which app cards or quiz mode to use next.
