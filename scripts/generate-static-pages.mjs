import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { seoPages, researchPages } from "./seo-pages.mjs";

const site = "https://auditicle.site";
const updated = "July 14, 2026";
const ogImage = `${site}/og-auditicle.png`;
const outDir = join(process.cwd(), "public");

const pages = [
  {
    slug: "features",
    title: "Article Audit Features",
    eyebrow: "PRODUCT CAPABILITIES",
    description: "Explore Auditicle’s deterministic article intelligence, rendered-browser evidence, five readiness scorecards, PageSpeed data, link validation, AI fallback, translation, exports, and security controls.",
    intro: "A complete article-audit workflow built around public evidence, transparent limitations, deterministic scoring, and practical optimization actions.",
    type: "CollectionPage",
    sections: [
      ["article-intelligence", "Article intelligence audit", `<p>Auditicle is designed around article pages rather than a generic site-health checklist. It extracts the article body, headings, authorship, dates, citations, structured data, internal and external links, language signals, and page-type context before producing findings.</p><div class="grid"><div class="card"><span class="badge">ARTICLE-FIRST</span><h3>Context-aware rules</h3><p>Article, documentation, homepage, landing page, product, and category modes use different expectations. A missing Article schema warning is not applied blindly to every page type.</p></div><div class="card"><span class="badge">EVIDENCE SNAPSHOT</span><h3>Bounded content extraction</h3><p>The report uses extracted signals and a limited article snapshot. Raw HTML remains server-side during processing and is excluded from public JSON exports.</p></div></div>`],
      ["scorecards", "Five separate readiness scorecards", `<p>The report separates five diagnostic dimensions. They are not combined into a promise of rankings, traffic, AI Overview inclusion, or citation.</p><div class="table-wrap"><table><thead><tr><th>Scorecard</th><th>What it evaluates</th><th>What it does not claim</th></tr></thead><tbody><tr><td><strong>Technical SEO</strong></td><td>Indexability, metadata, canonical signals, headings, structured data, language, links, images, and performance evidence.</td><td>Search ranking or index status.</td></tr><tr><td><strong>GEO readiness</strong></td><td>Entity clarity, provenance, source support, update signals, authorship, and content organization useful to generative search systems.</td><td>Guaranteed AI Overview inclusion.</td></tr><tr><td><strong>AEO readiness</strong></td><td>Direct-answer structure, question coverage, scannability, definitions, lists, tables, and answer extraction patterns.</td><td>Guaranteed featured snippets or answer placement.</td></tr><tr><td><strong>RAG retrieval readiness</strong></td><td>Section independence, descriptive headings, chunk clarity, internal context, stable identifiers, and retrievable supporting detail.</td><td>Private index ingestion or retrieval accuracy.</td></tr><tr><td><strong>LLMO / AI citation readiness</strong></td><td>Attribution, source quality, author and publisher signals, claim support, unique evidence, dates, and crawl access for selected AI agents.</td><td>Guaranteed citation by ChatGPT, Claude, Gemini, Perplexity, or another system.</td></tr></tbody></table></div>`],
      ["rendering", "Server HTML and rendered-browser audit", `<p>Every case begins with server-delivered HTML. Auto mode can invoke Cloudflare Browser Rendering when the response looks like an incomplete JavaScript shell. Manual modes allow server HTML only or rendered browser.</p><ul><li><strong>Auto:</strong> uses server HTML first and renders only when deterministic heuristics indicate material client-side dependence.</li><li><strong>Server HTML only:</strong> lowest resource use and the clearest crawler-facing baseline.</li><li><strong>Rendered Browser:</strong> executes public JavaScript when Browser Rendering is available.</li></ul><div class="notice">If browser rendering fails, times out, or reaches an account allowance, Auditicle falls back to server HTML and marks affected interpretation as provisional instead of inventing rendered evidence.</div>`],
      ["evidence-integrity", "Evidence integrity and deterministic scoring", `<p>Measurements, findings, and AI commentary remain separate layers. Deterministic rules produce the scores. Evidence coverage controls whether the overall result is final, provisional, or withheld.</p><div class="grid"><div class="card"><h3>Final</h3><p>Required evidence is available and no material collection limitation changes the interpretation.</p></div><div class="card"><h3>Provisional</h3><p>The report is useful, but a rendering, PageSpeed, discovery, or coverage limitation requires caution.</p></div><div class="card"><h3>Withheld</h3><p>Evidence coverage is too low for a responsible overall score. Auditicle still explains what was and was not collected.</p></div><div class="card"><h3>Reproducible</h3><p>The same evidence and rule set produce the same deterministic outcome. AI cannot edit the score or finding set.</p></div></div>`],
      ["ai", "AI provider fallback and boundaries", `<p>AI is optional and receives a bounded evidence package after the deterministic audit is complete. Configured providers are tried in the declared order; providers without a key are skipped.</p><div class="table-wrap"><table><thead><tr><th>Task</th><th>Fallback order</th></tr></thead><tbody><tr><td>Report explanation</td><td>Gemini 3.1 Flash-Lite → Groq GPT-OSS 120B → OpenRouter Free → Auditicle deterministic narrative</td></tr><tr><td>Translation</td><td>Groq GPT-OSS 20B → Gemini 3.1 Flash-Lite → OpenRouter Free</td></tr></tbody></table></div><ul><li>AI cannot change scores, severity, evidence IDs, URLs, measurements, or deterministic findings.</li><li>The provider and model can be disclosed in the report.</li><li>AI output may be incomplete or wrong and must be reviewed.</li><li>No provider receives API keys from the browser; all secrets remain in Cloudflare.</li></ul><p><a href="/ai-transparency.html">Read the complete AI Transparency statement.</a></p>`],
      ["translation-exports", "Translation and safe exports", `<p>The source report is English. Translation occurs only after the case file is complete and preserves identifiers, numbers, severity, URLs, model names, and measurements.</p><ul><li>TXT case file for review and handoff.</li><li>JSON evidence package without raw source HTML.</li><li>Print stylesheet for browser Print / Save as PDF.</li></ul>`],
      ["performance", "PageSpeed and link validation", `<p>Auditicle requests mobile and desktop PageSpeed Insights evidence and exposes availability instead of filling missing metrics. The engine supports bounded destination checks, while the launch profile validates at most five selected links in one batch per secured session to protect the Cloudflare Free allowance.</p><p>Only links actually requested are classified as working, redirecting, client-error, server-error, timeout, or unavailable.</p>`],
      ["robots-security", "Robots compliance, privacy, and security", `<div class="grid"><div class="card"><h3>Robots preflight</h3><p>Auditicle checks <code>AuditicleBot</code> rules first and wildcard rules second, supports Allow, Disallow, wildcard matching, end anchors, and longest-match precedence.</p></div><div class="card"><h3>Request safety</h3><p>Public HTTP(S) URLs only, standard ports, redirect revalidation, private-network blocking, response-size limits, same-origin API protection, and optional Turnstile.</p></div><div class="card"><h3>Specific failures</h3><p>401, 403, 404, 410, 429, 5xx, bot challenge, non-HTML, timeout, oversized HTML, and robots restrictions receive specific error codes.</p></div><div class="card"><h3>Quota integrity</h3><p>A daily audit unit is committed only after trustworthy primary HTML evidence has been acquired. Failed preflight and fetch attempts do not consume the audit quota.</p></div></div>`],
      ["privacy", "Privacy-conscious operation", `<p>Auditicle processes submitted public URLs and the public evidence needed for the requested audit. It does not require an account, does not ask users to submit API keys, and does not intentionally retain raw article HTML as a downloadable artifact.</p><p><a href="/privacy.html">Review the Privacy Policy</a> and <a href="/data-sources.html">Data Sources register</a>.</p>`]
    ]
  },
  {
    slug: "use-cases",
    title: "Use Cases",
    eyebrow: "ARTICLE WORKFLOWS",
    description: "Use Auditicle for pre-publication QA, article refresh planning, technical SEO diagnosis, AI-search readiness, editorial governance, agency handoff, and JavaScript rendering checks.",
    intro: "Evidence-led workflows for editors, SEO teams, publishers, agencies, developers, and AI governance teams.",
    type: "CollectionPage",
    sections: [
      ["pre-publication", "Pre-publication article review", `<p>Review indexability, metadata, canonical signals, heading hierarchy, Article schema, authorship, dates, source attribution, answer structure, images, language, and mobile performance before launch.</p><div class="callout cyan"><strong>Best outcome:</strong> a shared issue ledger for the writer, editor, SEO owner, and developer before the URL is promoted or submitted for indexing.</div>`],
      ["refresh", "Content refresh planning", `<p>Use the case file to identify stale dates, weak author signals, thin or repetitive sections, unsupported claims, unclear answers, retrieval problems, and performance opportunities. Findings include impact, effort, likely owner, and a validation method.</p>`],
      ["traffic-change", "Diagnosing an article after traffic changes", `<p>Auditicle does not diagnose ranking causes from Search Console data because it does not access private analytics. It can document the current public technical and editorial state so teams can compare that evidence with their own traffic timeline, release history, and query data.</p>`],
      ["ai-readiness", "AI search and citation readiness review", `<p>Inspect generative-search signals, answer extraction, retrieval chunk quality, provenance, author and publisher clarity, source support, and selected AI crawler access without promising visibility or citation.</p><p>Use the five scorecards to separate a crawl problem from a content-structure problem or a provenance problem.</p>`],
      ["agency", "Agency and editorial QA", `<p>Share a source-labeled report with clients or internal stakeholders. The report distinguishes direct evidence, deterministic interpretation, third-party PageSpeed data, and optional AI explanation.</p>`],
      ["javascript", "JavaScript-heavy publishing platforms", `<p>Compare server-delivered HTML with rendered-browser evidence when headings, article copy, canonical tags, links, or structured data are injected after JavaScript execution. Auto mode limits browser use to cases where the server response appears materially incomplete.</p>`],
      ["governance", "Content governance and audit trails", `<p>Use exported TXT or JSON reports as point-in-time review artifacts. Auditicle is not a legal compliance system, but its explicit evidence sources, rule-set label, limitations, and timestamps can support editorial QA records.</p>`],
      ["not-for", "What Auditicle is not intended for", `<ul><li>Penetration testing, authenticated scanning, or private-network discovery.</li><li>Backlink indexing, rank tracking, keyword-volume research, or Search Console replacement.</li><li>Factual verification, plagiarism detection, or legal review.</li><li>Guaranteed ranking, rich-result, AI Overview, RAG ingestion, or AI citation outcomes.</li></ul>`]
    ]
  },
  {
    slug: "methodology",
    title: "Audit Methodology",
    eyebrow: "EVIDENCE PROTOCOL",
    description: "Understand Auditicle’s robots-aware evidence pipeline, contextual article extraction, deterministic scoring, five readiness dimensions, confidence states, and AI separation.",
    intro: "How a public URL becomes a reproducible case file without turning estimates into facts.",
    type: "TechArticle",
    sections: [
      ["scope", "Scope and unit of analysis", `<p>The primary unit of analysis is one public article-like URL. Auditicle can apply contextual rules to documentation, landing pages, homepages, product pages, and category pages, but its deepest editorial intelligence is designed for articles, guides, and documentation.</p>`],
      ["pipeline", "Evidence collection pipeline", `<ol><li>Validate the submitted URL and reject credentials, unsupported protocols, non-standard ports, and known private or local targets.</li><li>Fetch and evaluate robots.txt for <code>AuditicleBot</code>, then wildcard rules when no specific group exists.</li><li>Fetch server HTML with manual redirect validation and re-check robots when the origin changes.</li><li>Classify HTTP failures, content type, response size, and bot challenges.</li><li>Optionally render the public page in Cloudflare Browser Rendering.</li><li>Collect sitemap, mobile and desktop PageSpeed, and a bounded link sample.</li><li>Extract deterministic article and page evidence.</li><li>Apply contextual rules and calculate coverage-aware scores.</li></ol>`],
      ["sources", "Evidence source labels", `<div class="table-wrap"><table><thead><tr><th>Source</th><th>Examples</th><th>Interpretation</th></tr></thead><tbody><tr><td>Direct target response</td><td>HTTP status, selected headers, server HTML, redirects</td><td>Primary evidence</td></tr><tr><td>Rendered browser</td><td>Post-JavaScript DOM and final rendered URL</td><td>Primary evidence with browser availability limits</td></tr><tr><td>robots.txt and sitemap</td><td>Access decision, matched rule, declared sitemap URLs</td><td>Discovery evidence</td></tr><tr><td>PageSpeed Insights</td><td>Lighthouse scores, lab metrics, opportunities</td><td>Third-party evidence with independent availability</td></tr><tr><td>Auditicle rules</td><td>Finding severity, score, priority, contextual expectations</td><td>Deterministic interpretation</td></tr><tr><td>AI provider</td><td>Explanation, prioritization prose, translation</td><td>Optional generated interpretation</td></tr></tbody></table></div>`],
      ["scoring", "Deterministic scoring", `<p>Scores are calculated from explicit rules and observed evidence. AI is called only after the report exists and receives no authority to add findings or alter scores.</p><p>Each article-intelligence dimension has its own score, strengths, gaps, evidence IDs, and status. The overall score is coverage-aware and does not substitute for the five separate scorecards.</p>`],
      ["coverage", "Evidence coverage and result status", `<ul><li><strong>Final:</strong> the required collection layers are sufficiently complete.</li><li><strong>Provisional:</strong> useful evidence exists, but at least one material limitation affects confidence.</li><li><strong>Withheld:</strong> coverage is below the responsible threshold, so Auditicle avoids presenting a definitive overall score.</li></ul>`],
      ["context", "Contextual page-type rules", `<p>A page-type selection changes applicable expectations. For example, an article is evaluated for authorship, publication and modification dates, source support, and Article-like schema. A homepage is not penalized merely for lacking article-specific markup.</p>`],
      ["robots", "Robots matching behavior", `<p>Auditicle supports Allow and Disallow directives, <code>*</code> wildcards, <code>$</code> end anchors, and longest matching rule precedence. When Allow and Disallow have equal specificity, Allow wins. A specific <code>AuditicleBot</code> group takes precedence over the wildcard group.</p>`],
      ["limitations", "Known limitations", `<ul><li>Public HTML cannot confirm Google index status, rankings, backlinks, traffic, or private analytics.</li><li>Automated language, content, and accessibility checks are diagnostic rather than definitive.</li><li>Rendered browser evidence can be unavailable because of account allowance, timeout, challenge, or site behavior.</li><li>PageSpeed data can be unavailable because of API quota or provider failure.</li><li>Readiness scores describe observable conditions, not future outcomes.</li></ul>`],
      ["changes", "Methodology changes", `<p>Material rule, evidence, and scoring changes are recorded in the <a href="/changelog.html">Changelog</a>. Reports include a rule-set identifier so later reviews can distinguish methodology versions.</p>`]
    ]
  },
  {
    slug: "docs",
    title: "Documentation",
    eyebrow: "USER GUIDE",
    description: "Learn how to run an Auditicle case, choose evidence mode, interpret final, provisional, or withheld scores, use AI fallback and translation, and export results safely.",
    intro: "A practical guide to opening, interpreting, exporting, and validating an Auditicle case file.",
    type: "TechArticle",
    sections: [
      ["start", "Start an audit", `<ol><li>Enter a public HTTP or HTTPS article URL.</li><li>Add the primary and optional secondary keyword for contextual review.</li><li>Select target market, page language, and page type.</li><li>Choose Auto, Server HTML only, or Rendered Browser.</li><li>Complete Turnstile when required and start the investigation.</li></ol><div class="notice">Do not submit private URLs, signed links, credentials, API keys, intranet hosts, or pages you are not authorized to test.</div>`],
      ["modes", "Choose an evidence mode", `<div class="grid"><div class="card"><h3>Auto</h3><p>Recommended default. Starts with server HTML and renders only when deterministic signals indicate an incomplete JavaScript shell.</p></div><div class="card"><h3>Server HTML only</h3><p>Best for checking what a traditional crawler receives and for minimizing Browser Rendering usage.</p></div><div class="card"><h3>Rendered Browser</h3><p>Useful for JavaScript-heavy sites. Falls back to server HTML when rendering is unavailable.</p></div></div>`],
      ["results", "Read the case file", `<p>Begin with evidence coverage and score status. Then review the five article scorecards, result table, priority ledger, performance panels, discovery evidence, and checked-link ledger.</p><p>Finding rows distinguish what was observed, why it matters, the recommended action, and how to validate the change.</p>`],
      ["errors", "Understand collection errors", `<div class="table-wrap"><table><thead><tr><th>Error family</th><th>Meaning</th></tr></thead><tbody><tr><td>ROBOTS_DISALLOWED</td><td>Auditicle respected a matching robots.txt rule and did not fetch or score the page.</td></tr><tr><td>TARGET_FORBIDDEN / BOT_CHALLENGE</td><td>The server or protection layer prevented trustworthy collection.</td></tr><tr><td>TARGET_NOT_FOUND</td><td>The target returned 404 or 410.</td></tr><tr><td>TARGET_RATE_LIMITED / TARGET_SERVER_ERROR</td><td>The target returned 429 or 5xx.</td></tr><tr><td>NON_HTML_RESPONSE</td><td>The URL did not return an HTML document.</td></tr><tr><td>HTML_TOO_LARGE</td><td>The response exceeded the configured 1 MB limit.</td></tr><tr><td>TARGET_TIMEOUT / TARGET_NETWORK_ERROR</td><td>The target did not respond in time or could not be reached.</td></tr></tbody></table></div>`],
      ["quota", "Daily quota behavior", `<p>The session shows the remaining daily audit allowance. A unit is committed only after trustworthy primary HTML evidence is acquired. A robots rejection, inaccessible target, timeout before primary evidence, or bot challenge does not reduce the quota.</p>`],
      ["ai", "Generate the consultant narrative", `<p>The consultant narrative is optional. Configured AI providers are tried in order. If no provider is configured or all providers fail, Auditicle returns a deterministic narrative built from the existing findings and scorecards.</p><p>The report displays the provider and model. The narrative cannot change deterministic findings or scores.</p>`],
      ["translation", "Translate a completed report", `<p>English remains the source report. Translation is available only when at least one translation provider is configured. Finding IDs, numbers, scores, severity, URLs, and technical tokens remain unchanged.</p>`],
      ["exports", "Export and print", `<ul><li><strong>TXT:</strong> readable case file with findings, scorecards, limitations, and narrative.</li><li><strong>JSON:</strong> structured evidence and findings without raw HTML.</li><li><strong>Print / PDF:</strong> use the browser print dialog to save or print the report.</li></ul>`],
      ["validate", "Validate recommended changes", `<p>Implement changes in staging when practical, preserve a rollback path, and rerun the audit. For accessibility, legal, security, and business-critical decisions, use qualified manual review in addition to automated diagnostics.</p>`]
    ]
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    eyebrow: "PRIVACY & DATA HANDLING",
    description: "How Auditicle processes public URLs, server and rendered evidence, PageSpeed requests, AI fallback, logs, localStorage, Turnstile, donations, email feedback, retention, and user responsibilities.",
    intro: "What Auditicle processes, which providers may receive bounded public evidence, what is not intentionally stored, and what users must not submit.",
    type: "WebPage",
    sections: [
      ["scope", "Scope", `<p>This policy applies to Auditicle at <strong>auditicle.site</strong>. It does not govern third-party target websites, AI providers, Google PageSpeed Insights, Cloudflare, donation services, email providers, or links opened from the application.</p>`],
      ["submitted", "Information you submit", `<p>An audit can process a public URL, primary and secondary keywords, target market, page language, page type, evidence mode, Turnstile token when enabled, and a report translation language.</p><p>Do not submit private URLs, signed URLs, passwords, API keys, authentication tokens, confidential documents, intranet addresses, or unnecessary personal data.</p>`],
      ["public-evidence", "Public URL evidence", `<p>Auditicle may send the submitted hostname to Cloudflare DNS-over-HTTPS for a public-network safety check, then request the target page, redirect destinations, robots.txt, sitemap files, and a limited set of link destinations. It extracts selected headers, metadata, headings, links, images, structured data, article text signals, and bounded excerpts needed to produce the report.</p><p>Rendered-browser mode may execute public JavaScript through Cloudflare Browser Rendering to inspect the resulting DOM. It is not intended to sign in, bypass access controls, submit forms, or access private content.</p>`],
      ["providers", "AI provider fallback", `<p>When the user requests an AI narrative or translation, a bounded report payload may be sent from the Cloudflare Worker to a configured provider. Report order is Gemini, Groq, then OpenRouter; translation order is Groq, Gemini, then OpenRouter. Providers without a configured key are skipped.</p><p>The payload can include the public URL, selected extracted article excerpts, deterministic findings, evidence identifiers, scorecards, measurements, and the requested translation language. API keys are never sent to the browser or included in the payload.</p><p>If report providers are unavailable, Auditicle can create a deterministic narrative locally from the completed findings. Translation has no deterministic fallback.</p>`],
      ["cloudflare", "Cloudflare infrastructure", `<p>Auditicle runs as a Cloudflare Worker with Static Assets and optional Browser Rendering. Cloudflare may process network metadata, security signals, request logs, and operational telemetry under its own terms and privacy documentation. Optional Turnstile validation is sent to Cloudflare’s Siteverify service.</p>`],
      ["pagespeed", "Google PageSpeed Insights", `<p>Auditicle may send the audited public URL to the Google PageSpeed Insights API for mobile and desktop analysis. Google returns Lighthouse and related performance evidence. Auditicle does not send Auditicle API keys or private account data to the target website.</p>`],
      ["storage", "Storage, retention, and logs", `<p>Auditicle does not provide user accounts and does not intentionally persist completed audit reports or raw target HTML in an application database. The active report is held in the browser while the page remains open.</p><p>Short-lived cache entries can be used for audit sessions and per-session action limits. Public robots evidence is cached for about one hour, sitemap evidence for about six hours, and PageSpeed evidence for about twelve hours by default. The exact values are deployment controls and are not intended as permanent report storage.</p><p>An application-wide Durable Object stores only UTC-day aggregate counters for audits, rendered-browser attempts, and provider requests. It does not store submitted URLs, report content, raw HTML, IP addresses, or API keys. The per-IP daily counter is a short-lived abuse-control cache.</p><p>Cloudflare observability and provider services may retain operational logs according to their own configurations. Production operators should minimize logging, avoid logging report payloads, and review retention settings regularly.</p>`],
      ["browser-storage", "Cookies, localStorage, and Web Analytics", `<p>Auditicle does not require an advertising cookie to run the core audit. The interface stores the selected theme mode in <code>localStorage</code> so Dark, Light, or System preference persists.</p><p>Cloudflare Web Analytics may be enabled to collect aggregate usage and performance signals. Cloudflare Turnstile and Web Analytics can process browser, network, or security signals under Cloudflare’s own documentation and settings. Production operators should disclose any material analytics configuration change here.</p>`],
      ["exports", "Exports", `<p>TXT and JSON exports are generated in the browser. Public JSON exports deliberately exclude raw source HTML. A downloaded report can still contain the audited public URL, extracted evidence, findings, and excerpts, so users must protect exported files appropriately.</p>`],
      ["donation-feedback", "Donations and feedback", `<p>The donation widget opens the configured external donation URL. Auditicle does not collect payment card or bank details. The feedback widget opens a draft in the user’s email application to the public contact address; the application does not submit that message to an Auditicle database.</p>`],
      ["rights", "Choices and user responsibility", `<p>You can avoid AI processing by not requesting the consultant narrative or translation. You can use Server HTML only to avoid Browser Rendering. You can clear the stored theme mode through browser storage controls.</p><p>You are responsible for auditing only public URLs you are authorized to test, reviewing third-party terms, protecting exported reports, and avoiding sensitive input.</p>`],
      ["contact", "Privacy contact", `<p>Questions can be sent to <a href="mailto:hello@auditicle.site">hello@auditicle.site</a>. Do not include passwords, secrets, private URLs, or confidential source material.</p>`]
    ]
  },
  {
    slug: "terms",
    title: "Terms of Service",
    eyebrow: "TERMS OF USE",
    description: "Terms for responsible use of Auditicle, public URL authorization, robots compliance, AI limitations, third-party services, quotas, availability, and review before implementation.",
    intro: "Use Auditicle responsibly, only on public URLs you are permitted to test, and independently review recommendations before implementation.",
    type: "WebPage",
    sections: [
      ["service", "Service description", `<p>Auditicle provides automated diagnostic and educational information based on publicly accessible evidence, deterministic rules, and optional third-party services. Features, limits, providers, and methodology can change.</p>`],
      ["authorized", "Authorized and responsible use", `<p>You may assess only public websites you are permitted to test. You may not probe private networks, bypass controls, evade robots.txt, overload systems, submit credentials, use the service for abuse, or attempt to access restricted content.</p>`],
      ["crawler", "Crawler and browser behavior", `<p>Auditicle identifies server requests as <code>AuditicleBot</code>, checks robots.txt before primary collection, and can use a rendered browser for public pages. It is not designed to authenticate, defeat challenges, or interact with private applications.</p>`],
      ["no-guarantees", "No guarantees", `<p>Reports do not guarantee indexing, rankings, traffic, revenue, rich results, Core Web Vitals outcomes, AI Overview visibility, private RAG ingestion, or citation by any AI system.</p>`],
      ["ai", "AI-generated explanation", `<p>AI output is optional, can be incomplete or incorrect, and is not legal, financial, security, accessibility, or guaranteed SEO advice. Deterministic scores and findings remain separate from AI prose.</p>`],
      ["review", "Review before implementation", `<p>Review technical, editorial, accessibility, legal, and business-critical changes. Keep backups, use staging when practical, and validate the resulting public page.</p>`],
      ["availability", "Availability, limits, and changes", `<p>Daily quotas, Browser Rendering allowances, provider quotas, rate limits, maintenance, abuse controls, and third-party outages may restrict availability. Auditicle may change or discontinue features without guaranteeing uninterrupted service.</p>`],
      ["third-parties", "Third-party services and intellectual property", `<p>Target website content remains subject to its owner’s rights. Cloudflare, Google, AI providers, donation services, and email providers operate under their own terms and policies.</p>`],
      ["contact", "Contact", `<p>Questions can be sent to <a href="mailto:hello@auditicle.site">hello@auditicle.site</a>.</p>`]
    ]
  },
  {
    slug: "disclaimer",
    title: "Disclaimer",
    eyebrow: "INTERPRETATION LIMITS",
    description: "Important limitations for Auditicle scores, GEO, AEO, RAG and LLMO readiness, AI commentary, PageSpeed evidence, accessibility diagnostics, and third-party data.",
    intro: "A case file is a diagnostic aid, not a guarantee, certification, or substitute for qualified review.",
    type: "WebPage",
    sections: [
      ["diagnostic", "Diagnostic purpose", `<p>Auditicle provides automated educational and diagnostic information based on the evidence available at the time of the request. Results can change when the page, network, third-party service, or rule set changes.</p>`],
      ["search", "Search and AI visibility", `<p>No score or recommendation guarantees crawling, indexing, ranking, traffic, rich results, featured snippets, AI Overview inclusion, retrieval by a private RAG system, or citation by ChatGPT, Claude, Gemini, Perplexity, or another system.</p>`],
      ["readiness", "Readiness score interpretation", `<p>GEO, AEO, RAG, and LLMO scores are Auditicle diagnostic views based on observable public signals. They are not official metrics published by search engines or AI providers.</p>`],
      ["ai", "AI commentary", `<p>AI commentary can be wrong, incomplete, or overly general. It cannot change deterministic scores or findings, but users must still verify the explanation and proposed remediation.</p>`],
      ["third-party", "Third-party evidence", `<p>PageSpeed Insights, Cloudflare Browser Rendering, Turnstile, and AI providers can be unavailable, rate-limited, or return incomplete data. Auditicle labels unavailable evidence rather than treating it as a passing result.</p>`],
      ["accessibility", "Accessibility", `<p>Automated checks are not a WCAG conformance audit or legal accessibility certification. Manual keyboard, screen-reader, zoom, cognitive, and real-user testing remain necessary.</p>`],
      ["security-legal", "Security, legal, and business decisions", `<p>Auditicle is not a penetration test, legal opinion, compliance certification, financial recommendation, or substitute for qualified specialists. Test changes safely and retain a rollback path.</p>`]
    ]
  },
  {
    slug: "about",
    title: "About Auditicle",
    eyebrow: "ABOUT THE LAB",
    description: "Learn why Auditicle was built as an article-first SEO forensics application that separates public evidence, deterministic scoring, and optional AI explanation.",
    intro: "A public evidence lab for article quality, technical SEO, retrieval, answer extraction, and AI citation readiness.",
    type: "AboutPage",
    sections: [
      ["mission", "Mission", `<p>Many audit tools mix measurements, heuristics, estimates, and generated commentary into one opaque score. Auditicle keeps those layers separate so teams can see what was collected, what a deterministic rule concluded, what remains unavailable, and what AI merely explained.</p>`],
      ["focus", "Article-first focus", `<p>The product is centered on articles, guides, documentation, and editorial pages. It evaluates Technical SEO, GEO, AEO, RAG retrieval readiness, and LLMO / AI citation readiness alongside rendering, PageSpeed, discovery, and link evidence.</p>`],
      ["principles", "Evidence principles", `<ul><li>Do not claim a measurement that was not collected.</li><li>Do not convert missing evidence into a passing result.</li><li>Do not let AI create or alter deterministic findings.</li><li>Respect robots.txt and public access boundaries.</li><li>Disclose source, provider, model, fallback, and limitations where relevant.</li><li>Never promise rankings or AI citations.</li></ul>`],
      ["architecture", "Independent and simple architecture", `<p>Auditicle uses one Cloudflare Worker for the React frontend, public pages, Worker API, optional Browser Rendering, and server-side provider integrations. The design avoids shipping API secrets to the browser or maintaining a separate API deployment.</p>`],
      ["contact", "Contact and feedback", `<p>Product suggestions, accuracy reports, privacy questions, and responsible security reports can be sent to <a href="mailto:hello@auditicle.site">hello@auditicle.site</a>.</p>`]
    ]
  },
  {
    slug: "contact",
    title: "Contact",
    eyebrow: "CONTACT THE LAB",
    description: "Contact Auditicle for product feedback, audit-quality reports, privacy questions, responsible security disclosure, or partnership inquiries.",
    intro: "The quickest way to reach Auditicle is by email. No support account or contact form is required.",
    type: "ContactPage",
    sections: [
      ["email", "Email", `<p>Send messages to <a href="mailto:hello@auditicle.site">hello@auditicle.site</a>. For an audit accuracy report, include the public URL, approximate audit time, visible finding ID, and a description of the evidence that appears incorrect.</p>`],
      ["categories", "Feedback categories", `<div class="grid"><div class="card"><h3>Feature suggestion</h3><p>Describe the workflow, intended user, and evidence source that would make the feature verifiable.</p></div><div class="card"><h3>Bug report</h3><p>Include browser, device, public URL, visible error code, and reproduction steps. Never include keys.</p></div><div class="card"><h3>Audit accuracy</h3><p>Reference the finding ID and identify which direct evidence or rule interpretation appears wrong.</p></div><div class="card"><h3>Privacy request</h3><p>Explain the concern without sending private URLs, credentials, or sensitive source material.</p></div></div>`],
      ["security", "Responsible security reporting", `<p>Email a concise vulnerability description and safe reproduction steps. Do not access data that is not yours, degrade the service, evade limits, or perform destructive testing.</p>`],
      ["not-send", "What not to send", `<ul><li>Passwords, API keys, authentication tokens, or private repository links.</li><li>Signed URLs, internal hostnames, confidential documents, or personal data.</li><li>Payment card or bank details.</li></ul>`],
      ["response", "Response expectations", `<p>Auditicle is an independent project and cannot guarantee a response time. Clear evidence, a public reproduction URL, and a finding or error ID help make reports actionable.</p>`]
    ]
  },
  {
    slug: "accessibility",
    title: "Accessibility Statement",
    eyebrow: "ACCESSIBLE EXPERIENCE",
    description: "Auditicle’s accessibility goals, supported interaction patterns, known limitations, theme modes, report table behavior, and feedback channel.",
    intro: "Auditicle aims to provide a usable evidence workflow across keyboard, screen, zoom, color-scheme, and mobile contexts.",
    type: "WebPage",
    sections: [
      ["commitment", "Commitment", `<p>Auditicle aims to follow practical WCAG 2.2 AA design principles where feasible, including semantic landmarks, visible focus, keyboard access, readable contrast, responsive layouts, and reduced dependence on color alone.</p>`],
      ["themes", "Dark, Light, and System modes", `<p>The theme control supports Dark, Light, and System preference. The selected mode is stored in localStorage and applied before the page body renders to reduce theme flash. System mode follows changes to the operating-system color preference.</p>`],
      ["tables", "Tables and reports", `<p>Large evidence tables remain horizontally scrollable on narrow screens. Findings are also presented as cards in the priority ledger. Score status includes text such as final, provisional, or withheld rather than relying only on color.</p>`],
      ["keyboard", "Keyboard and assistive technology", `<p>Navigation, form fields, theme controls, buttons, modals, and links are intended to be keyboard operable. Modal dialogs expose a dialog role and close control. Users should still report any focus, label, or announcement problem they encounter.</p>`],
      ["limitations", "Known limitations", `<ul><li>Some third-party Turnstile behavior is controlled by Cloudflare.</li><li>Wide technical tables can require horizontal scrolling.</li><li>Automated target-page accessibility findings are diagnostic and not a conformance certification.</li><li>Generated translation quality can vary by provider and language.</li></ul>`],
      ["feedback", "Accessibility feedback", `<p>Send accessibility feedback to <a href="mailto:hello@auditicle.site?subject=Auditicle%20Accessibility">hello@auditicle.site</a>. Include the page, browser, device, assistive technology, and the barrier encountered.</p>`]
    ]
  },
  {
    slug: "ai-transparency",
    title: "AI Transparency",
    eyebrow: "CONTROLLED AI LAYER",
    description: "How Auditicle separates deterministic scoring from AI explanation, discloses provider and model, constrains prompts, validates IDs, handles fallback, and states AI limitations.",
    intro: "AI can explain a completed case file, but it cannot become the evidence engine or scoring authority.",
    type: "WebPage",
    sections: [
      ["separation", "Deterministic score is separate from AI", `<p>Auditicle collects public evidence and completes all findings, severity, evidence IDs, scorecards, coverage, and score status before an AI provider is called. The AI endpoint receives a bounded derivative of that completed report.</p>`],
      ["allowed", "What AI is allowed to do", `<ul><li>Explain what existing evidence means.</li><li>Summarize strengths and gaps already present in a scorecard.</li><li>Prioritize existing findings into a practical roadmap.</li><li>Suggest implementation and validation steps tied to existing finding IDs.</li><li>Translate human-readable report prose after the audit is complete.</li></ul>`],
      ["forbidden", "What AI is not allowed to do", `<ul><li>Create a new measurement or claim evidence was collected when it was not.</li><li>Change deterministic scores, severity, status, URLs, numbers, or finding IDs.</li><li>Promise rankings, traffic, AI Overview inclusion, RAG ingestion, or citation.</li><li>Hide provider failure or present generated text as a statement from Google or another platform.</li></ul>`],
      ["providers", "Provider and model disclosure", `<p>The report can display the provider, model, generation time, and whether a fallback provider was used. Providers without a configured API key are skipped. A provider is labeled fallback only when an earlier configured provider was attempted and failed.</p>`],
      ["fallback", "Deterministic fallback", `<p>If no report provider is configured or every configured provider fails, Auditicle creates a deterministic consultant narrative from the completed scorecards and findings. It is labeled <strong>Auditicle deterministic</strong> and does not call an external AI provider.</p>`],
      ["validation", "Output validation", `<p>Generated report JSON is parsed and constrained. Recommendations referencing unknown finding IDs are rejected. Dimension keys and scores are re-anchored to the deterministic source. Translation is rebuilt against the source report so omitted fields fall back to English rather than disappearing.</p>`],
      ["errors", "AI can still be wrong", `<p>Even bounded AI explanation can misunderstand evidence, produce weak wording, or recommend an unsuitable implementation. Users must review all generated prose and validate changes against the source page.</p>`],
      ["no-guarantees", "No ranking or citation guarantee", `<p>Auditicle does not claim that optimization will cause a page to rank, appear in an AI Overview, be retrieved by a RAG system, or be cited by ChatGPT, Claude, Gemini, Perplexity, or any other system.</p>`]
    ]
  },
  {
    slug: "data-sources",
    title: "Data Sources",
    eyebrow: "SOURCE REGISTER",
    description: "A transparent register of Auditicle’s direct page evidence, robots and sitemap data, rendered-browser DOM, PageSpeed Insights, deterministic rules, and optional AI processing.",
    intro: "Where each class of evidence comes from, how it is labeled, and which limitations apply.",
    type: "WebPage",
    sections: [
      ["direct", "Direct target response", `<p>Auditicle requests the submitted public URL with the <code>AuditicleBot</code> user agent. It records the final URL, redirect chain, HTTP status, content type, response size, and selected response headers such as X-Robots-Tag, content language, caching, and security headers.</p><p>Before a Worker or rendered-browser request, Auditicle validates the URL and resolves the hostname through Cloudflare DNS-over-HTTPS to reject private, local, reserved, or non-routable address results. DNS validation reduces SSRF risk but should still be treated as one layer within the broader request-safety design.</p>`],
      ["html", "Server HTML and extracted article evidence", `<p>Server-delivered HTML is the baseline source for title, description, canonical, robots meta, headings, links, images, structured data, language, article body signals, authorship, dates, source links, and platform indicators.</p>`],
      ["browser", "Cloudflare Browser Rendering", `<p>When requested or triggered by Auto mode, Cloudflare Browser Rendering can supply the public post-JavaScript DOM. Auditicle records whether rendering was attempted, available, successful, or replaced by a server-HTML fallback.</p>`],
      ["robots", "robots.txt", `<p>Auditicle fetches the target origin’s robots.txt before primary page collection. It parses applicable AuditicleBot or wildcard groups and records the matched rule. robots.txt also supplies declared sitemap locations.</p>`],
      ["sitemap", "Sitemaps", `<p>Auditicle processes a bounded number of sitemap files and parses at most 10,000 location entries per file. It can report type, URL count, lastmod count, a small sample, truncation, and whether a URL-set contains the submitted page.</p>`],
      ["pagespeed", "Google PageSpeed Insights", `<p>The PageSpeed Insights API is requested for mobile and desktop strategies. Returned Lighthouse category scores, lab metrics, selected opportunities, and available field information remain third-party data and can be unavailable.</p>`],
      ["links", "Link destination checks", `<p>A bounded set of article links is selected deterministically and checked from the Worker. The report distinguishes checked outcomes from untested links and does not claim site-wide link coverage.</p>`],
      ["rules", "Auditicle deterministic rules", `<p>Finding severity, contextual expectations, scorecards, evidence coverage, priority fields, and score status are Auditicle interpretations built from the collected evidence. They are not official Google or AI-provider metrics.</p>`],
      ["ai", "Optional AI providers", `<p>AI providers receive only a bounded report payload when the user requests explanation or translation. Provider prose is labeled as generated interpretation and never becomes a primary evidence source.</p>`]
    ]
  },
  {
    slug: "crawler-information",
    title: "Crawler Information",
    eyebrow: "AUDITICLEBOT",
    description: "Technical information for site owners about AuditicleBot, robots.txt compliance, server HTML requests, rendered-browser mode, rate limits, public URLs, blocking, and contact.",
    intro: "How Auditicle accesses public pages and how a site owner can allow or block the crawler.",
    type: "WebPage",
    sections: [
      ["identity", "Crawler identity", `<p>Primary server requests use a user agent similar to:</p><pre><code>AuditicleBot/4.8 (+https://auditicle.site/crawler-information.html)</code></pre><p>Rendered-browser mode also identifies itself as AuditicleBot while using a browser-compatible user-agent string.</p>`],
      ["robots", "robots.txt compliance", `<p>Auditicle checks robots.txt before fetching the submitted page. A specific <code>AuditicleBot</code> group is used when present; otherwise the wildcard group applies. Allow, Disallow, <code>*</code>, <code>$</code>, and longest-match precedence are supported.</p>`],
      ["server", "Server HTML fetch", `<p>The default evidence source is a normal public HTTP(S) request. Auditicle validates every redirect, allows only standard web ports, limits response size, rejects non-HTML targets, and stops on access denial, challenge, or disallowed robots rules.</p>`],
      ["rendered", "Rendered-browser mode", `<p>Auto or manual rendered mode can open the already validated public page in Cloudflare Browser Rendering. Auditicle does not log in, submit credentials, or intentionally bypass bot protection. If rendering fails, the report falls back to server HTML and discloses the limitation.</p>`],
      ["limits", "Request limits", `<ul><li>HTML evidence limit: 1 MB.</li><li>Launch-profile link validation: at most five selected links.</li><li>Link batches: one batch of at most five links per secured session.</li><li>Sitemap parsing: at most 10,000 location entries per file.</li><li>Daily audit quotas and Cloudflare Browser Rendering allowances can further limit requests.</li></ul>`],
      ["public", "Public URLs only", `<p>Auditicle rejects credentials in URLs, known local or private addresses, non-standard ports, unsupported protocols, and hostnames that resolve to private, local, reserved, or non-routable addresses during the DNS safety check. Redirects and rendered-browser requests are validated again. It is not designed for intranets, authenticated staging systems, private documents, or signed links.</p>`],
      ["block", "How to block AuditicleBot", `<p>Add a specific group to robots.txt:</p><pre><code>User-agent: AuditicleBot
Disallow: /</code></pre><p>To block only a section:</p><pre><code>User-agent: AuditicleBot
Disallow: /private-section/
Allow: /private-section/public-guide/</code></pre><p>Auditicle will stop before fetching a URL when the applicable rule disallows it.</p>`],
      ["contact", "Crawler questions", `<p>Site owners can report crawler behavior to <a href="mailto:hello@auditicle.site?subject=AuditicleBot">hello@auditicle.site</a>. Include the public URL, approximate time, and relevant access logs without exposing credentials or personal data.</p>`]
    ]
  },
  {
    slug: "system-status",
    title: "System Information",
    eyebrow: "DEPLOYMENT STATUS",
    description: "View the current Auditicle application version, architecture, rendered-browser configuration, PageSpeed availability, AI provider configuration, Turnstile mode, and operational limitations.",
    intro: "A safe public summary of the active deployment. No secret values are exposed.",
    type: "WebPage",
    extraScript: "/system-status.js",
    sections: [
      ["live", "Live deployment check", `<div id="system-status" class="status-console" aria-live="polite"><div class="status-line"><span class="status-dot pending"></span><div><strong>Checking the Auditicle Worker…</strong><small>The page is requesting /api/health and /api/public-config.</small></div></div></div>`],
      ["shows", "What this page can show", `<ul><li>Worker health response and public application version.</li><li>Single-Worker architecture label.</li><li>Whether rendered-browser mode is enabled in configuration.</li><li>Whether PageSpeed integration is available to the application.</li><li>Names of configured AI providers, never their keys.</li><li>Whether Turnstile is required.</li><li>Per-IP and global daily audit limits, rendered-browser budget, provider-request budget, cache durations, and link-check limits exposed by public configuration.</li></ul>`],
      ["not-monitor", "What this page does not monitor", `<p>This is a deployment information page, not an independent uptime service. A successful health response does not prove that every target website, AI provider, PageSpeed, Browser Rendering allowance, or third-party API is currently available.</p>`],
      ["incidents", "Reporting an issue", `<p>Send a public reproduction URL, timestamp, browser, and visible error code to <a href="mailto:hello@auditicle.site?subject=Auditicle%20System%20Issue">hello@auditicle.site</a>. Never send API keys or private URLs.</p>`]
    ]
  },
  {
    slug: "faq",
    title: "Frequently Asked Questions",
    eyebrow: "COMMON QUESTIONS",
    description: "Answers about Auditicle’s article-first scope, deterministic scoring, AI fallback, rendered browser, robots.txt, PageSpeed, quotas, privacy, exports, and limitations.",
    intro: "Clear answers about what Auditicle measures, how it collects evidence, and what its scores cannot guarantee.",
    type: "FAQPage",
    faq: true,
    sections: [
      ["what", "What does Auditicle audit?", `<p>Auditicle audits a single public article-like page across Technical SEO, GEO readiness, AEO readiness, RAG retrieval readiness, and LLMO / AI citation readiness, with additional rendering, PageSpeed, discovery, and link evidence.</p>`],
      ["deterministic", "Are the scores generated by AI?", `<p>No. Scores, findings, severity, evidence IDs, coverage, and score status are deterministic. AI can explain the completed report but cannot change it.</p>`],
      ["no-key", "What happens when no AI key is configured?", `<p>The core audit remains complete. The consultant narrative uses an Auditicle deterministic fallback. Translation is unavailable until a supported provider key is configured.</p>`],
      ["render", "When does Auto mode use a rendered browser?", `<p>Auto mode starts with server HTML and uses deterministic heuristics to detect a thin JavaScript application shell. If rendering fails, server HTML remains the evidence source and the limitation is disclosed.</p>`],
      ["robots", "Does Auditicle respect robots.txt?", `<p>Yes. It evaluates AuditicleBot rules first and wildcard rules second, with Allow, Disallow, wildcard, end-anchor, and longest-match behavior. A disallowed target is not fetched or scored.</p>`],
      ["quota", "Does a failed audit consume the daily quota?", `<p>Not when failure occurs before trustworthy primary HTML evidence is acquired. The quota is committed only after primary evidence exists.</p>`],
      ["pagespeed", "Is PageSpeed required?", `<p>No. Mobile and desktop PageSpeed evidence strengthens the report, but the primary audit can finish when the API is unavailable. The report labels missing data.</p>`],
      ["privacy", "Does Auditicle store the audited HTML?", `<p>Auditicle does not intentionally persist completed reports or raw target HTML in an application database. Raw HTML is also excluded from the downloadable JSON export. Infrastructure providers can still process operational logs under their own settings.</p>`],
      ["guarantee", "Can Auditicle guarantee ranking or AI citation?", `<p>No. Readiness scores and recommendations describe observable conditions and do not guarantee rankings, traffic, AI Overview inclusion, RAG ingestion, or citation by any AI system.</p>`],
      ["block", "How can a site owner block AuditicleBot?", `<p>Add a robots.txt group for <code>AuditicleBot</code> with the desired Disallow rules. See <a href="/crawler-information.html#block">Crawler Information</a> for examples.</p>`]
    ]
  },
  {
    slug: "changelog",
    title: "Changelog",
    eyebrow: "PRODUCT HISTORY",
    description: "Auditicle release notes covering evidence collection, deterministic scoring, article intelligence, public trust pages, theme modes, security, and deployment changes.",
    intro: "Material product, evidence, scoring, security, and information-architecture changes.",
    type: "WebPage",
    sections: [
      ["v4-8", "Version 4.8.0 — SEO growth foundation and Free-tier controls", `<p><strong>Released: July 14, 2026.</strong></p><ul><li>Prerendered meaningful homepage content into the initial HTML while retaining the React audit application.</li><li>Added supplied favicon and application icons plus a 1200×630 Open Graph image across public pages.</li><li>Added eight distinct high-intent article-audit landing pages with clean production canonicals, specific evidence examples, report screenshots, worked findings, use cases, limitations, unique FAQs, and direct audit CTAs.</li><li>Published the Article Readiness Benchmark 2026 pre-results protocol, data dictionary, safe collection template, aggregation script, and honest zero-sample status without fabricated findings.</li><li>Made sitemap lastmod values explicit and stable until material content changes.</li><li>Added non-production noindex headers and a disallow-all staging robots response while keeping production robots crawlable.</li><li>Added robots, sitemap, and PageSpeed evidence caching.</li><li>Added a Durable Object coordinator for global audit, rendered-browser, and provider request budgets.</li><li>Applied the launch profile: five audits per IP/day, five links in one batch, one AI report, one translation, and Auto evidence mode.</li><li>Added CPU and external-subrequest limits, provider budget caps, and continued server-HTML fallback when rendered-browser allowance is unavailable.</li><li>Updated the donation destination to SociaBuzz.</li></ul>`],
      ["v4-7-1", "Version 4.7.1 — Responsive report and complete translation", `<p><strong>Released: July 14, 2026.</strong></p><ul><li>Made result navigation adaptive across mobile selectors, tablet layouts, and the desktop section rail.</li><li>Removed unintended horizontal overflow at 360 px, 768 px, and desktop widths.</li><li>Converted findings and link tables into labeled evidence cards on narrow screens and prevented support controls from covering report content.</li><li>Expanded translation to every visible report string, including labels, evidence, owners, limitations, PageSpeed details, link errors, article intelligence, consultant narrative, and disclaimer.</li><li>Rejects incomplete or mixed-language provider output and tries the next configured provider.</li><li>Preserves deterministic scores, IDs, priorities, URLs, and measurements during translation.</li><li>Added translation completeness and immutable-value tests.</li></ul>`],
      ["v4-7", "Version 4.7.0 — Trust Center and deterministic fallback", `<p><strong>Released: July 14, 2026.</strong></p><ul><li>Added AI Transparency, Data Sources, Crawler Information, and System Information pages.</li><li>Expanded Features, Methodology, Docs, Privacy, Terms, Disclaimer, About, Contact, Accessibility, Use Cases, FAQ, and homepage metadata.</li><li>Added complete Dark, Light, and System theme modes with pre-render application and localStorage persistence.</li><li>Changed AI provider handling so missing keys are skipped and the first configured provider is not mislabeled as fallback.</li><li>Added a deterministic consultant narrative when all report providers are unavailable.</li><li>Aligned the public contact variable with <code>PUBLIC_CONTACT_EMAIL</code>.</li><li>Added static-page metadata, duplicate-ID checks, internal-link validation, and a noindex 404 response.</li><li>Refined bot-challenge detection to reduce false positives from ordinary CAPTCHA markup.</li><li>Required a completed primary audit before link, narrative, or translation endpoints can be used and added per-session action limits.</li><li>Added public DNS resolution checks before outbound fetches and redirects.</li><li>Reused the secured audit session for evidence retries instead of submitting a single-use Turnstile token twice.</li><li>Updated Content Security Policy support for optional Cloudflare Web Analytics.</li></ul>`],
      ["v4-6", "Version 4.6.0 — Light mode and article intelligence", `<ul><li>Introduced five article-readiness scorecards.</li><li>Added server and rendered-browser evidence modes.</li><li>Added deterministic scoring, coverage states, report translation, safe exports, PageSpeed, bounded link checks, robots compliance, and Cloudflare single-Worker deployment.</li></ul>`],
      ["methodology", "Methodology versioning", `<p>Future changes that materially alter scoring, evidence coverage, crawler behavior, or AI constraints will be documented here. Individual reports include a rule-set identifier.</p>`]
    ]
  }
];

