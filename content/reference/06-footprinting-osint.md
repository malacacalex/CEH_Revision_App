---
id: ref-06
title: Footprinting and OSINT
order: 6
modules: [2]
rev: 1
verify: true
sources:
  - https://attack.mitre.org/tactics/TA0043/
  - https://support.google.com/websearch/answer/2466433
  - https://github.com/OWASP/wstg/blob/master/document/4-Web_Application_Security_Testing/01-Information_Gathering/01-Conduct_Search_Engine_Reconnaissance_for_Information_Leakage.md
  - https://www.exploit-db.com/google-hacking-database
  - https://help.shodan.io/the-basics/search-query-fundamentals
  - https://www.rfc-editor.org/rfc/rfc9162
  - https://www.rfc-editor.org/rfc/rfc3912
  - https://www.icann.org/rdap
  - https://www.rfc-editor.org/rfc/rfc9083
  - https://www.icann.org/resources/pages/gtld-registration-data-specs-en
  - https://www.icann.org/resources/pages/epp-status-codes-2014-06-16-en
  - https://www.nro.net/about/rirs/
  - https://www.arin.net/resources/registry/whois/
  - https://www.ripe.net/manage-ips-and-asns/db/
  - https://www.rfc-editor.org/rfc/rfc1035
  - https://www.rfc-editor.org/rfc/rfc2308
  - https://www.rfc-editor.org/rfc/rfc3596
  - https://www.rfc-editor.org/rfc/rfc2782
  - https://www.rfc-editor.org/rfc/rfc8659
  - https://www.rfc-editor.org/rfc/rfc7208
  - https://www.rfc-editor.org/rfc/rfc6376
  - https://www.rfc-editor.org/rfc/rfc7489
  - https://www.rfc-editor.org/rfc/rfc5936
  - https://www.rfc-editor.org/rfc/rfc8945
  - https://www.rfc-editor.org/rfc/rfc5155
  - https://www.cloudflare.com/learning/dns/dns-records/
  - https://www.rfc-editor.org/rfc/rfc9309
  - https://attack.mitre.org/mitigations/M1056/
  - https://genai.owasp.org/llm-top-10/
---
Flagged **verify**: Google documents only some of the operators below, and the AI-footprinting framing follows the v13 course topics. Footprinting = ATT&CK **Reconnaissance** (TA0043).

## Passive vs active

| | Passive | Active |
|---|---|---|
| Contact with the target | none | direct (its servers or its people) |
| Examples | search engines, WHOIS/RDAP, CT logs, archives, social media, job ads, Shodan | queries to the target's own name servers, zone transfer attempts, traceroute to its hosts, calling staff, e-mail tracking |
| Detection risk | very low | may be logged |

Test question: **does the activity touch the target's systems or people?** A lookup through a public resolver is usually passive; a query sent straight to the target's name server is active.

## Search operators

| Operator | Finds | Documented by Google? |
|---|---|---|
| `site:` | results from one domain or path only | yes |
| `filetype:` (`ext:`) | one file type (pdf, xlsx, sql, log…) | yes |
| `"…"` | the exact phrase | yes |
| `-` | excludes a word or site (`site:example.com -www` surfaces subdomains) | yes |
| `before:` / `after:` | pages updated before / after a date | yes |
| `OR` | either term | not on the help page, works |
| `intitle:` / `allintitle:` | word(s) in the page title (`intitle:"index of"` = directory listings) | no, still widely used |
| `inurl:` / `allinurl:` | word(s) in the URL (login, admin paths) | no, still widely used |
| `intext:` / `allintext:` | word(s) in the page body | no, still widely used |
| `cache:` | Google's cached copy: **retired in 2024**; use the Wayback Machine | removed |

**Google hacking (dorking)** combines operators to find exposed documents, login portals, error messages and configuration files. The **GHDB** (Exploit-DB) catalogs such queries by category.

## Other OSINT sources

| Source | Reveals |
|---|---|
| **Shodan**, **Censys** | internet-facing devices and banners (`port:`, `org:`, `net:`, `hostname:`, `country:`) |
| **Certificate Transparency** (crt.sh) | every issued TLS certificate, so subdomains |
| **Wayback Machine** | old pages, removed files, former staff lists |
| Job ads | the technology stack |
| SEC EDGAR, business registers | subsidiaries, executives, acquisitions |
| Social networks | names, roles, e-mail format (theHarvester, Sherlock for usernames) |
| Breach data, dark web | leaked credentials; defenders check Have I Been Pwned |
| Document metadata (FOCA, ExifTool) | usernames, software versions, paths, GPS |

## WHOIS, RDAP and RIRs

- **WHOIS**: plain text over **TCP 43**. **RDAP**: HTTPS + JSON, access control; gTLDs no longer have to run WHOIS since **28 Jan 2025**.
- Since the **GDPR** (2018), personal contacts are usually **redacted**. Thick registries hold full records; thin ones point to the registrar.

