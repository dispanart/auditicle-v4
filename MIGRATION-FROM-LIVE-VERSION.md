# Replace the current live Auditicle with V4.8

1. Deploy V4.8 to the temporary `workers.dev` hostname from a private GitHub repository.
2. Confirm the Durable Object migration and `QUOTA_COORDINATOR` binding were created.
3. Add safe variables and Secrets in Cloudflare; do not put keys in GitHub.
4. Verify `/api/health`, `/api/public-config`, the prerendered homepage source, all eight clean landing pages, the benchmark page, one successful audit, one expected failure, exports, themes, and staging noindex headers.
5. Remove `auditicle.site` and `www.auditicle.site` from the previous Pages or Worker project.
6. Add both hostnames as Custom Domains on the new `auditicle-v4` Worker.
7. Verify `https://auditicle.site/api/health` returns version `4.8.0` and that production HTML does not carry a noindex header.
8. Confirm `www` permanently redirects to the apex domain while preserving path and query.
9. Verify production `robots.txt`, `sitemap.xml`, canonical URLs, favicon, Open Graph image, and one end-to-end audit.
10. Keep the old deployment available until the production audit succeeds, then remove only obsolete projects/routes/records.

Do not delete the domain zone, Email Routing records, Search Console property, Turnstile widget, Web Analytics configuration, or active production secrets. Rollback instructions are in `SETUP-FROM-ZERO-TO-LIVE-ID.md`.
