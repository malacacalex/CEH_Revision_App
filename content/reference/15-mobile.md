---
id: ref-15
title: Mobile platforms
order: 15
modules: [17]
rev: 1
verify: true
sources:
  - https://owasp.org/projects/mobile-top-10
  - https://github.com/OWASP/www-project-mobile-top-10
  - https://source.android.com/docs/security/app-sandbox
  - https://source.android.com/docs/security/features/apksigning
  - https://source.android.com/docs/security/features/verifiedboot/boot-flow
  - https://developer.android.com/guide/topics/permissions/overview
  - https://developer.android.com/google/play/integrity/verdicts
  - https://support.apple.com/guide/security/boot-process-for-ipad-and-iphone-devices-secb3000f149/web
  - https://support.apple.com/guide/security/app-code-signing-process-sec7c917bf14/web
  - https://support.apple.com/guide/security/security-of-runtime-process-sec15bfe098e/web
  - https://support.apple.com/guide/security/data-protection-classes-secb010e978a/web
  - https://support.apple.com/guide/iphone/unauthorized-modification-of-ios-iph9385bb26a/ios
  - https://csrc.nist.gov/pubs/sp/800/124/r2/final
  - https://support.apple.com/guide/deployment/user-enrollment-and-device-management-dep23db2037d/web
  - https://developers.google.com/android/work/terminology
  - https://mas.owasp.org/MASVS/
  - https://attack.mitre.org/techniques/T1660/
  - https://attack.mitre.org/techniques/T1451/
  - https://attack.mitre.org/techniques/T1458/
  - https://pages.nist.gov/800-63-4/sp800-63b.html
  - https://www.cisa.gov/resources-tools/resources/mobile-communications-best-practice-guidance
  - https://csrc.nist.gov/glossary/term/jailbreak
---
Platform security models, the OWASP Mobile Top 10 and enterprise controls for module 17. Flagged **verify** because the jailbreak types, the attack-surface split and trustjacking are EC-Council framing.

## Android vs iOS security model

| Layer | Android | iOS |
|---|---|---|
| **Sandbox** | unique Linux **UID** per app (kernel DAC) + per-app **SELinux** domain (Android 9+) | random home directory per app; other data only through system services and **entitlements** |
| **Permissions** | normal (install time), **dangerous (runtime, since 6.0)**, special (e.g. draw over apps) | per-resource user prompts; entitlements granted by Apple |
| **Code signing** | every APK signed; **self-signed**, no CA check; schemes v1 (JAR), v2 (7.0), v3 (9, key rotation), v4 (11) | all executable code signed with an **Apple-issued** certificate; unsigned code does not run |
| **Secure boot chain** | **Verified Boot**: hardware root of trust → bootloader → partitions (dm-verity), rollback protection | **Boot ROM** (immutable, Apple Root CA key) → iBoot → kernel, each step checks the next |
| **Key storage** | Keystore in TEE or **StrongBox** | **Secure Enclave**, Keychain |
| **Data at rest** | file-based encryption: CE (after unlock) and DE (Direct Boot) storage | Data Protection classes A, B, **C (default)**, D |
| **Transport** | cleartext off by default (API 28+); only system CAs trusted (7.0+) | **ATS**: TLS 1.2+, forward secrecy |
| **Attestation** | **Play Integrity API** (verdict checked on the server) | **App Attest** (key in the Secure Enclave) |
| **Store and scanning** | Google Play, **Play Protect** also scans sideloaded apps | App Store review; Lockdown Mode for high-risk users |

- Android boot warnings: **ORANGE** = bootloader unlocked, **YELLOW** = custom root of trust, **RED** = verification failed.
- Play Integrity: `MEETS_BASIC_INTEGRITY` (basic only), `MEETS_DEVICE_INTEGRITY` (genuine certified device), `MEETS_STRONG_INTEGRITY` (plus recent patches).
- iOS class C = "until first user authentication"; class A keys are dropped shortly after lock.

## Rooting vs jailbreaking

| | Rooting (Android) | Jailbreaking (iOS) |
|---|---|---|
| What | gain root, bypass platform restrictions | exploit flaws to disable code signing and sandbox checks |
| Usual prerequisite | **unlocked bootloader** (breaks Verified Boot) | a vulnerability (bootrom, iBoot or userland level) |
| Risks | any root process reads every app's data, hides malware, ignores policy | unsigned code runs, other apps' data exposed, instability, **no more updates** |
| Detect | server-side Play Integrity verdict, MDM / MTD posture | App Attest, MDM / MTD posture |

