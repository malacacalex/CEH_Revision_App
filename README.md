# ShieldUp

**Unofficial study app for the CEH v13 (312-50) exam.** Local-first: no account, no server, no analytics.

> ShieldUp is an independent study aid. It is **not affiliated with, sponsored by or endorsed by EC-Council**.
> "CEH", "Certified Ethical Hacker" and "EC-Council" are trademarks of EC-Council, used only to name the exam.
> All notes, flashcards and questions are original, written from cited public sources. They are not real exam questions.

**Use it:** https://malacacalex.github.io/CEH_Revision_App/ (installable as a PWA; works offline).

## What it does

- **Study plan** from your exam date or window, weekly hours and busy periods: phases, weekly load, projected ready date, and what it would take to be ready earlier.
- **Modules** with notes, a Reading Map for courseware owners (section titles only), free lab pointers and a Feynman summary; a gate tells you when a module is done.
- **Flashcards** scheduled with FSRS, capped so nothing is scheduled past your exam.
- **Quizzes**: module, domain, interleaved, weak spots, confidently-wrong and due reviews. Rate your confidence before each answer is revealed.
- **Mistake log** with causes and notes; missed questions come back through spaced repetition.
- **Readiness estimate** per exam domain, weighted by the blueprint.
- **Backup**: export and import your progress as a JSON file. Several profiles per device.

Every item has a **Report an error** link. Items not yet double-checked carry an *unverified* badge.

## Status

Milestone 1 (MVP): app, planner, FSRS, quiz engine, sample content for M1 and M3. Modules are filled in one at a time; see `npm run content:stats`.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # lint + typecheck + unit tests + content validation
npm run e2e          # Playwright smoke test (PW_CHANNEL=chrome to reuse an installed Chrome)
npm run build        # content pack + typecheck + production build in dist/
```

Content lives in `content/` as JSON and Markdown, validated by zod schemas (`src/schemas/content.ts`) and `npm run content:validate`.

## Licenses

- Code: [MIT](LICENSE)
- Study content (`content/`): [CC BY-NC-SA 4.0](content/LICENSE)
