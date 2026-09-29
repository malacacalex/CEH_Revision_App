# ShieldUp

**Unofficial study app for the CEH v13 (312-50) exam.** Local-first: no account, no server, no analytics.

> ShieldUp is an independent study aid. It is **not affiliated with, sponsored by or endorsed by EC-Council**.
> "CEH", "Certified Ethical Hacker" and "EC-Council" are trademarks of EC-Council, used only to name the exam.
> All notes, flashcards and questions are original, written from cited public sources. They are not real exam questions.

## Get it

- **In the browser:** https://malacacalex.github.io/CEH_Revision_App/ (works offline, installable; the option for iPhone/iPad).
- **Windows, macOS, Linux, Android:** [latest release](https://github.com/malacacalex/CEH_Revision_App/releases/latest).
  The builds are not code-signed; [INSTALL.md](INSTALL.md) explains the warnings and how to get past them.

## What it does

- **Study plan** from your exam date or window, weekly hours and busy periods: phases, weekly load, projected ready date, and what it would take to be ready earlier.
- **Modules** with notes, a Reading Map for courseware owners (section titles only), free lab pointers and a Feynman summary; a gate tells you when a module is done.
- **Flashcards** scheduled with FSRS, capped so nothing is scheduled past your exam.
- **Quizzes**: module, domain, interleaved, weak spots, confidently-wrong and due reviews. Rate your confidence before each answer is revealed.
- **Mock exams**: a half-mock (63 q, 2 h) and a full mock (125 q, 4 h) from questions kept out of practice, timed like the exam, with a full debrief.
- **Lab tracker**: status, time spent and notes for every lab, with the time still needed.
- **Mistake log** with notes; missed questions come back through spaced repetition.
- **Readiness estimate** per exam domain, weighted by the blueprint, and a go/no-go checklist for booking the exam.
- **Analytics**: accuracy by module, domain, topic and difficulty, time per question, confidence calibration and trends.
- **Self-study list** of exam topics the app does not cover yet, so nothing is missed.
- **Reference**: cheat sheets (ports, TCP flags, methodologies, laws) and a glossary, with search.
- **Backup**: export and import your progress as a JSON file. Several profiles per device.
- **Content updates**: Settings → Check for updates gets question fixes and new modules without reinstalling.

Every item has a **Report an error** link. Items not yet double-checked carry an *unverified* badge.
Want to fix something yourself? See [CONTRIBUTING.md](CONTRIBUTING.md).

## Status

App 1.0.0 with content 0.36.0: M0 Foundations, the 60-question diagnostic, 16 of the 21 modules fully built
(6 and 12 partly), 15 of 18 reference sheets, mock exams, analytics and a lab tracker. Modules 4 (Enumeration),
15 (SQL Injection) and 16 (Wireless) are not covered; the Self-study page lists what to study elsewhere.
[CHANGELOG.md](CHANGELOG.md) lists the changes.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # lint + typecheck + unit tests + content validation
npm run e2e          # Playwright smoke test (PW_CHANNEL=chrome to reuse an installed Chrome)
npm run build        # content pack + typecheck + production build in dist/
```

Content lives in `content/` as JSON and Markdown, validated by zod schemas (`src/schemas/content.ts`) and `npm run content:validate`.
Desktop (`src-tauri/`) and Android (`android/`) builds, icons and releases: see [CONTRIBUTING.md](CONTRIBUTING.md).

## Licenses

- Code: [MIT](LICENSE)
- Study content (`content/`): [CC BY-NC-SA 4.0](content/LICENSE)
