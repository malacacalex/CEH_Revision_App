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
- **Mistake log** with causes and notes; missed questions come back through spaced repetition.
- **Readiness estimate** per exam domain, weighted by the blueprint.
- **Reference**: cheat sheets (ports, TCP flags, methodologies, laws) and a glossary, with search.
- **Backup**: export and import your progress as a JSON file. Several profiles per device.
- **Content updates**: Settings → Check for updates gets question fixes and new modules without reinstalling.

Every item has a **Report an error** link. Items not yet double-checked carry an *unverified* badge.
Want to fix something yourself? See [CONTRIBUTING.md](CONTRIBUTING.md).

## Status

App 0.3.0 with content 0.2.0: M0 Foundations, the 60-question diagnostic and 4 reference sheets are complete.
Modules M1–M20 are written one at a time and arrive as content updates. [CHANGELOG.md](CHANGELOG.md) lists the changes.

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
