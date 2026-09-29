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
content/self-study.json          one short, general line per topic the app leaves out (Self-study page)
research/                        mXX.md fact/source tables; deferred.md = content set aside (see below)
.claude/commands/                /build-module /teach /weekly-review /mock-debrief /fact-check /triage-reports /release
src/schemas/                     zod: content.ts (content), progress.ts (DB + export format)
src/content/                     assemble.ts (shared by app + scripts), validate.ts, bundle.ts (glob import)
src/domain/                      pure logic: dates, fsrs/scheduler, planner, quiz (assemble/score/resume/mock), readiness,
                                 gates (module + Phase 3 + exam-ready), analytics (local only), coverage, review
src/db/                          Dexie schema (db.ts) + all writes (repo.ts)
src/state/                       ProfileContext (live queries) + snapshot.ts (derived plan/gates/readiness)
src/features/                    onboarding, dashboard, planner, modules, flashcards, quiz, mock, analytics, mistakes,
                                 reference, selfstudy, settings
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
  The learner-facing side is `content/self-study.json` (Self-study page): every module that is not
  built needs a line there (validator error otherwise); update it when a gap closes or opens.
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
| M0 Foundations | built | 42 cards, 10 pretest, 60 practice, 20 skip-check, 0 verify (+1 lab) |
| M1 Intro to Ethical Hacking | built | 45 cards, 10 pretest, 57 practice, 30 mock, 9 verify |
| M2 Footprinting and Reconnaissance | built | 50/10/71/47, 7 verify; mock pool built on the 2026-09-27 retry |
| M3 Scanning Networks | built | 63/10/90/47, 6 verify; built on the 2026-09-27 retry (evasion as concept classes) |
| M4 Enumeration | stub | deferred (blocked, defensive retry blocked too) |
| M5 Vulnerability Analysis | built | 38 cards, 10 pretest, 53 practice, 30 mock, 8 verify |
| M6 System Hacking | sample | 45/10/58/28, 1 verify; research and notes complete; Gaining Access items deferred (blocked) |
| M8 Sniffing | built | 46 cards, 10 pretest, 65 practice, 18 mock, 3 verify; notes and Sniffing Techniques built on the 2026-09-27 retry |
| M9 Social Engineering | built | 31 cards, 10 pretest, 54 practice, 11 mock, 16 verify |
| M10 Denial-of-Service | built | 33 cards, 10 pretest, 45 practice, 11 mock, 14 verify |
| M11 Session Hijacking | built | 39/10/46/11, 5 verify |
| M7 Malware Threats | built | 52 cards, 10 pretest, 72 practice, 28 mock, 15 verify (all ec-council-specific) |
| M12 Evading IDS, Firewalls, and Honeypots | sample | 40 cards, 10 pretest, 38 practice, 18 mock, 0 verify; 2 evasion sections deferred (retry blocked too) |
| M13 Hacking Web Servers | built | 38 cards, 10 pretest, 48 practice, 30 mock, 2 verify (+1 lab) |
| M14 Hacking Web Applications | built | 70/10/94/51, 2 verify; cards and questions built on the 2026-09-27 retry |
| M15 SQL Injection | stub | full build deferred (blocked, defensive retry blocked too) |
| M16 Hacking Wireless Networks | stub | full build deferred (blocked, defensive retry blocked too) |
| M17 Hacking Mobile Platforms | built | 40 cards, 10 pretest, 54 practice, 20 mock, 6 verify |
| M18 IoT and OT Hacking | built | 44/10/48/20, 5 verify; IoT practice built on the 2026-09-27 retry |
| M19 Cloud Computing | built | 44 cards, 10 pretest, 60 practice, 30 mock, 6 verify |
| M20 Cryptography | built | 42 cards, 10 pretest, 61 practice, 30 mock, 4 verify |
| Diagnostic | done | 60 questions, 3 per module M1–M20 |
| Reference | 15 / 18 | sheets 1, 3–6, 8–13, 15–18 (9 and 12 partial, 13 without SQLi); sheet 2 deferred, 7 and 14 wait on blocked M4 and M16 · glossary 208 terms |

## Milestones

- [x] **M1 MVP**: scaffold, schemas, Dexie profiles, onboarding, FSRS cards, quiz engine (modes, confidence,
  mistake log), dashboard, planner v1, export/import, PWA + Pages CI, sample content.
