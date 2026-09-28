---
id: ref-09
title: System hacking (defender view)
order: 9
modules: [6]
rev: 2
verify: true
sources:
  - https://attack.mitre.org/tactics/TA0004/
  - https://attack.mitre.org/tactics/TA0003/
  - https://attack.mitre.org/tactics/TA0005/
  - https://attack.mitre.org/tactics/TA0112/
  - https://attack.mitre.org/techniques/T1068/
  - https://attack.mitre.org/techniques/T1548/
  - https://attack.mitre.org/techniques/T1574/
  - https://attack.mitre.org/techniques/T1134/
  - https://attack.mitre.org/techniques/T1053/
  - https://attack.mitre.org/techniques/T1543/
  - https://attack.mitre.org/techniques/T1611/
  - https://attack.mitre.org/techniques/T1552/
  - https://attack.mitre.org/techniques/T1547/001/
  - https://attack.mitre.org/techniques/T1546/003/
  - https://attack.mitre.org/techniques/T1136/
  - https://attack.mitre.org/techniques/T1098/
  - https://attack.mitre.org/techniques/T1505/003/
  - https://attack.mitre.org/techniques/T1014/
  - https://attack.mitre.org/techniques/T1542/003/
  - https://attack.mitre.org/techniques/T1027/003/
  - https://attack.mitre.org/techniques/T1001/002/
  - https://attack.mitre.org/techniques/T1564/004/
  - https://attack.mitre.org/techniques/T1685/005/
  - https://attack.mitre.org/techniques/T1685/001/
  - https://attack.mitre.org/techniques/T1070/
  - https://attack.mitre.org/mitigations/M1029/
  - https://csrc.nist.gov/glossary/term/least_privilege
  - https://csrc.nist.gov/glossary/term/steganography
  - https://csrc.nist.gov/glossary/term/rootkit
  - https://csrc.nist.gov/glossary/term/covert_channel
  - https://csrc.nist.gov/pubs/sp/800/92/final
  - https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works
  - https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-1102
  - https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4719
  - https://learn.microsoft.com/en-us/windows/win32/wec/windows-event-collector
  - https://learn.microsoft.com/en-us/windows/security/operating-system-security/system-security/secure-the-windows-10-boot-process
  - https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon
  - https://learn.microsoft.com/en-us/sysinternals/downloads/autoruns
  - https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview
  - https://man7.org/linux/man-pages/man2/setuid.2.html
  - https://man7.org/linux/man-pages/man7/capabilities.7.html
  - https://man7.org/linux/man-pages/man8/auditd.8.html
  - https://www.sudo.ws/docs/man/sudoers.man/
  - https://www.cisecurity.org/controls/audit-log-management
  - https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - https://www.kali.org/tools/steghide/
  - https://www.kali.org/tools/stegsnow/
  - https://www.openstego.com/
  - https://github.com/AustralianCyberSecurityCentre/windows_event_logging
  - https://github.com/nsacyber/Event-Forwarding-Guidance
  - https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/appendix-l--events-to-monitor
  - https://www.eccouncil.org/wp-content/uploads/2023/03/System-Hacking.pdf
  - https://www.eccouncil.org/cybersecurity-exchange/ethical-hacking/system-hacking-definition-types-processes/
  - https://www.eccouncil.org/cybersecurity-exchange/ethical-hacking/what-is-steganography-guide-meaning-types-tools/
  - https://www.eccouncil.org/train-certify/certified-ethical-hacker-ceh/
---
Privilege escalation, persistence, hidden data and log tampering, seen from the defender's side. Flagged **verify** for the steganography lists: the technical/linguistic split and the cover types appear on only one EC-Council page, and no public EC-Council page lists the steganalysis attacks.

Password attacks, hash formats and Kerberos/AD attacks: see the Self-study tab.

## Privilege escalation: horizontal vs vertical

| Kind | Moves from → to | Example signal |
|---|---|---|
| **Vertical** | user → admin, root or SYSTEM (higher level) | new admin-equivalent logon (4672), group change (4732) |
| **Horizontal** | user A → user B at the **same** level | one account reading another user's data or session |