pages.push(...seoPages, ...researchPages);

const mainNav = `
<a href="/features.html">Features</a>
<a href="/use-cases.html">Use cases</a>
<a href="/methodology.html">Methodology</a>
<a href="/docs.html">Docs</a>
<a href="/article-readiness-benchmark-2026">Research</a>`;

const trustLinks = `
<a href="/ai-transparency.html">AI Transparency</a>
<a href="/data-sources.html">Data Sources</a>
<a href="/crawler-information.html">Crawler Info</a>
<a href="/system-status.html">System Info</a>`;

const themeControl = `<div class="theme-control" data-theme-control role="group" aria-label="Color theme"><button type="button" data-theme-mode="system">System</button><button type="button" data-theme-mode="dark">Dark</button><button type="button" data-theme-mode="light">Light</button></div>`;

function canonicalFor(page) {
  return page.cleanUrl ? `${site}/${page.slug}` : `${site}/${page.slug}.html`;
}

function pageLastmod(page) {
  // Deliberately explicit and stable. Update this property only when page content materially changes.
  return page.lastmod || "2026-07-14";
}

function schemaFor(page) {
  const url = canonicalFor(page);
  const graph = [
    { "@type": "WebSite", "@id": `${site}/#website`, name: "Auditicle", url: `${site}/`, description: "Evidence-based article auditing for Technical SEO, GEO, AEO, RAG retrieval, and LLMO readiness." },
    { "@type": "Organization", "@id": `${site}/#organization`, name: "Auditicle", url: `${site}/`, logo: { "@type": "ImageObject", url: `${site}/android-chrome-512x512.png` }, email: "hello@auditicle.site" },
    { "@type": page.type, "@id": `${url}#webpage`, url, name: `${page.title} — Auditicle`, description: page.description, isPartOf: { "@id": `${site}/#website` }, about: { "@id": `${site}/#organization` }, primaryImageOfPage: { "@type": "ImageObject", url: ogImage }, inLanguage: "en", dateModified: pageLastmod(page) },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Auditicle", item: `${site}/` }, { "@type": "ListItem", position: 2, name: page.title, item: url }] }
  ];
  if (page.faq) {
    const explicitFaq = page.sections.filter(([id]) => String(id).startsWith("faq-"));
    const faqSections = explicitFaq.length ? explicitFaq : page.sections;
    graph[2].mainEntity = faqSections.map(([, question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() } }));
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}

