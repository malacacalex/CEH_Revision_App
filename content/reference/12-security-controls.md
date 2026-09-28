---
id: ref-12
title: IDS, firewalls, NAC, EDR and honeypots
order: 12
modules: [12]
rev: 2
verify: false
sources:
  - https://csrc.nist.gov/pubs/sp/800/94/final
  - https://csrc.nist.gov/pubs/sp/800/41/r1/final
  - https://csrc.nist.gov/glossary/term/firewall
  - https://csrc.nist.gov/glossary/term/intrusion_detection_system
  - https://csrc.nist.gov/glossary/term/intrusion_prevention_system
  - https://csrc.nist.gov/glossary/term/false_positive
  - https://csrc.nist.gov/glossary/term/false_negative
  - https://csrc.nist.gov/glossary/term/packet_filter
  - https://csrc.nist.gov/glossary/term/stateful_inspection
  - https://csrc.nist.gov/glossary/term/application_proxy_gateway
  - https://csrc.nist.gov/glossary/term/network_access_control
  - https://csrc.nist.gov/glossary/term/honeypot
  - https://www.rfc-editor.org/rfc/rfc1928
  - https://www.paloaltonetworks.com/cyberpedia/what-is-a-circuit-level-gateway
  - https://www.paloaltonetworks.com/cyberpedia/what-is-a-next-generation-firewall-ngfw
  - https://owasp.org/www-community/Web_Application_Firewall
  - https://www.fortinet.com/resources/cyberglossary/what-is-network-access-control
  - https://learn.microsoft.com/en-us/windows-server/networking/technologies/nps/nps-top
  - https://learn.microsoft.com/en-us/defender-endpoint/overview-endpoint-detection-response
  - https://learn.microsoft.com/en-us/defender-xdr/microsoft-365-defender
  - https://www.fortinet.com/resources/cyberglossary/what-is-edr
  - https://www.fortinet.com/resources/cyberglossary/what-is-xdr
  - https://www.fortinet.com/resources/cyberglossary/what-is-honeypot
  - https://www.kaspersky.com/resource-center/threats/what-is-a-honeypot
  - https://d3fend.mitre.org/technique/d3f:StandaloneHoneynet/
  - https://d3fend.mitre.org/technique/d3f:IntegratedHoneynet/
  - https://d3fend.mitre.org/technique/d3f:ConnectedHoneynet/
  - https://d3fend.mitre.org/technique/d3f:DecoyUserCredential/
  - https://github.com/cowrie/cowrie
  - https://github.com/skeeto/endlessh
  - https://docs.suricata.io/en/latest/rules/intro.html
  - https://www.eccouncil.org/cybersecurity-exchange/ethical-hacking/what-are-honeypots-benefits-types/
  - https://www.eccouncil.org/cybersecurity-exchange/threat-intelligence/active-defense-for-mitigating-security-threats-and-intrusions/
  - https://manpages.ubuntu.com/manpages/jammy/man1/labrea.1.html
---
The types of network and endpoint security controls, and how to tell them apart.

Evasion techniques: see the Self-study tab.

## IDS vs IPS

| | IDS | IPS |
|---|---|---|
| Job | monitors and analyses events, raises an **alert** | everything an IDS does **and responds** to stop the attack |
| Placement | usually **passive** (SPAN/mirror port, tap, IDS load balancer) | **inline**: traffic must pass through it |
| On failure | protection silently stops (fail-open) | depends on design: fail-open or fail-closed |
| Response | none beyond alerting and logging | end the session, block source or target, reconfigure a firewall, drop or clean the packet |

The response is the **only** real difference (NIST SP 800-94). "Stop it in real time" in a scenario = IPS, inline.

## NIDS vs HIDS (and the other SP 800-94 types)

| Type | Watches | Sees | Blind to |
|---|---|---|---|
| **NIDS** (network-based) | a network segment | packets and protocols of many hosts | payloads inside TLS/VPN/SSH; what happens on the host |
| **HIDS** (host-based) | one host | logs, processes, file integrity, config changes, that host's traffic (after decryption) | the rest of the network |
| **Wireless IDPS** | radio traffic | rogue APs, wireless protocol misuse | wired traffic |
| **NBA** (network behaviour analysis) | flows | volume anomalies, DoS, scanning, unusual flows | payload detail |

Examples: **Snort** and **Suricata** (signature NIDS/NIPS), **Zeek** (network analysis), **OSSEC / Wazuh** (HIDS with file integrity monitoring), **AIDE** (file integrity checker).

## Detection methodologies

| Method | Compares traffic to | Strength | Weakness |
|---|---|---|---|
| **Signature** (misuse) | known attack patterns | precise, simple, few false positives on known threats | blind to zero-days and variants |
| **Anomaly** (behaviour) | a learned baseline of normal | can catch unknown attacks | many false positives; needs a training period |
| **Stateful protocol analysis** | vendor profiles of benign protocol state | tracks protocol state, pairs requests and responses | heavy on resources; misses protocol-legal attacks |

