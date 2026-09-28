---
id: ref-13
title: Web servers, web apps, APIs and LLM apps
order: 13
modules: [13, 14]
rev: 2
verify: true
sources:
  - https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-44ver2.pdf
  - https://attack.mitre.org/techniques/T1190/
  - https://attack.mitre.org/techniques/T1505/003/
  - https://community.owasp.org/attacks/Path_Traversal
  - https://community.owasp.org/attacks/HTTP_Response_Splitting
  - https://community.owasp.org/attacks/Cache_Poisoning
  - https://cwe.mitre.org/data/definitions/444.html
  - https://www.cisa.gov/news-events/directives/ed-19-01-mitigate-dns-infrastructure-tampering-closed
  - https://top10.owasp.org/2025/
  - https://top10.owasp.org/2025/0x00_2025-Introduction/
  - https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/
  - https://api-security.owasp.org/editions/2023/en/0x11-t10/
  - https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
  - https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md
  - https://docs.stripe.com/webhooks/signature
  - https://docs.stripe.com/webhooks
  - https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks
  - https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html
  - https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html
  - https://genai.owasp.org/llm-top-10/
  - https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html
  - https://www.eccouncil.org/wp-content/uploads/2023/03/Hacking-Webservers.pdf
  - https://www.eccouncil.org/train-certify/certified-ethical-hacker-ceh/
  - https://csrc.nist.gov/pubs/sp/800/52/r2/final
  - https://www.rfc-editor.org/rfc/rfc6797
---
Recognition and the key control for each web risk in modules 13 and 14. Flagged **verify** because the CEH v13 page lists directory brute forcing but not mirroring or session hijacking, so the v13 web server methodology may differ from EC-Council's 2023 order below.

SQL injection: see the Self-study tab.

## Web server attacks (recognition)

| Attack | The clue | Control |
|---|---|---|
| **Directory traversal** (CWE-22) | `../` or its encoded form in a URL; a system file comes back | patch, canonicalize paths, deny access outside served folders |
| **HTTP response splitting** (CWE-113) | encoded CR/LF in a parameter; an extra header appears | strip CR/LF from anything placed in headers |
| **Web cache poisoning** | a shared cache or CDN serves one bad response to everyone | key the cache on every input used; ignore unkeyed headers |
| **HTTP request smuggling** (CWE-444) | front end and back end disagree on where a request ends | same parsing on both tiers; reject ambiguous requests |
| **DNS server hijacking** | users land on a fake site; the real server is untouched | MFA on registrar and DNS accounts, record audits (CISA ED 19-01) |
| **Defacement** | visible content changed on the real server | file integrity monitoring, restore from known-good copy |
| **Web shell** (T1505.003) | new script in the web root; the web server process starts shells | least privilege, no write or execute in web folders, FIM |
| **Misconfiguration leaks** | directory listing, backups in the web root, stack traces | disable listing, move backups, generic errors |
| **DoS** | floods; Slowloris holds connections with slow headers | timeouts, per-IP limits, CDN / DDoS protection |

- **T1190** Exploit Public-Facing Application is how they get in; **T1505.003** Web Shell is how they stay. Methodology (EC-Council framing, 2023 infographic): information gathering → footprinting / banner grabbing → mirroring → vulnerability scanning → session hijacking → password attacks; the CEH v13 topics also name directory brute forcing.
- Hardening (NIST SP 800-44): DMZ, single-purpose host, remove samples and unused modules, hide banners (obscurity only), patch. Transport: TLS 1.2+ (SP 800-52r2), HSTS (RFC 6797).

## OWASP Top 10:2025

| # | Risk | Recognize | Key control |
|---|---|---|---|
| A01 | Broken Access Control (now includes **SSRF**) | 200 OK for another user's object or an admin URL | deny by default, server-side checks on every request |
| A02 | Security Misconfiguration | default accounts, listings, verbose errors, missing headers | repeatable hardening baseline |
| A03 | Software Supply Chain Failures | outdated or tampered dependencies, weak build pipeline | SBOM, SCA, signed artifacts |
| A04 | Cryptographic Failures | cleartext transport, weak hashes, poor key handling | TLS + HSTS, Argon2id / bcrypt for passwords |
| A05 | Injection (includes XSS) | input interpreted as code or commands | parameterized APIs, contextual output encoding |
| A06 | Insecure Design | the flaw is in the plan (no limit, no step check) | threat modeling, abuse cases |
| A07 | Authentication Failures | credential stuffing allowed, no lockout | MFA, throttling, breached-password checks |
| A08 | Software or Data Integrity Failures | unsigned updates, scripts without SRI, untrusted deserialization | signatures, SRI |
| A09 | Security Logging and Alerting Failures | breach found by a customer, not by you | log and alert on auth and access failures |
| A10 | Mishandling of Exceptional Conditions (new) | a failure that grants access (fail open) | fail closed, generic errors |

