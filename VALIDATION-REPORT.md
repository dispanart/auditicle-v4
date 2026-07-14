# Auditicle V4.8.0 — Actual Validation Report

**Validation date:** July 14, 2026  
**Validated source:** `/mnt/data/auditicle_v48_work`  
**Scope:** SEO growth surface, generated content, benchmark safeguards, Free-tier controls, Durable Object configuration, caching code, build, dependency audit, Wrangler package dry-run, and local Worker smoke tests.

## Implemented and inspected

- meaningful homepage content in the initial `index.html` before React mounts;
- supplied favicon/application icons and a generated 1200×630 Open Graph image;
- production canonicals and social metadata using `https://auditicle.site`;
- eight distinct high-intent clean-URL landing pages;
- Article Readiness Benchmark 2026 pre-results page, methodology, data dictionary, de-identified input template, and aggregation script;
- stable explicit sitemap `lastmod` values rather than deployment-time dates;
- automatic non-production `noindex, nofollow` and disallow-all staging robots behavior;
- Cache API reuse for PageSpeed, robots.txt, and sitemap evidence;
- `AuditicleQuotaCoordinator` Durable Object for atomic global audit, rendered-browser, combined AI, and per-provider daily budgets;
- launch settings: five audits per IP/day, one five-link batch, one AI narrative, one translation, and Auto evidence mode;
- rendered-browser budget fallback to Server HTML;
- Worker CPU and external-subrequest limits;
- SociaBuzz donation destination.

## Final validation results

| Validation | Actual result |
|---|---|
| Benchmark aggregation | Passed. With an empty validated input set, output remains `0/1000`, `resultsPublished=false`, and metrics remain withheld. |
| Automated tests | **Passed: 8 files, 41 tests.** |
| V4.8-specific tests | Passed: homepage prerender/social metadata, eight clean URLs, benchmark withholding, launch settings/DO/limits, and staging noindex source checks. |
| TypeScript | Passed through `npm run build`. |
| Static-page generation | Passed: **25 generated public pages**, stable sitemap, and `404.html`. |
| Public-page validation | Passed: homepage prerender, production canonicals, favicon/OG metadata, stable lastmod, JSON-LD/internal links, and benchmark result withholding. |
| Secret pattern scan | Passed: no obvious credential patterns found in scanned source files. |
| Production Vite build | Passed: 34 modules transformed. |
| Built frontend | HTML 10.50 kB (3.52 kB gzip); CSS 78.86 kB (17.17 kB gzip); JS 330.90 kB (101.05 kB gzip). |
| Dependency audit | `npm audit --audit-level=low`: **0 vulnerabilities**. |
| Wrangler dry-run | Passed with exit code 0. Read 70 assets and recognized ASSETS, BROWSER, QUOTA_COORDINATOR, migration/config variables, CPU limit, and subrequest limit. |
| Local health | HTTP 200; version `4.8.0`; architecture `single-worker`; rendered-browser flag true. |
| Local public config | HTTP 200; expected launch limits/cache TTLs returned; no provider secrets exposed. |
| Staging landing page | HTTP 200 with `X-Robots-Tag: noindex, nofollow`. |
| Staging robots | Returned `User-agent: *` and `Disallow: /`. |
| Production-host robots simulation | Returned public crawl rules and blocked `/api/`; no staging disallow-all response. |
| Local session with Turnstile disabled only for smoke testing | HTTP 200; personal quota 0/5 and shared global quota 0/100 returned through the Durable Object. |
| Supplied icon dimensions | Confirmed 16×16, 32×32, 180×180, 192×192, and 512×512. |
| Open Graph image | Confirmed 1200×630 RGB and visually inspected locally. |
| Release ZIP integrity | `unzip -t` passed with no compressed-data errors. |
| Clean extraction install | `npm ci --ignore-scripts` installed 212 packages and reported 0 vulnerabilities. |
| Clean extraction tests/build | Passed again: 8 files/41 tests, static validation, TypeScript, and production build. |
| Clean extraction Wrangler dry-run | Passed separately with exit code 0 and 70 assets/bindings recognized. |

One V4.8 test initially used a stale literal source-string assertion while the implemented protection used an equivalent `requestHost` variable. The assertion was corrected to test the actual implementation, and the complete suite was rerun successfully at 41/41. No runtime source defect was hidden by this change.

## Not performed or not claimed

The following require the user's production accounts, DNS, traffic, or real research records and were not performed in this environment:

- deployment to the user's Cloudflare account;
- live Durable Object migration on that account;
- live Browser Rendering allowance/429 behavior;
- real Turnstile verification on `auditicle.site`;
- live PageSpeed, Gemini, Groq, or OpenRouter requests;
- Google Search Console property verification, sitemap submission, URL Inspection, or indexing requests;
- production Core Web Vitals field-data collection;
- production DNS, `www` redirect, Email Routing, Web Analytics, AdSense, or seller-line validation;
- auditing 1,000 public articles or publishing benchmark findings.

The benchmark feature is an honest collection and aggregation framework. It currently contains no research observations and does not claim percentages, medians, platform comparisons, or conclusions.