- [x] **M2**: M0 Foundations, 60-q diagnostic, reference sheets 1, 3–5 (2 deferred), glossary,
  review export, `.claude/commands`.
- [x] **M3**: Tauri + Capacitor packaging, CI release (`release.yml`), INSTALL/CONTRIBUTING/CHANGELOG,
  in-app content-pack update. Released as v0.3.0.
- [x] **M4**: build M1–M20 (`/build-module N`), full volumes. Closed as far as the blocks allow: 16/21 built;
  M4, M15, M16, the M12 evasion sections, M6 Gaining Access and sheet 2 stay in research/deferred.md and on
  the Self-study page for good (owner, 2026-09-29).
- [x] **M5**: analytics page, half/full mocks, Phase 3 and exam-ready gates on the dashboard.
  - Mocks (`domain/quiz/mock.ts`) draw fresh held-out mock items by blueprint quota. The pool has 460/500
    items (2026-09-28) and none for D6 (M16 blocked), so gaps fall back to unseen practice items of the domain, then fresh mock
    items of other domains, then the mock items seen longest ago; the session stores `composition`.
  - Mock items never enter SRS or re-tests (the mistake log closes them with "Mark as understood").
  - The clock counts visible time only; draft answers and `elapsedMs` live on the session until submit.
- [x] **M6**: lab tracker (§6.3 feature 9). `/labs` page and the module Labs tab: status (to do, in progress,
  done, skipped), time spent and notes per lab, stored on `moduleProgress.labs` keyed by lab name
  (`domain/labs.ts`). Lab totals and touched labs go into the review export. Labs are practice, not a gate.
  Lab names are the log keys: once a release ships the tracker, renaming a lab loses its logs unless a
  migration maps the old name (one rename before that: the M12 Cowrie lab, low → medium-interaction).
- [x] **M7**: fact-check pass over the `verify: true` items, module by module (`/fact-check`); items confirmed
  on primary sources lose the flag, wrong ones are fixed with a `rev` bump. Done 2026-09-28 (content 0.24.0 →
  0.33.0): 264 → 109 flagged items, about 30 fixed; reference sheets 06 and 12 cleared, the other 10 keep a
  narrowed flag line. What stays flagged is EC-Council framing (named lists, phase orders) that no public
  EC-Council page states; public infographics under eccouncil.org/wp-content/uploads count, courseware does not.
  Standards moved in 2026 and were aligned: ATT&CK (T1562 → T1685, ICS renames), BOD 26-04, OWASP Top 10:2025,
  DMARC RFC 9989, NVD enrichment priorities.
- [x] **M8**: print (§6.3 feature 10). Reference sheets and notes print with the light palette in dark mode,
  tables in full, dark Mermaid diagrams inverted; e2e covers the dark print.
- [ ] **M9**: §9 fact-check sample, 10% of items per module re-checked against primary sources.

## Release status

**v0.5.0 released 2026-09-29** (content 0.33.0): lab tracker, labs in the review export; content since v0.4.0.
**v0.4.0 released 2026-09-27** (content 0.16.0): mocks, analytics, go/no-go, Self-study, quiz resume, glossary popovers.
**v0.3.0 released 2026-09-23** (content 0.2.0): Windows exe/msi, macOS universal dmg (ad-hoc signed),
Linux AppImage/deb, Android apk/aab signed with the release key. Nothing else is code-signed.
Android key: PKCS12 made with OpenSSL, kept by the owner outside the repo (`C:\Users\malac\ShieldUp-keys`),
passed to CI through 4 repo secrets. Never regenerate it: a new key breaks in-place APK updates.

## Lessons kept from the session log

- Parallel agents hit the session limit: run 4 at a time, and make them log per item so a relaunch skips done work.
- After a classifier stop, drop what was written after it; never keep reworded output. Blocked topics are
  final (owner, 2026-09-29): they stay on the Self-study page and are not retried.
- Quiz stems are plain text: keep command output on one line with backticks. Mermaid state labels need
  `state "Label" as X`; labels render through DOMPurify's foreignObject integration point.
- Print: the dark palette is screen-only (`@media screen`), so any new colour must be a palette variable.
