# Security Tools Guide for COBA

This guide covers security tooling for the COBA monorepo (Hono + tRPC backend, React + Vite frontend, better-sqlite3, Anthropic AI SDK). Use these tools for ongoing security work in CI and local development.

---

## 1. npm audit — Built-in Dependency Vulnerability Scanner

**What it does:** Checks all installed packages against the GitHub Advisory Database for known CVEs. Already available — no install required.

**Why it's relevant:** COBA has 30+ direct production dependencies. npm audit catches known vulnerabilities in `@anthropic-ai/sdk`, `hono`, `better-sqlite3`, `mammoth`, `pdfkit`, and transitive deps.

**CI integration (GitHub Actions):**
```yaml
- name: Audit backend dependencies
  run: npm audit --audit-level=moderate
  working-directory: backend

- name: Audit frontend dependencies
  run: npm audit --audit-level=moderate
  working-directory: frontend
```

Use `--audit-level=moderate` to fail CI on Medium+ vulnerabilities. Use `--audit-level=high` for a more permissive threshold while stabilising.

**Run locally:**
```bash
# From repo root
npm audit
cd backend && npm audit
cd frontend && npm audit
```

---

## 2. Socket.dev — Supply Chain Security

**What it does:** Detects malicious packages, dependency confusion attacks, typosquatting, and suspicious package behaviour (network access, shell execution, env variable reads). Goes beyond CVE databases to catch zero-day supply chain attacks.

**Why it's relevant:** COBA uses the Anthropic SDK and AWS SDK — high-value targets for supply chain attacks. Socket catches issues that `npm audit` misses (e.g., a package that silently exfiltrates `ANTHROPIC_API_KEY`).

**Install CLI:**
```bash
npm install --global @socketdotdev/cli
```

**Run:**
```bash
socket scan .
```

**GitHub App:** Install at https://socket.dev — automatically comments on PRs with supply chain risk scores.

**npm package:** `@socketdotdev/cli`
**GitHub:** https://github.com/SocketDev/socket-cli

---

## 3. Snyk — Vulnerability Scanning for Node.js

