# ShieldUp — CEH v13 study app

Unofficial, local-first study app for the CEH v13 (312-50) exam: PWA on GitHub Pages now, then Tauri v2
desktop and a Capacitor Android APK built from the same `dist/`. App UI and study content are in English;
talk to the user in French.

## Hard rules (never break)

- **Original content only.** Write from public sources (NIST, RFCs, OWASP, vendor docs, MITRE, tool docs)
  and cite ≥ 1 URL per item. Never reproduce EC-Council courseware text, never use braindumps or
  "real exam" questions. Reading Maps use section **titles** only.
- **Trademarks:** no EC-Council logos; keep the disclaimer ("not affiliated with or endorsed by EC-Council").
- **Accuracy:** anything not confirmed by a source gets `"verify": true` (shows an *unverified* badge).
  EC-Council-specific framing gets the tag `ec-council-specific`. Fix a wrong item by editing it and bumping `rev`.
- **Privacy:** no accounts, backend, analytics or telemetry. The only network call allowed is the
  user-triggered content-pack fetch (M3). Report-error = GitHub issue link + mailto malacaxel@gmail.com.
- **Ethics:** labs only on practice platforms or authorized systems; the notice stays on the Labs tab.
- No padding: every note/card/question must earn its place.

## Commands

```bash
npm run dev                # Vite dev server
npm run check              # lint + typecheck + vitest + content:validate  (run after EVERY change)
npm run e2e                # Playwright smoke (locally: PW_CHANNEL=chrome; Chromium CDN download times out here)
npm run build              # content-pack → tsc → vite build (dist/, relative base ./)
npm run content:validate -- --warnings
npm run content:stats      # per-module volumes vs targets, answer balance, domain coverage
npm run android:sync       # copy dist/ into android/ (after npm run build)
npx tsx scripts/gen-icons.ts   # PWA + Android icons from public/favicon.svg; then npx tauri icon public/icon-1024.png -o src-tauri/icons
```

No Rust or Android SDK on this machine: native builds run only in CI (`release.yml`, dry run on pushes that
touch `src-tauri/`, `android/` or the workflow). Check a CSP change by serving `dist/` with the header from
`tauri.conf.json` (Playwright `page.route`), as done in M3.

Shell pitfalls on this machine: always add `< /dev/null` and `timeout` to Bash commands (a stray `cat >`
hung 3 min); write multi-file content with the Write tool, not one big heredoc.

## Stack & gotchas

Vite 8 + React 19 + TS **pinned ~6.0.3** (typescript-eslint needs < 6.1) · react-router 8 **HashRouter**
(one build for Pages/Tauri/Capacitor) · Dexie 4 · ts-fsrs 5 · zod 4 · marked + DOMPurify · Mermaid 12
(lazy) · Tailwind 4 (`@theme inline` tokens in `src/index.css`, `.dark` class) · vite-plugin-pwa · Vitest
(+ fake-indexeddb) · Playwright.

- ts-fsrs lets Easy exceed `maximum_interval`: `reviewSrs` clamps `scheduled_days`/`due` itself.
- React Compiler lint rules are on: no setState in effect bodies, no `Date.now()` in render
  (use keyed child + lazy `useState`, see `CardsPage`).
- Mermaid in notes: flowchart / sequence / state / class only. ELK, cytoscape (mindmap, architecture)
  and KaTeX chunks are excluded from the PWA precache.
- Theme is stored in localStorage `shieldup-theme` (try/catch everywhere); applied in `index.html`.

## Layout

```
content/config/blueprint.json    domain weights, hours per unit, mock sizes, quiz pass mark
content/content-version.json     bump on every content change
content/modules/mXX/             meta.json, notes.md, flashcards.json, questions.<pool>.json
content/reference/NN-slug.md     reference sheets (front matter + `##` sections), content/glossary.json
research/                        mXX.md fact/source tables; deferred.md = content set aside (see below)
.claude/commands/                /build-module /teach /weekly-review /mock-debrief /fact-check /triage-reports /release
src/schemas/                     zod: content.ts (content), progress.ts (DB + export format)
src/content/                     assemble.ts (shared by app + scripts), validate.ts, bundle.ts (glob import)
src/domain/                      pure logic: dates, fsrs/scheduler, planner, quiz (assemble/score), readiness, gates
src/db/                          Dexie schema (db.ts) + all writes (repo.ts)
src/state/                       ProfileContext (live queries) + snapshot.ts (derived plan/gates/readiness)
src/features/                    onboarding, dashboard, planner, modules, flashcards, quiz, mistakes, reference, settings
                                 (Settings → "Export for Claude review" = src/domain/review.ts, used by /weekly-review)
