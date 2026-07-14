import type {
  AiCrawlerDecision,
  ArticleDimensionKey,
  ArticleDimensionScore,
  ArticleIntelligence,
  AuditFormData,
  ExtractedEvidence,
  Finding,
  RobotsEvidence,
  ScanResponse,
  ScoreStatus
} from "../types";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function robotsPatternRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const core = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = core
    .split("*")
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}${anchored ? "$" : ""}`);
}

function patternSpecificity(pattern: string): number {
  return new TextEncoder().encode(pattern.replace(/\*/g, "").replace(/\$$/, "")).byteLength;
}

function crawlerDecision(
  targetUrl: string,
  robots: RobotsEvidence,
  crawler: AiCrawlerDecision["crawler"],
  purpose: AiCrawlerDecision["purpose"]
): AiCrawlerDecision {
  if (!robots.available) {
    return { crawler, purpose, allowed: true, matchedAgent: null, matchedRule: null, confidence: "Medium" };
  }
  const token = crawler.toLowerCase();
  let groups = robots.groups.filter((group) => group.agents.some((agent) => agent.toLowerCase() === token));
  let matchedAgent: string | null = groups.length ? crawler : null;
  if (!groups.length) {
    groups = robots.groups.filter((group) => group.agents.some((agent) => agent.trim() === "*"));
    matchedAgent = groups.length ? "*" : null;
  }
  if (!groups.length) return { crawler, purpose, allowed: true, matchedAgent: null, matchedRule: null, confidence: "High" };

  const url = new URL(targetUrl);
  const target = `${url.pathname || "/"}${url.search}`;
  const matches = groups.flatMap((group) => [
    ...group.allow.map((pattern) => ({ type: "allow" as const, pattern })),
    ...group.disallow.map((pattern) => ({ type: "disallow" as const, pattern }))
  ]).filter((rule) => {
    try { return robotsPatternRegex(rule.pattern).test(target); } catch { return false; }
  }).map((rule) => ({ ...rule, specificity: patternSpecificity(rule.pattern) }))
    .sort((a, b) => b.specificity - a.specificity || (a.type === "allow" ? -1 : 1));

  if (!matches.length) return { crawler, purpose, allowed: true, matchedAgent, matchedRule: null, confidence: "High" };
  const bestSpecificity = matches[0].specificity;
  const tied = matches.filter((item) => item.specificity === bestSpecificity);
  const winner = tied.find((item) => item.type === "allow") || tied[0];
  return {
    crawler,
    purpose,
    allowed: winner.type === "allow",
    matchedAgent,
    matchedRule: `${winner.type === "allow" ? "Allow" : "Disallow"}: ${winner.pattern}`,
    confidence: "High"
  };
}

export function evaluateAiCrawlerAccess(targetUrl: string, robots: RobotsEvidence): AiCrawlerDecision[] {
  return [
    crawlerDecision(targetUrl, robots, "Googlebot", "search-discovery"),
    crawlerDecision(targetUrl, robots, "OAI-SearchBot", "search-discovery"),
    crawlerDecision(targetUrl, robots, "GPTBot", "training"),
    crawlerDecision(targetUrl, robots, "Claude-SearchBot", "search-discovery"),
    crawlerDecision(targetUrl, robots, "Claude-User", "user-retrieval"),
    crawlerDecision(targetUrl, robots, "ClaudeBot", "training")
  ];
}

function dimension(
  key: ArticleDimensionKey,
  label: string,
  score: number,
  status: ScoreStatus,
  strengths: string[],
  gaps: string[],
  evidenceIds: string[]
): ArticleDimensionScore {
  const finalScore = clamp(score);
  const summary = finalScore >= 85
    ? "Strong evidence readiness with focused refinements remaining."
    : finalScore >= 70
      ? "Solid foundation with material opportunities to improve."
      : finalScore >= 50
        ? "Mixed readiness; several gaps can limit reliable discovery or reuse."
        : "Weak readiness; resolve foundational evidence and structure issues first.";
  return { key, label, score: finalScore, status, summary, strengths: strengths.slice(0, 6), gaps: gaps.slice(0, 8), evidenceIds };
}

function hasFinding(findings: Finding[], id: string): boolean {
  return findings.some((item) => item.id === id);
}

export function buildArticleIntelligence(
  scan: ScanResponse,
  extracted: ExtractedEvidence,
  findings: Finding[],
  form: AuditFormData,
  overallScore: number,
  scoreStatus: ScoreStatus
): ArticleIntelligence {
  const applicable = form.pageType === "Article";
  const crawlerAccess = evaluateAiCrawlerAccess(scan.page.finalUrl, scan.discovery.robots);
  const signals = extracted.articleSignals;
  const noindex = /\bnoindex\b/i.test(`${extracted.robotsMeta} ${extracted.xRobotsTag}`);
  const articleSchema = extracted.structuredData.types.some((type) => ["article", "blogposting", "newsarticle"].includes(type.toLowerCase()));
  const hasSources = signals.externalSourceLinks >= 2 || signals.referenceSectionDetected;
  const structured = signals.headingCount >= 3 && signals.paragraphCount >= 5;
  const searchBotsBlocked = crawlerAccess.filter((item) => item.purpose === "search-discovery" && !item.allowed);
  const userRetrievalBlocked = crawlerAccess.some((item) => item.purpose === "user-retrieval" && !item.allowed);

  const technicalStrengths: string[] = [];
  const technicalGaps: string[] = [];
  if (scan.page.status === 200) technicalStrengths.push("The canonical page returned a successful HTTP response.");
  if (extracted.canonical) technicalStrengths.push("A canonical URL was detected."); else technicalGaps.push("Canonical URL evidence is missing.");
  if (!noindex) technicalStrengths.push("No noindex directive was detected."); else technicalGaps.push("A noindex directive prevents ordinary index eligibility.");
  if (scan.pageSpeed.mobile.available) technicalStrengths.push("Mobile laboratory performance evidence is available."); else technicalGaps.push("Mobile PageSpeed evidence is unavailable.");
  if (extracted.accessibility.headingOrderWarnings === 0) technicalStrengths.push("No automated heading-order warning was detected."); else technicalGaps.push("Heading hierarchy warnings were detected.");

  let geoScore = 100;
  const geoStrengths: string[] = [];
  const geoGaps: string[] = [];
  if (noindex) { geoScore -= 30; geoGaps.push("The page is marked noindex."); } else geoStrengths.push("The page is not marked noindex.");
  if (!extracted.canonical) { geoScore -= 10; geoGaps.push("Canonical identity is missing."); } else geoStrengths.push("Canonical identity is explicit.");
  if (!articleSchema) { geoScore -= 9; geoGaps.push("Article/BlogPosting/NewsArticle schema was not detected."); } else geoStrengths.push("Article structured data was detected.");
  if (!extracted.authorSignals.length) { geoScore -= 10; geoGaps.push("Visible authorship signals were not detected."); } else geoStrengths.push("Authorship evidence is present.");
  if (!extracted.dateSignals.length) { geoScore -= 8; geoGaps.push("Publication or modification date signals were not detected."); } else geoStrengths.push("Publication/freshness evidence is present.");
  if (!hasSources) { geoScore -= 12; geoGaps.push("Independent source or reference signals are limited."); } else geoStrengths.push("External source/reference signals are present.");
  if (extracted.wordCount < 500) { geoScore -= 8; geoGaps.push("The extracted article may not cover the topic comprehensively."); }
  if (hasFinding(findings, "localization.lang.mismatch") || hasFinding(findings, "localization.content-language.mismatch")) { geoScore -= 7; geoGaps.push("Language evidence is inconsistent."); }

  let aeoScore = 100;
  const aeoStrengths: string[] = [];
  const aeoGaps: string[] = [];
  if (extracted.h1s.length === 1) aeoStrengths.push("One descriptive H1 was detected."); else { aeoScore -= 14; aeoGaps.push("The page does not expose one clear primary heading."); }
  if (signals.questionHeadingCount > 0) aeoStrengths.push(`${signals.questionHeadingCount} question-oriented heading(s) support direct-answer scanning.`); else { aeoScore -= 11; aeoGaps.push("No question-oriented headings were detected."); }
  if (signals.tableCount + extracted.pageSignals.listItems > 0) aeoStrengths.push("Lists or tables provide scannable answer formats."); else { aeoScore -= 8; aeoGaps.push("No lists or tables were detected in the main article evidence."); }
  if (signals.introWordCount <= 180 && signals.introWordCount > 0) aeoStrengths.push("The opening section is concise enough to surface a direct answer."); else { aeoScore -= 7; aeoGaps.push("The opening section may delay the primary answer."); }
  if (signals.definitionPatternCount > 0) aeoStrengths.push("Definition-style answer patterns were detected."); else { aeoScore -= 5; aeoGaps.push("No clear definition or direct-answer pattern was detected."); }
  if (extracted.accessibility.headingOrderWarnings > 0) { aeoScore -= 8; aeoGaps.push("Heading-order issues weaken answer hierarchy."); }
  if (signals.faqSchemaDetected) aeoStrengths.push("FAQPage schema was detected; verify that it matches visible content and eligibility rules.");

  let ragScore = 100;
  const ragStrengths: string[] = [];
  const ragGaps: string[] = [];
  if (structured) ragStrengths.push("The article has multiple headings and paragraphs for retrieval segmentation."); else { ragScore -= 16; ragGaps.push("The article lacks sufficient section and paragraph structure for reliable passage retrieval."); }
  if (signals.headingCount > 0 && signals.headingsWithIds / signals.headingCount >= 0.5) ragStrengths.push("Most sections expose stable heading anchors."); else { ragScore -= 8; ragGaps.push("Few headings expose stable IDs for precise section linking."); }
  if (hasSources) ragStrengths.push("Reference/source signals support grounded retrieval."); else { ragScore -= 11; ragGaps.push("Source attribution is too limited for grounded reuse."); }
  if (extracted.canonical) ragStrengths.push("Canonical identity supports stable document reconciliation."); else { ragScore -= 8; ragGaps.push("Canonical identity is missing."); }
  if (scan.page.evidenceMode === "rendered-browser" || extracted.platform !== "JavaScript application") ragStrengths.push("Primary content was available in retrievable HTML evidence."); else { ragScore -= 10; ragGaps.push("Important content may depend on client-side rendering."); }
  if (signals.paragraphCount < 5) { ragScore -= 9; ragGaps.push("Too few paragraph units were available for passage-level retrieval."); }
  if (signals.uniqueExternalDomains >= 2) ragStrengths.push("Multiple external domains provide source diversity.");

  let llmoScore = 100;
  const llmoStrengths: string[] = [];
  const llmoGaps: string[] = [];
  for (const item of crawlerAccess) {
    if (item.purpose === "search-discovery" && !item.allowed) {
      const penalty = item.crawler === "Googlebot" ? 30 : item.crawler === "OAI-SearchBot" ? 20 : 15;
      llmoScore -= penalty;
      llmoGaps.push(`${item.crawler} is blocked for search discovery.`);
    }
    if (item.purpose === "search-discovery" && item.allowed) llmoStrengths.push(`${item.crawler} is allowed by the available robots evidence.`);
  }
  if (userRetrievalBlocked) { llmoScore -= 10; llmoGaps.push("Claude-User is blocked for user-directed retrieval."); }
  if (noindex) { llmoScore -= 20; llmoGaps.push("Noindex limits ordinary search-based discovery and citation pathways."); }
  if (!articleSchema) { llmoScore -= 7; llmoGaps.push("Article entity relationships are not expressed through Article-family schema."); }
  if (!extracted.authorSignals.length || !extracted.dateSignals.length) { llmoScore -= 10; llmoGaps.push("Author or freshness provenance is incomplete."); } else llmoStrengths.push("Author and freshness provenance signals are present.");
  if (!hasSources) { llmoScore -= 10; llmoGaps.push("The article provides limited external grounding evidence."); } else llmoStrengths.push("The article includes source/reference signals.");
  if (!structured) { llmoScore -= 8; llmoGaps.push("Section structure is too limited for reliable extraction and citation."); } else llmoStrengths.push("Semantic sections support extraction and citation.");
  const blockedTrainingBots = crawlerAccess.filter((item) => item.purpose === "training" && !item.allowed);
  for (const bot of blockedTrainingBots) {
    llmoStrengths.push(`${bot.crawler} training access is blocked; this is a publisher preference and is not treated as a search-discovery failure.`);
  }

  const dimensions = [
    dimension("technicalSeo", "Technical SEO", overallScore, scoreStatus, technicalStrengths, technicalGaps, ["page.response", "html.canonical", "html.robots", "pagespeed.mobile"]),
    dimension("geo", "GEO readiness", geoScore, scoreStatus, geoStrengths, geoGaps, ["html.trust-signals", "html.jsonld", "html.sources", "html.canonical"]),
    dimension("aeo", "AEO readiness", aeoScore, scoreStatus, aeoStrengths, aeoGaps, ["html.headings", "html.visible-text", "html.lists", "html.tables"]),
    dimension("rag", "RAG retrieval readiness", ragScore, scoreStatus, ragStrengths, ragGaps, ["html.sections", "html.heading-ids", "html.sources", "page.evidence-mode"]),
    dimension("llmo", "LLMO / AI citation readiness", llmoScore, scoreStatus, llmoStrengths, llmoGaps, ["robots.ai-crawlers", "html.trust-signals", "html.jsonld", "html.sources"])
  ];

  return {
    applicable,
    overallScore: clamp(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length),
    scoreStatus,
    dimensions,
    aiCrawlerAccess: crawlerAccess,
    methodologyNote: "These scores measure observable article readiness, not ranking, retrieval, AI Overview inclusion, model training, or citation probability. GEO and AEO remain extensions of sound SEO; RAG and LLMO scores are diagnostic labels for public-page retrievability, provenance, structure and citation readiness."
  };
}

export function buildArticleReadinessFindings(
  scan: ScanResponse,
  extracted: ExtractedEvidence,
  form: AuditFormData
): Finding[] {
  if (form.pageType !== "Article") return [];
  const results: Finding[] = [];
  const signals = extracted.articleSignals;
  const crawlerAccess = evaluateAiCrawlerAccess(scan.page.finalUrl, scan.discovery.robots);

  if (signals.externalSourceLinks === 0 && !signals.referenceSectionDetected) {
    results.push({
      id: "article.sources.missing",
      area: "Article Evidence & GEO",
      severity: "warning",
      title: "Independent source signals were not detected",
      found: "No external source link or recognizable references/sources section was detected in the main article evidence.",
      why: "Transparent sourcing helps readers verify factual claims and gives retrieval systems clearer grounding paths.",
      action: "Cite authoritative primary sources beside relevant claims and add a concise references section when the topic warrants it.",
      evidenceIds: ["html.sources", "html.external-links"],
      impact: "High", effort: "Medium", owner: "Editorial", confidence: "Medium",
      validation: "Review every material factual claim and verify that linked sources directly support it."
    });
  }

  if (signals.questionHeadingCount === 0 && extracted.wordCount >= 700) {
    results.push({
      id: "article.aeo.question-structure",
      area: "Answer Engine Readiness",
      severity: "notice",
      title: "Question-led answer structure is limited",
      found: `No question-oriented H2/H3 heading was detected across ${signals.headingCount} heading(s).`,
      why: "Question-led sections can make user intent and answer boundaries clearer without changing the article into an FAQ farm.",
      action: "Where it matches real reader intent, convert selected section headings into natural questions and answer them directly below the heading.",
      evidenceIds: ["html.headings", "html.visible-text"],
      impact: "Medium", effort: "Low", owner: "Editorial / SEO", confidence: "High",
      validation: "Confirm each question reflects a genuine subtopic and the first paragraph provides a complete, accurate answer."
    });
  }

  if (signals.headingCount >= 3 && signals.headingsWithIds / Math.max(1, signals.headingCount) < 0.5) {
    results.push({
      id: "article.rag.heading-anchors",
      area: "RAG Retrieval Readiness",
      severity: "info",
      title: "Most article sections lack stable heading anchors",
      found: `${signals.headingsWithIds} of ${signals.headingCount} detected headings include an id attribute.`,
      why: "Stable section URLs improve precise linking, human navigation and passage-level retrieval workflows.",
      action: "Generate stable, human-readable IDs for important H2 and H3 sections and keep them unchanged after publication.",
      evidenceIds: ["html.heading-ids"],
      impact: "Low", effort: "Low", owner: "Developer / Editorial", confidence: "High",
      validation: "Open representative fragment URLs and confirm they land on the intended section."
    });
  }

  if (signals.introWordCount > 220) {
    results.push({
      id: "article.aeo.answer-delay",
      area: "Answer Engine Readiness",
      severity: "notice",
      title: "The opening may delay the primary answer",
      found: `Approximately ${signals.introWordCount} words were detected before the first major section boundary.`,
      why: "Readers and answer systems benefit when the article states its scope, answer or conclusion early and then expands with evidence.",
      action: "Add a concise answer-first summary near the top, then preserve nuance and supporting evidence in later sections.",
      evidenceIds: ["html.introduction", "html.headings"],
      impact: "Medium", effort: "Low", owner: "Editorial", confidence: "Medium",
      validation: "Ask whether a reader can understand the article’s main answer from the opening 120–180 words."
    });
  }

  for (const decision of crawlerAccess) {
    if (!decision.allowed && decision.purpose === "search-discovery") {
      results.push({
        id: `article.llmo.${decision.crawler.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.blocked`,
        area: "LLMO / AI Discovery",
        severity: decision.crawler === "OAI-SearchBot" ? "warning" : "notice",
        title: `${decision.crawler} is blocked for search discovery`,
        found: `${decision.matchedAgent || "robots.txt"} matched ${decision.matchedRule || "a restrictive rule"}.`,
        why: "Blocking a search-specific AI crawler may reduce that provider’s ability to retrieve, summarize and link to the page in search experiences.",
        action: `Review the publisher policy. If discovery is desired, allow ${decision.crawler} for public article paths while keeping private areas blocked.`,
        evidenceIds: ["robots.ai-crawlers"],
        impact: "Medium", effort: "Low", owner: "SEO / Developer / Legal", confidence: decision.confidence,
        validation: `Re-fetch robots.txt and confirm ${decision.crawler} is allowed for this exact article path.`
      });
    }
  }

  return results;
}