function iconLinks() {
  return `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`;
}

function pageHtml(page) {
  const canonical = canonicalFor(page);
  const toc = page.sections.map(([id, heading]) => `<a href="#${id}">${heading}</a>`).join("");
  const sections = page.sections.map(([id, heading, body]) => `<section id="${id}"><h2>${heading}</h2>${body}</section>`).join("");
  return `<!doctype html>
<html lang="en" data-theme-mode="system">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${page.title} — Auditicle</title>
  <meta name="description" content="${page.description}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <meta name="theme-color" content="#07111f">
  <link rel="canonical" href="${canonical}">
  ${iconLinks()}
  <link rel="stylesheet" href="/legal.css">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta property="og:site_name" content="Auditicle">
  <meta property="og:title" content="${page.title} — Auditicle">
  <meta property="og:description" content="${page.description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Auditicle evidence-based article intelligence audit">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${page.title} — Auditicle">
  <meta name="twitter:description" content="${page.description}">
  <meta name="twitter:image" content="${ogImage}">
  <script src="/theme.js"></script>
  <script type="application/ld+json">${schemaFor(page)}</script>
  ${page.extraScript ? `<script src="${page.extraScript}" defer></script>` : ""}
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="/" aria-label="Auditicle home"><span class="mark"><img src="/favicon-32x32.png" width="32" height="32" alt=""></span><span>Auditicle<small>SEO FORENSICS LAB</small></span></a>
    <nav class="desktop-nav" aria-label="Primary navigation">${mainNav}<details class="nav-more"><summary>Trust center</summary><div>${trustLinks}<a href="/privacy.html">Privacy</a><a href="/accessibility.html">Accessibility</a></div></details>${themeControl}</nav>
    <details class="mobile-menu"><summary>Menu</summary><div>${mainNav}${trustLinks}<a href="/free-article-seo-audit-tool">Free audit tool</a><a href="/article-readiness-benchmark-2026">Benchmark 2026</a><a href="/about.html">About</a><a href="/contact.html">Contact</a>${themeControl}</div></details>
  </header>
  <main class="page-shell" id="main-content">
    <div class="page-hero"><div class="eyebrow">${page.eyebrow}</div><h1>${page.title}</h1><p>${page.intro}</p></div>
    <div class="page-layout">
      <aside class="toc"><strong>ON THIS PAGE</strong>${toc}</aside>
      <article class="content">${sections}<div class="cta-row"><a class="button primary" href="/#audit-form">Open a case file</a><a class="button secondary" href="/methodology.html">Review methodology</a><a class="button secondary" href="/data-sources.html">Inspect data sources</a></div><p class="updated">Last updated: ${page.updatedDisplay || updated}. Sitemap lastmod changes only after a material content update.</p></article>
    </div>
  </main>
  <footer class="site-footer"><div><strong>Auditicle</strong><span>Evidence-based article audits. No ranking or AI citation guarantees.</span></div><nav aria-label="Footer navigation"><a href="/free-article-seo-audit-tool">Free article audit</a><a href="/article-seo-checker">Article SEO checker</a><a href="/technical-seo-article-audit">Technical audit</a><a href="/geo-readiness-audit">GEO audit</a><a href="/aeo-readiness-checker">AEO checker</a><a href="/rag-retrieval-readiness">RAG readiness</a><a href="/ai-citation-readiness-checker">AI citation readiness</a><a href="/rendered-html-seo-audit">Rendered HTML audit</a><a href="/article-readiness-benchmark-2026">Benchmark 2026</a><a href="/features.html">Features</a><a href="/methodology.html">Methodology</a><a href="/docs.html">Docs</a><a href="/ai-transparency.html">AI Transparency</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/contact.html">Contact</a></nav></footer>
</body>
</html>`;
}

