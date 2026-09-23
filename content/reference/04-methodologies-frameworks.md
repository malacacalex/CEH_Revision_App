---
id: ref-04
title: Methodologies and frameworks
order: 4
modules: [1, 2, 3, 4, 5, 6, 7]
rev: 1
verify: true
sources:
  - https://www.lockheedmartin.com/content/dam/lockheed-martin/rms/documents/cyber/LM-White-Paper-Intel-Driven-Defense.pdf
  - https://attack.mitre.org/tactics/enterprise/
  - https://apps.dtic.mil/sti/citations/ADA586960
  - https://csrc.nist.gov/pubs/sp/800/150/final
  - https://csrc.nist.gov/pubs/sp/800/115/final
  - https://www.eccouncil.org/train-certify/certified-ethical-hacker-ceh/
---
Flagged **verify** because the EC-Council-specific lists (five phases, hacker classes) follow the vendor's own wording, which we check against the official exam blueprint at each release.

## Five phases of hacking (EC-Council)

| # | Phase | What happens |
|---|---|---|
| 1 | Reconnaissance | Passive and active information gathering |
| 2 | Scanning | Live hosts, open ports, services, vulnerabilities |
| 3 | Gaining access | Exploiting a weakness to get in |
| 4 | Maintaining access | Persistence: backdoors, new accounts |
| 5 | Clearing tracks | Hiding activity, tampering with logs |

The CEH hacking methodology breaks this down further: footprinting → scanning → enumeration → vulnerability analysis → system hacking. System hacking covers gaining access, escalating privileges, maintaining access and clearing logs.

## Lockheed Martin Cyber Kill Chain

| # | Stage | Defender's chance |
|---|---|---|
| 1 | Reconnaissance | Detect scanning and OSINT interest |
| 2 | Weaponization | (on the attacker's side) intelligence on tooling |
| 3 | Delivery | Mail filtering, web proxies, USB control |
| 4 | Exploitation | Patching, exploit mitigations, EDR |
| 5 | Installation | Application allow-listing, EDR |
| 6 | Command and control (C2) | Egress filtering, DNS monitoring |
| 7 | Actions on objectives | DLP, segmentation, monitoring |

Breaking any link stops the intrusion.

## MITRE ATT&CK: Enterprise tactics

A **tactic** is the adversary's goal (the *why*); a **technique** is how they reach it; a **procedure** is one specific real-world implementation.

| # | Tactic | # | Tactic |
|---|---|---|---|
| 1 | Reconnaissance | 8 | Credential Access |
| 2 | Resource Development | 9 | Discovery |
| 3 | Initial Access | 10 | Lateral Movement |
| 4 | Execution | 11 | Collection |
| 5 | Persistence | 12 | Command and Control |
| 6 | Privilege Escalation | 13 | Exfiltration |
| 7 | Defense Evasion | 14 | Impact |

## Diamond Model of Intrusion Analysis

Every event links four core features: **adversary**, **capability**, **infrastructure** and **victim**. Meta-features include timestamp, phase, result, direction, methodology and resources. Analysts *pivot* from one feature to the others, for example from an IP address (infrastructure) to other victims.

## TTPs and indicators

- **TTPs**: tactics, techniques and procedures. They describe *behavior* and are hard for an attacker to change.
- **IoCs** (indicators of compromise): artifacts that show an intrusion happened, such as file hashes, IP addresses, domains, registry keys or unusual processes.
- **Indicators of attack (IoAs)**: signs of an attack in progress, based on behavior.
- Threat intelligence levels: **strategic** (executives, trends), **operational** (specific campaigns), **tactical** (TTPs) and **technical** (raw IoCs for tools).

## Hacker classes (as the exam names them)

| Class | Description |
|---|---|
| White hat | Authorized testers and defenders |
| Black hat | Malicious, unauthorized attackers |
| Gray hat | Sometimes offensive, sometimes defensive; may act without permission |
| Script kiddie | Unskilled; runs other people's tools |
| Hacktivist | Attacks to promote a political or social cause |
| State-sponsored | Works for a government |
| Cyber terrorist | Motivated by ideology; aims at fear or large-scale disruption |
| Insider | Trusted employee or contractor who misuses access |
| Suicide hacker | Does not care about being caught |
| Organized crime / criminal syndicates | Financially motivated groups |

## Security controls

| By type | Examples |
|---|---|
| Administrative | Policies, training, background checks |
| Technical | Firewalls, encryption, access control lists, MFA |
| Physical | Locks, guards, fences, CCTV |

| By function | Examples |
|---|---|
| Preventive | Firewall, IPS, locks |
| Detective | IDS, log review, CCTV monitoring |
| Corrective | Patching, reimaging, restoring a config |
| Deterrent | Warning banners, visible cameras |
| Recovery | Backups, disaster-recovery site |
| Compensating | Alternative when the standard control is not feasible |

## Testing types

- **Black box**: no prior knowledge.
- **Gray box**: partial knowledge, such as a user account.
- **White box**: full knowledge (diagrams, source code, credentials).
- **Announced** tests are known to the IT staff; **unannounced** tests are not, and they also test the response.

## Exam traps

- **Kill Chain: Exploitation comes right after Delivery**, then Installation.
- **ATT&CK tactic = why, technique = how.**
- **Diamond Model = adversary, capability, infrastructure, victim**: no "target", no "motive" in the core four.
- **Gray hat ≠ authorized.** Only white hats work with permission.
