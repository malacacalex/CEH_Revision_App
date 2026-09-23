# Changelog

App and content have separate versions. The app version is in `package.json`, the content version in
`content/content-version.json`. Content fixes reach installed apps through **Settings → Check for updates**,
so they do not need a new app release.

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