| Domain record field | What it tells you |
|---|---|
| Registrar, Registrar IANA ID, WHOIS/RDAP server | who sold the domain, where to ask next |
| Creation / Updated / Registry Expiry Date | a very young domain can flag phishing |
| Name Server | the DNS provider |
| Domain Status (EPP codes, e.g. `clientTransferProhibited`) | locks and lifecycle state |
| DNSSEC | `signedDelegation` or `unsigned` |
| Registrant / Admin / Tech contacts | often redacted or a privacy proxy |
| Registrar Abuse Contact | where to report misuse |

IP addresses and ASNs are looked up in a **Regional Internet Registry**: owner, network range (ARIN `NetRange`/`CIDR`, RIPE `inetnum`), origin AS, abuse contact.

| RIR | Region |
|---|---|
| **ARIN** | United States, Canada, parts of the Caribbean |
| **RIPE NCC** | Europe, Middle East, Central Asia |
| **APNIC** | Asia-Pacific |
| **LACNIC** | Latin America and parts of the Caribbean |
| **AFRINIC** | Africa |

## DNS record types

| Record | Holds | Footprinting value |
|---|---|---|
| **A / AAAA** | IPv4 / IPv6 address | hosts to scan |
| **MX** | mail servers (with preference) | mail provider, phishing target |
| **NS** | authoritative name servers | the servers that hold the zone |
| **CNAME** | alias to another name | cloud/SaaS in use; dangling ones = subdomain takeover |
| **SOA** | primary NS (MNAME), admin mailbox (RNAME), serial, refresh, retry, expire, minimum (negative-cache TTL) | primary server and admin contact |
| **PTR** | reverse lookup in `in-addr.arpa` / `ip6.arpa` | naming conventions across an IP range |
| **TXT** | free text: SPF, DKIM, DMARC, site-verification tokens | mail senders and SaaS providers |
| **SRV** | `_service._proto.name`: priority, weight, port, target | LDAP, SIP, Kerberos, XMPP services |
| **CAA** | which CAs may issue certificates (`issue`, `issuewild`, `iodef`) | the certificate authority in use |
| DNSKEY, RRSIG, DS, NSEC/NSEC3 | DNSSEC keys and signatures | NSEC allows zone walking; NSEC3 hashes names |

## Mail authentication records (all TXT)

| Record | Lives at | Purpose |
|---|---|---|
| **SPF** | the domain itself, `v=spf1 … -all` | lists servers allowed to send for the domain |
| **DKIM** | `selector._domainkey.domain` | public key that verifies message signatures |
| **DMARC** | `_dmarc.domain`, `v=DMARC1; p=none/quarantine/reject` | policy for SPF/DKIM failures, reporting (`rua`) |

In mail headers, read `Received:` lines **bottom-up**; `Authentication-Results` shows the SPF/DKIM/DMARC verdicts.

## Zone transfers

- **AXFR** copies a whole zone over **TCP 53** (normal lookups mostly UDP 53). If a server allows it to anyone, every host name leaks.
- Fix: allow transfers only to known secondaries, authenticated with **TSIG**. Tools that test for it: DNSRecon, dnsenum.

## AI-assisted footprinting (EC-Council framing, new in v13)

- AI assistants draft operator combinations, summarize large result sets, extract names and e-mail formats, chain OSINT tools and write the recon part of a report.
- Risks: models invent subdomains and people (**verify every fact**), collected personal data must stay inside the engagement, and scope still applies.
- Classic automation to recognize: **Maltego** (graph + transforms), **Recon-ng** (modules + workspaces), **SpiderFoot** (hundreds of OSINT modules), **theHarvester**.

## Countermeasures

| Exposure | Countermeasure |
|---|---|
| Sensitive files in search results | remove them, request de-indexing, protect with authentication |
| robots.txt listing secret paths | robots.txt is public and **not access control** |
| Document metadata | strip before publishing |
| WHOIS contacts | privacy/proxy service, role accounts |
| DNS | restrict AXFR (TSIG), split-horizon DNS, no HINFO or revealing names |
| Banners, errors, directory listing | generic errors, minimal banners, listing off |
| Staff posts, job ads | social media policy, generic job ads, awareness training |
| Unknown exposure | footprint yourself: search engines, Shodan/Censys, CT logs, breach services |

## Exam traps

- **WHOIS = TCP 43; zone transfer = TCP 53.**
- **European IP → RIPE NCC.**
- **CT logs reveal subdomains** even when zone transfers are blocked.
- **SOA** names the primary server and the admin mailbox; **SRV** reveals internal services.
- Footprinting cannot be fully stopped: limit what is useful and know what is out there.