- Jailbreak types (EC-Council framing): **tethered** (needs a computer to boot), **semi-tethered** (boots, re-jailbreak from a computer), **semi-untethered** (re-jailbreak with an on-device app), **untethered** (persists). More "un" = less needed.
- A **bootrom** exploit cannot be patched by an iOS update. Jailbreaking is **not** carrier unlocking.
- NIST SP 800-124r2: treat rooted or jailbroken devices as **untrusted**. Client-side root checks can be bypassed; check attestation on the server.

## OWASP Mobile Top 10 (2024)

| # | Risk | Typical finding |
|---|---|---|
| M1 | Improper Credential Usage | API key or password hardcoded in the app |
| M2 | Inadequate Supply Chain Security | vulnerable or malicious SDK, weak build pipeline |
| M3 | Insecure Authentication/Authorization | IDOR, role sent by the client, local-only login |
| M4 | Insufficient Input/Output Validation | injection through intents, deep links, WebViews |
| M5 | Insecure Communication | HTTP, accepting any certificate |
| M6 | Inadequate Privacy Controls | collects or leaks more personal data than needed |
| M7 | Insufficient Binary Protections | easy to reverse engineer or repackage |
| M8 | Security Misconfiguration | debuggable release, exported components, cleartext allowed |
| M9 | Insecure Data Storage | tokens in plain files, logs, backups |
| M10 | Insufficient Cryptography | weak algorithm, short key, poor key management |

Changes from 2016: M1 Improper Platform Usage and M10 Extraneous Functionality dropped; tampering and reverse engineering merged into **M7**; authentication and authorization merged into **M3**; data storage fell from M2 to **M9**.

## Mobile attacks (recognition)

| Attack | Sign | Control |
|---|---|---|
| **Smishing** (T1660) | text with a link or callback number | do not tap; forward to 7726; official app |
| **Caller ID spoofing / vishing** | call appears to come from the bank | call back on a known number; STIR/SHAKEN |
| **SIM swap** (T1451) | phone loses service, then SMS codes are abused | carrier PIN / port lock, **no SMS MFA**, FIDO |
| **OTP-stealing malware** | app with SMS access forwards codes | app vetting, permission review, non-SMS MFA |
| **Juice jacking** (T1458) | public USB charging port or cable | wall socket, own charger, charge-only cable |
| **Overlay / tapjacking** | fake screen drawn over a real app | Android 12 blocks touches through untrusted overlays |
| **Malicious or repackaged app** | clone of a real app from outside the store | official stores, Play Protect, MDM allowlist |
| **Camera / mic spying** | sensors used in the background | OS indicators, permission review |
| **Trustjacking** (EC-Council framing) | abuse of an old "Trust This Computer" pairing | review and reset trusted computers |

EC-Council's anatomy of a mobile attack: **device**, **network**, **data center / cloud**.

## MDM, EMM and BYOD

| Term | Scope |
|---|---|
| **MDM** | whole device: passcode, encryption, OS version, radios, camera, full wipe |
| **MAM** | only work apps: allowlist, copy/paste limits, app-level wipe (fits BYOD) |
| **EMM** | umbrella: MDM + MAM + more, one console |
| **MTD** | on-device detection of malicious apps, MitM, phishing, risky configs; feeds the EMM |
| **App vetting** | tests apps before deployment (NIST SP 800-163r1) |

| Model | Owner | Personal use | Wipe |
|---|---|---|---|
| Fully managed | company | no | full |
| **COPE** | company | yes | full or work only |
| **CYOD** | company, employee picks from a list | usually | full |
| **BYOD** | employee | yes | **selective (enterprise) wipe** |

- BYOD platforms: Android **work profile**; Apple **User Enrollment** (manages only the organization's accounts and data). Company-owned: Android fully managed device, Apple **supervision**.
- Policy (NIST SP 800-124r2): passcode and encryption, minimum OS version, block rooted or jailbroken devices, developer mode and USB debugging off, restrict sideloading, remote lock and wipe (wipe needs power and a network).
- Standards: **OWASP MASVS** = what to verify, **MASTG** = how to test; MITRE ATT&CK Mobile; CISA: FIDO MFA, no SMS MFA, updates.

## Exam traps

- **M1 in 2024 = Improper Credential Usage**; "Improper Platform Usage" was M1 in 2016. A hardcoded key is M1, not M10.
- **Runtime permissions arrived in Android 6.0.** Android signing proves the same developer, not a trusted identity.
- **Class C is the iOS default**, not class A.
- **MTD detects, MDM enforces.** BYOD + "do not touch personal data" → MAM / work profile + selective wipe.
- **SMS is a restricted authenticator** (NIST SP 800-63B-4) and falls to SIM swap.
- **"Jailbreak" also means an AI prompt attack** in NIST's glossary: read the question.
