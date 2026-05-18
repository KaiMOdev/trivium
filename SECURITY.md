# Security Policy

## Reporting a vulnerability

Please **do not** open public GitHub issues for security vulnerabilities.

Instead:

1. Use GitHub Security Advisories: https://github.com/KaiMOdev/trivium/security/advisories/new
2. Or email the maintainer privately (contact via GitHub profile).

Include:
- A description of the issue and its impact.
- Steps to reproduce.
- Affected version / commit.
- Suggested fix, if you have one.

Expect an acknowledgement within 7 days and a status update within 30 days. Coordinated disclosure preferred — please give us a reasonable window to ship a fix before public disclosure.

## In scope

- Server-side issues in the API (SSRF, injection, auth bypass once auth is added, etc.).
- Client-side issues that can be triggered by audited site content (XSS via parsed HTML, prompt-injection into the AI calls, etc.).
- Cryptographic weakness in token encryption.

## Out of scope

- Vulnerabilities in third-party SaaS providers (Anthropic, Google, etc.).
- Issues that require attacker-controlled environment variables.
- Theoretical issues without a working PoC.