Good products combine all three. Tuning uses **thresholds** (x events in y seconds), **allow lists** and **block lists**.

## Alert outcomes

| | Alert raised | No alert |
|---|---|---|
| **Real attack** | **True positive** (correct detection) | **False negative** (missed attack: the most dangerous) |
| **Benign activity** | **False positive** (noise, alert fatigue) | **True negative** (correct silence) |

Lowering one error rate usually raises the other. Adjusting the sensor to balance them is **tuning**.

## Firewall types

| Type | OSI layer | Decides on | Remember |
|---|---|---|---|
| **Packet filter** (stateless) | 3 (and 4 ports) | source/destination IP, protocol, port, per packet | no state table; cannot tell a real reply from a crafted one |
| **Stateful inspection** | 3–4 | the above + a **connection state table** | drops packets that do not fit an existing session |
| **Circuit-level gateway** | 5 (session) | whether the session/handshake is valid | relays approved sessions (SOCKS, RFC 1928); **no payload check** |
| **Application proxy** (application-level gateway) | 7 | full content; terminates and reopens the connection | hosts never talk directly; hides internal addresses; slower |
| **NGFW** | up to 7 | stateful + application ID + integrated IPS + DPI, often TLS inspection and user ID | a firewall that knows apps and users |
| **UTM** | several | firewall + anti-malware + IDS/IPS + more in one box | one appliance must handle every task |
| **WAF** | 7 (HTTP) | web requests to one application (SQLi, XSS) | protects the **server**; a forward proxy protects clients |

Rules of thumb (NIST SP 800-41): **deny by default**; most-matched rules near the top on sequential firewalls; NAT is a routing feature, not a security control. Host-based (personal) firewalls protect one machine; network firewalls protect a segment.

## NAC (network access control)

- Decides **whether a device may join the network** based on who the user is and the device's **health** (patch level, anti-malware, configuration): the posture check.
- **Pre-admission**: checked before any access. **Post-admission**: checked again when the device moves to another area or its state changes.
- Non-compliant devices are denied or sent to a **quarantine / remediation network** until fixed.
- Common building blocks: **802.1X** (supplicant = the device, authenticator = switch or AP, authentication server = RADIUS, e.g. Microsoft NPS). Agent-based NAC installs software on the endpoint; agentless NAC scans or fingerprints the device.

## EDR and XDR

| | What it covers | What it does |
|---|---|---|
| **Antivirus / EPP** | files on the endpoint | blocks known malware (prevention) |
| **EDR** | endpoints (process, file, registry, network telemetry) | near real-time detection, investigation of the full scope, response: **isolate the host**, kill a process, quarantine a file |
| **XDR** | endpoints **plus** identities, email, network, cloud, apps | collects and **correlates** across layers into one incident |

Recognition: "records everything a laptop does and lets the analyst isolate it" = EDR; "one incident built from endpoint, email and identity alerts" = XDR.

## Honeypot types

| Type | What it is | Trade-off |
|---|---|---|
| **Low-interaction** | emulates a few services | cheap and safe; little data; easiest to fingerprint |
| **Medium-interaction** | emulates an OS shell or service in more depth (e.g. Cowrie's shell mode) | more data, still no real OS |
| **High-interaction** | real OS and services | richest data; real risk of being used as a pivot, must be contained |
| **Pure honeypot** | a full production-like system with fake sensitive data | most convincing, most costly |
| **Honeynet** | a network of honeypots (D3FEND: standalone, integrated, connected) | studies attacker movement between hosts |
| **Honeytoken** | a decoy credential, file or URL (canary token) | any use at all is a high-signal alert |
| **Tarpit** | a service that deliberately slows attackers down, holding connections open (e.g. an SSH tarpit such as Endlessh; LaBrea-style sticky honeypots answer unused addresses) | wastes the attacker's time; slows scanners and worms |

- By purpose: **production** (beside real servers, detects intrusions) vs **research** (studies tools and trends).
- (EC-Council framing) By deployment: malware, database, email-trap (spam) and spider honeypots, plus honeynets.
- A honeypot has **no legitimate users**, so it has very few false positives. It **detects and deceives, it does not block**, and it supplements, never replaces, IDS/IPS.

## Exam traps

- **IDS alerts, IPS blocks; an IPS must be inline.**
- **New attack with no signature → anomaly detection** (at the cost of false positives).
- **False negative is worse than false positive**: the attack went through unseen.
- **Circuit-level gateway checks the session, not the payload**; the application proxy checks the payload.
- **WAF protects a web server**, not users browsing out.
- **Honeytoken = decoy artifact, honeypot = decoy system, honeynet = decoy network.**
