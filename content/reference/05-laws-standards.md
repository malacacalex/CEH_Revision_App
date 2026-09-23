---
id: ref-05
title: Laws, regulations and standards
order: 5
modules: [1]
rev: 1
verify: false
sources:
  - https://www.pcisecuritystandards.org/standards/pci-dss/
  - https://www.iso.org/standard/27001
  - https://www.govinfo.gov/app/details/PLAW-104publ191
  - https://www.hhs.gov/hipaa/for-professionals/security/index.html
  - https://www.govinfo.gov/content/pkg/PLAW-107publ204/pdf/PLAW-107publ204.pdf
  - https://www.copyright.gov/dmca/
  - https://www.cisa.gov/topics/cyber-threats-and-advisories/federal-information-security-modernization-act
  - https://eur-lex.europa.eu/eli/reg/2016/679/oj
  - https://www.legislation.gov.uk/ukpga/2018/12/contents
  - https://www.ftc.gov/business-guidance/privacy-security/gramm-leach-bliley-act
  - https://www.law.cornell.edu/uscode/text/18/1030
  - https://www.legislation.gov.uk/ukpga/1990/18/contents
  - https://eur-lex.europa.eu/eli/dir/2022/2555/oj
---
Exam questions usually describe an organization and ask which rule applies. Match the **data** (cards, health, financial reports, personal data) and the **jurisdiction**.

## Quick match

| If the scenario mentions… | Think |
|---|---|
| Credit or debit card numbers | **PCI DSS** |
| Patient health records in the US | **HIPAA** |
| Financial reporting of a US public company | **SOX** |
| Personal data of people in the EU | **GDPR** |
| Personal data in the UK | **UK GDPR + Data Protection Act 2018** |
| US federal agency systems | **FISMA** |
| US banks, insurers, lenders and customer financial data | **GLBA** |
| Bypassing copy protection, takedown notices | **DMCA** |
| Certifiable information security management system | **ISO/IEC 27001** |
| Unauthorized access to computers | **CFAA** (US), **Computer Misuse Act 1990** (UK) |

## PCI DSS

- **Who**: any organization that stores, processes or transmits payment card data.
- **By**: the PCI Security Standards Council, founded by the major card brands. PCI DSS is an industry standard, not a law.
- **Content**: 12 requirements grouped under 6 goals, including network security controls, protecting stored account data, encrypting transmission, vulnerability management, strong access control, logging and monitoring, and regular testing.
- **Current version**: 4.0.1.

## ISO/IEC 27001 and 27002

- **27001**: requirements for an information security management system (ISMS). Organizations can be **certified** against it. The current edition is 2022.
- Its Annex A lists 93 controls in 4 themes: organizational, people, physical and technological.
- **27002**: guidance on implementing those controls. It is not certifiable.

## HIPAA (US, 1996)

- **Who**: covered entities (health plans, providers, clearinghouses) and their business associates.
- **Privacy Rule**: use and disclosure of protected health information (PHI).
- **Security Rule**: administrative, physical and technical safeguards for electronic PHI (ePHI).
- **Breach Notification Rule**: notify individuals, HHS and sometimes the media.
- HITECH (2009) strengthened enforcement. The regulator is HHS (Office for Civil Rights).

## SOX: Sarbanes-Oxley Act (US, 2002)

- **Who**: US publicly traded companies.
- **§302**: the CEO and CFO personally certify financial reports.
- **§404**: management assesses internal controls over financial reporting, and auditors attest to that assessment.
- **§802**: criminal penalties for destroying or falsifying records.

## DMCA: Digital Millennium Copyright Act (US, 1998)

- **§1201**: bans circumventing technological protection measures (copy protection). It has limited exemptions, some of them for good-faith security research.
- **§512**: safe harbor for online service providers that follow notice-and-takedown.

## FISMA (US, 2002; modernized 2014)

- **Who**: federal agencies and contractors running federal systems.
- **Framework**: NIST standards. FIPS 199 categorizes systems, FIPS 200 sets minimum requirements, SP 800-53 lists the controls and SP 800-37 is the Risk Management Framework.

## GDPR (EU 2016/679, applied since 25 May 2018)

- **Scope**: personal data of people in the EU, wherever the organization is based.
- **Principles**: lawfulness, purpose limitation, data minimization, accuracy, storage limitation, integrity and confidentiality, accountability.
- **Breach notification**: tell the supervisory authority within **72 hours** where feasible (Art. 33).
- **Fines**: up to **€20 million or 4% of worldwide annual turnover**, whichever is higher (Art. 83).
- **Rights**: access, rectification, erasure, portability, objection.

## Other laws to recognize

| Law | Scope |
|---|---|
| **UK Data Protection Act 2018** | UK counterpart of the GDPR (with the UK GDPR) |
| **GLBA** (US, 1999) | Financial institutions: privacy notices, Safeguards Rule, a ban on pretexting |
| **CFAA**, 18 U.S.C. § 1030 (US) | Unauthorized access to protected computers |
| **Computer Misuse Act 1990** (UK) | Unauthorized access, and unauthorized acts that impair computers |
| **NIS2 Directive** (EU 2022/2555) | Cybersecurity duties and incident reporting for essential and important entities |

## Exam traps

- **PCI DSS is not a law**; it is enforced by contracts with the card brands and banks.
- **ISO 27001 is certifiable, 27002 is not.**
- **SOX protects investors**, not customers' personal data.
- **HIPAA = health, GLBA = finance, FISMA = federal agencies.**