async function writePage(page) {
  if (page.cleanUrl) {
    const dir = join(outDir, page.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), pageHtml(page));
  } else {
    await writeFile(join(outDir, `${page.slug}.html`), pageHtml(page));
  }
}

function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sitemapXml() {
  const entries = [
    { url: `${site}/`, lastmod: "2026-07-14", changefreq: "weekly", priority: "1.0" },
    ...pages.map((page) => ({
      url: canonicalFor(page),
      lastmod: pageLastmod(page),
      changefreq: page.changefreq || (page.slug === "system-status" ? "weekly" : "monthly"),
      priority: page.priority || "0.6"
    }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((entry) => `  <url><loc>${escapeXml(entry.url)}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`).join("\n")}\n</urlset>\n`;
}

await Promise.all(pages.map(writePage));
await writeFile(join(outDir, "sitemap.xml"), sitemapXml());
const notFound = `<!doctype html>
<html lang="en" data-theme-mode="system">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Case File Not Found — Auditicle</title>
  <meta name="description" content="The requested Auditicle page could not be found.">
  <meta name="robots" content="noindex,follow">
  <meta name="theme-color" content="#07111f">
  ${iconLinks()}
  <link rel="stylesheet" href="/legal.css">
  <script src="/theme.js"></script>
</head>
<body>
  <main class="page-shell" id="main-content">
    <div class="page-hero"><div class="eyebrow">404 / CASE FILE MISSING</div><h1>Page not found</h1><p>The requested public case file does not exist or has moved.</p><div class="cta-row"><a class="button primary" href="/">Return to Auditicle</a><a class="button secondary" href="/docs.html">Open documentation</a></div></div>
  </main>
</body>
</html>`;
await writeFile(join(outDir, "404.html"), notFound);
console.log(`Generated ${pages.length} public pages, a stable sitemap, and 404.html.`);
