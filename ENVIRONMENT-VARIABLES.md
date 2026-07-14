# Auditicle V4.8.0 — Environment Variables and Secrets

## Cloudflare Secrets

| Name | Required | Purpose |
|---|---:|---|
| `PAGESPEED_API_KEY` | Recommended | Mobile and desktop PageSpeed evidence. |
| `GEMINI_API_KEY` | Optional | First report provider; second translation provider. |
| `GROQ_API_KEY` | Optional | Second report provider; first translation provider. |
| `OPENROUTER_API_KEY` | Optional | Last external report and translation fallback. |
| `TURNSTILE_SECRET` | Required with enforced Turnstile | Server-side Turnstile validation. |

Never put these values in GitHub, frontend code, `wrangler.jsonc`, screenshots, issues, support messages, or chat.

## Public/safe variables

| Name | V4.8 launch value | Purpose |
|---|---:|---|
| `SITE_URL` | `https://auditicle.site` | Production canonical origin and staging-host comparison. |
| `PUBLIC_CONTACT_EMAIL` | `hello@auditicle.site` | Public contact destination. |
| `TURNSTILE_SITE_KEY` | your public site key | Browser widget key. |
| `TURNSTILE_REQUIRED` | `true` | Requires a valid token before creating an audit session. |
| `DONATION_URL` | `https://sociabuzz.com/dispa/donate` | Donation widget destination. |
| `DAILY_AUDIT_LIMIT` | `5` | Per-IP successful primary audits per UTC day. |
| `GLOBAL_DAILY_AUDIT_LIMIT` | `100` | Application-wide successful primary audits per UTC day. |
| `RENDERED_BROWSER_DAILY_LIMIT` | `20` | Application-wide rendered-browser attempts per UTC day. |
| `AI_DAILY_REQUEST_LIMIT` | `30` | Combined external AI requests per UTC day. |
| `GEMINI_DAILY_REQUEST_LIMIT` | `15` | Gemini request budget per UTC day. |
| `GROQ_DAILY_REQUEST_LIMIT` | `20` | Groq request budget per UTC day. |
| `OPENROUTER_DAILY_REQUEST_LIMIT` | `10` | OpenRouter request budget per UTC day. |
| `PAGESPEED_CACHE_TTL_SECONDS` | `43200` | 12-hour PageSpeed cache; source bounds it to 6–24 hours. |
| `ROBOTS_CACHE_TTL_SECONDS` | `3600` | One-hour robots cache. |
| `SITEMAP_CACHE_TTL_SECONDS` | `21600` | Six-hour sitemap cache. |

## Other safe application settings

| Name | V4.8 value | Notes |
|---|---:|---|
| `SESSION_TTL_SECONDS` | `1800` | Secured session lifetime. |
| `MAX_HTML_BYTES` | `1000000` | 1 MB HTML evidence limit. |
| `MAX_LINKS` | `5` | Links selected for the launch profile. |
| `LINK_BATCH_SIZE` | `5` | Destinations checked in one API call. |
| `MAX_LINK_BATCHES` | `1` | One link batch per completed session. |
| `AI_REPORTS_PER_SESSION` | `1` | One consultant narrative per completed session. |
| `TRANSLATIONS_PER_SESSION` | `1` | One translation per completed session. |
| `SITEMAP_URL_PARSE_LIMIT` | `10000` | Maximum parsed `<loc>` entries per sitemap file. |
| `RENDERED_BROWSER_ENABLED` | `true` | Allows Auto and Rendered modes. |
| `RENDER_TIMEOUT_MS` | `30000` | Bounded render timeout. |
| `AI_REPORT_PROVIDER_ORDER` | `gemini,groq,openrouter` | Missing keys are skipped. |
| `TRANSLATION_PROVIDER_ORDER` | `groq,gemini,openrouter` | Missing keys are skipped. |

## Bindings

| Binding | Type | Purpose |
|---|---|---|
| `ASSETS` | Worker Static Assets | Frontend and generated public pages. |
| `BROWSER` | Browser Rendering | JavaScript-rendered evidence. |
| `QUOTA_COORDINATOR` | Durable Object | Atomic global audit, browser, and AI daily counters. |

The `QUOTA_COORDINATOR` stores aggregate daily counter values only. It does not store target URLs, reports, raw HTML, IP addresses, API keys, or provider responses.
