---
id: ref-17
title: Cloud security
order: 17
modules: [19]
rev: 1
verify: true
sources:
  - https://csrc.nist.gov/pubs/sp/800/145/final
  - https://www.nist.gov/publications/nist-cloud-computing-reference-architecture
  - https://aws.amazon.com/compliance/shared-responsibility-model/
  - https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility
  - https://cloud.google.com/architecture/framework/security/shared-responsibility-shared-fate
  - https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
  - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
  - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-v2-how-it-works.html
  - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html
  - https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service
  - https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview
  - https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview
  - https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-prevent
  - https://cloud.google.com/storage/docs/public-access-prevention
  - https://cloud.google.com/compute/docs/metadata/querying-metadata
  - https://cloud.google.com/iam/docs/best-practices-service-accounts
  - https://cloud.google.com/logging/docs/audit
  - https://csrc.nist.gov/pubs/sp/800/190/final
  - https://kubernetes.io/docs/reference/networking/ports-and-protocols/
  - https://kubernetes.io/docs/concepts/security/pod-security-standards/
  - https://kubernetes.io/docs/concepts/configuration/secret/
  - https://docs.docker.com/engine/security/protect-access/
  - https://owasp.org/www-project-serverless-top-10/
  - https://docs.aws.amazon.com/lambda/latest/dg/welcome.html
  - https://csrc.nist.gov/glossary/term/cloud_access_security_broker
  - https://learn.microsoft.com/en-us/azure/defender-for-cloud/concept-cloud-security-posture-management
  - https://cloudsecurityalliance.org/artifacts/top-threats-to-cloud-computing-2024
  - https://cloudsecurityalliance.org/research/cloud-controls-matrix
  - https://attack.mitre.org/matrices/enterprise/cloud/
---
Flagged **verify** because the attack names in the threats table and the CWPP label follow EC-Council or industry usage rather than a standard. Everything else comes from NIST and the providers' own documentation.

## NIST model (SP 800-145)

- **5 characteristics**: on-demand self-service, broad network access, resource pooling (multi-tenant), rapid elasticity, measured service.
- **3 service models**: IaaS, PaaS, SaaS. FaaS / serverless is an extra model in common use.
- **4 deployment models**:

| Model | Who uses it | Remember |
|---|---|---|
| **Public** | anyone, on the provider's premises | multi-tenant |
| **Private** | one organization | on or off premises |
| **Community** | several organizations with shared concerns | shared compliance needs |
| **Hybrid** | two or more distinct clouds bound together | "cloud bursting" at peak |
| Multi-cloud | several public providers side by side | not a NIST model (EC-Council framing) |

NIST SP 500-292 actors: **consumer**, **provider**, **auditor** (independent assessment), **broker** (intermediation, aggregation, arbitrage), **carrier** (connectivity).

## Shared responsibility per model

| Layer | On-prem | IaaS | PaaS | SaaS |
|---|---|---|---|---|
| Data, identities, access, endpoints | you | **you** | **you** | **you** |
| Application | you | you | you | provider |
| Runtime, middleware | you | you | provider | provider |
| Guest OS | you | **you** | provider | provider |
| Hypervisor, hardware, network | you | provider | provider | provider |
| Facilities | you | provider | provider | provider |

- AWS: **security *of* the cloud** (provider) vs **security *in* the cloud** (customer).
- Google adds **shared fate** (secure defaults, blueprints).
- Serverless: provider runs servers, OS, runtime, scaling; you own code, dependencies, function permissions, input validation.

## Provider attack surfaces (recognition level)

| Surface | AWS | Azure | Google Cloud |
|---|---|---|---|
| Identity | IAM users, roles; keys `AKIA` (long-term), `ASIA` (temporary STS) | Microsoft Entra ID, service principals, **managed identities** | service accounts; org → folders → projects |
| Storage exposure | S3 bucket policy/ACL; **Block Public Access** (4 settings) | anonymous blob access (`allowBlobPublicAccess`), **SAS** tokens, account keys | `allUsers` / `allAuthenticatedUsers`; **public access prevention** |
| Metadata service | 169.254.169.254; **IMDSv2** needs a session token (PUT, hop limit 1) | 169.254.169.254, header `Metadata: true` | `metadata.google.internal`, header `Metadata-Flavor: Google` |
| Keys and secrets | access keys in code; no root keys; Secrets Manager, KMS | account keys, long SAS; Key Vault | service account keys: avoid, use Workload Identity Federation |
| Audit logging | CloudTrail (Event history 90 days) | Activity log, Entra sign-in logs | Cloud Audit Logs (**Data Access off by default**) |
| Guardrails | SCPs (limit, never grant), permissions boundaries | Azure Policy, PIM, Conditional Access | Organization Policy, VPC Service Controls |

