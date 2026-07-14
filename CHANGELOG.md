# Auditicle changelog

## 4.8.0 — July 14, 2026

### Search-ready public surface

- Added meaningful prerendered homepage content to the initial HTML while retaining the React audit application.
- Added the supplied favicon/application icon set and a branded 1200×630 Open Graph image.
- Standardized public canonical, Open Graph, and Twitter URLs on `https://auditicle.site`.
- Added eight distinct, clean-URL high-intent landing pages with specific evidence examples, report screenshots, worked findings, unique use cases, limitations, FAQs, and direct audit CTAs.
- Added stable sitemap `lastmod` values that change only when the corresponding content is materially updated.
- Added automatic `noindex, nofollow` protection and disallow-all robots behavior on non-production hosts.

### Article Readiness Benchmark 2026

- Added the pre-results benchmark page, methodology, data dictionary, de-identified collection template, platform summary output, and aggregation script.
- The public benchmark intentionally reports a sample size of zero and withholds all findings until real records are collected; no statistics are fabricated.

### Free-tier protection and caching

- Added Cache API reuse for PageSpeed, robots.txt, and sitemap evidence.
- Added a Durable Object coordinator for atomic global audit, rendered-browser, total AI, and per-provider daily budgets.
- Applied the launch profile: five audits per IP/day, one link batch of five links, one consultant narrative, one translation, and Auto evidence mode.
- Added daily rendered-browser and provider request caps, with server-HTML fallback when browser allowance is unavailable.
- Added explicit Worker CPU and external-subrequest limits in Wrangler configuration.
- Updated the public donation destination to `https://sociabuzz.com/dispa/donate`.

### Validation coverage

- Added tests for homepage prerendering, social metadata, clean landing URLs, benchmark result withholding, launch limits, Durable Object configuration, and staging noindex behavior.

## 4.7.1 — July 14, 2026

### Complete report translation

- Expanded translation coverage to every visible report string: navigation, static labels, evidence, findings, owners, limitations, rendering reasons, PageSpeed errors and opportunities, checked-link errors, article intelligence, consultant narrative, and disclaimer.
- Added strict recursive translation validation. Missing or unchanged English content causes that provider response to be rejected instead of producing a mixed-language report.
- Added provider fallback per translation chunk for large reports, followed by final merged-output validation.
- Preserved deterministic scores, finding IDs, priorities, URLs, model names, measurements, and other source-controlled values even when provider output attempts to change them.
- Removed provider-added prefixes such as “Translation:” and “Terjemahan:”.

### Audit results navigation

- Added active-section tracking across the complete audit case file.
- Added a persistent desktop result rail with numbered sections and progress indication.
- Added horizontally scrollable result tabs for tablet layouts.
- Added a compact mobile section selector with previous and next controls.
- Removed the AI narrative destination until a narrative actually exists.
- Added responsive scroll offsets so section headings are not hidden behind sticky navigation.

### Responsive result presentation

- Improved case header, score ring, toolbars, score summaries, evidence cards, and two-column layouts across mobile, tablet, and desktop.
- Converted primary findings and link evidence tables into readable stacked evidence cards on narrow mobile screens.
- Added safer long-URL and evidence wrapping.
- Prevented report, toolbar, action-plan, table, and support-widget overflow at mobile, tablet, and desktop widths.
- Changed findings and link tables into labeled evidence cards on narrow screens while preserving normal tables on desktop.
- Moved the support/donation dock into normal document flow on smaller screens so it cannot cover report content.

### Hero scanner

- Replaced the static forensic board with an animated evidence scanner.
- Added rotating readiness text, radar sweep, evidence blips, scanner nodes, and reduced-motion support.
- Added complete light-mode and responsive styling for the scanner.

## 4.7.0 — July 14, 2026

### Public information architecture

- Removed all Pricing references and navigation.
- Added AI Transparency, Data Sources, Crawler Information, and System Information pages.
- Reconstructed Features, Use Cases, Methodology, Docs, Privacy, Terms, Disclaimer, About, Contact, Accessibility, FAQ, and Changelog.
- Added unique title, description, canonical, Open Graph, Twitter metadata, JSON-LD, breadcrumb data, internal links, and responsive navigation to generated pages.
- Added sitemap entries for all public pages.
- Added a noindex 404 page and changed Static Assets from SPA fallback to `404-page` handling.

### Theme and interface

- Added complete System, Dark, and Light modes.
- Migrated the old theme storage key to `auditicle-theme-mode`.
- Applied the resolved theme before body rendering to reduce flash.
- Added a mobile homepage navigation menu and consistent theme controls.
- Expanded Trust Center links in the homepage footer and static navigation.

### Evidence and crawler behavior

- Updated crawler identity to `AuditicleBot/4.7 (+https://auditicle.site/crawler-information.html)`.
- Refined bot-challenge detection so ordinary pages containing CAPTCHA markup are not automatically rejected.
- Preserved robots preflight on primary fetches and added robots preflight before link-destination checks.
- Added redirect-origin robots checks for rendered main-frame navigation.

### AI and translation

- Missing provider keys are skipped rather than counted as provider failures.
- The first configured and successful provider is no longer mislabeled as fallback.
- Added deterministic consultant narrative fallback when all report providers are absent or fail.
- Deterministic fallback uses existing five scorecards and finding IDs without adding measurements or changing scores.
- Translation remains provider-backed and has no deterministic fallback.

### Security and abuse controls

- Standardized the public contact variable as `PUBLIC_CONTACT_EMAIL`, with legacy `CONTACT_EMAIL` read-only compatibility.
- Required a completed primary audit before link checking, narrative generation, or translation.
- Added per-session limits for link batches, consultant narratives, and translations.
- Extended CSP for optional Cloudflare Web Analytics while retaining same-origin and Turnstile restrictions.
- Kept API keys server-side and public config limited to non-secret deployment information.

### Validation and documentation

- Added deterministic fallback tests and CAPTCHA false-positive tests.
- Added static-page generation and validation scripts.
- Static validator checks required pages, unique metadata, JSON-LD, duplicate IDs, internal links, and Pricing removal.
- Updated browser-only deployment guide, environment variable reference, migration notes, prelaunch map, and production checklist.

## 4.6.0

- Introduced article intelligence scorecards, light mode, server/rendered evidence modes, deterministic scoring, PageSpeed, bounded link checks, exports, and single-Worker deployment.
