---
id: ref-11
title: Sniffing, social engineering, DoS and session hijacking
order: 11
modules: [8, 9, 10, 11]
rev: 1
verify: true
sources:
  - https://attack.mitre.org/techniques/T1040/
  - https://attack.mitre.org/techniques/T1557/002/
  - https://attack.mitre.org/techniques/T1557/003/
  - https://www.rfc-editor.org/rfc/rfc826
  - https://www.rfc-editor.org/rfc/rfc4033
  - https://www.rfc-editor.org/rfc/rfc5452
  - https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/topic-map/overview-port-security.html
  - https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/topic-map/understanding-and-using-dai.html
  - https://www.cisa.gov/news-events/news/avoiding-social-engineering-and-phishing-attacks
  - https://attack.mitre.org/techniques/T1566/
  - https://attack.mitre.org/techniques/T1660/
  - https://www.ncsc.gov.uk/guidance/phishing
  - https://www.rfc-editor.org/rfc/rfc7489
  - https://pages.nist.gov/800-63-4/sp800-63b.html
  - https://www.cisa.gov/resources-tools/resources/understanding-and-responding-distributed-denial-service-attacks
  - https://www.cisa.gov/news-events/alerts/2014/01/17/udp-based-amplification-attacks
  - https://www.rfc-editor.org/rfc/rfc4987
  - https://www.rfc-editor.org/rfc/rfc2827
  - https://attack.mitre.org/techniques/T1498/
  - https://attack.mitre.org/techniques/T1499/
  - https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
  - https://community.owasp.org/attacks/Session_hijacking_attack
  - https://www.rfc-editor.org/rfc/rfc5961
  - https://www.rfc-editor.org/rfc/rfc6528
  - https://attack.mitre.org/techniques/T1539/
  - https://www.rfc-editor.org/rfc/rfc6797
---
Recognition and defense for modules 8 to 11. Match the symptom to the attack, then the attack to its control. Flagged **verify** because a few labels are EC-Council framing and are marked as such.

## Sniffing and spoofing on the LAN

Passive sniffing only listens (hub, mirror port, open Wi-Fi) and is very hard to detect. Active sniffing (EC-Council framing) injects traffic so a switch or host sends frames to the attacker, and it leaves traces.

| Attack | What a defender sees | Control |
|---|---|---|
| **MAC flooding** | thousands of new MACs on one access port; unicast traffic appears on other ports | **Port security** (MAC limit per port) |
| **DHCP starvation** | DHCP pool empty; bursts of requests from many MACs on one port | **DHCP snooping** + rate limit, port security |
| **Rogue DHCP server** | leases whose gateway or DNS points to an unknown host | **DHCP snooping** (server replies only on trusted ports) |
| **ARP spoofing / poisoning** | unsolicited ARP replies; the gateway IP's MAC changes; "duplicate IP" alerts | **Dynamic ARP Inspection**, static ARP for key hosts |
| **MAC spoofing** | one MAC seen on two ports or suddenly on a new port | **802.1X**, MAC move limiting |
| **Switch port stealing** | the victim's MAC keeps moving to the attacker's port | port security, 802.1X |
| **DNS spoofing / cache poisoning** | a name resolves to an unexpected IP; two answers to one query | **DNSSEC** validation, port and ID randomization (RFC 5452) |
| **VLAN hopping** (switch spoofing, double tagging) | an access port negotiating a trunk; frames with two 802.1Q tags | DTP off (`switchport mode access`), unused native VLAN |
| **STP attack** | a new device claims root bridge | BPDU guard, root guard |
| **LLMNR / NBT-NS poisoning** | a host answers failed name lookups and collects NTLM hashes | disable LLMNR and NetBIOS, SMB signing |
| **SSL stripping** | a site that should be HTTPS loads over HTTP | **HSTS** (preloaded) |

- **DHCP snooping builds the binding table** that DAI (ARP) and IP Source Guard (IP spoofing) read. Enable it first.
- Port security violation modes: **protect** (drop silently), **restrict** (drop + alert), **shutdown** (err-disable, the default). **Encryption makes a capture useless** (TLS, SSH, SFTP, SNMPv3, IPsec, MACsec). Switch features stop the attacker getting the traffic at all.
- Sniffer detection (EC-Council list): ARP, DNS, ping and latency methods; tools: arpwatch, Nmap `sniffer-detect`, IDS.

## Social engineering families

| Family | Channel | Examples |
|---|---|---|
| **Human-based** | in person, phone | impersonation, vishing, tailgating, piggybacking, shoulder surfing, dumpster diving, eavesdropping, baiting, quid pro quo, reverse social engineering |
| **Computer-based** | email, web, chat, social media | phishing, spear phishing, whaling, pharming, watering hole, fake profiles, scareware pop-ups |
| **Mobile-based** | SMS, apps, QR codes | smishing, quishing, malicious or repackaged apps, SIM swap, MFA fatigue |

Levers: authority, urgency, scarcity, emotion (fear, greed, curiosity), social proof, familiarity. EC-Council phases: research the company → select a victim → develop a relationship → exploit it.