Main metadata threat: **SSRF** makes an app fetch the VM role's credentials (ATT&CK T1552.005). Requiring IMDSv2 or the metadata header blocks simple SSRF.

## Common cloud threats

| Threat | ATT&CK | Countermeasure |
|---|---|---|
| Misconfigured public storage | T1530 | account-level public-access blocks, CSPM |
| Stolen or leaked cloud credentials | T1078.004 | MFA, roles instead of long-term keys, rotation |
| Cryptojacking, often in unused regions | T1496, T1535 | billing alerts, region guardrails |
| Disabling cloud logs | T1562.008 | logs in a separate account, deny via guardrail |
| Snapshot shared to attacker's account | T1537 | alert on sharing events |

EC-Council names (EC-Council framing): **cloud hopping** (via a managed service provider), **Cloudborne** (BMC firmware implant surviving bare-metal reuse), **man-in-the-cloud** (stolen sync token), **wrapping attack** (XML signature wrapping in SOAP), cross-VM side channels.

CSA Top Threats 2024 is led by **misconfiguration and inadequate change control**, then **IAM**, then **insecure interfaces and APIs**.

## Containers, Kubernetes and serverless

| Area | Risk | Control |
|---|---|---|
| Image | known CVEs, secrets baked in | scan in CI (Trivy, Clair), sign images, trusted registry |
| Docker daemon | API on **2375** (plain) = root on host | TLS with client certs on **2376**, or no remote API |
| Container runtime | `--privileged`, running as root, escape (T1611) | non-root, drop capabilities, seccomp/AppArmor, gVisor/Kata |
| K8s API server | **6443** exposed with weak auth | RBAC least privilege, private endpoint |
| etcd | **2379–2380**; holds all state incl. Secrets | TLS, restricted access, encryption at rest |
| kubelet | **10250** with anonymous auth | `--anonymous-auth=false`, kube-bench (CIS) |
| Secrets | base64 and **unencrypted in etcd by default** | encryption at rest, external vault |
| Pod network | all pods talk until a NetworkPolicy selects them | default-deny NetworkPolicies |
| Pod settings | privileged pods | **Pod Security Standards**: Privileged, Baseline, Restricted |
| Serverless | event-data injection, over-privileged function roles, vulnerable dependencies, secrets in env vars | input validation, one least-privilege role per function, dependency scanning |

NIST SP 800-190 risk areas: **image, registry, orchestrator, container, host OS**. Containers share the host kernel; VMs do not.

## Cloud security tool categories

| Category | What it protects | Examples |
|---|---|---|
| **CASB** | users' access to cloud apps: visibility, DLP, shadow IT; sits between users and providers | CASB products |
| **CSPM** | configuration posture across accounts | Defender CSPM, Security Hub, Security Command Center, Prowler |
| **CWPP** | running workloads: VMs, containers, functions (industry term) | Defender for Cloud workload plans, Falco |
| IaC scanning | templates before deployment | Checkov, Trivy |
| Audit / assessment | read-only reports | ScoutSuite, Prowler, kube-bench, Docker Bench |

Frameworks: **CSA CCM** (197 control objectives, 17 domains), **CSA STAR** (level 1 self-assessment, level 2 third-party), CIS Benchmarks, **MITRE ATT&CK Cloud matrix**.

## Exam traps

- **Guest OS patching in IaaS is the customer's job.** Data and identities are always the customer's.
- **Community ≠ hybrid**: one shared infrastructure vs several bound together.
- **CSPM = misconfigurations; CASB = user access to cloud apps; CWPP = workloads.**
- **SCPs never grant permissions.** `allAuthenticatedUsers` = every Google account in the world.
- **Base64 is not encryption.** A password reset does not revoke stolen tokens.
