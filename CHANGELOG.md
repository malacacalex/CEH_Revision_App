# Changelog

App and content have separate versions. The app version is in `package.json`, the content version in
`content/content-version.json`. Content fixes reach installed apps through **Settings → Check for updates**,
so they do not need a new app release.

## [Unreleased]

### Fixed

- Printing from dark mode gave near-white text on white paper; print now always uses the light palette,
  prints tables in full and keeps diagrams readable.

## [0.5.0] - 2026-09-29

Ships with content 0.33.0: 16 of 21 modules fully built, 1794 questions, 802 flashcards, 15 of 18 reference
sheets and a 208-term glossary.

### Added
- **Lab tracker** (Modules → Lab tracker, or the Labs tab of a module): mark each lab as to do, in progress,
  done or skipped, log the time you spent and keep notes. The page shows labs done, time logged and an
  estimate of the time left. Logging time on a lab you have not started marks it as in progress.
- The review export includes lab totals and the labs you have logged.

### Content (0.17.0 → 0.33.0, also reaches older apps through Check for updates)
- Modules 3, 8, 14 and 18 fully built, module 2 mock questions, module 6 as a sample. The mock pool has 460
  of the 500 questions it aims for.
- Reference sheets for footprinting, vulnerability assessment, system hacking (partial), malware, network and
  human attacks, security controls (partial), web, mobile, IoT/OT, cloud and cryptography.
- Every item marked *unverified* was checked against two primary sources: 264 flags down to 109, about 30
  items corrected. The ones still marked follow EC-Council's own wording, which no public EC-Council page states.
- Standards that changed in 2026 are up to date: MITRE ATT&CK (Stealth, Defense Impairment, T1685), CISA
  BOD 26-04, OWASP Top 10:2025, DMARC (RFC 9989) and the NVD's new enrichment priorities.

## [0.4.0] - 2026-09-27

Ships with content 0.16.0: 12 of 21 modules fully built, 1316 questions, 632 flashcards and a 208-term glossary.

### Added
- **Mock exams.** A half-mock (63 questions, 2 hours) and a full mock (125 questions, 4 hours) from questions
  kept out of practice. Timed like the exam, with flag for review, a question grid, a review screen before
  submitting and no feedback until the end. The clock pauses when you leave the page, and answers are kept
  if you close it. The result page shows the score against the 85% target, each domain against 75%,
  confidence, and a question-by-question debrief.
- **Analytics** page: accuracy by module, domain, tag, difficulty and question type, time per question,
  confidence calibration, a weekly trend and mock history. Computed on your device only.
- **Go / no-go** on the dashboard: when you are ready for full mocks, and when you are ready to sit the
  exam. You can record scores from practice exams taken outside the app.
- **Self-study** page listing the exam topics the app does not cover yet, with what to study on your own.
- Quizzes left half-way can be resumed. Glossary terms in questions open a short definition.

### Changed
- The mistake log no longer asks why you missed a question. Questions from mock exams are marked and can be
  closed with "Mark as understood"; they never come back in re-tests, so later mocks stay honest.

## [0.3.0] - 2026-09-23

### Added
- Desktop apps for Windows (`.exe`, `.msi`), macOS (`.dmg`, Intel and Apple silicon) and Linux (`.AppImage`, `.deb`).
- Android app (`.apk`).
- **Check for updates** in Settings → About. It downloads newer study content and checks the whole pack
  before using it. In the installed apps it also links to a newer version when there is one. Nothing is
  sent about you.
- Backups and review exports are saved with a "Save as" dialog on desktop and through the share sheet on
  Android.
- [INSTALL.md](INSTALL.md) with the warnings unsigned builds show and how to get past them, plus
  [CONTRIBUTING.md](CONTRIBUTING.md).

### Changed
- The offline cache (service worker) is only used by the website. Installed apps already contain every file.
- Links (sources, "Report an error") open in your browser or mail app, including from the installed apps.

## [0.2.0] - 2026-09-23

### Added
- M0 Foundations: networking, operating systems, security basics and lab setup. It comes with 42 flashcards,
  a 10-question pre-test, 60 practice questions and a 20-question skip-check.
- A 60-question diagnostic covering every module.
- Reference page: 4 cheat sheets (ports, TCP flags and attacks by OSI layer, methodologies, laws and
  standards), a 43-term glossary and search.
- "Export for Claude review": a compact progress summary to paste into an AI tutor.

## [0.1.0] - 2026-09-23

### Added
- First version: study planner, FSRS flashcards, quiz engine with confidence rating, mistake log,
  readiness estimate, backup export/import, several profiles, and a PWA that works offline.
