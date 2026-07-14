const reportShot = (slug, alt, caption) => `<figure class="report-shot"><img src="/assets/reports/${slug}.webp" width="1280" height="1200" loading="lazy" decoding="async" alt="${alt}"><figcaption>${caption} The screenshot is an illustrative Auditicle report generated with simulated preview data; it is not a claim about a real audited publisher.</figcaption></figure>`;

const evidenceExample = (rows) => `<div class="table-wrap"><table><thead><tr><th>Evidence</th><th>Observed value</th><th>Interpretation</th></tr></thead><tbody>${rows.map(([a,b,c])=>`<tr><td><strong>${a}</strong></td><td>${b}</td><td>${c}</td></tr>`).join("")}</tbody></table></div>`;

export const seoPages = [
  {
    slug: "free-article-seo-audit-tool",
    cleanUrl: true,
    title: "Free Article SEO Audit Tool",
    eyebrow: "FREE ARTICLE AUDIT",
    description: "Audit one public article for Technical SEO, crawlability, metadata, structure, PageSpeed, links, GEO, AEO, RAG retrieval, and AI citation readiness with evidence-led findings.",
    intro: "A free article-first audit that separates crawler evidence, deterministic findings, readiness scorecards, and optional AI explanation instead of reducing a page to one opaque SEO score.",
    type: "WebPage",
    lastmod: "2026-07-14",
    updatedDisplay: "July 14, 2026",
    priority: "0.9",
    changefreq: "monthly",
    faq: true,
    sections: [
      ["what-it-checks", "What the free article audit checks", `<p>Auditicle examines one public URL as an article, documentation page, landing page, product page, category page, or homepage. It starts with robots.txt, validates every redirect, collects server HTML, and can use a rendered browser when Auto mode detects a thin JavaScript shell.</p><p>The resulting case file separates Technical SEO, GEO, AEO, RAG retrieval, and LLMO readiness. It also records evidence coverage, score status, mobile and desktop PageSpeed evidence, selected link outcomes, sitemap discovery, and limitations.</p><div class="grid"><div class="card"><span class="badge">NO ACCOUNT</span><h3>One public URL</h3><p>Paste an accessible HTTP or HTTPS article. Auditicle does not log in, bypass access controls, or scan private networks.</p></div><div class="card"><span class="badge">DETERMINISTIC</span><h3>Evidence before advice</h3><p>Scores and findings come from bounded rules. AI can explain the finished report but cannot change it.</p></div></div>`],
      ["evidence-example", "Example evidence from a free audit", `${evidenceExample([
        ["Canonical", "https://example.com/guides/article-audit", "A self-referencing canonical was detected in the acquired HTML."],
        ["Visible author", "Not detected", "The article lacks an observable authorship signal in the extracted article region."],
        ["Article schema", "Article + BreadcrumbList", "Structured data types were parsed, but property completeness still requires review."],
        ["Server HTML", "1,240 words", "The crawler-facing response contains material article text without requiring rendering."]
      ])}<div class="notice">Evidence examples describe how Auditicle reports observations. They do not imply that a detected signal is correct, authoritative, indexed, or rewarded by a search engine.</div>`],
      ["report-screenshot", "What the report looks like", reportShot("free-article-seo-audit-tool", "Auditicle homepage and article audit form with forensic scanner", "The free workflow begins with a public URL and an evidence mode selection.")],
      ["example-finding", "Example finding: article provenance is incomplete", `<div class="finding-example"><span class="badge warning">WARNING</span><h3>Article provenance signals are incomplete</h3><p><strong>Verified evidence:</strong> no visible author signal was extracted and no publication or modified date was detected in the article region.</p><p><strong>Why it matters:</strong> readers and retrieval systems benefit from knowing who produced a document and when it was published or revised.</p><p><strong>Recommended action:</strong> add accurate visible attribution and dates, then align supported Article structured-data properties with the visible page.</p><p><strong>Validation:</strong> rerun the audit and inspect both visible content and parsed structured data. Do not add dates or authors that cannot be substantiated.</p></div>`],
      ["when-useful", "When this tool is useful", `<ul><li>Before publishing a long-form article or technical guide.</li><li>After a redesign, CMS migration, theme change, or JavaScript framework migration.</li><li>When an article looks complete in a browser but may deliver little content in server HTML.</li><li>When an editorial team needs a prioritized evidence ledger instead of a generic checklist.</li><li>When comparing before-and-after changes using the same public URL and methodology.</li></ul>`],
      ["limitations", "Free audit limitations", `<p>The free launch configuration intentionally limits resource use. A visitor can complete five successful audits per UTC day, link checks are capped at five links in one batch, one AI narrative and one translation are allowed per session, and rendered-browser attempts are globally limited.</p><p>Auditicle does not query Google Search Console, verify indexing, measure backlinks, inspect private analytics, prove factual accuracy, or guarantee ranking, rich results, AI Overview inclusion, ingestion, or citation.</p>`],
      ["faq-cost", "Is the article audit really free?", `<p>Yes. The public launch configuration does not require an account or payment. Daily and feature limits protect the shared Cloudflare and third-party allowances.</p>`],
      ["faq-ai", "Does AI decide the SEO score?", `<p>No. AI is optional and receives a reduced report only after deterministic evidence collection and scoring are complete.</p>`],
      ["faq-site", "Can it audit an entire website?", `<p>No. Auditicle is intentionally page-first. Sitemap and link evidence provide context, but the score describes the submitted page rather than the entire domain.</p>`]
    ]
  },
  {
    slug: "article-seo-checker",
    cleanUrl: true,
    title: "Article SEO Checker",
    eyebrow: "ARTICLE-LEVEL DIAGNOSIS",
    description: "Check a published article’s title, description, canonical, headings, authorship, dates, citations, structured data, article body, language, images, and links with traceable evidence.",
    intro: "A focused article SEO checker for editors and publishers who need to know what was actually found, what remains uncertain, and which changes can be verified after implementation.",
    type: "WebPage",
    lastmod: "2026-07-14",
    updatedDisplay: "July 14, 2026",
    priority: "0.9",
    changefreq: "monthly",
    faq: true,
    sections: [
      ["article-signals", "Article signals checked", `<p>Generic website graders often treat every URL alike. Auditicle applies contextual expectations to article-like pages and records the signals that matter to an editorial document: one descriptive title, a useful meta description, canonical consistency, visible H1 and section hierarchy, author and date signals, article-body length, references, external source links, schema types, image alternatives, language metadata, and internal navigation.</p><p>The checker does not reward a field merely because it exists. It distinguishes presence from quality and marks interpretation separately from direct evidence.</p>`],
      ["evidence-example", "Example article evidence ledger", `${evidenceExample([
        ["Title element", "How to Validate RAG Sources — Example", "Present, unique within this page response, and 46 characters long."],
        ["H1", "How to Validate Sources in a RAG Pipeline", "One visible H1 was extracted; wording differs from the title without creating a conflicting topic."],
        ["Modified date", "2026-06-18", "A visible date and dateModified property agree."],
        ["External sources", "7 links across 5 domains", "Source links exist; Auditicle does not independently verify the claims they support."]
      ])}`],
      ["report-screenshot", "Article intelligence summary", reportShot("article-seo-checker", "Auditicle article intelligence scorecards and case overview", "The article checker keeps five diagnostic dimensions separate so a strong technical foundation does not conceal provenance or extraction gaps.")],
      ["example-finding", "Example finding: heading structure hides the answer", `<div class="finding-example"><span class="badge notice">NOTICE</span><h3>The primary answer begins before a descriptive section heading</h3><p><strong>Found:</strong> the first 420 words contain several topic shifts, while the first H2 appears after the introduction.</p><p><strong>Action:</strong> introduce a descriptive H2 before the first major subtopic and keep the answer under that heading self-contained.</p><p><strong>Validation:</strong> confirm the heading appears in both server HTML and the rendered document, then check that the section can be understood without relying on unrelated preceding text.</p></div>`],
      ["editorial-use", "When editors should run it", `<ul><li>During final editorial QA before a post moves from draft to production.</li><li>When updating an evergreen article and deciding whether the visible revision date is justified.</li><li>When two articles compete for the same intent and their topic boundaries need clarification.</li><li>When an author page, byline component, or citation module has changed.</li><li>When an article loses traffic after a template or CMS release and the page evidence needs to be compared.</li></ul>`],
      ["limitations", "What the checker cannot establish", `<p>It cannot determine whether an author is a subject-matter expert, whether a claim is true, whether a source is independent, whether Google selected a canonical, or whether a page is indexed. Those questions require editorial review, Search Console, external research, or other evidence.</p>`],
      ["faq-score", "What is a good article SEO score?", `<p>There is no universal threshold. Use the score to prioritize findings inside the same methodology, and inspect evidence coverage and score status before comparing pages.</p>`],
      ["faq-draft", "Can it check an unpublished draft?", `<p>Only when the draft is publicly accessible without credentials and allowed by robots.txt. Private staging and authenticated preview URLs are rejected by design.</p>`],
      ["faq-keywords", "Does the checker require a target keyword?", `<p>No. Keyword fields are optional context. The audit still evaluates observable page structure and technical evidence without them.</p>`]
    ]
  },
  {
    slug: "technical-seo-article-audit",
    cleanUrl: true,
    title: "Technical SEO Article Audit",
    eyebrow: "CRAWLER-FACING EVIDENCE",
    description: "Run a technical SEO audit for one article using server HTML, rendered DOM evidence, status and redirect validation, robots directives, canonicals, structured data, PageSpeed, and bounded link checks.",
    intro: "A technical article audit designed to show what the server returned, what JavaScript changed, and which crawler-facing signals can be confirmed without claiming index status or rankings.",
    type: "WebPage",
    lastmod: "2026-07-14",
    updatedDisplay: "July 14, 2026",
    priority: "0.85",
    changefreq: "monthly",
    faq: true,
    sections: [
      ["technical-scope", "Technical scope for a single article", `<p>The audit begins before HTML parsing. Auditicle validates the public hostname, blocks private or reserved network destinations, checks robots.txt for AuditicleBot and wildcard rules, follows a bounded redirect chain, classifies HTTP failures, rejects non-HTML responses, limits response size, and detects common bot challenges.</p><p>After acquisition it evaluates meta robots and X-Robots-Tag, canonical markup, language and viewport metadata, heading order, duplicate IDs, image alternative text, structured-data parsing, link composition, and performance evidence.</p>`],
      ["evidence-example", "Example technical evidence", `${evidenceExample([
        ["HTTP chain", "301 → 200", "The submitted HTTP URL redirected once to the HTTPS canonical host."],
        ["Robots decision", "Allowed for AuditicleBot", "No matching Disallow rule won the longest-match evaluation."],
        ["X-Robots-Tag", "none", "No response-header directive was detected; HTML meta directives are evaluated separately."],
        ["Rendered delta", "+18,440 bytes", "Auto mode found a thin server shell and acquired a materially larger rendered DOM."]
      ])}`],
      ["report-screenshot", "Technical findings and priority ledger", reportShot("technical-seo-article-audit", "Auditicle technical findings table and forensic action plan", "Confirmed technical findings are tied to evidence IDs, impact, effort, owner, and a validation method.")],
      ["example-finding", "Example finding: canonical target is inconsistent", `<div class="finding-example"><span class="badge warning">WARNING</span><h3>The canonical points to a different host than the final page URL</h3><p><strong>Verified evidence:</strong> the final URL is <code>https://www.example.com/guide</code>, while the canonical points to <code>https://example.com/guide</code>.</p><p><strong>Recommended action:</strong> choose the intended preferred host, align redirects and internal links, and render one consistent absolute canonical.</p><p><strong>Validation:</strong> request both hosts, inspect the final redirect destination, and confirm the canonical matches the intended production URL.</p></div>`],
      ["when-useful", "When this audit is most useful", `<ul><li>After moving an article between hosts, protocols, paths, or frameworks.</li><li>When client-side rendering may hide metadata or article text from the initial response.</li><li>When robots directives, canonicals, or status codes differ across edge and origin layers.</li><li>When PageSpeed regressions need to be connected to a specific article template.</li><li>When validating a remediation ticket with repeatable public evidence.</li></ul>`],
      ["limitations", "Technical audit limitations", `<p>Auditicle does not execute a full crawl, inspect log files, query Search Console, render every device or geography, test all links, validate every structured-data property against a rich-result program, or reproduce every search crawler. PageSpeed data is third-party evidence and may be cached for 12 hours.</p>`],
      ["faq-render", "Does rendered HTML replace server HTML?", `<p>No. Both are retained as separate evidence sources. Server HTML remains the crawler-facing baseline, and rendered output is used only when selected or triggered.</p>`],
      ["faq-links", "How many links are checked?", `<p>The Free launch profile checks at most five selected destinations in one batch. Unchecked links remain explicitly unverified.</p>`],
      ["faq-cwv", "Does a Lighthouse score prove Core Web Vitals?", `<p>No. Lighthouse is lab evidence. Field Core Web Vitals require real-user data when available.</p>`]
    ]
  },
  {
    slug: "geo-readiness-audit",
    cleanUrl: true,
    title: "GEO Readiness Audit",
    eyebrow: "GENERATIVE SEARCH READINESS",
    description: "Evaluate an article’s generative search readiness through crawlability, entity clarity, provenance, source support, authorship, dates, structured organization, and evidence coverage—without AI visibility guarantees.",
    intro: "A GEO readiness audit grounded in ordinary search fundamentals and observable article evidence, not a promise that a generative engine will select, summarize, or cite the page.",
    type: "WebPage",
    lastmod: "2026-07-14",
    updatedDisplay: "July 14, 2026",
    priority: "0.8",
    changefreq: "monthly",
    faq: true,
    sections: [
      ["definition", "What GEO readiness means in Auditicle", `<p>Auditicle uses GEO as a diagnostic view of whether a public article is accessible, attributable, clearly organized, and supported well enough to be interpreted by generative search systems. The score draws from crawl access, article identity, visible authorship, publication and revision signals, source links, claim-support patterns, descriptive headings, and unique article content.</p><p>It does not treat special files, keyword density, or speculative prompt patterns as shortcuts to AI visibility.</p>`],
      ["evidence-example", "Example GEO evidence", `${evidenceExample([
        ["Publisher identity", "Organization schema + visible publisher", "The machine-readable and visible publisher names agree."],
        ["Author provenance", "Byline present; author profile not linked", "Attribution exists, but readers cannot reach supporting author context from the article."],
        ["Reference section", "Detected", "A dedicated source list is present after the article body."],
        ["Update signal", "dateModified present and visible", "The structured and visible revision dates match; Auditicle cannot verify whether the changes were material."]
      ])}`],
      ["report-screenshot", "GEO dimension in the case file", reportShot("geo-readiness-audit", "Auditicle GEO readiness card with strengths gaps and optimization actions", "GEO is reported beside—not instead of—Technical SEO, AEO, RAG, and LLMO evidence.")],
      ["example-finding", "Example finding: claims lack attributable source context", `<div class="finding-example"><span class="badge warning">WARNING</span><h3>Several quantitative claims are not connected to visible sources</h3><p><strong>Found:</strong> the extracted article contains percentage and date claims, while the article snapshot contains no nearby source links or citation markers.</p><p><strong>Action:</strong> attach each material claim to an appropriate primary or authoritative source and make the relationship understandable to readers.</p><p><strong>Caution:</strong> adding links does not prove that a claim is correct or guarantee selection by a generative system.</p></div>`],
      ["when-useful", "When to run a GEO audit", `<ul><li>When publishing research, comparisons, definitions, or decision-support content likely to be summarized.</li><li>When an article has strong traditional SEO but weak author, publisher, or source context.</li><li>When a content team wants to improve traceability without rewriting for an imagined AI formula.</li><li>When reviewing whether an update date is visible, consistent, and defensible.</li></ul>`],
      ["limitations", "GEO limitations", `<p>No public page audit can observe the private selection logic, index state, retrieval corpus, or citation policy of every AI system. Auditicle therefore reports readiness conditions and uncertainty. It never labels a page “AI optimized” as a guaranteed outcome.</p>`],
      ["faq-seo", "Is GEO different from SEO?", `<p>Auditicle treats GEO as a specialized diagnostic view built on crawlability, useful content, provenance, structure, and source support. It does not replace SEO.</p>`],
      ["faq-schema", "Is there a special GEO schema type?", `<p>No special GEO schema is required. Use structured data that accurately describes visible content and the real page entity.</p>`],
      ["faq-citation", "Will a high GEO score earn an AI citation?", `<p>No. A high score only means more of Auditicle’s observable readiness criteria were satisfied.</p>`]
    ]
  },
  {
    slug: "aeo-readiness-checker",
    cleanUrl: true,
    title: "AEO Readiness Checker",
    eyebrow: "ANSWER EXTRACTION",
    description: "Check whether an article presents direct, well-scoped answers through descriptive question headings, definitions, lists, tables, concise introductions, and self-contained sections without promising answer-engine placement.",
    intro: "An answer-engine readiness checker that looks for extractable information architecture while preserving nuance, evidence, and the reader’s ability to understand the full article.",
    type: "WebPage",
    lastmod: "2026-07-14",
    updatedDisplay: "July 14, 2026",
    priority: "0.8",
    changefreq: "monthly",
    faq: true,
    sections: [
      ["what-is-aeo", "What AEO readiness checks", `<p>The AEO dimension evaluates whether a reader or answer system can locate a question, identify the answer boundary, and extract a useful response without reconstructing meaning from unrelated sections. Signals include question-style headings, definitions, short answer openings, descriptive H2/H3 labels, ordered steps, comparison tables, FAQ markup that matches visible content, and section independence.</p><p>Long-form depth remains valuable. Auditicle does not recommend reducing every topic to a sentence or flooding a page with repetitive questions.</p>`],
      ["evidence-example", "Example answer evidence", `${evidenceExample([
        ["Question headings", "6 of 14 headings", "Several sections map directly to reader questions."],
        ["Definition pattern", "2 detected", "Two sections begin with a concise term definition before expanding."],
        ["Tables", "1 comparison table", "A structured comparison can support direct extraction when headers are descriptive."],
        ["Intro length", "184 words", "The introduction provides context but may delay the first direct answer for a narrow query."]
      ])}`],
      ["report-screenshot", "AEO strengths and gaps", reportShot("aeo-readiness-checker", "Auditicle AEO readiness report showing evidence-based strengths and gaps", "The checker distinguishes direct-answer structure from the broader quality or truth of the answer.")],
      ["example-finding", "Example finding: the definition is buried", `<div class="finding-example"><span class="badge notice">NOTICE</span><h3>The key term is explained but not defined near its heading</h3><p><strong>Found:</strong> the section titled “What is retrieval grounding?” begins with background history; the concise definition appears in the fourth paragraph.</p><p><strong>Action:</strong> place an accurate one- or two-sentence definition immediately after the heading, then preserve the detailed explanation below.</p><p><strong>Validation:</strong> read the heading plus opening paragraph in isolation and confirm they answer the stated question without overstating the concept.</p></div>`],
      ["when-useful", "When AEO review helps", `<ul><li>For how-to guides, glossaries, troubleshooting articles, comparison pages, and policy explainers.</li><li>When readers must scroll through long introductions before finding the requested answer.</li><li>When an article uses vague headings such as “Overview,” “More details,” or “Next steps.”</li><li>When FAQ schema exists and needs to be checked against visible questions and answers.</li></ul>`],
      ["limitations", "AEO limitations", `<p>The checker cannot know which query an engine will ask, whether an answer is factually correct, or whether a snippet will be displayed. Extractability is one quality dimension; editorial accuracy, completeness, safety, and context still require human review.</p>`],
      ["faq-short", "Should every answer be short?", `<p>No. Lead with a direct response when the question permits one, then provide the detail, qualifications, evidence, and exceptions the reader needs.</p>`],
      ["faq-faq", "Do I need FAQ schema?", `<p>No. Clear visible questions and answers can be useful without FAQ schema. Structured data must match visible content and applicable policies.</p>`],
      ["faq-headings", "Do question headings improve every article?", `<p>No. Use them when they reflect genuine reader intent. Descriptive declarative headings can be equally clear.</p>`]
    ]
  },
  {
    slug: "rag-retrieval-readiness",
    cleanUrl: true,
    title: "RAG Retrieval Readiness Audit",
    eyebrow: "RETRIEVABLE ARTICLE STRUCTURE",
    description: "Assess whether a public article is easy to segment, retrieve, attribute, and understand in RAG workflows through stable sections, descriptive headings, local context, citations, and public crawl access.",
    intro: "A public-page RAG readiness audit for content teams that want sections to remain useful after chunking—without claiming that any private retrieval system has indexed the page.",
    type: "WebPage",
    lastmod: "2026-07-14",
    updatedDisplay: "July 14, 2026",
    priority: "0.8",
    changefreq: "monthly",
    faq: true,
    sections: [
      ["rag-scope", "What retrieval readiness means", `<p>RAG systems commonly split documents into smaller units before retrieval. Auditicle evaluates public signals that can help those units remain understandable: descriptive headings, section anchors, local entity context, independent definitions, source attribution, consistent article identity, and content that is present in accessible HTML.</p><p>The score is about page design and evidence. It cannot observe a private chunker, embedding model, vector database, reranker, access policy, or ingestion schedule.</p>`],
      ["evidence-example", "Example retrieval evidence", `${evidenceExample([
        ["Headings with IDs", "11 of 13", "Most major sections have stable fragment identifiers."],
        ["Section samples", "8 extracted", "Auditicle captured bounded excerpts that remain associated with their headings."],
        ["Ambiguous pronouns", "Human review required", "Automated extraction cannot reliably determine whether every chunk preserves its entity context."],
        ["Citation links", "5 external sources", "Links exist within the article; claim-to-source alignment still requires editorial review."]
      ])}`],
      ["report-screenshot", "RAG readiness dimension", reportShot("rag-retrieval-readiness", "Auditicle RAG retrieval readiness card and section evidence", "The report uses article structure as a proxy for retrievability and labels the limits of that proxy.")],
      ["example-finding", "Example finding: a section depends on missing context", `<div class="finding-example"><span class="badge notice">NOTICE</span><h3>A comparison section relies on “this approach” without naming the approach</h3><p><strong>Found:</strong> the section opening contains pronouns that refer to a concept introduced two sections earlier.</p><p><strong>Action:</strong> restate the named concept in the section opening and keep the comparison criteria inside the section.</p><p><strong>Validation:</strong> copy the section into a separate document and confirm that a reader can identify the subject, scope, and source context without the preceding section.</p></div>`],
      ["when-useful", "When to use the RAG audit", `<ul><li>For technical documentation, knowledge-base articles, policies, standards, and research summaries.</li><li>When content is reused in internal search, support assistants, or enterprise knowledge systems.</li><li>When sections are long, headings are generic, or important definitions appear only once far from later references.</li><li>When public HTML differs materially from what a user sees after JavaScript rendering.</li></ul>`],
      ["limitations", "RAG limitations", `<p>A high readiness score does not prove ingestion, retrieval, grounding, answer accuracy, or permission to reuse the content. System owners must evaluate licensing, access control, freshness, chunking, embeddings, ranking, and safety in their own pipeline.</p>`],
      ["faq-ingest", "Can Auditicle tell whether ChatGPT or a private RAG system ingested my page?", `<p>No. It only evaluates the public page and selected crawler-access signals.</p>`],
      ["faq-chunks", "What is the ideal chunk size?", `<p>There is no universal size. Auditicle focuses on section clarity and local context rather than prescribing a token count.</p>`],
      ["faq-ids", "Are heading IDs required?", `<p>No, but stable anchors can improve deep linking, referencing, and document navigation when implemented consistently.</p>`]
    ]
  },
  {
    slug: "ai-citation-readiness-checker",
    cleanUrl: true,
    title: "AI Citation Readiness Checker",
    eyebrow: "ATTRIBUTION AND SOURCE SUPPORT",
    description: "Check public signals that can support AI citation readiness: crawl access, article identity, visible attribution, dates, source links, unique evidence, stable sections, and claim support—without citation guarantees.",
    intro: "A citation-readiness checker that identifies observable provenance and source-support conditions while making clear that no external AI system is required to cite a page.",
    type: "WebPage",
    lastmod: "2026-07-14",
    updatedDisplay: "July 14, 2026",
    priority: "0.8",
    changefreq: "monthly",
    faq: true,
    sections: [
      ["signals", "Signals used for AI citation readiness", `<p>Auditicle evaluates whether the article can be crawled, identified, attributed, dated, segmented, and connected to supporting sources. It considers author and publisher signals, Article structured data, visible publication context, reference sections, external-source diversity, stable canonical URLs, descriptive headings, and evidence that the page contributes specific information rather than an untraceable summary.</p><p>Search-discovery crawlers, training crawlers, and user-triggered retrieval are reported separately because they serve different purposes.</p>`],
      ["evidence-example", "Example citation-readiness evidence", `${evidenceExample([
        ["Canonical identity", "Stable HTTPS URL", "The article exposes one self-referencing canonical and no redirect conflict."],
        ["Byline", "Visible author linked to profile", "Readers can reach additional author context from the article."],
        ["Primary evidence", "Original test table present", "The article contains a labeled methodology and results table; Auditicle does not validate the experiment."],
        ["Crawler access", "OAI-SearchBot allowed; GPTBot disallowed", "Search discovery and training preferences are presented separately."]
      ])}`],
      ["report-screenshot", "Citation readiness and consultant narrative", reportShot("ai-citation-readiness-checker", "Auditicle AI citation readiness analysis and evidence-grounded narrative", "Optional AI prose explains deterministic findings; it does not create citation predictions.")],
      ["example-finding", "Example finding: original evidence is not reproducible", `<div class="finding-example"><span class="badge warning">WARNING</span><h3>The article reports test results without a visible method</h3><p><strong>Found:</strong> a results table and percentages are present, but no sample definition, collection period, or calculation method appears in the extracted article sections.</p><p><strong>Action:</strong> add a concise methodology, define the sample and exclusions, link downloadable aggregate data where appropriate, and state limitations.</p><p><strong>Validation:</strong> ask an independent reader whether the reported result can be interpreted and challenged from the published method.</p></div>`],
      ["when-useful", "When citation-readiness review is useful", `<ul><li>Before publishing original research, benchmarks, surveys, or product tests.</li><li>When an article synthesizes claims from several primary sources.</li><li>When a publisher wants clear crawler preferences without confusing training controls with search visibility.</li><li>When authorship, publisher identity, or revision history is incomplete.</li></ul>`],
      ["limitations", "Citation-readiness limitations", `<p>Auditicle cannot observe whether a model has seen a page, whether a retrieval product has indexed it, whether a user prompt will trigger it, or whether an answer system considers it the best source. It therefore prohibits guaranteed-citation language in generated recommendations.</p>`],
      ["faq-block", "Does blocking GPTBot block ChatGPT search?", `<p>Training and search-discovery controls are not interchangeable. Auditicle reports crawler purposes separately and avoids treating one bot rule as a universal AI visibility switch.</p>`],
      ["faq-llms", "Does llms.txt guarantee citation?", `<p>No. Auditicle exposes its own llms.txt as documentation, but does not score the file as a citation guarantee.</p>`],
      ["faq-original", "Must every article contain original research?", `<p>No. Clear attribution, accurate synthesis, and useful editorial contribution can still matter. Original evidence is one possible differentiator, not a universal requirement.</p>`]
    ]
  },
  {
    slug: "rendered-html-seo-audit",
    cleanUrl: true,
    title: "Rendered HTML SEO Audit",
    eyebrow: "SERVER VS BROWSER EVIDENCE",
    description: "Compare server-delivered HTML with a rendered browser DOM for JavaScript articles, while preserving robots compliance, SSRF protection, bounded rendering, and a server-HTML fallback.",
    intro: "A rendered HTML audit for diagnosing whether important article content and metadata are available before JavaScript—and what changes after a browser executes the page.",
    type: "WebPage",
    lastmod: "2026-07-14",
    updatedDisplay: "July 14, 2026",
    priority: "0.85",
    changefreq: "monthly",
    faq: true,
    sections: [
      ["modes", "Three evidence collection modes", `<div class="grid"><div class="card"><span class="badge">AUTO</span><h3>Render only when needed</h3><p>Acquire server HTML first. Deterministic heuristics trigger a browser when the response contains little readable content and application-shell markers.</p></div><div class="card"><span class="badge">SERVER HTML</span><h3>Lowest resource baseline</h3><p>Audit only the initial response to see what a simple crawler request receives.</p></div><div class="card"><span class="badge">RENDERED</span><h3>Execute public JavaScript</h3><p>Open the validated page in Cloudflare Browser Rendering when the account allowance and daily Auditicle budget are available.</p></div><div class="card"><span class="badge">FALLBACK</span><h3>Do not lose the audit</h3><p>If rendering is unavailable, continue with server HTML and mark affected interpretation as provisional.</p></div></div>`],
      ["evidence-example", "Example server/render comparison", `${evidenceExample([
        ["Server readable words", "54", "The initial response resembles an application shell."],
        ["Rendered readable words", "1,846", "The browser DOM contains the article body after JavaScript execution."],
        ["Canonical", "Present in both", "The canonical remained consistent across acquisition modes."],
        ["H1", "Missing server; present rendered", "The heading depends on client rendering and is disclosed as rendered evidence."]
      ])}`],
      ["report-screenshot", "Rendering and discovery evidence", reportShot("rendered-html-seo-audit", "Auditicle PageSpeed robots sitemap and rendering evidence panels", "The case file records the requested mode, used mode, byte counts, browser status, and fallback reason.")],
      ["example-finding", "Example finding: meaningful content depends on JavaScript", `<div class="finding-example"><span class="badge warning">WARNING</span><h3>The server response contains a thin application shell</h3><p><strong>Found:</strong> server HTML contains a root container and scripts but fewer than 80 readable words; rendered HTML contains the complete article.</p><p><strong>Action:</strong> evaluate SSR, SSG, or prerendering for the article route and ensure critical title, canonical, robots, H1, and primary content are present in the initial response.</p><p><strong>Validation:</strong> fetch the production URL without executing JavaScript and compare the meaningful text and metadata to the browser view.</p></div>`],
      ["when-useful", "When rendered auditing matters", `<ul><li>For React, Next.js, Vue, Nuxt, Angular, SPA, and headless CMS frontends.</li><li>When a browser shows content but HTML inspection shows only a root element.</li><li>When client navigation and direct URL requests behave differently.</li><li>When metadata is inserted late or changes after hydration.</li><li>When diagnosing a migration from server-rendered templates to a JavaScript application.</li></ul>`],
      ["limits", "Rendering limits and safeguards", `<p>The Free launch profile permits at most 20 rendered-browser attempts per UTC day across the application, subject to the Cloudflare account’s own Browser Run allowance. Every target and navigation request is validated against public-network rules and applicable robots access. Rendering has a 30-second application timeout and always closes the browser in a finally block.</p>`],
      ["faq-auto", "How does Auto mode decide to render?", `<p>It uses bounded heuristics such as low readable word count plus common application-shell markers. It does not use AI for this decision.</p>`],
      ["faq-google", "Does JavaScript automatically harm SEO?", `<p>No. The audit identifies evidence differences. Whether a specific implementation is discoverable and indexable depends on the actual output and search-engine processing.</p>`],
      ["faq-limit", "What happens when the browser limit is reached?", `<p>Auditicle continues with server HTML and records the limit as a rendering limitation rather than failing the entire audit.</p>`]
    ]
  }
];

