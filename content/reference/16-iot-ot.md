---
id: ref-16
title: IoT and OT security
order: 16
modules: [18]
rev: 1
verify: true
sources:
  - https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml
  - https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html
  - https://datatracker.ietf.org/doc/html/rfc7252
  - https://datatracker.ietf.org/doc/html/rfc7452
  - https://csa-iot.org/all-solutions/zigbee/
  - https://standards.ieee.org/ieee/802.15.4/7029/
  - https://z-wavealliance.org/
  - https://lora-alliance.org/about-lorawan/
  - https://csrc.nist.gov/pubs/sp/800/121/r2/upd1/final
  - https://standards.ieee.org/ieee/1815/5414/
  - https://csrc.nist.gov/pubs/sp/800/82/r3/final
  - https://wiki.owasp.org/images/1/1c/OWASP-IoT-Top-10-2018-final.pdf
  - https://owasp.org/www-project-internet-of-things/
  - https://attack.mitre.org/matrices/ics/
  - https://syc-se.iec.ch/deliveries/cybersecurity-guidelines/security-standards-and-best-practices/iec-62443/
  - https://gca.isa.org/blog/how-to-define-zones-and-conduits
  - https://csrc.nist.gov/glossary/term/data_diode
  - https://csrc.nist.gov/pubs/ir/8259/a/final
  - https://datatracker.ietf.org/doc/html/rfc8520
  - https://www.cisa.gov/resources-tools/resources/primary-mitigations-reduce-cyber-threats-operational-technology
  - https://www.cisa.gov/news-events/alerts/2016/10/14/heightened-ddos-threat-posed-mirai-and-other-botnets
  - https://www.cisa.gov/news-events/ics-advisories/icsa-10-272-01
  - https://www.cisa.gov/news-events/alerts/2017/06/12/crashoverride-malware
  - https://www.cisa.gov/news-events/cybersecurity-advisories/aa22-083a
---
Flagged **verify** because the IoT architecture layers and some attack labels follow EC-Council's own framing; ports come from the IANA registry and the protocol specifications.

## IoT protocols and radios

| Protocol | Transport / port | What it is | Weakness to recognise |
|---|---|---|---|
| **MQTT** | TCP **1883**, TLS **8883** | publish/subscribe through a **broker**; wildcards `+` (one level), `#` (all levels) | anonymous broker: anyone can subscribe to `#` |
| **CoAP** (RFC 7252) | UDP **5683**, DTLS **5684** | REST-style GET/PUT/POST for constrained nodes; discovery at `/.well-known/core` | open UDP service usable for amplification |
| **Zigbee** | IEEE **802.15.4**, 2.4 GHz (also sub-GHz) | low-power mesh for home and building automation | weak key handling at join, replay |
| **Z-Wave** | sub-GHz radio | home automation mesh | legacy pairing modes |
| **BLE** | 2.4 GHz, Bluetooth Low Energy | wearables, locks, beacons | "Just Works" pairing has **no MITM protection** |
| **LoRaWAN** | sub-GHz LPWAN, star-of-stars via gateways | long range (km), low data rate, battery devices | key handling at device join |
| **6LoWPAN** | IPv6 over 802.15.4 (RFC 4944) | IP on tiny radios | same radio threats as 802.15.4 |
| **UPnP / SSDP** | UDP **1900** | device discovery, automatic router port opening | opens ports without asking |
| **Telnet** | TCP **23** (and 2323) | remote shell on cheap devices | Mirai's entry point |

BLE pairing methods (NIST SP 800-121): **Just Works** (no MITM protection), **Numeric Comparison**, **Passkey Entry**, **Out of Band**.

## OT / ICS protocols

| Protocol | Port | Where used | Security note |
|---|---|---|---|
| **Modbus/TCP** | **502**/tcp | PLCs everywhere; Modbus RTU runs on serial lines | classic protocol has **no authentication or encryption** |
| **DNP3** (IEEE 1815) | **20000** tcp/udp | electric and water utilities, master ↔ outstation | Secure Authentication exists but is often off |
| **S7comm** (Siemens) | **102**/tcp (ISO-TSAP) | Siemens S7 PLCs | Stuxnet's target family |
| **EtherNet/IP** (CIP) | **44818**, I/O **2222** | Rockwell / Allen-Bradley | device identity readable remotely |
| **BACnet/IP** | **47808**/udp | building automation | object discovery |
| **IEC 60870-5-104** | **2404** | grid telecontrol | used by Industroyer |
| **OPC UA** | **4840** | modern interoperability | built-in security modes: enable them |

## IoT architecture and communication

EC-Council's five layers, bottom to top (EC-Council framing):

| Layer | Contents |
|---|---|
| Edge technology | sensors, actuators, device hardware |
| Access gateway | hubs and gateways translating radios to IP |
| Internet | the IP transport to the cloud |
| Middleware | device management, data handling |
| Application | the user-facing app and services |

RFC 7452 communication patterns: **device-to-device**, **device-to-cloud**, **device-to-gateway**, **back-end data sharing**.

## Purdue model (ICS reference architecture)