Horizontal escalation is **not** lateral movement: horizontal = another account, lateral = another host. ATT&CK files both kinds under Privilege Escalation (TA0004); "horizontal/vertical" are study-guide terms.

## Escalation categories and controls

| Category | What goes wrong | How it is spotted | Control |
|---|---|---|---|
| **Unpatched vulnerability** (kernel, driver, service) | a local flaw grants higher rights | crash or odd child process under SYSTEM; EDR exploit alert | patch fast, exploit protection, block vulnerable drivers |
| **Elevation controls abused** | UAC bypass; setuid/setgid binaries; over-broad sudo rules | high-integrity process with no consent prompt; unusual setuid files; sudo logs | UAC "always notify", no local admin for users, audit setuid, least-privilege sudoers |
| **Hijacked execution flow** | DLL planted where a privileged program loads it; PATH interception; **unquoted service path**; writable service binary | new DLL/EXE in program or service folders; changed service path | quote service paths, fix folder and service permissions, application control |
| **Token manipulation** | a process takes another user's access token (e.g. SYSTEM) | process running as a different user than its parent | limit impersonate/debug privileges, EDR |
| **Weak scheduled tasks, cron, services** | a user can edit something that runs as SYSTEM/root | **4698** task created, **4697** service installed, cron file changes | restrict who can create or edit them |
| **Credentials lying around** | passwords in scripts, configs, registry, browser stores | access to credential files | secrets vault, no stored plaintext |
| **Container escape** | privileged container reaches the host | container processes touching host resources | no privileged containers, patched runtime |

Misconfiguration classes to remember: **weak file/folder/service permissions**, **unquoted paths**, **setuid on the wrong binary**, **sudo allowing an editor, shell or interpreter**, **users with local admin**, **stored plaintext secrets**.

**Mechanics.** UAC runs an admin with a standard-user token until elevation is approved; integrity levels (low, medium, high, system) stop a lower process modifying a higher one. A **setuid** program runs with its owner's rights; Linux **capabilities** split root's powers into smaller rights.

**Detect:** 4672 special privileges at logon · 4688 / Sysmon 1 process creation · 4732 member added to a local group · 4697 · 4698 · sudo and auth logs.
**Harden:** least privilege, separate admin accounts, tiered admin and privileged access workstations, LAPS, patching, application control, `nosuid` on user-writable mounts. Defenders run the same checkers (PEASS-ng, PowerUp) first and fix what they find.

## Persistence categories and how defenders spot them

| Mechanism | Where it lives | Defender's signal |
|---|---|---|
| **Run keys / Startup folder** | registry Run/RunOnce, user Startup folder | Sysmon 12/13 registry events, 4657 (if audited), Autoruns |
| **Scheduled task / cron** | Task Scheduler, crontab | **4698**; changed cron files |
| **Service / systemd unit** | new or modified service | **4697** (Security) or 7045 (System); new unit files |
| **WMI event subscription** | WMI repository | WMI activity log, Sysmon 19–21 |
| **New or changed account** | local accounts | **4720** created, **4732** added to group, **4738** changed |
| **SSH authorized keys** | `~/.ssh/authorized_keys` | file integrity monitoring (FIM) |
| **Web shell** | script in the web root | new file in web root; web server spawning a shell |
| **Rootkit** | user mode, kernel driver, hypervisor, firmware | visible from outside the OS but not from inside; unsigned drivers |
| **Bootkit / firmware** | MBR/VBR, boot loader, UEFI | Secure Boot failure, Measured Boot attestation mismatch |
| **Hidden files / ADS** | hidden attribute, dot-files, NTFS named streams | stream-aware tools, EDR, FIM (ADS do not change the size shown) |

