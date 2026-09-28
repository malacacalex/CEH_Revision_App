# Changelog

App and content have separate versions. The app version is in `package.json`, the content version in
`content/content-version.json`. Content fixes reach installed apps through **Settings → Check for updates**,
so they do not need a new app release.

## [Unreleased]

### Added
- **Lab tracker** (Modules → Lab tracker, or the Labs tab of a module): mark each lab as to do, in progress,
  done or skipped, log the time you spent and keep notes. The page shows labs done, time logged and an
  estimate of the time left. Logging time on a lab you have not started marks it as in progress.
- The review export includes lab totals and the labs you have logged.

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
