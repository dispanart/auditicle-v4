import { describe, expect, it } from "vitest";
import { buildArticleIntelligence, evaluateAiCrawlerAccess } from "../src/lib/article-intelligence";
import type { AuditFormData, ExtractedEvidence, RobotsEvidence, ScanResponse } from "../src/types";

function robots(content: string, available = true): RobotsEvidence {
  const groups = content.split(/\n\s*\n/).map((block) => {
    const agents: string[] = [];
    const allow: string[] = [];
    const disallow: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      const [name, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      if (/^user-agent$/i.test(name)) agents.push(value);
      if (/^allow$/i.test(name)) allow.push(value);
      if (/^disallow$/i.test(name)) disallow.push(value);
    }
    return { agents, allow, disallow };
  }).filter((group) => group.agents.length);
  return {
    url: "https://example.com/robots.txt",
    status: available ? 200 : null,
    available,
    content,
    sitemapUrls: [],
    groups,
    access: { userAgent: "AuditicleBot", matchedAgent: "*", matchedRule: null, allowed: true, decision: available ? "allowed" : "unavailable" }
  };
}

function extracted(): ExtractedEvidence {
  return {
    title: "Evidence-based article audit",
    metaDescription: "A practical evidence-based article audit guide.",
    canonical: "https://example.com/article",
    robotsMeta: "index,follow",
    xRobotsTag: "",
    h1s: ["Evidence-based article audit"],
    h2s: ["What is article auditing?", "How to improve it", "Sources"],
    wordCount: 1400,
    lang: "en",
    detectedLanguage: "English",
    detectedLanguageConfidence: "high",
    hreflangCodes: [],
    ogLocale: "en_US",
    viewport: "width=device-width, initial-scale=1",
    authorSignals: ["rel=author"],
    dateSignals: ["time[datetime]"],
    platform: "WordPress",
    platformConfidence: "high",
    images: { total: 2, missingAlt: 0, emptyAlt: 0 },
    links: { total: 14, internal: 10, external: 4, emptyAnchors: 0, genericAnchors: 0 },
    structuredData: { blocks: 1, types: ["Article"], invalidBlocks: 0 },
    pageSignals: { navigationLinks: 5, forms: 0, buttons: 1, codeBlocks: 0, listItems: 8, priceSignals: 0, currencyCodes: [] },
    accessibility: { unlabeledInputs: 0, unnamedButtons: 0, duplicateIds: 0, headingOrderWarnings: 0 },
    articleSignals: {
      paragraphCount: 18,
      headingCount: 4,
      questionHeadingCount: 1,
      headingsWithIds: 4,
      tableCount: 1,
      blockquoteCount: 1,
      referenceSectionDetected: true,
      externalSourceLinks: 4,
      uniqueExternalDomains: 3,
      citationMarkerCount: 5,
      definitionPatternCount: 1,
      introWordCount: 120,
      shortParagraphCount: 15,
      faqSchemaDetected: false
    },
    articleContent: {
      introExcerpt: "Article auditing is a structured review of technical and editorial evidence.",
      conclusionExcerpt: "Prioritize verified gaps and validate every change.",
      sectionSamples: [{ heading: "What is article auditing?", excerpt: "It combines crawl, structure, sourcing and answer-readiness evidence." }],
      externalSources: [{ url: "https://developers.google.com/search", anchor: "Google Search Central" }],
      snapshotCharacters: 220
    },
    linkCandidates: []
  };
}

const form: AuditFormData = {
  url: "https://example.com/article",
  primaryKeyword: "article audit",
  secondaryKeyword: "",
  country: "United States",
  pageLanguage: "English",
  pageType: "Article",
  evidenceMode: "auto"
};

describe("article intelligence", () => {
  it("separates search-discovery and training crawler controls", () => {
    const access = evaluateAiCrawlerAccess(
      form.url,
      robots("User-agent: Googlebot\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: Claude-User\nAllow: /")
    );
    expect(access.find((item) => item.crawler === "Googlebot")?.allowed).toBe(true);
    expect(access.find((item) => item.crawler === "GPTBot")?.purpose).toBe("training");
    expect(access.find((item) => item.crawler === "GPTBot")?.allowed).toBe(false);
    expect(access.find((item) => item.crawler === "ClaudeBot")?.allowed).toBe(false);
    expect(access.find((item) => item.crawler === "Claude-SearchBot")?.allowed).toBe(true);
  });

  it("produces five deterministic article readiness dimensions", () => {
    const scan = {
      page: { finalUrl: form.url, status: 200, evidenceMode: "server-html" },
      discovery: { robots: robots("User-agent: *\nAllow: /"), sitemaps: [] },
      pageSpeed: { mobile: { available: true }, desktop: { available: true } }
    } as unknown as ScanResponse;
    const result = buildArticleIntelligence(scan, extracted(), [], form, 92, "final");
    expect(result.dimensions.map((item) => item.key)).toEqual(["technicalSeo", "geo", "aeo", "rag", "llmo"]);
    expect(result.dimensions.every((item) => item.score >= 0 && item.score <= 100)).toBe(true);
    expect(result.overallScore).toBeGreaterThan(80);
  });

  it("penalizes blocked search-discovery crawlers without treating training opt-out as a search failure", () => {
    const scan = {
      page: { finalUrl: form.url, status: 200, evidenceMode: "server-html" },
      discovery: { robots: robots("User-agent: Googlebot\nDisallow: /\n\nUser-agent: OAI-SearchBot\nDisallow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: Claude-User\nAllow: /"), sitemaps: [] },
      pageSpeed: { mobile: { available: true }, desktop: { available: true } }
    } as unknown as ScanResponse;
    const result = buildArticleIntelligence(scan, extracted(), [], form, 92, "final");
    const llmo = result.dimensions.find((item) => item.key === "llmo")!;
    expect(llmo.gaps.some((gap) => gap.includes("Googlebot"))).toBe(true);
    expect(llmo.gaps.some((gap) => gap.includes("OAI-SearchBot"))).toBe(true);
    expect(llmo.strengths.some((strength) => strength.includes("GPTBot training access is blocked"))).toBe(true);
  });
});