**What it does:** Scans dependencies for known CVEs (like npm audit) but also performs static analysis for code-level vulnerabilities: hardcoded secrets, insecure configurations, and IaC misconfigurations (including COBA's Terraform modules).

**Why it's relevant:** Snyk provides richer fix guidance than npm audit and can scan the `terraform/` directory for AWS misconfiguration (e.g., open S3 bucket policies, missing encryption).

**Install CLI:**
```bash
npm install --global snyk
snyk auth   # authenticate with your Snyk account (free tier available)
```

**Run dependency scan:**
```bash
snyk test --all-projects
```

**Run IaC scan (Terraform):**
```bash
snyk iac test terraform/
```

**VS Code extension:** Search "Snyk Security" in the VS Code marketplace — provides inline vulnerability highlighting.

**CI integration:**
```yaml
- name: Snyk security scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high
```

**npm package:** `snyk`
**GitHub:** https://github.com/snyk/snyk

---

## 4. OWASP ZAP — Dynamic Application Security Testing

**What it does:** Actively probes a running application for vulnerabilities: XSS, SQL injection, CSRF, insecure headers, open redirects, and more. Unlike static analysis, ZAP sends real HTTP requests to the live dev server.

**Why it's relevant:** COBA's tRPC API at `/trpc/*` accepts JSON mutations from any authenticated session. ZAP can probe these endpoints for injection and header issues. It will also catch the missing security headers (CSP, HSTS, X-Frame-Options).

**Install:** Download from https://www.zaproxy.org/download/ or use Docker:
```bash
docker pull ghcr.io/zaproxy/zaproxy:stable
```

**Run against local dev server (start `npm run dev` first):**
```bash
# Baseline scan (passive — safe for dev)
docker run --network=host ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://localhost:3000 -r zap-report.html

# Full active scan (may mutate data — use against a clean dev DB only)
docker run --network=host ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py -t http://localhost:3000 -r zap-full-report.html
```

**Focus areas for COBA:**
- `/trpc/*` endpoints — check for missing auth headers enforcement
- `/api/cv/:cvId` — check for IDOR (accessing another user's CV by guessing ID)
- Response headers — ZAP will flag missing CSP, HSTS, X-Content-Type-Options

**GitHub:** https://github.com/zaproxy/zaproxy

---

## 5. eslint-plugin-security — Static Analysis for Node.js Security Antipatterns

**What it does:** ESLint plugin that flags common Node.js security mistakes: `eval()`, unsafe `RegExp`, non-literal `require()`, object injection via bracket notation, and more.

**Why it's relevant:** The COBA backend builds SQL strings dynamically in `services/projects.ts` (the `listProjects` search/filter function). eslint-plugin-security will flag any accidental non-parameterised string interpolation.

**Install:**
```bash
# Backend
cd backend
npm install --save-dev eslint eslint-plugin-security

# Frontend (eslint already installed)
cd frontend
npm install --save-dev eslint-plugin-security
```

**Configure** — add to `backend/eslint.config.js` (create if absent):
```js
import security from 'eslint-plugin-security'

export default [
  security.configs.recommended,
  {
    rules: {
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
    }
  }
]
```

**Run:**
```bash
cd backend && npx eslint src/
cd frontend && npx eslint src/
```

**npm package:** `eslint-plugin-security`
**GitHub:** https://github.com/eslint-community/eslint-plugin-security

---

## 6. Semgrep — SAST Rules for JavaScript/TypeScript

**What it does:** Fast static analysis engine with community-maintained rule packs for JavaScript and TypeScript. Covers OWASP Top 10, secrets detection, and framework-specific patterns (React XSS, Express injection, etc.).

**Why it's relevant:** Semgrep can detect prompt injection patterns in COBA's Claude API integration, hardcoded secrets, and insecure direct object reference (IDOR) patterns in the REST/tRPC endpoints.

**Install CLI:**
```bash
# macOS/Linux
pip install semgrep
# or via Homebrew
brew install semgrep
# Windows (WSL recommended)
pip install semgrep
```

**Run with relevant rulesets:**
```bash
# OWASP Top 10 for JavaScript
semgrep --config p/owasp-top-ten src/

# JavaScript security (generic)
semgrep --config p/javascript src/

# React-specific (XSS, dangerouslySetInnerHTML, etc.)
semgrep --config p/react src/

# Secrets detection
semgrep --config p/secrets .

# Run all at once
semgrep --config p/owasp-top-ten --config p/javascript --config p/react --config p/secrets .
```

**CI integration:**
```yaml
- name: Semgrep SAST scan
  uses: semgrep/semgrep-action@v1
  with:
    config: p/owasp-top-ten p/javascript p/react p/secrets
```

**npm package:** N/A (Python-based CLI)
**GitHub:** https://github.com/semgrep/semgrep
**Registry:** https://semgrep.dev/r (rule browser)

---

## 7. MCP Servers for Security

The MCP (Model Context Protocol) ecosystem does not currently have a stable, widely-adopted dedicated "security audit" MCP server as of April 2026. However, the following approaches provide equivalent capability within Claude Code sessions:

**Available today:**
- **Claude Code built-in:** Claude Code can read the entire codebase and perform manual security review (which is how this audit was produced). This is the current best-practice approach for AI-assisted security review.
- **Semgrep MCP (experimental):** Semgrep is developing an MCP server — watch https://github.com/semgrep/semgrep for releases. When available, it will allow running Semgrep rules directly from within Claude Code sessions.
- **GitHub Security Advisories API:** Can be accessed via the `gh` CLI or GitHub MCP server to query CVEs for specific packages — useful for ad hoc package risk checks.

**Recommended workflow:** Until dedicated MCP security servers are stable, use the Security Agent (this agent) with Claude Code's native file-reading capability for manual review, combined with CLI tools (Snyk, Semgrep, npm audit) run as Bash commands within sessions.

---

## Recommended CI Pipeline Integration

Add the following to `.github/workflows/security.yml`:

```yaml
name: Security Scan
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'   # Weekly on Mondays

jobs:
  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '25'
      - run: npm ci && npm audit --audit-level=high
      - run: cd backend && npm ci && npm audit --audit-level=high
      - run: cd frontend && npm ci && npm audit --audit-level=high

  semgrep:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep
    steps:
      - uses: actions/checkout@v4
      - run: semgrep --config p/owasp-top-ten --config p/javascript --config p/react --config p/secrets --error .

  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --all-projects --severity-threshold=high
```
