# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in IronMind, do not open a public GitHub issue.

Report it by emailing the maintainer directly (contact info in the GitHub profile). Include:

- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any relevant logs, request/response examples, or proof-of-concept code

You will receive a response within 48 hours.

## Scope

**In scope:**
- Cloudflare Worker endpoints (authentication bypass, unauthorized Durable Object access, data leakage between athletes)
- ElevenLabs API key exposure or session hijacking
- Voice clone data exposure (an athlete's voice model accessed by another athlete)
- Any mechanism that allows cross-athlete data access

**Out of scope:**
- Issues in third-party services (Cloudflare, ElevenLabs, Anthropic) — report those to the respective vendor
- Theoretical attacks with no realistic exploitation path

## Secrets Management

All API keys are stored as Cloudflare Workers secrets — never in `wrangler.toml` or committed to the repository. The `.env` file (local development only) is in `.gitignore`.

If you find a secret committed to the repository, report it immediately.