src/platform.ts                  web / tauri / android: external links, saving files (Save-as dialog, share sheet)
src/content/updates.ts           user-triggered content-pack + GitHub release checks; stored pack loaded before render
src-tauri/                       Tauri v2 desktop shell: CSP, opener + dialog plugins, `save_text_file` command
android/                         Capacitor 8 project (committed); version + signing read from package.json / env
scripts/                         content-validate / -stats / -pack / -balance, gen-icons, release-notes.mjs
tests/unit, tests/e2e
```

## Content conventions

- IDs: `mXX-c-NNNN` (cards), `mXX-q-NNNN` (questions), unique, never reused or renumbered.
  Progress is keyed by ID, so edits keep progress; bump `rev` when meaning changes.
- The file decides the pool: `questions.pretest.json` (10/module), `questions.practice.json`,
  `questions.mock.json` (held out: never shown in practice), `questions.diagnostic.json` (3 per module
  M1–M20, IDs `mXX-q-9001..9003`, balanced as one group), `questions.skipcheck.json` (20, M0 only).
- Write generated items with the correct answer at index 0, then `npm run content:balance -- <module>`
  (deterministic, idempotent).
- Reference sheets: front matter `id: ref-NN` (= `order`), title, modules, rev, verify, sources.
  Glossary entries: term, definition, modules, tags, sources, verify.
- **Deferred content:** anything that cannot be written (blocked, no reliable source, set aside by the
  owner) goes as one row in `research/deferred.md`, never worked around; carry on with the rest.
  Currently: reference sheet 2 (Nmap / hping3).
- Every item: `module`, `domain`, `section` (must be one of meta.sections), `sources[]`, `verify`, `rev`.
- Questions: 4 distinct options, `optionNotes` explain each option, `answer` 0–3 balanced (20–30% each),
  "all/none of the above" ≤ 2%, no near-duplicate stems (Jaccard < 0.8).
- Notes: one `## <Section>` heading per meta section. Built module volumes:
  cards ≥ max(25, 0.9·35·units), practice ≥ max(35, 0.9·50·units), ≥ 3 cards and ≥ 5 practice per section,
  ≥ 5 objectives, 3 Feynman prompts. Status `stub` → `sample` → `built` (errors only apply to `built`).

## Planner model (src/domain/planner)

Daily capacity = weekly hours × day weight (Mon–Fri .14, Sat .24, Sun .06) × busy factor, streamed through
blocks: Phase 0 (setup until next Monday) → Phase 1 modules (units × hoursPerUnit, M0 for beginners) →
Phase 2 (10 h, compressed 4 h) → Phase 3 mocks (5 h each, target 4, min 3) → buffer. Status on-track /
tight / behind vs the exam date or window start; `requiredHoursPerWeek` by binary search.

## User config (the owner)

Beginner · 10 h/week · exam window 2026-12-14 → 2027-01-22 · busy until 2026-10-12 · W1 = 2026-09-28.
Repo: github.com/malacacalex/CEH_Revision_App (public). Licenses: MIT code, CC BY-NC-SA 4.0 content.
Unsigned macOS .dmg from CI; iOS = PWA only.

## Content status

