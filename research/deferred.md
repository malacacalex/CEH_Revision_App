# Deferred content

Content that could not be generated in a session (it was blocked, a source could not be reached, or the owner
set it aside). Nothing here blocks a release: the app works without it. Each entry says what is missing and
where it goes, so it can be written later, by Claude or by hand.

`/build-module` and the other content commands append here instead of stopping when an item cannot be written.

| Added | Item | Target file | Scope (from the spec) | Status |
|---|---|---|---|---|
| 2026-09-23 | Reference sheet 2: Nmap and hping3 | `content/reference/02-nmap-hping3.md` (front matter `id: ref-02`, `order: 2`) | §7.4 sheet 2: scan types and responses, host discovery, timing, evasion, NSE, hping3 equivalents | Set aside by the owner; revisit at the end of the project or study it outside the app. Official sources: nmap.org/book/man.html, manpages.debian.org hping3(8) |
