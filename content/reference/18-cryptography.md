---
id: ref-18
title: Cryptography
order: 18
modules: [20]
rev: 2
verify: true
sources:
  - https://csrc.nist.gov/pubs/fips/197/final
  - https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines/archived-crypto-projects/aes-development
  - https://csrc.nist.gov/news/2023/nist-to-withdraw-sp-800-67-rev-2
  - https://www.rfc-editor.org/rfc/rfc3058
  - https://www.rfc-editor.org/rfc/rfc2144
  - https://www.rfc-editor.org/rfc/rfc2040
  - https://www.schneier.com/academic/blowfish/
  - https://www.schneier.com/academic/twofish/
  - https://www.rfc-editor.org/rfc/rfc7465
  - https://www.rfc-editor.org/rfc/rfc8439
  - https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final
  - https://csrc.nist.gov/pubs/sp/800/131/a/r2/final
  - https://csrc.nist.gov/pubs/fips/186-5/final
  - https://csrc.nist.gov/pubs/sp/800/186/final
  - https://csrc.nist.gov/pubs/fips/180-4/upd1/final
  - https://csrc.nist.gov/pubs/fips/202/final
  - https://www.nist.gov/news-events/news/2022/12/nist-retires-sha-1-cryptographic-algorithm
  - https://csrc.nist.gov/pubs/sp/800/38/a/final
  - https://csrc.nist.gov/pubs/sp/800/38/c/upd1/final
  - https://csrc.nist.gov/pubs/sp/800/38/d/final
  - https://csrc.nist.gov/pubs/sp/800/38/e/final
  - https://www.rfc-editor.org/rfc/rfc5280
  - https://www.rfc-editor.org/rfc/rfc6960
  - https://cabforum.org/2025/04/11/ballot-sc081v3-introduce-schedule-of-reducing-validity-and-data-reuse-periods/
  - https://www.rfc-editor.org/rfc/rfc5246
  - https://www.rfc-editor.org/rfc/rfc8446
  - https://www.rfc-editor.org/rfc/rfc8996
  - https://csrc.nist.gov/pubs/sp/800/52/r2/final
  - https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/
  - https://www.veracrypt.fr/en/Encryption%20Algorithms.html
  - https://www.veracrypt.fr/en/Hidden%20Volume.html
  - https://www.rfc-editor.org/rfc/rfc8551
  - https://www.rfc-editor.org/rfc/rfc9580
  - https://cacr.uwaterloo.ca/hac/about/chap1.pdf
  - https://sweet32.info/
  - https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
  - https://csrc.nist.gov/pubs/fips/203/final
  - https://csrc.nist.gov/pubs/fips/204/final
  - https://csrc.nist.gov/pubs/fips/205/final
  - https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards
  - https://www.nist.gov/news-events/news/2025/03/nist-selects-hqc-fifth-algorithm-post-quantum-encryption
  - https://csrc.nist.gov/pubs/sp/800/208/final
  - https://csrc.nist.gov/pubs/ir/8547/ipd
  - https://www.ncsc.gov.uk/paper/quantum-networking-technologies
  - https://www.rfc-editor.org/rfc/rfc7568
  - https://nvlpubs.nist.gov/nistpubs/ir/2024/NIST.IR.8547.ipd.pdf
  - https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-131Ar2.pdf
  - https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf
  - https://www.eccouncil.org/train-certify/ec-council-certified-encryption-specialist-eces/
  - https://link.springer.com/chapter/10.1007/3-540-45661-9_9
---
Flagged **verify** because no public EC-Council page lists rubber-hose among its cryptography attacks. Sizes are in bits.

## Symmetric algorithms

