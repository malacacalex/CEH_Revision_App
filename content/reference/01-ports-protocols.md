---
id: ref-01
title: Ports and protocols
order: 1
modules: [0, 3, 4, 8, 13]
rev: 1
verify: false
sources:
  - https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml
  - https://www.rfc-editor.org/rfc/rfc6335
  - https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/service-overview-and-network-port-requirements
---
Default ports from the IANA registry. A service can run on any port; these are the defaults the exam expects.

## Port ranges

| Range | Name | Use |
|---|---|---|
| 0–1023 | Well-known (system) | Standard server services |
| 1024–49151 | Registered (user) | Vendor applications |
| 49152–65535 | Dynamic / private | Client side of connections |

## Remote access and file transfer

| Port | Proto | Service | Note |
|---|---|---|---|
| 20 / 21 | TCP | FTP data / control | Cleartext credentials |
| 22 | TCP | SSH, SFTP, SCP | Encrypted |
| 23 | TCP | Telnet | Cleartext; replace with SSH |
| 69 | UDP | TFTP | No authentication |
| 873 | TCP | rsync | |
| 2049 | TCP/UDP | NFS | Check exports with `showmount -e` |
| 3389 | TCP | RDP | |
| 5900 | TCP | VNC | |
| 5985 / 5986 | TCP | WinRM HTTP / HTTPS | |

## Mail

| Port | Proto | Service | Note |
|---|---|---|---|
| 25 | TCP | SMTP (server to server) | VRFY / EXPN leak users (M4) |
| 110 / 995 | TCP | POP3 / POP3S | |
| 143 / 993 | TCP | IMAP / IMAPS | |
| 465 | TCP | SMTP submission over implicit TLS | |
| 587 | TCP | SMTP submission (STARTTLS) | |

## Name, address and time services

| Port | Proto | Service | Note |
|---|---|---|---|
| 53 | UDP + TCP | DNS | TCP for zone transfers (AXFR) and large answers |
| 67 / 68 | UDP | DHCP server / client | |
| 123 | UDP | NTP | `monlist` abuse enabled amplification (M10) |
| 137 | UDP | NetBIOS name service | |
| 138 | UDP | NetBIOS datagram | |
| 139 | TCP | NetBIOS session (SMB over NetBIOS) | |
| 161 / 162 | UDP | SNMP agent / traps | v1/v2c community strings are cleartext |
| 389 / 636 | TCP | LDAP / LDAPS | 3268 / 3269: Global Catalog |
| 88 | TCP/UDP | Kerberos | 464: password change |
| 514 | UDP | Syslog | |

## Windows and Active Directory

| Port | Proto | Service |
|---|---|---|
| 135 | TCP | MS-RPC endpoint mapper |
| 445 | TCP | SMB directly over TCP |
| 88, 389, 636, 3268 | TCP | Domain controller services |
| 5985 / 5986 | TCP | PowerShell remoting (WinRM) |

## Web and databases

| Port | Proto | Service |
|---|---|---|
| 80 / 443 | TCP | HTTP / HTTPS (443 over UDP for HTTP/3) |
| 8080 / 8443 | TCP | Common alternate HTTP / HTTPS |
| 1433 | TCP | Microsoft SQL Server |
| 1521 | TCP | Oracle listener |
| 3306 | TCP | MySQL / MariaDB |
| 5432 | TCP | PostgreSQL |
| 6379 | TCP | Redis |
| 27017 | TCP | MongoDB |

## VPN, AAA and infrastructure

| Port | Proto | Service |
|---|---|---|
| 49 | TCP | TACACS+ |
| 500 / 4500 | UDP | IKE / IPsec NAT traversal |
| 1194 | UDP | OpenVPN |
| 1723 | TCP | PPTP (obsolete) |
| 1812 / 1813 | UDP | RADIUS authentication / accounting |
| 179 | TCP | BGP |
| 502 | TCP | Modbus/TCP (OT, M18) |
| 1883 / 8883 | TCP | MQTT / MQTT over TLS (IoT, M18) |

## Exam traps

- **DNS = UDP *and* TCP 53.**
- **SNMP and TFTP are UDP.** A TCP-only scan misses them.
- **SMB: 445 direct, 139 over NetBIOS.**
- **Encrypted twins:** HTTP 80 → 443, LDAP 389 → 636, IMAP 143 → 993, POP3 110 → 995.