2021 → 2025: SSRF (A10:2021) merged into A01; Vulnerable and Outdated Components widened into A03; A10 is new. The CEH v13 course page still quotes the 2021 list.

## Classic web flaws: clue and key control

| Flaw | Clue | Key control |
|---|---|---|
| **XSS** (CWE-79): reflected, stored, DOM | input echoed unencoded; DOM: client script writes the URL into the page | contextual output encoding; CSP and `HttpOnly` as depth |
| **CSRF** (CWE-352) | state change with the victim's cookie from a foreign origin | synchronizer token; `SameSite` cookies; Origin check |
| **SSRF** (CWE-918) | URL parameter; app server calls internal or metadata addresses | allowlist destinations, block redirects, segment |
| **XXE** (CWE-611) | XML body declaring an external entity | disable DTDs and external entities in the parser |
| **OS command injection** (CWE-78) | shell metacharacters in input; web process spawns shells | call APIs, not a shell; allowlist input |
| **IDOR** (CWE-639) | changing an ID returns someone else's record | per-object ownership check on the server |

## OWASP API Security Top 10 (2023)

| # | Risk | Recognize |
|---|---|---|
| API1 | Broken Object Level Authorization (**BOLA**) | changing an object ID returns another user's data |
| API2 | Broken Authentication | weak token checks, unsigned JWT, no brute-force limit |
| API3 | Broken Object Property Level Authorization | extra fields returned, or `isAdmin` accepted (mass assignment) |
| API4 | Unrestricted Resource Consumption | no rate limit, no 429, huge page sizes |
| API5 | Broken Function Level Authorization (**BFLA**) | normal user reaches admin functions |
| API6 | Unrestricted Access to Sensitive Business Flows | bots buying all stock, mass sign-ups |
| API7 | Server-Side Request Forgery | URL field reaches internal hosts |
| API8 | Security Misconfiguration | permissive CORS, verbose errors, extra verbs |
| API9 | Improper Inventory Management | old `/v1` or staging hosts still live |
| API10 | Unsafe Consumption of APIs | third-party API data trusted blindly |

## Webhook risks

| Risk | Control |
|---|---|
| Forged delivery | HMAC-SHA256 of the raw body with a shared secret (GitHub `X-Hub-Signature-256`), constant-time compare |
| Replay | signed timestamp with a tolerance (Stripe default 5 min); store delivery IDs |
| SSRF on the provider | users register internal URLs: allowlist, block private ranges |
| Secret exposure | HTTPS only, secret kept server-side, rotate it |
| Slow receiver | answer 2xx fast, process later (GitHub expects a reply within 10 s) |

## OWASP Top 10 for LLM Applications (2025)

| # | Risk | Key control |
|---|---|---|
| LLM01 | Prompt Injection | treat all input as untrusted, separate instructions from data, least privilege |
| LLM02 | Sensitive Information Disclosure | data minimization, output filtering |
| LLM03 | Supply Chain | vet models, datasets and plugins |
| LLM04 | Data and Model Poisoning | trusted data sources, provenance checks |
| LLM05 | Improper Output Handling | encode model output (HTML output = XSS risk) |
| LLM06 | Excessive Agency | minimal tools and permissions, human approval for risky actions |
| LLM07 | System Prompt Leakage | no secrets in the system prompt |
| LLM08 | Vector and Embedding Weaknesses | access control on the vector store (RAG) |
| LLM09 | Misinformation | grounding, human review |
| LLM10 | Unbounded Consumption | rate limits, quotas, input size limits |

## Exam traps

- **SSRF is inside A01 in the 2025 web list but still API7** in the API list.
- **`HttpOnly` limits XSS cookie theft; it does not fix XSS.** `SameSite` is CSRF defense in depth, not a replacement for tokens.
- **XSS runs in the browser and can read the page; CSRF only sends a request.** A WAF buys time; it does not remove the flaw.
- **DNS hijacking changes where users go; defacement changes what the real server shows.**
- **Response splitting is the injection; cache poisoning is the spread** through a shared cache.
- **401 or 403 on a changed ID is correct; 200 is BOLA / IDOR.** BOLA = wrong object; BFLA = wrong function. API3 merges 2019's excessive data exposure and mass assignment.
- **A webhook is push** (provider POSTs to your URL); HTTPS alone does not authenticate the sender, the HMAC does.