| Module | Status | Notes |
|---|---|---|
| M0 Foundations | built | 42 cards, 10 pretest, 60 practice, 20 skip-check, 14 verify |
| M1 Intro to Ethical Hacking | built | 45 cards, 10 pretest, 57 practice, 30 mock, 30 verify |
| M2 Footprinting and Reconnaissance | stub + notes | notes and research/m02.md written; cards and questions deferred (research/deferred.md) |
| M3 Scanning Networks | sample | 8 cards, 3 pretest, 12 practice; full build deferred (blocked, defensive retry blocked too) |
| M4 Enumeration | stub | deferred (blocked, defensive retry blocked too) |
| M5 Vulnerability Analysis | built | 38 cards, 10 pretest, 53 practice, 19 mock, 14 verify |
| M6 System Hacking | stub | deferred (blocked, defensive retry blocked too) |
| M8 Sniffing | stub | research/m08.md only; notes and items deferred (blocked) |
| M9 Social Engineering | sample | notes, 31 cards, 10 pretest, 12 verify; practice + mock deferred (blocked) |
| M10 Denial-of-Service | built | 33 cards, 10 pretest, 45 practice, 11 mock, 25 verify |
| M11 Session Hijacking | stub + notes | research + notes; cards and questions deferred (blocked) |
| M7 Malware Threats | built | 52 cards, 10 pretest, 72 practice, 28 mock, 24 verify |
| M12 Evading IDS, Firewalls, and Honeypots | sample | 40 cards, 10 pretest, 38 practice, 18 mock, 1 verify; 2 evasion sections deferred |
| M13 Hacking Web Servers | built | 38 cards, 10 pretest, 48 practice, 18 mock, 6 verify |
| M14 Hacking Web Applications | stub + notes | research and notes written (defensive retry); cards and questions deferred (blocked) |
| M15 SQL Injection | stub | full build deferred (blocked) |
| M16 Hacking Wireless Networks | stub | full build deferred (blocked) |
| M17 Hacking Mobile Platforms | built | 40 cards, 10 pretest, 54 practice, 20 mock, 8 verify |
| M18 IoT and OT Hacking | stub | full build deferred (blocked); research gathered |
| M19 Cloud Computing | built | 44 cards, 10 pretest, 60 practice, 30 mock, 9 verify |
| M20 Cryptography | built | 42 cards, 10 pretest, 61 practice, 30 mock, 8 verify |
| Diagnostic | done | 60 questions, 3 per module M1–M20 |
| Reference | 4 / 18 | sheets 1, 3, 4 (verify), 5; sheet 2 deferred · glossary 43 terms |

## Milestones

- [x] **M1 MVP**: scaffold, schemas, Dexie profiles, onboarding, FSRS cards, quiz engine (modes, confidence,
  mistake log), dashboard, planner v1, export/import, PWA + Pages CI, sample content.
- [x] **M2**: M0 Foundations, 60-q diagnostic, reference sheets 1, 3–5 (2 deferred), glossary,
  review export, `.claude/commands`.
- [x] **M3**: Tauri + Capacitor packaging, CI release (`release.yml`), INSTALL/CONTRIBUTING/CHANGELOG,
  in-app content-pack update. Released as v0.3.0.
- [ ] **M4**: build M1–M20 (`/build-module N`), full volumes.
- [ ] **M5**: analytics, half/full mocks from the 500-q mock pool.

## Release status

**v0.3.0 released 2026-09-23** (content 0.2.0): Windows exe/msi, macOS universal dmg (ad-hoc signed),
Linux AppImage/deb, Android apk/aab signed with the release key. Nothing else is code-signed.
Android key: PKCS12 made with OpenSSL, kept by the owner outside the repo (`C:\Users\malac\ShieldUp-keys`),
passed to CI through 4 repo secrets. Never regenerate it: a new key breaks in-place APK updates.

## Session log

- 2026-09-23 — M1 MVP built and pushed; 35 unit tests + Playwright smoke (desktop + mobile) green.
  Pages needs Settings → Pages → Source: GitHub Actions (once).
- 2026-09-23 — M2: M0 built, diagnostic, Reference page (sheets + glossary), review export, commands.
  Content 0.2.0. Sheet 2 deferred by the owner (`research/deferred.md`).
- 2026-09-23 — M3: platform layer, content/app update checks, Tauri + Capacitor projects, release
  pipeline, docs. App 0.3.0. CSP verified in Chrome against the built app.
- 2026-09-23 — M4 started: M1 built (research/m01.md, content 0.3.0). Quiz stems are plain text:
  keep command output on one line with backticks. Mermaid state labels need `state "Label" as X`.
- 2026-09-23 — M2 partial: research/m02.md and notes pushed (content 0.3.1), module stays `stub`.
  Cards and questions were blocked during generation and are listed in research/deferred.md.
- 2026-09-24 — M4 wave 1 (agents in parallel, lead integrates): M5 and M10 built, M9 sample, M11 notes;
  M3, M4, M6, M8 and parts of M9/M11 deferred. Content 0.4.0. Many parallel agents hit the session limit:
  run 4 at a time.
- 2026-09-24 — M4 wave 2: M7, M13, M17, M19, M20 built, M12 sample (content 0.5.0 → 0.10.0); Mermaid label
  rendering fixed (DOMPurify foreignObject integration point + label CSS). M14, M15, M16, M18 blocked and
  deferred. Every remaining M4 gap is a safety-layer block listed in research/deferred.md.