**Rootkit ≠ backdoor:** the backdoor lets the attacker back in; the rootkit hides it. **Rootkit detection:** cross-view comparison, offline or boot-time scans, FIM (AIDE, Tripwire, Wazuh), rootkit scanners (chkrootkit, rkhunter). **Prevention:** Secure Boot, Trusted Boot and ELAM, Measured Boot with TPM attestation, signed drivers. A confirmed kernel or firmware rootkit means **rebuild from known-good media**.

## Steganography types and steganalysis

**Steganography** hides the **existence** of a message; encryption hides its **meaning**. They are often combined.

| Carrier | Typical method | What steganalysis looks for |
|---|---|---|
| Image | least-significant-bit (LSB) changes, palette tricks | statistical anomalies in LSBs; comparison with the original |
| Audio / video | LSB, echo or phase changes | noise statistics; size not explained by the content |
| Text / whitespace | spaces and tabs at line ends (SNOW / stegsnow) | trailing whitespace, odd formatting |
| Document | hidden fields, metadata | metadata and structure inspection |
| File system | alternate data streams, slack or unused space | stream-aware and forensic tools |
| Network | covert channel in unused header fields or timing | header field anomalies, timing analysis, egress monitoring |

(EC-Council framing) **Technical** steganography uses physical or chemical means (invisible ink, microdots); **linguistic** steganography hides data in ordinary text (semagrams, open codes). EC-Council also names cover types such as image, document, folder, video, audio, whitespace, web, spam/email and natural text.

(EC-Council framing) Steganalysis attacks, by what the analyst has: **stego-only**, **known-cover**, **known-message**, **known-stego**, **chosen-stego**, **chosen-message**.

Tools by purpose: **Steghide** (data in image/audio LSBs), **OpenStego** (image steganography and watermarking), **SNOW / stegsnow** (whitespace in text). ATT&CK tracks steganography in files (T1027.003) and in C2 traffic (T1001.002).

## Clearing logs: what tampering looks like

| Tampering | Defender's signal |
|---|---|
| Security log cleared | **Event 1102** "The audit log was cleared" (names the account) |
| System log cleared | **Event 104** in the System log |
| Auditing turned off or changed | **Event 4719** "System audit policy was changed"; EventLog service stopped |
| .evtx deleted or log service stopped | the host stops forwarding: **gap in log flow** |
| Linux logs wiped | truncated or missing `auth.log`/`secure`, `wtmp`/`btmp`, `kern.log` |
| Shell history cleared | empty or missing `.bash_history`, history disabled |
| **Timestomping** | file times that do not fit surrounding activity; Sysmon **event 2** |
| Tools and files deleted | deletion events, EDR telemetry, leftover artifacts |

(EC-Council framing) Covering tracks = disable auditing, clear logs, manipulate logs, delete files and history, hide artifacts, timestomp, use track-covering tools. ATT&CK now files log clearing under **Defense Impairment** (TA0112); older material says Defense Evasion.

## Central logging and integrity

1. **Forward in near real time** (Windows Event Forwarding to a collector, syslog/auditd forwarding, SIEM agent). A forwarded event cannot be erased from the host.
2. **Immutable (WORM) storage** for the central copy; ATT&CK mitigation Remote Data Storage (M1029).
3. **Restrict** who can clear logs or change audit policy; root-only log files.
4. **Alert** on 1102, 104, 4719, EventLog stopped, and a host that goes quiet.
5. **Integrity and retention:** hash or sign log batches, synchronise clocks, retain per policy (CIS Control 8; NIST SP 800-92).
6. **auditd** watches log files and privileged commands on Linux.

## Exam traps

- **Horizontal ≠ lateral.** Same level, other account vs other host.
- **Unquoted service path** needs a space in the path and a writable folder earlier in it; quoting fixes it.
- **setuid on `passwd` is normal; on an editor or shell it is a red flag.**
- **Bootkits load before the OS**: only Secure/Measured Boot or an offline scan sees them reliably.
- **Steganography is not encryption.**
- **1102 = Security cleared, 104 = System cleared, 4719 = audit policy changed.**
- **Bigger local logs or rotation do not protect evidence**; only a copy the attacker cannot reach does. No logs is a signal too.
