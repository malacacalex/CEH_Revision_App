---
id: ref-03
title: TCP flags and attacks by OSI layer
order: 3
modules: [0, 3, 8, 10, 11, 12]
rev: 1
verify: false
sources:
  - https://www.rfc-editor.org/rfc/rfc9293
  - https://www.rfc-editor.org/rfc/rfc3168
  - https://www.rfc-editor.org/rfc/rfc4987
  - https://attack.mitre.org/techniques/T1557/002/
  - https://www.cloudflare.com/learning/ddos/glossary/open-systems-interconnection-model-osi/
---
## TCP control bits

| Bit | Flag | Value | Meaning |
|---|---|---|---|
| 7 | CWR | 128 | Congestion window reduced |
| 6 | ECE | 64 | ECN echo |
| 5 | URG | 32 | Urgent pointer is valid |
| 4 | ACK | 16 | Acknowledgement number is valid |
| 3 | PSH | 8 | Push data to the application now |
| 2 | RST | 4 | Reset: abort the connection |
| 1 | SYN | 2 | Synchronize sequence numbers (open) |
| 0 | FIN | 1 | No more data from sender (close) |

Handy sums: SYN/ACK = 18 (0x12), FIN/ACK = 17 (0x11), RST/ACK = 20 (0x14), FIN+PSH+URG = 41 (0x29).

## Connection lifecycle

| Step | Packets |
|---|---|
| Open (three-way handshake) | SYN → SYN/ACK → ACK |
| Graceful close | FIN → ACK, then FIN → ACK from the other side |
| Abort | RST |
| SYN to a closed port | answered by RST/ACK |
| Unexpected packet to a closed port | answered by RST |

## Flag combinations that should never appear

| Combination | Why it is abnormal |
|---|---|
| SYN + FIN | Opens and closes at once |
| SYN + RST | Opens and aborts at once |
| No flags (NULL) | Every real segment has at least one flag |
| FIN + PSH + URG, no ACK ("Xmas") | FIN without ACK outside a connection |

IDS rules and stateful firewalls flag or drop these combinations. M3 explains how scanners use them.

## OSI layers and the attacks that target them

| Layer | Examples of attacks | Typical countermeasures |
|---|---|---|
| 7 Application | SQL injection, XSS, HTTP floods, DNS cache poisoning | Input validation, WAF, rate limiting, DNSSEC |
| 6 Presentation | TLS downgrade / SSL stripping, encoding tricks | HSTS, TLS 1.2+ only, strict decoding |
| 5 Session | Session hijacking, session fixation | Regenerate IDs at login, Secure/HttpOnly cookies |
| 4 Transport | SYN flood, TCP session hijacking, UDP flood, port scanning | SYN cookies, random ISNs, firewalls, IDS |
| 3 Network | IP spoofing, ICMP floods, Smurf, route manipulation | Ingress/egress filtering (BCP 38), ICMP rate limits |
| 2 Data link | ARP spoofing, MAC flooding, VLAN hopping, DHCP starvation, rogue DHCP | Dynamic ARP Inspection, port security, DHCP snooping, disable DTP |
| 1 Physical | Wiretapping, jamming, rogue devices, cable cutting | Physical security, locked racks, 802.1X |

The mapping is a teaching aid: some attacks span layers. For example, DHCP is an application protocol, but starvation is usually taught as a layer 2 attack.

## Exam traps

- **RST ≠ FIN.** RST aborts at once; FIN closes gracefully.
- **Closed port + SYN → RST/ACK.** Open port + SYN → SYN/ACK.
- **ARP attacks are layer 2**; they never cross a router.
- **A SYN flood fills the half-open connection backlog**; SYN cookies are the classic fix.