| Variant | Key clue |
|---|---|
| **Phishing** | mass, generic lure |
| **Spear phishing** | one person or team, researched details |
| **Whaling** | senior executives |
| **BEC** | fake CEO or supplier asks for a payment or a bank change; often no link or malware |
| **Pharming** | correct URL typed, wrong site (poisoned DNS or hosts file) |
| **Watering hole** | a site the target group trusts is infected (ATT&CK T1189) |
| **Vishing / smishing / quishing** | voice / SMS / QR code |
| **Angler phishing** | fake customer-support account on social media |

- **Piggybacking vs tailgating** (EC-Council framing): piggybacking = insider knowingly lets you in; tailgating = no consent. **Reverse social engineering**: the victim calls the attacker, who posed as the "helper".
- ATT&CK: **T1598** phishing for information (collect) vs **T1566** phishing (run code, get access).

**Defenses.** SPF (allowed senders), DKIM (signature), **DMARC** (alignment + policy `none` / `quarantine` / `reject`). **FIDO2 / WebAuthn** is phishing-resistant; typed OTP, SMS and push codes are not (NIST SP 800-63B-4). Verify any odd request through a **separate, known channel**; two-person approval for payments. Training plus reporting, not training alone.

## DoS and DDoS

| Category | What runs out | Examples | Unit (EC-Council framing) |
|---|---|---|---|
| **Volumetric** | link bandwidth | UDP flood, ICMP flood, reflection / amplification | bps |
| **Protocol** (L3–L4) | state tables in hosts, firewalls, load balancers | SYN flood, fragment attacks, ACK flood | pps |
| **Application** (L7) | server work per request | HTTP GET/POST flood, Slowloris, R.U.D.Y. | rps |

- **Reflection** = spoofed source so third-party servers answer the victim; **amplification** = the answer is much larger than the request. Both rely on UDP. Top factors (CISA TA14-017A): **Memcached** (11211) up to ~51,000, **NTP** `monlist` (123) ~557, **CharGEN** (19) ~359, DNS (53) 28–54.
- Classic names: **Smurf** (ICMP to a directed broadcast), **Fraggle** (same with UDP), **Ping of death** (reassembled packet over 65,535 bytes), **Teardrop** (overlapping fragments), **Land** (same source and destination), **PDoS / phlashing** (firmware damaged).
- Botnet = bots (zombies) + bot master + C2; **Mirai** recruited IoT devices with default Telnet passwords. ATT&CK: **T1498** network DoS (.002 reflection amplification), **T1499** endpoint DoS.

| Attack | Control |
|---|---|
| SYN flood | **SYN cookies**, larger backlog, shorter SYN-RECEIVED timer (RFC 4987) |
| Spoofed traffic at the source | **BCP 38** ingress filtering (RFC 2827), uRPF (BCP 84), egress filtering |
| Volumetric flood | upstream scrubbing, anycast / CDN, **RTBH** (target goes offline) |
| Amplifiers you run | close open resolvers, patch `monlist`, disable unused UDP services |
| HTTP flood | WAF, rate limiting (429 / 503), caching |
| Slowloris / R.U.D.Y. | request timeouts (Apache `mod_reqtimeout`), per-IP connection limits |

## Session hijacking

Hijacking takes over a session that **already exists**; spoofing starts a new one under a false identity.

| Level | Target | Techniques | Key control |
|---|---|---|---|
| **Application** | the HTTP session token | sniffing / sidejacking, XSS cookie theft, **fixation**, prediction, replay, man-in-the-browser, AiTM phishing proxy | TLS + `Secure`, `HttpOnly`, new ID at login, ≥ 64-bit random IDs |
| **Network** | the TCP or UDP flow | TCP/IP hijacking, **blind** hijacking (guess sequence numbers), **RST** hijacking, UDP hijacking, MITM via ARP spoofing or ICMP redirect | encryption (TLS, SSH, IPsec), random ISNs (RFC 6528), RFC 5961 challenge ACKs, DAI |

- **Fixation fix = regenerate the session ID at authentication** and accept only IDs the server issued (strict mode).
- Cookie flags: `Secure` (HTTPS only), `HttpOnly` (no script access; limits XSS theft, does not fix XSS), `SameSite` (CSRF defense in depth), `__Host-` prefix.
- Timeouts (OWASP): idle 2–5 min high-value, 15–30 min low-risk; **logout must invalidate the session on the server**.
- **HSTS** (RFC 6797) defeats SSL stripping; the preload list covers the first visit.
- EC-Council TCP hijack sequence: sniff → monitor → desynchronize → predict sequence numbers → take over. An **ACK storm** (EC-Council term) is a desync clue.
- ATT&CK: **T1539** steal web session cookie, **T1550.004** use it (bypasses MFA), **T1563** SSH / RDP session hijacking.

## Exam traps

- **MAC flooding targets the switch; ARP poisoning targets hosts.** Many MACs on one port = flooding.
- **DAI needs DHCP snooping** (or ARP ACLs for static hosts). **DNSSEC = integrity, not privacy** (DoT / DoH for privacy).
- **Pharming needs no click on a bad link.** **Whaling = executives.** A SIM swap defeats SMS codes, not FIDO2 keys.
- **Reflection hides the source; amplification multiplies size.** Reflectors are victims too. **BCP 38 stops your network being a spoofing source**; it does not filter floods aimed at you.
- **Slowloris is low bandwidth**: fix with timeouts, not capacity. **SYN cookies protect state, not the link.**
- **A stolen session cookie bypasses MFA.** Blind hijacking = attacker cannot see replies. UDP hijacking is easier (no sequence numbers).