export const researchPages = [
  {
    slug: "article-readiness-benchmark-2026",
    cleanUrl: true,
    title: "Auditicle Article Readiness Benchmark 2026",
    eyebrow: "ORIGINAL RESEARCH PROTOCOL",
    description: "The transparent methodology, data dictionary, sampling plan, aggregation workflow, and publication safeguards for Auditicle’s planned 1,000-article readiness benchmark.",
    intro: "A published pre-results protocol for a reproducible study of 1,000 public articles. The protocol is published now; aggregate results remain withheld until the sample is collected, quality-checked, and frozen.",
    type: "Report",
    lastmod: "2026-07-14",
    updatedDisplay: "July 14, 2026",
    priority: "0.85",
    changefreq: "monthly",
    sections: [
      ["status", "Research status", `<div class="research-status"><span class="status-dot pending"></span><div><strong>Protocol published · data collection not yet complete</strong><p><b>0 of 1,000</b> production audits are included in the public release dataset. No benchmark percentages or medians are published yet because inventing or extrapolating results would violate the evidence standard of this project.</p></div></div><p>The repository includes a data dictionary, blank collection template, aggregation script, and rules for freezing the sample. Results will be added only after every included record passes validation.</p>`],
      ["questions", "Research questions", `<ol><li>What percentage of sampled articles lack a visible author signal?</li><li>What percentage lack a visible and machine-readable modification date?</li><li>What percentage deliver materially thin server HTML compared with a rendered browser DOM?</li><li>What percentage contain no attributable external citation links?</li><li>What are the median Technical SEO, GEO, AEO, RAG, and LLMO readiness scores?</li><li>How do observable patterns differ across WordPress, Next.js, Webflow, and custom or other platforms?</li></ol>`],
      ["sample", "Sampling plan", `<p>The target sample is 1,000 public English-language article URLs. The proposed design uses stratified sampling across four platform groups, multiple topic categories, and a mix of publisher sizes. The final report must disclose the URL-discovery sources, collection dates, inclusion criteria, duplicate handling, inaccessible pages, and exclusions.</p><div class="table-wrap"><table><thead><tr><th>Stratum</th><th>Target</th><th>Purpose</th></tr></thead><tbody><tr><td>WordPress</td><td>250 articles</td><td>Represent a widely used server-rendered and plugin-driven publishing ecosystem.</td></tr><tr><td>Next.js</td><td>250 articles</td><td>Measure variation across SSR, SSG, ISR, and client-heavy implementations.</td></tr><tr><td>Webflow</td><td>250 articles</td><td>Observe a hosted visual-CMS publishing pattern.</td></tr><tr><td>Custom / other CMS</td><td>250 articles</td><td>Avoid treating three named platforms as the entire web.</td></tr></tbody></table></div><p>These targets are a protocol, not completed counts. If the final sample differs, the deviation and reason must be disclosed before results are interpreted.</p>`],
      ["variables", "Variables and operational definitions", `<ul><li><strong>Visible author:</strong> at least one author signal extracted from the visible article context. Schema-only authorship is reported separately.</li><li><strong>dateModified:</strong> parsed machine-readable modification evidence; visible revision dates are recorded separately and checked for agreement.</li><li><strong>Thin server HTML:</strong> a predefined low-readable-text threshold combined with application-shell markers and a material rendered-content increase.</li><li><strong>Citation links:</strong> external source links found within the article content snapshot; the study does not claim that every link supports a nearby claim.</li><li><strong>Platform:</strong> Auditicle’s deterministic platform inference with a confidence label. Low-confidence rows are grouped as unknown for platform comparisons.</li></ul>`],
      ["workflow", "Collection and quality-control workflow", `<ol><li>Freeze the URL sample and assign a non-identifying study row ID.</li><li>Run Auditicle using one declared rule-set version and a controlled evidence mode.</li><li>Store only safe JSON exports; raw target HTML is excluded.</li><li>Validate required fields, score status, evidence coverage, and platform confidence.</li><li>Remove duplicate canonical URLs and document exclusions.</li><li>Freeze the cleaned dataset before calculating percentages and medians.</li><li>Run the repository aggregation script and independently review the output.</li><li>Publish aggregate data, charts, methodology, and limitations. Do not publish private data or API credentials.</li></ol>`],
      ["downloads", "Research materials", `<div class="grid"><div class="card"><h3>Methodology</h3><p>The preregistered protocol in a portable Markdown file.</p><a href="/data/benchmark-methodology-2026.md">Download methodology</a></div><div class="card"><h3>Data dictionary</h3><p>Column definitions, accepted values, and interpretation notes.</p><a href="/data/benchmark-data-dictionary.csv">Download CSV dictionary</a></div><div class="card"><h3>Collection template</h3><p>A blank CSV header for validated aggregate inputs.</p><a href="/data/benchmark-collection-template.csv">Download template</a></div><div class="card"><h3>Current status JSON</h3><p>Machine-readable progress and release state.</p><a href="/data/article-readiness-benchmark-2026.json">Open status data</a></div></div>`],
      ["charts", "Results and charts", `<div class="benchmark-placeholder"><strong>Results withheld</strong><p>Charts will appear after the 1,000-article sample is complete and the dataset is frozen. This prevents partial results from being presented as a finished benchmark.</p><div class="placeholder-bars" aria-hidden="true"><i style="--h:34%"></i><i style="--h:58%"></i><i style="--h:43%"></i><i style="--h:72%"></i><i style="--h:51%"></i></div></div>`],
      ["limitations", "Planned limitations disclosure", `<p>The benchmark will describe observable public-page conditions, not search rankings, index status, factual quality, traffic, model ingestion, or actual AI citations. The sample will not represent every language, country, publisher, or CMS configuration. Platform detection can be uncertain, PageSpeed can vary, rendering can fail, and article templates can change after collection.</p>`],
      ["citation", "How to cite the future release", `<p>Do not cite the placeholder page as a source of benchmark results. After publication, the page will provide a release date, methodology version, dataset checksum, sample size, and recommended citation.</p>`]
    ]
  }
];