| Level | Name | Typical assets |
|---|---|---|
| 5 | Enterprise | corporate IT, cloud |
| 4 | Business / site business network | ERP, e-mail, business servers |
| 3.5 | **Industrial DMZ** | jump hosts, historian replica, patch server |
| 3 | Site operations | historian, engineering workstations |
| 2 | Supervisory control | HMI, SCADA servers, alarms |
| 1 | Basic control | PLC, RTU, IED |
| 0 | Physical process | sensors, actuators, drives |

Rule of thumb (NIST SP 800-82r3): Level 4 never talks straight to Levels 0–2; traffic crosses the DMZ.

## IT vs OT

| | IT | OT |
|---|---|---|
| First priority | confidentiality | **safety and availability** |
| Lifetime | a few years | often decades |
| Patching / reboot | routine | planned, tested, in maintenance windows |
| Active scanning | normal | can crash fragile devices; **passive monitoring** preferred |
| Protocols | authenticated, encrypted by default | many legacy protocols trust any sender |
| Impact of failure | data loss | physical damage, injury, outages |

Components to place: **PLC** (control logic), **RTU** (remote field unit), **IED** (smart relay), **HMI** (operator screen), **historian** (process data), **SIS** (independent safety trip). **SCADA** spans wide areas; **DCS** runs one plant.

## ICS / SCADA attack types (recognition level)

| Threat (ATT&CK for ICS name) | How defenders see it | Countermeasure |
|---|---|---|
| Internet Accessible Device | own PLC or HMI appears in Shodan | take off the internet, VPN with MFA |
| Default Credentials | vendor password still works | change at install |
| Unauthorized Command Message | valid-looking write from an unknown host | protocol-aware IDS, allowlists |
| Program Download / Modify Firmware | logic changed outside a change window | key switch in RUN, compare to known-good |
| Manipulation of View | HMI shows normal values, process is not | independent sensors, out-of-band checks |
| Loss of Safety | SIS disabled or reprogrammed | separate SIS network, change alarms |
| Replication Through Removable Media | USB carries malware across the air gap | removable media control |

EC-Council also labels HMI-based attacks, side-channel attacks, PLC hacking and RF remote controller attacks (replay, command injection, e-stop abuse) (EC-Council framing).

| Case | Target | One-line lesson |
|---|---|---|
| **Stuxnet** (2010) | Siemens S7 PLCs driving centrifuges, via USB | verify PLC logic; don't trust the HMI alone |
| **Industroyer** (2016) | Ukrainian substation, IEC 101/104/61850 | attackers use the protocol as designed |
| **Triton / TRISIS** (2017) | Schneider Triconex SIS | isolate the SIS, key switch in RUN |
| **Mirai** (2016) | IoT via default Telnet passwords (62 pairs) | remove default passwords, not just the malware |

## OWASP IoT Top 10 (2018)

| # | Risk | Recognise it by |
|---|---|---|
| I1 | Weak, guessable or hardcoded passwords | admin/admin works; password in firmware |
| I2 | Insecure network services | Telnet, UPnP or debug port open |
| I3 | Insecure ecosystem interfaces | cloud API or mobile app without authorization |
| I4 | Lack of secure update mechanism | unsigned firmware, no anti-rollback |
| I5 | Use of insecure or outdated components | old BusyBox, OpenSSL, kernel |
| I6 | Insufficient privacy protection | collects more personal data than needed |
| I7 | Insecure data transfer and storage | cleartext MQTT, keys in plain files |
| I8 | Lack of device management | no inventory, monitoring or decommissioning |
| I9 | Insecure default settings | risky features on, cannot be hardened |
| I10 | Lack of physical hardening | open UART/JTAG, easy to open |

## Defences

- **Segmentation**: IoT on its own VLAN/SSID; OT split into **zones** joined by **conduits** (ISA/IEC 62443), with an industrial DMZ.
- **Data diode / unidirectional gateway**: data flows one way only (for example historian data out of OT).
- **NIST SP 800-82r3** (2023, *Guide to OT Security*): defence in depth, DMZs, separate IT/OT credentials, OT overlay of SP 800-53.
- **IEC 62443**: security levels SL 1–4 (target SL-T vs achieved SL-A), seven foundational requirements FR1–FR7.
- **CISA OT mitigations**: remove OT from the internet, change default passwords, secure remote access with phishing-resistant MFA, segment IT/OT, practise manual operation.
- **IoT device baseline** (NISTIR 8259A): identification, configuration, data protection, logical access, software update, cybersecurity state awareness.
- **MUD** (RFC 8520): the device declares the network access it needs; the network enforces it.

## Exam traps

- **1883 vs 8883** (MQTT, TLS); **5683 / 5684** are CoAP over **UDP**.
- **Zigbee = 802.15.4**, not 802.11 (Wi-Fi) or Bluetooth.
- **Modbus 502, DNP3 20000, S7 102, BACnet 47808, EtherNet/IP 44818, IEC-104 2404, OPC UA 4840.**
- A **data diode** is one-way; a firewall is two-way with rules. **Zones** group assets, **conduits** connect them.
- OWASP **I3** is the ecosystem (cloud, API, app) around the device; **I2** is the device's own services.
