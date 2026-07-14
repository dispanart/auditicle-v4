# Auditicle SEO Forensics V4.8.0

Auditicle is an article-first evidence lab for public URLs. It separates deterministic evidence, findings, coverage, and scores from optional AI explanation and translation.

## Audit dimensions

- Technical SEO
- GEO readiness
- AEO readiness
- RAG retrieval readiness
- LLMO / AI citation readiness

## Architecture

```text
auditicle.site
└── one Cloudflare Worker
    ├── prerendered React + Vite homepage
    ├── Worker Static Assets and public content pages
    ├── /api/* evidence backend
    ├── Browser Rendering binding: BROWSER
    ├── Durable Object binding: QUOTA_COORDINATOR
    ├── Cache API for PageSpeed, robots.txt, and sitemap evidence
    └── server-side PageSpeed and AI integrations
```

There is no separate Cloudflare Pages project, Vercel deployment, or standalone API service.

## V4.8 SEO growth foundation

- meaningful homepage content is present in the initial HTML before React loads;
- supplied favicon and application icons are used across the app and static pages;
- a 1200×630 Open Graph image is included;
- all public canonicals use `https://auditicle.site`;
- non-production hosts receive `X-Robots-Tag: noindex, nofollow` and a disallow-all `robots.txt` response;
- sitemap `lastmod` dates are explicit and change only with material content changes;
- eight distinct clean-URL landing pages cover high-intent article audit use cases;
- the Article Readiness Benchmark 2026 protocol, data dictionary, collection template, and aggregation workflow are included without fabricated results.

## Launch profile for Cloudflare Free

```text
TURNSTILE_REQUIRED=true
DAILY_AUDIT_LIMIT=5
GLOBAL_DAILY_AUDIT_LIMIT=100
MAX_LINKS=5
LINK_BATCH_SIZE=5
MAX_LINK_BATCHES=1
AI_REPORTS_PER_SESSION=1
TRANSLATIONS_PER_SESSION=1
RENDERED_BROWSER_DAILY_LIMIT=20
AI_DAILY_REQUEST_LIMIT=30
Evidence mode default=Auto
```

The Durable Object stores only UTC-day aggregate counters. It never stores URLs, report content, raw HTML, IP addresses, or API keys.

## Evidence caching

- PageSpeed: 12 hours by default; configurable from 6–24 hours.
- robots.txt: 1 hour by default.
- sitemap evidence: 6 hours by default.

Cached evidence includes a collection timestamp and cache status. Path-specific robots access is recalculated from the cached rules for each target URL.

## Safety controls

- robots.txt preflight for `AuditicleBot` and `*` with Allow, Disallow, wildcard, end anchor, and longest-match behavior;
- server HTML, Auto, and Rendered Browser modes with server fallback;
- specific 401, 403, 404, 410, 429, 5xx, non-HTML, timeout, oversized HTML, and bot-challenge errors;
- SSRF protection, public DNS validation, private-network blocking, redirect validation, same-origin API protection, and server-only secrets;
- 1 MB HTML limit and 10,000 sitemap URL parse limit;
- final, provisional, and withheld scores based on evidence coverage;
- TXT, JSON, and Print/PDF exports; raw HTML is excluded from JSON;
- failed collection before trustworthy primary HTML does not consume an audit unit;
- Worker CPU limit of 10 ms and external subrequest limit of 50 for the Free launch profile.

## AI behavior

```text
Report:
Gemini 3.1 Flash-Lite
→ Groq GPT-OSS 120B
→ OpenRouter Free
→ Auditicle deterministic narrative

Translation:
Groq GPT-OSS 20B
→ Gemini 3.1 Flash-Lite
→ OpenRouter Free
```

Missing keys are skipped. AI cannot alter deterministic scores, finding IDs, URLs, measurements, priorities, or severity. Incomplete or mixed-language translation is rejected and the next configured provider is attempted.

## Public growth pages

```text
/free-article-seo-audit-tool
/article-seo-checker
/technical-seo-article-audit
/geo-readiness-audit
/aeo-readiness-checker
/rag-retrieval-readiness
/ai-citation-readiness-checker
/rendered-html-seo-audit
/article-readiness-benchmark-2026
```

Each focused landing page has unique metadata, content, examples, limitations, FAQs, screenshot evidence, and a direct CTA to `/#audit-form`.

## Benchmark workflow

Place de-identified JSON records in `benchmark/input/`, then run:

```bash
npm run benchmark:aggregate
```

The aggregation script validates safe fields and writes aggregate JSON/CSV under `public/data/`. Do not place URLs, hostnames, raw HTML, article text, IP addresses, or personal data in benchmark input.

## Validation

```bash
npm ci
npm test
npm run build
npm run dry-run
npm audit --audit-level=low
```

`npm run build` regenerates public pages, scans for obvious credential patterns, validates metadata/canonicals/JSON-LD/internal links/stable sitemap dates, runs TypeScript, and builds Vite.

See `SETUP-FROM-ZERO-TO-LIVE-ID.md` for deployment. Never commit `.dev.vars`, API keys, tokens, or screenshots containing credentials.
