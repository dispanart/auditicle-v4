# Auditicle V4.8.0 — Production Checklist

## Repository and build

- [ ] Root contains `package.json`, `wrangler.jsonc`, `src`, `worker`, `public`, `scripts`, `tests`, and `benchmark`.
- [ ] No `.dev.vars`, `.env`, secret, credential screenshot, `node_modules`, or `dist` is committed.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `npm audit --audit-level=low` reports no unresolved vulnerability.
- [ ] `npx wrangler deploy --dry-run` detects ASSETS, BROWSER, and QUOTA_COORDINATOR.

## Cloudflare

- [ ] Durable Object migration `v1` completed.
- [ ] `TURNSTILE_SITE_KEY` is plaintext and `TURNSTILE_SECRET` is Secret.
- [ ] `TURNSTILE_REQUIRED=true` only after both keys exist.
- [ ] PageSpeed and optional AI keys are Secrets.
- [ ] Free launch limits match `wrangler.jsonc`.
- [ ] Observability is enabled and no repeating controlled error dominates logs.

## SEO and public content

- [ ] Homepage source contains meaningful content before JavaScript.
- [ ] One H1, unique title, unique description, production canonical, OG image, and Twitter image exist.
- [ ] Favicon and app icons load.
- [ ] All eight focused landing pages return 200 at clean URLs.
- [ ] Benchmark page does not claim uncollected results.
- [ ] Sitemap contains production absolute URLs.
- [ ] `lastmod` changed only for materially updated pages.
- [ ] Production host has no noindex response header.
- [ ] Non-production hostname has `X-Robots-Tag: noindex, nofollow` and disallow-all robots.
- [ ] No Pricing page or menu remains.

## Audit behavior

- [ ] Turnstile validates.
- [ ] Failed pre-primary collection does not consume quota.
- [ ] Per-IP limit is five successful audits/day.
- [ ] Global audit limit is enforced by Durable Object.
- [ ] Auto is the default evidence mode.
- [ ] Browser budget fallback returns server HTML instead of failing the audit.
- [ ] Robots, sitemap, and PageSpeed cache status/timestamp are plausible on repeated audits.
- [ ] Link checker stops at five links and one batch.
- [ ] One narrative and one translation are allowed per session.
- [ ] AI provider budget caps cause fallback instead of uncontrolled spend.
- [ ] TXT, JSON, Print/PDF work and JSON excludes raw HTML.

## Search and operations

- [ ] Custom domain apex works.
- [ ] `www` redirects to apex with path/query preserved.
- [ ] Search Console Domain Property is verified.
- [ ] Sitemap is submitted.
- [ ] Priority URLs are inspected.
- [ ] Core Web Vitals lab checks are run after live.
- [ ] Cloudflare Web Analytics receives production traffic.
- [ ] `hello@auditicle.site` Email Routing is tested.
- [ ] SociaBuzz donation link is correct.
- [ ] Rollback version is known before deleting the old application.
