# Auditicle V4.8 pre-launch implementation map

## Source-complete

- one Cloudflare Worker with React/Vite Static Assets and Worker API
- Browser Rendering binding and Server HTML fallback
- `AuditicleQuotaCoordinator` Durable Object for global daily budgets
- five deterministic article-readiness scorecards
- prerendered homepage content in initial HTML
- supplied favicon/application icons and branded Open Graph image
- eight unique high-intent landing pages with clean URLs
- honest Article Readiness Benchmark 2026 pre-results page and aggregation workflow
- production canonicals, social metadata, JSON-LD, internal linking, robots, and sitemap
- stable explicit sitemap `lastmod` values
- automatic non-production noindex and disallow-all staging robots behavior
- PageSpeed, robots, and sitemap evidence caching
- launch limits: 5 audits/IP/day, 5 links in one batch, 1 AI report, 1 translation
- global audit, rendered-browser, total AI, and per-provider daily caps
- CPU and external-subrequest limits in Wrangler
- donation URL set to SociaBuzz

## Operator-required after deployment

- create/connect the private GitHub repository
- verify the Durable Object migration and binding
- add provider, PageSpeed, and Turnstile values directly in Cloudflare
- test Turnstile before keeping enforcement enabled in production
- attach apex and `www` custom domains
- verify production does not emit noindex
- enable and test Email Routing and Web Analytics
- add the Search Console property, inspect important URLs, and submit the sitemap
- collect field Core Web Vitals after sufficient real traffic exists
- replace `ads.txt` only with the exact authorized seller line
- collect and review real benchmark records before publishing any statistics
- retain a known-good rollback deployment
