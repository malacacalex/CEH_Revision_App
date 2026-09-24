# Deferred content

Content that could not be generated in a session (it was blocked, a source could not be reached, or the owner
set it aside). Nothing here blocks a release: the app works without it. Each entry says what is missing and
where it goes, so it can be written later, by Claude or by hand.

`/build-module` and the other content commands append here instead of stopping when an item cannot be written.

| Added | Item | Target file | Scope (from the spec) | Status |
|---|---|---|---|---|
| 2026-09-23 | Reference sheet 2: Nmap and hping3 | `content/reference/02-nmap-hping3.md` (front matter `id: ref-02`, `order: 2`) | §7.4 sheet 2: scan types and responses, host discovery, timing, evasion, NSE, hping3 equivalents | Set aside by the owner; revisit at the end of the project or study it outside the app. Official sources: nmap.org/book/man.html, manpages.debian.org hping3(8) |
| 2026-09-23 | M2 flashcards and question pools (pretest, practice, mock) | `content/modules/m02/flashcards.json`, `questions.{pretest,practice,mock}.json`, then `meta.json` status `built` | §7 module build: about 50 cards, 10 pretest, 70 practice, 35 mock over the 10 sections | Blocked while generating; notes and research are written. Sources: `research/m02.md` |
| 2026-09-23 | M3 Scanning Networks full build (research, notes, cards, questions) | `content/modules/m03/` (keep the sample items, status `built`) | §7 module build: host discovery, port/service/OS discovery, IDS/firewall evasion, countermeasures | Same scope as reference sheet 2 (Nmap/hping3), which the safety layer stopped twice; set aside with it until the end |
| 2026-09-23 | M4 Enumeration full build (research, notes, meta, cards, questions) | `content/modules/m04/`, `research/m04.md` | §7 module build: NetBIOS, SNMP, LDAP, NTP, NFS, SMTP, DNS, IPsec, VoIP, RPC, SMB, Unix user enumeration, countermeasures | Blocked by the safety layer before any content was written; set aside until the end |
| 2026-09-23 | M6 System Hacking full build (research, notes, meta, cards, questions) | `content/modules/m06/`, `research/m06.md` | §7 module build: gaining access (passwords, exploitation), privilege escalation, maintaining access, clearing logs, with detections | Blocked by the safety layer before any content was written; set aside until the end |
| 2026-09-23 | M11 flashcards and question pools (pretest, practice, mock) | `content/modules/m11/flashcards.json`, `questions.{pretest,practice,mock}.json`, then `meta.json` status `built` | §7 module build: about 25 cards, 10 pretest, 35 practice, 11 mock over the 4 sections | Blocked while generating; research written (`research/m11.md`) |
| 2026-09-23 | M8 Sniffing notes, meta, cards, questions | `content/modules/m08/` | §7 module build: sniffing concepts, attack types, Wireshark/tcpdump filters, switch defenses; 39+ cards, 10 pretest, 56+ practice, 18 mock | Notes blocked by the safety layer while writing; research written (`research/m08.md`); set aside until the end |
| 2026-09-23 | M9 practice and mock pools | `content/modules/m09/questions.practice.json` (≥ 35, ≥ 5 per section), `questions.mock.json` (11); then `meta.json` status `sample` → `built` | §7 module build: practice and mock over the 5 sections | Blocked while writing practice; research, notes, meta, 31 cards and pretest are written |
| 2026-09-24 | M12 sections "Evading IDS/Firewalls" and "Evading NAC and Endpoint Security" (notes, cards, practice) | `content/modules/m12/notes.md`, `flashcards.json`, `questions.practice.json` (≥ 18 more practice to reach 56); then `meta.json` `sample` → `built` | §7 module build: evasion technique classes at recognition level, NAC/endpoint bypass, with detections | Left out by the agent (attacker-side); the other 4 sections are built |