| Algorithm | Type | Block | Key | Note |
|---|---|---|---|---|
| **DES** | block | 64 | 56 effective | 16 rounds; broken by brute force |
| **3DES (TDEA)** | block | 64 | 3 × 56 (≈112-bit strength) | new encryption disallowed after 2023; decrypt legacy only |
| **AES** (Rijndael) | block | **128** | 128 / 192 / 256 | 10 / 12 / 14 rounds; FIPS 197 |
| **IDEA** | block | 64 | 128 | used in early PGP |
| **CAST-128** | block | 64 | 40–128 | RFC 2144 |
| **Blowfish** | block | 64 | 32–448 | legacy (64-bit block) |
| **Twofish**, **Serpent**, **RC6** | block | 128 | 128 / 192 / 256 | AES finalists |
| **RC5** | block | 32 / 64 / 128 (variable) | variable | parameterised cipher |
| **RC4** | stream | none | variable | prohibited in TLS (RFC 7465) |
| **ChaCha20** | stream | none | 256 | with Poly1305 in TLS 1.3 |

Symmetric = one shared key; **n people need n(n−1)/2 keys**. Double DES falls to **meet-in-the-middle**, hence three passes.

## Asymmetric algorithms

| Algorithm | Hard problem | Use | Size today |
|---|---|---|---|
| **RSA** | factoring | encryption, signatures | ≥ 2048 (3072 for 128-bit strength) |
| **Diffie-Hellman** | discrete log | **key agreement** only, no authentication | ≥ 2048 |
| **ECC** (ECDH, ECDSA) | elliptic-curve discrete log | agreement, signatures | P-256, P-384, P-521 |
| **EdDSA** | Edwards curves | signatures (added in FIPS 186-5) | Ed25519, Ed448 |
| **DSA** | discrete log | signatures, **verify only** since FIPS 186-5 | legacy |

| Security bits (SP 800-57) | Symmetric | RSA / DH | ECC |
|---|---|---|---|
| 112 | 3TDEA | 2048 | 224 |
| 128 | AES-128 | 3072 | 256 |
| 192 | AES-192 | 7680 | 384 |
| 256 | AES-256 | 15360 | 512 |

**Encrypt with the recipient's public key; sign with your own private key.** Real systems are **hybrid**: public key protects a random session key.

## Hash output sizes

| Hash | Digest | Status |
|---|---|---|
| MD5 | 128 | collisions easy; not for security |
| SHA-1 | 160 | practical collision 2017; NIST retires it by end of 2030 |
| SHA-224 / 256 / 384 / 512 | 224 / 256 / 384 / 512 | current (FIPS 180-4) |
| SHA3-224 / 256 / 384 / 512 | same as SHA-2 | Keccak (FIPS 202) |
| SHAKE128 / SHAKE256 | variable (XOF) | FIPS 202 |

Properties: **preimage**, **second-preimage** and **collision** resistance. **HMAC** = keyed hash: integrity + origin, **no non-repudiation**. Collisions appear after about **2^(n/2)** tries (birthday bound).

## Modes of operation

| Mode | Idea | Watch out |
|---|---|---|
| **ECB** | each block alone | equal blocks → equal ciphertext (pattern leak) |
| **CBC** | XOR with previous ciphertext block, IV | padding oracles |
| **CFB / OFB** | turn a block cipher into a stream | IV must not repeat |
| **CTR** | encrypt a counter for a keystream | never reuse counter/nonce |
| **GCM** | CTR + authentication tag (AEAD) | nonce reuse is catastrophic |
| **CCM** | CTR + CBC-MAC (AEAD) | used in TLS 1.3, constrained devices |
| **XTS** | tweakable mode for storage (SP 800-38E) | disk encryption, no integrity |

## PKI and certificate lifecycle

| Component | Job |
|---|---|
| **CA** | issues and signs certificates with its private key |
| **RA** | verifies the requester's identity for the CA |
| **X.509 v3 certificate** | binds subject to public key; never contains the private key |
| **CRL** | signed list of revoked certificates, published periodically |
| **OCSP** | real-time status of one certificate (RFC 6960) |

Lifecycle: key pair generated → **CSR** (PKCS #10: public key + subject) → RA validation → CA issues → use → renew before **expiry** → **revoke** on compromise (CRL / OCSP). Chain: leaf → intermediate → **self-signed root** (trust anchor). The CA/B Forum (ballot SC-081) is cutting maximum TLS certificate validity from 398 days to 47 days by 2029.

## TLS 1.2 vs TLS 1.3

| | TLS 1.2 (RFC 5246) | TLS 1.3 (RFC 8446) |
|---|---|---|
| Handshake | 2 round trips | **1 round trip**, optional 0-RTT (replayable) |
| Key exchange | RSA key transport, DHE, ECDHE | **(EC)DHE or PSK only**: forward secrecy by default |
| Ciphers | CBC, GCM, legacy suites | **AEAD only**: AES-GCM, AES-CCM, ChaCha20-Poly1305 |
| Certificate | sent in clear | encrypted after ServerHello |
| Removed | — | compression, renegotiation, static RSA, custom DH groups |
| Downgrade protection | Finished message check | adds a sentinel in ServerHello.random |

SSL 3.0 (RFC 7568) and TLS 1.0 / 1.1 (RFC 8996) are deprecated. NIST SP 800-52r2: support TLS 1.2 and 1.3.

## Disk and email encryption

| Tool | Scope | Remember |
|---|---|---|
| **BitLocker** | Windows volumes | TPM-backed; XTS-AES 128 by default; `manage-bde -status`; add pre-boot PIN |
| **VeraCrypt** | cross-platform volumes, containers | AES, Serpent, Twofish, Camellia and cascades in XTS; **hidden volumes** for plausible deniability |
| **S/MIME** (RFC 8551) | email | X.509 certificates from CAs: **hierarchical trust** |
| **PGP / OpenPGP** (RFC 9580) | email, files | user-managed keys: **web of trust**; GnuPG |

Full-disk encryption protects a **powered-off or lost** device, not a running, unlocked one (cold boot, DMA).

## Cryptanalysis attack types

| Attack | What the attacker has or does | Countermeasure |
|---|---|---|
| Ciphertext-only → known-plaintext → chosen-plaintext (adaptive) | holds only ciphertext → has some pairs → can encrypt chosen inputs | modern, well-analysed cipher |
| Chosen-ciphertext | gets chosen ciphertext decrypted (padding oracle, ROBOT) | AEAD, TLS 1.3 |
| Linear / differential / integral | statistical block-cipher analysis (integral: EC-Council framing) | modern cipher design |
| Brute force | tries every key (2^n) | long keys |
| Dictionary / rainbow table | likely words / precomputed hash chains | **unique salt**, slow hashes (Argon2id, bcrypt) |
| Birthday | collisions after ~2^(n/2); Sweet32 on 64-bit blocks | longer digests, 128-bit blocks |
| Side-channel | timing, power, EM, acoustic leaks | constant-time code, blinding |
| Downgrade | forces old version or export crypto (FREAK, Logjam, DROWN, POODLE) | disable old protocols |
| Rubber-hose | coercion or bribery of a person (EC-Council framing) | split knowledge, policy |

## Post-quantum cryptography

**Shor's algorithm** would break RSA, DH and ECC; **Grover's** halves effective symmetric strength, so prefer AES-256. **Harvest now, decrypt later**: traffic recorded today is at risk once a large quantum computer exists.

| Standard (Aug 2024) | Algorithm | From | Purpose |
|---|---|---|---|
| **FIPS 203** | **ML-KEM** (512 / 768 / 1024) | CRYSTALS-Kyber | key encapsulation |
| **FIPS 204** | **ML-DSA** (44 / 65 / 87) | CRYSTALS-Dilithium | digital signatures |
| **FIPS 205** | **SLH-DSA** | SPHINCS+ | stateless hash-based signatures (backup) |

**HQC** was picked in March 2025 as a backup KEM. **SP 800-208** covers stateful hash-based signatures (LMS, XMSS). NIST draft IR 8547: deprecate 112-bit RSA/ECC after 2030, disallow quantum-vulnerable public key algorithms after 2035. **QKD** does not authenticate endpoints; the UK NCSC prefers PQC.

## Exam traps

- **AES block is always 128**; 192 and 256 are key sizes. **3DES ≈ 112-bit**, not 168.
- **Hashing is not encryption**; **HMAC gives no non-repudiation**; **DH does not encrypt or authenticate**.
- **S/MIME = CAs, PGP = web of trust.** A certificate never holds the private key.
- **Salts stop rainbow tables**, not online guessing. **A longer RSA key does not stop Shor.**
