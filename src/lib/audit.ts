import { buildContextualFindings } from "./contextual";
import { buildArticleIntelligence, buildArticleReadinessFindings } from "./article-intelligence";
import type {
  AuditFormData,
  AuditReport,
  CheckedLink,
  ExtractedEvidence,
  Finding,
  LinkCandidate,
  ScanResponse,
  Severity
} from "../types";

const GENERIC_ANCHORS = new Set([
  "click here",
  "read more",
  "learn more",
  "more",
  "here",
  "this",
  "link"
]);

const SEVERITY_DEDUCTION: Record<Severity, number> = {
  critical: 14,
  warning: 7,
  notice: 3,
  info: 0,
  pass: 0
};

const LANGUAGE_CONFIG: Record<string, { code: string; locale: string; stopwords: string[] }> = {
  English: { code: "en", locale: "en-US", stopwords: ["the", "and", "for", "with", "this", "that", "from", "your", "are", "you"] },
  Indonesian: { code: "id", locale: "id-ID", stopwords: ["dan", "yang", "untuk", "dengan", "dari", "ini", "itu", "pada", "adalah", "anda"] },
  Spanish: { code: "es", locale: "es-ES", stopwords: ["el", "la", "los", "las", "para", "con", "que", "del", "una", "por"] },
  French: { code: "fr", locale: "fr-FR", stopwords: ["le", "la", "les", "pour", "avec", "des", "une", "dans", "est", "que"] },
  German: { code: "de", locale: "de-DE", stopwords: ["der", "die", "das", "und", "für", "mit", "von", "ist", "eine", "den"] },
  Portuguese: { code: "pt", locale: "pt-BR", stopwords: ["o", "a", "os", "as", "para", "com", "que", "uma", "por", "dos"] },
  Italian: { code: "it", locale: "it-IT", stopwords: ["il", "la", "gli", "per", "con", "che", "una", "del", "dei", "sono"] },
  Dutch: { code: "nl", locale: "nl-NL", stopwords: ["de", "het", "een", "voor", "met", "van", "dat", "die", "zijn", "op"] },
  Japanese: { code: "ja", locale: "ja-JP", stopwords: ["です", "ます", "する", "この", "その", "から", "ため", "について"] },
  Korean: { code: "ko", locale: "ko-KR", stopwords: ["합니다", "입니다", "대한", "에서", "으로", "있는", "위한", "그리고"] },
  "Simplified Chinese": { code: "zh", locale: "zh-CN", stopwords: ["的", "和", "是", "在", "为", "与", "这", "一个"] },
  Arabic: { code: "ar", locale: "ar-SA", stopwords: ["في", "من", "على", "إلى", "هذا", "هذه", "مع", "التي"] },
  Hindi: { code: "hi", locale: "hi-IN", stopwords: ["और", "के", "का", "की", "में", "से", "यह", "लिए"] }
};

const MARKET_CONFIG: Record<string, { region: string; locale: string; currency: string }> = {
  "United States": { region: "US", locale: "en-US", currency: "USD" },
  Indonesia: { region: "ID", locale: "id-ID", currency: "IDR" },
  "United Kingdom": { region: "GB", locale: "en-GB", currency: "GBP" },
  Australia: { region: "AU", locale: "en-AU", currency: "AUD" },
  Singapore: { region: "SG", locale: "en-SG", currency: "SGD" },
  Canada: { region: "CA", locale: "en-CA", currency: "CAD" },
  India: { region: "IN", locale: "en-IN", currency: "INR" },
  Japan: { region: "JP", locale: "ja-JP", currency: "JPY" },
  Germany: { region: "DE", locale: "de-DE", currency: "EUR" },
  France: { region: "FR", locale: "fr-FR", currency: "EUR" },
  Brazil: { region: "BR", locale: "pt-BR", currency: "BRL" },
  Global: { region: "", locale: "", currency: "" }
};

function languagePrimaryTag(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, "-").split("-")[0] || "";
}

function expectedLanguageCode(language: string): string {
  return LANGUAGE_CONFIG[language]?.code || languagePrimaryTag(language);
}

function detectContentLanguage(text: string): { language: string; confidence: "high" | "medium" | "low" } {
  const sample = text.toLocaleLowerCase().slice(0, 30000);
  if (!sample.trim()) return { language: "Unknown", confidence: "low" };
  const tokens = sample.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const tokenCounts = new Map<string, number>();
  for (const token of tokens) tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
  const scores = Object.entries(LANGUAGE_CONFIG).map(([language, config]) => {
    const score = config.stopwords.reduce((sum, word) => {
      if (word.length <= 3 && !/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(word)) {
        return sum + (tokenCounts.get(word) || 0);
      }
      return sum + Math.max(0, sample.split(word).length - 1);
    }, 0);
    return { language, score };
  }).sort((a, b) => b.score - a.score);
  const best = scores[0];
  const second = scores[1];
  if (!best || best.score < 2) return { language: "Unknown", confidence: "low" };
  const ratio = best.score / Math.max(1, second?.score || 0);
  return { language: best.language, confidence: best.score >= 8 && ratio >= 1.7 ? "high" : "medium" };
}

function collectCurrencyCodes(text: string): string[] {
  const codes = new Set<string>();
  const patterns: Array<[RegExp, string]> = [
    [/\bUSD\b|US\$|\$/gi, "USD"], [/\bIDR\b|Rp\.?\s?/gi, "IDR"], [/\bGBP\b|£/gi, "GBP"],
    [/\bEUR\b|€/gi, "EUR"], [/\bAUD\b|A\$/gi, "AUD"], [/\bCAD\b|C\$/gi, "CAD"],
    [/\bSGD\b|S\$/gi, "SGD"], [/\bINR\b|₹/gi, "INR"], [/\bJPY\b|¥/gi, "JPY"], [/\bBRL\b|R\$/gi, "BRL"]
  ];
  for (const [pattern, code] of patterns) if (pattern.test(text)) codes.add(code);
  return [...codes];
}

export function normalizeKeyword(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function textOf(element: Element | null): string {
  return element?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function absoluteUrl(value: string, base: string): string {
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

function detectPlatform(html: string, doc: Document): {
  platform: string;
  confidence: "high" | "medium" | "low";
} {
  const source = html.toLowerCase();
  const generator =
    doc.querySelector('meta[name="generator"]')?.getAttribute("content")?.toLowerCase() ?? "";

  if (source.includes("wp-content/") || source.includes("wp-includes/") || generator.includes("wordpress")) {
    return { platform: "WordPress", confidence: "high" };
  }
  if (source.includes("/_next/") || source.includes("__next_data__")) {
    return { platform: "Next.js", confidence: "high" };
  }
  if (source.includes("cdn.shopify.com") || source.includes("shopify.theme") || generator.includes("shopify")) {
    return { platform: "Shopify", confidence: "high" };
  }
  if (source.includes("webflow.js") || source.includes("data-wf-page")) {
    return { platform: "Webflow", confidence: "high" };
  }
  if (source.includes("wixstatic.com") || generator.includes("wix")) {
    return { platform: "Wix", confidence: "high" };
  }
  if (generator.includes("ghost") || source.includes("ghost-url")) {
    return { platform: "Ghost", confidence: "high" };
  }
  if (source.includes("react") || source.includes("vite")) {
    return { platform: "JavaScript application", confidence: "medium" };
  }
  return { platform: "Generic HTML", confidence: "low" };
}

function collectVisibleText(doc: Document): string {
  const clone = doc.cloneNode(true) as Document;
  clone
    .querySelectorAll("script,style,noscript,svg,canvas,template,nav,footer,header,form")
    .forEach((node) => node.remove());
  const target = clone.querySelector("main,article,[role='main']") ?? clone.body;
  return textOf(target);
}

function countHeadingOrderWarnings(doc: Document): number {
  const levels = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((node) =>
    Number(node.tagName.slice(1))
  );
  let warnings = 0;
  for (let index = 1; index < levels.length; index += 1) {
    if (levels[index] - levels[index - 1] > 1) warnings += 1;
  }
  return warnings;
}

function collectStructuredData(doc: Document): ExtractedEvidence["structuredData"] {
  const types = new Set<string>();
  let invalidBlocks = 0;
  const blocks = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));

  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    const type = record["@type"];
    if (typeof type === "string") types.add(type);
    if (Array.isArray(type)) type.filter((item): item is string => typeof item === "string").forEach((item) => types.add(item));
    if (record["@graph"]) visit(record["@graph"]);
  };

  for (const block of blocks) {
    try {
      visit(JSON.parse(block.textContent ?? ""));
    } catch {
      invalidBlocks += 1;
    }
  }

  return { blocks: blocks.length, types: Array.from(types), invalidBlocks };
}

export function extractEvidence(scan: ScanResponse): ExtractedEvidence {
  const parser = new DOMParser();
  const doc = parser.parseFromString(scan.page.html, "text/html");
  const baseUrl = scan.page.finalUrl;
  const baseOrigin = new URL(baseUrl).origin;
  const visibleText = collectVisibleText(doc);
  const title = textOf(doc.querySelector("title"));
  const metaDescription =
    doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "";
  const canonicalRaw = doc.querySelector('link[rel~="canonical"]')?.getAttribute("href") ?? "";
  const canonical = canonicalRaw ? absoluteUrl(canonicalRaw, baseUrl) : "";
  const robotsMeta =
    doc.querySelector('meta[name="robots"]')?.getAttribute("content")?.trim() ?? "";
  const xRobotsTag = scan.page.headers["x-robots-tag"]?.trim() ?? "";
  const h1s = Array.from(doc.querySelectorAll("h1")).map(textOf).filter(Boolean);
  const h2s = Array.from(doc.querySelectorAll("h2")).map(textOf).filter(Boolean);
  const images = Array.from(doc.querySelectorAll("img"));
  const missingAlt = images.filter((img) => !img.hasAttribute("alt")).length;
  const emptyAlt = images.filter((img) => img.getAttribute("alt") === "").length;

  const candidates: LinkCandidate[] = [];
  let emptyAnchors = 0;
  let genericAnchors = 0;
  let internal = 0;
  let external = 0;

  for (const anchor of Array.from(doc.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
    const rawHref = anchor.getAttribute("href") ?? "";
    if (!rawHref || rawHref.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(rawHref)) continue;
    const destination = absoluteUrl(rawHref, baseUrl);
    if (!destination || !/^https?:/i.test(destination)) continue;
    const anchorText = textOf(anchor) || anchor.getAttribute("aria-label")?.trim() || "";
    const isInternal = new URL(destination).origin === baseOrigin;
    if (isInternal) internal += 1;
    else external += 1;
    if (!anchorText) emptyAnchors += 1;
    if (GENERIC_ANCHORS.has(anchorText.toLowerCase())) genericAnchors += 1;
    candidates.push({
      destination,
      anchor: anchorText,
      internal: isInternal,
      rel: anchor.getAttribute("rel") ?? ""
    });
  }

  const inputs = Array.from(doc.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea"));
  const unlabeledInputs = inputs.filter((input) => {
    if (input instanceof HTMLInputElement && ["hidden", "submit", "button", "reset", "image"].includes(input.type)) return false;
    const id = input.id;
    const hasLabel = Boolean(id && doc.querySelector(`label[for="${CSS.escape(id)}"]`));
    const wrapped = Boolean(input.closest("label"));
    const accessibleName = input.getAttribute("aria-label") || input.getAttribute("aria-labelledby") || input.getAttribute("title");
    return !hasLabel && !wrapped && !accessibleName;
  }).length;

  const unnamedButtons = Array.from(doc.querySelectorAll<HTMLElement>("button,[role='button']")).filter((button) => {
    return !textOf(button) && !button.getAttribute("aria-label") && !button.getAttribute("title");
  }).length;

  const ids = Array.from(doc.querySelectorAll<HTMLElement>("[id]")).map((node) => node.id).filter(Boolean);
  const duplicateIds = ids.length - new Set(ids).size;
  const { platform, confidence } = detectPlatform(scan.page.html, doc);

  const authorSignals = [
    doc.querySelector('[rel="author"]') ? "rel=author" : "",
    doc.querySelector('[itemprop="author"]') ? "itemprop=author" : "",
    doc.querySelector('.author,.byline,[class*="author"]') ? "visible author element" : ""
  ].filter(Boolean);
  const dateSignals = [
    doc.querySelector("time[datetime]") ? "time[datetime]" : "",
    doc.querySelector('[itemprop="datePublished"]') ? "datePublished" : "",
    doc.querySelector('[itemprop="dateModified"]') ? "dateModified" : ""
  ].filter(Boolean);
  const hreflangCodes = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel~="alternate"][hreflang]'))
    .map((link) => link.getAttribute("hreflang")?.trim().toLowerCase() || "")
    .filter(Boolean);
  const ogLocale = doc.querySelector('meta[property="og:locale"]')?.getAttribute("content")?.trim() || "";
  const detectedLanguage = detectContentLanguage(visibleText);
  const currencyCodes = collectCurrencyCodes(visibleText);
  const priceSignals = (visibleText.match(/(?:[$€£¥₹]|Rp\.?|USD|IDR|GBP|EUR|AUD|CAD|SGD|INR|JPY|BRL)\s?\d[\d.,]*/gi) || []).length;
  const mainRoot = doc.querySelector("article,main,[role='main']") || doc.body;
  const paragraphs = Array.from(mainRoot.querySelectorAll("p")).map(textOf).filter(Boolean);
  const headings = Array.from(mainRoot.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6"));
  const questionHeadingCount = headings.filter((node) => /\?|^(what|why|how|when|where|who|which|can|should|is|are|do|does|apa|mengapa|kenapa|bagaimana|kapan|di mana|siapa|apakah)\b/i.test(textOf(node))).length;
  const headingsWithIds = headings.filter((node) => Boolean(node.id)).length;
  const externalSourceAnchors = Array.from(mainRoot.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .map((anchor) => ({ href: absoluteUrl(anchor.getAttribute("href") || "", baseUrl), text: textOf(anchor) }))
    .filter((item) => { try { return Boolean(item.href) && new URL(item.href).origin !== baseOrigin; } catch { return false; } });
  const uniqueExternalDomains = new Set(externalSourceAnchors.map((item) => { try { return new URL(item.href).hostname; } catch { return ""; } }).filter(Boolean)).size;
  const headingText = headings.map(textOf).join(" ");
  const referenceSectionDetected = /\b(references|sources|citations|bibliography|further reading|referensi|sumber|daftar pustaka)\b/i.test(headingText);
  const introBoundary = headings.find((node) => ["H2", "H3"].includes(node.tagName));
  let introText = "";
  for (const child of Array.from(mainRoot.children)) {
    if (introBoundary && child === introBoundary) break;
    if (["P", "UL", "OL", "BLOCKQUOTE"].includes(child.tagName)) introText += ` ${textOf(child)}`;
  }
  const introWordCount = introText.trim() ? introText.trim().split(/\s+/).length : Math.min(visibleText.split(/\s+/).filter(Boolean).length, 9999);
  const citationMarkerCount = (visibleText.match(/\[(?:\d{1,3}|[A-Za-z][^\]]{0,30})\]|\([A-Z][A-Za-z-]+(?: et al\.)?,? \d{4}\)/g) || []).length;
  const definitionPatternCount = (visibleText.match(/\b(?:is defined as|refers to|means that|can be described as|adalah|merujuk pada|didefinisikan sebagai)\b/gi) || []).length;
  const shortParagraphCount = paragraphs.filter((paragraph) => paragraph.split(/\s+/).filter(Boolean).length <= 80).length;
  const structuredData = collectStructuredData(doc);
  const compactExcerpt = (value: string, max: number) => value.replace(/\s+/g, " ").trim().slice(0, max);
  const introExcerpt = compactExcerpt(introText || paragraphs.slice(0, 3).join(" "), 2400);
  const conclusionExcerpt = compactExcerpt(paragraphs.slice(-3).join(" "), 1800);
  const sectionSamples = headings
    .filter((heading) => ["H2", "H3"].includes(heading.tagName) && textOf(heading))
    .slice(0, 10)
    .map((heading) => {
      let cursor = heading.nextElementSibling;
      const parts: string[] = [];
      while (cursor && !/^H[1-6]$/.test(cursor.tagName) && parts.join(" ").length < 1000) {
        if (["P", "LI", "BLOCKQUOTE", "DD"].includes(cursor.tagName)) {
          const value = textOf(cursor);
          if (value) parts.push(value);
        } else if (["UL", "OL", "DL"].includes(cursor.tagName)) {
          const value = textOf(cursor);
          if (value) parts.push(value);
        }
        cursor = cursor.nextElementSibling;
      }
      return { heading: compactExcerpt(textOf(heading), 240), excerpt: compactExcerpt(parts.join(" "), 1000) };
    })
    .filter((item) => item.excerpt);
  const seenSourceUrls = new Set<string>();
  const externalSources = externalSourceAnchors
    .filter((item) => {
      if (!item.href || seenSourceUrls.has(item.href)) return false;
      seenSourceUrls.add(item.href);
      return true;
    })
    .slice(0, 20)
    .map((item) => ({ url: item.href, anchor: compactExcerpt(item.text || new URL(item.href).hostname, 240) }));
  const snapshotCharacters = introExcerpt.length + conclusionExcerpt.length
    + sectionSamples.reduce((sum, item) => sum + item.heading.length + item.excerpt.length, 0)
    + externalSources.reduce((sum, item) => sum + item.url.length + item.anchor.length, 0);

  return {
    title,
    metaDescription,
    canonical,
    robotsMeta,
    xRobotsTag,
    h1s,
    h2s,
    wordCount: visibleText ? visibleText.split(/\s+/).filter(Boolean).length : 0,
    lang: doc.documentElement.getAttribute("lang")?.trim() ?? "",
    detectedLanguage: detectedLanguage.language,
    detectedLanguageConfidence: detectedLanguage.confidence,
    hreflangCodes,
    ogLocale,
    viewport: doc.querySelector('meta[name="viewport"]')?.getAttribute("content")?.trim() ?? "",
    authorSignals,
    dateSignals,
    platform,
    platformConfidence: confidence,
    images: { total: images.length, missingAlt, emptyAlt },
    links: {
      total: candidates.length,
      internal,
      external,
      emptyAnchors,
      genericAnchors
    },
    structuredData,
    pageSignals: {
      navigationLinks: doc.querySelectorAll("nav a[href]").length,
      forms: doc.querySelectorAll("form").length,
      buttons: doc.querySelectorAll("button,[role='button'],input[type='submit']").length,
      codeBlocks: doc.querySelectorAll("pre,code").length,
      listItems: doc.querySelectorAll("main li,article li,[role='main'] li").length,
      priceSignals,
      currencyCodes
    },
    accessibility: {
      unlabeledInputs,
      unnamedButtons,
      duplicateIds,
      headingOrderWarnings: countHeadingOrderWarnings(doc)
    },
    articleSignals: {
      paragraphCount: paragraphs.length,
      headingCount: headings.length,
      questionHeadingCount,
      headingsWithIds,
      tableCount: mainRoot.querySelectorAll("table").length,
      blockquoteCount: mainRoot.querySelectorAll("blockquote").length,
      referenceSectionDetected,
      externalSourceLinks: externalSourceAnchors.length,
      uniqueExternalDomains,
      citationMarkerCount,
      definitionPatternCount,
      introWordCount,
      shortParagraphCount,
      faqSchemaDetected: structuredData.types.some((type) => type.toLowerCase() === "faqpage")
    },
    articleContent: {
      introExcerpt,
      conclusionExcerpt,
      sectionSamples,
      externalSources,
      snapshotCharacters
    },
    linkCandidates: candidates
  };
}

function finding(input: Finding): Finding {
  return input;
}

function pagePath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function sameCanonical(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    const normalize = (value: URL) => `${value.origin}${value.pathname.replace(/\/$/, "") || "/"}`;
    return normalize(left) === normalize(right);
  } catch {
    return false;
  }
}

function keywordPresent(text: string, keyword: string): boolean {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) return true;
  return normalizeKeyword(text).includes(normalized);
}

function implementationAction(platform: string, element: string): string {
  const actions: Record<string, Record<string, string>> = {
    WordPress: {
      title: "Edit the SEO title in Yoast or Rank Math, then clear page and CDN caches.",
      description: "Add the meta description in Yoast or Rank Math and verify the rendered source.",
      canonical: "Review the canonical field in the SEO plugin and check for theme or plugin overrides.",
      h1: "Update the page or theme heading template so one descriptive H1 remains.",
      schema: "Use one schema source only; validate plugin output and remove duplicated theme markup."
    },
    "Next.js": {
      title: "Set title through App Router metadata or generateMetadata(), then inspect the server-rendered HTML.",
      description: "Set metadata.description and validate the production route output.",
      canonical: "Set alternates.canonical in metadata and confirm it resolves to the preferred production URL.",
      h1: "Render one semantic H1 in the route component and preserve a logical heading hierarchy.",
      schema: "Render validated JSON-LD from a server component and escape serialized content safely."
    },
    Shopify: {
      title: "Update the page or product SEO title in Shopify and review the theme title template.",
      description: "Add the search listing description in Shopify and verify theme output.",
      canonical: "Inspect canonical_url output in theme.liquid and remove conflicting app markup.",
      h1: "Update the Liquid template so the main page name is the single H1.",
      schema: "Review theme and app JSON-LD for duplication before adding new schema."
    }
  };
  return actions[platform]?.[element] ?? `Update the ${element} in the CMS or page template, publish to staging, and inspect the rendered HTML.`;
}

export function buildFindings(scan: ScanResponse, extracted: ExtractedEvidence, form: AuditFormData, checkedLinks: CheckedLink[] = []): Finding[] {
  const results: Finding[] = [];
  const requested = scan.page.requestedUrl;
  const mobile = scan.pageSpeed.mobile;
  const desktop = scan.pageSpeed.desktop;
  const primaryKeyword = form.primaryKeyword;

  results.push(...buildContextualFindings(extracted, form));
  results.push(...buildArticleReadinessFindings(scan, extracted, form));

  if (scan.page.status >= 400) {
    results.push(finding({
      id: "http.status",
      area: "Crawlability",
      severity: "critical",
      title: `Page returns HTTP ${scan.page.status}`,
      found: `${scan.page.finalUrl} returned ${scan.page.status} ${scan.page.statusText}.`,
      why: "Search engines and users may be unable to access the intended content.",
      action: "Restore a stable 200 response or redirect the obsolete URL to the correct destination.",
      evidenceIds: ["page.response"],
      impact: "High",
      effort: "Medium",
      owner: "Developer",
      validation: "Request the URL again and confirm a stable 200 response without an unsafe redirect chain.",
      currentValue: String(scan.page.status),
      recommendedValue: "200",
      confidence: "High"
    }));
  } else {
    results.push(finding({
      id: "http.status.pass",
      area: "Crawlability",
      severity: "pass",
      title: "Page is publicly reachable",
      found: `The final page returned HTTP ${scan.page.status}.`,
      why: "A stable successful response is the foundation for crawling and user access.",
      action: "Keep monitoring uptime and redirect behavior.",
      evidenceIds: ["page.response"],
      impact: "High",
      effort: "Low",
      owner: "Developer",
      validation: "Recheck after releases and infrastructure changes.",
      confidence: "High"
    }));
  }

  if (!extracted.title) {
    results.push(finding({
      id: "metadata.title.missing",
      area: "Metadata",
      severity: "critical",
      title: "Document title is missing",
      found: "No non-empty <title> element was detected.",
      why: "The title is a primary document label used by browsers and search systems.",
      action: implementationAction(extracted.platform, "title"),
      evidenceIds: ["html.title"],
      impact: "High",
      effort: "Low",
      owner: "SEO / Developer",
      validation: "Inspect the rendered source and confirm one concise title is present.",
      currentValue: "Missing",
      recommendedValue: primaryKeyword ? `${primaryKeyword} — clear page value` : "A concise descriptive page title",
      confidence: "High"
    }));
  } else if (extracted.title.length < 25 || extracted.title.length > 65) {
    results.push(finding({
      id: "metadata.title.length",
      area: "Metadata",
      severity: "notice",
      title: "Title length deserves editorial review",
      found: `The title contains ${extracted.title.length} characters: “${extracted.title}”.`,
      why: "Very short titles may lack context, while long titles may be truncated or rewritten.",
      action: implementationAction(extracted.platform, "title"),
      evidenceIds: ["html.title"],
      impact: "Medium",
      effort: "Low",
      owner: "SEO / Content",
      validation: "Confirm the revised title accurately describes the page and remains distinct from nearby pages.",
      currentValue: extracted.title,
      recommendedValue: primaryKeyword ? `${primaryKeyword} — specific benefit or page purpose` : "A unique, descriptive title",
      confidence: "High"
    }));
  }

  if (!extracted.metaDescription) {
    results.push(finding({
      id: "metadata.description.missing",
      area: "Metadata",
      severity: "warning",
      title: "Meta description is missing",
      found: "No meta description was detected in the fetched HTML.",
      why: "Search systems may select other page text when constructing a result snippet.",
      action: implementationAction(extracted.platform, "description"),
      evidenceIds: ["html.meta.description"],
      impact: "Medium",
      effort: "Low",
      owner: "SEO / Content",
      validation: "Inspect rendered HTML and confirm one accurate description is present.",
      currentValue: "Missing",
      recommendedValue: "A concise summary matching the page intent and current content",
      confidence: "High"
    }));
  }

  if (extracted.h1s.length === 0) {
    results.push(finding({
      id: "headings.h1.missing",
      area: "HTML & Semantics",
      severity: "warning",
      title: "H1 heading is missing",
      found: "No H1 element was detected.",
      why: "A clear top-level heading helps users and machines understand the page subject.",
      action: implementationAction(extracted.platform, "h1"),
      evidenceIds: ["html.headings"],
      impact: "Medium",
      effort: "Low",
      owner: "Content / Developer",
      validation: "Confirm one visible, descriptive H1 appears in the rendered page.",
      currentValue: "Missing",
      recommendedValue: primaryKeyword || "A natural description of the page topic",
      confidence: "High"
    }));
  } else if (extracted.h1s.length > 1) {
    results.push(finding({
      id: "headings.h1.multiple",
      area: "HTML & Semantics",
      severity: "notice",
      title: "Multiple H1 headings detected",
      found: `${extracted.h1s.length} H1 elements were detected.`,
      why: "Multiple H1s are valid in some document structures, but templates often create unintended hierarchy ambiguity.",
      action: "Review the rendered document outline and keep only headings that genuinely define separate top-level sections.",
      evidenceIds: ["html.headings"],
      impact: "Low",
      effort: "Low",
      owner: "Developer / Content",
      validation: "Inspect the page outline and confirm the heading hierarchy remains meaningful.",
      currentValue: extracted.h1s.join(" | "),
      recommendedValue: "One primary page heading unless the document structure clearly justifies more",
      confidence: "High"
    }));
  }

  if (primaryKeyword && extracted.h1s.length > 0 && !extracted.h1s.some((value) => keywordPresent(value, primaryKeyword))) {
    results.push(finding({
      id: "keyword.h1",
      area: "Content & Search Intent",
      severity: "notice",
      title: "Primary keyword is not reflected in the H1",
      found: `The supplied keyword “${primaryKeyword}” was not found naturally in the detected H1 text.`,
      why: "Alignment between the declared target query and the primary heading can make page intent clearer.",
      action: "Rewrite the H1 only when the keyword accurately describes the page; avoid forced repetition.",
      evidenceIds: ["html.headings", "user.keyword"],
      impact: "Medium",
      effort: "Low",
      owner: "Content / SEO",
      validation: "Read the H1 aloud and confirm it remains natural, specific and faithful to the page.",
      currentValue: extracted.h1s.join(" | "),
      recommendedValue: `A natural heading that clearly covers “${primaryKeyword}”`,
      confidence: "Medium"
    }));
  }

  if (!extracted.canonical) {
    results.push(finding({
      id: "canonical.missing",
      area: "Crawlability",
      severity: "warning",
      title: "Canonical link is missing",
      found: "No canonical link element was detected.",
      why: "A canonical helps identify the preferred URL when multiple variants expose equivalent content.",
      action: implementationAction(extracted.platform, "canonical"),
      evidenceIds: ["html.canonical"],
      impact: "Medium",
      effort: "Low",
      owner: "Developer / SEO",
      validation: "Inspect the final rendered HTML and confirm the canonical resolves to the preferred public URL.",
      currentValue: "Missing",
      recommendedValue: scan.page.finalUrl,
      confidence: "High"
    }));
  } else if (!sameCanonical(extracted.canonical, scan.page.finalUrl)) {
    results.push(finding({
      id: "canonical.mismatch",
      area: "Crawlability",
      severity: "warning",
      title: "Canonical points to a different path",
      found: `The fetched URL is ${pagePath(scan.page.finalUrl)}, while the canonical points to ${pagePath(extracted.canonical)}.`,
      why: "An unintended canonical can consolidate signals away from the page being audited.",
      action: "Confirm whether the canonical target is intentional. If not, update the page template or CMS field.",
      evidenceIds: ["html.canonical", "page.final-url"],
      impact: "High",
      effort: "Low",
      owner: "SEO / Developer",
      validation: "Refetch the page and confirm the canonical matches the intended preferred URL.",
      currentValue: extracted.canonical,
      recommendedValue: scan.page.finalUrl,
      confidence: "High"
    }));
  }

  const noindexSources = [
    ...( /noindex/i.test(extracted.robotsMeta) ? [`meta robots: ${extracted.robotsMeta}`] : []),
    ...( /noindex/i.test(extracted.xRobotsTag) ? [`X-Robots-Tag: ${extracted.xRobotsTag}`] : [])
  ];
  if (noindexSources.length) {
    results.push(finding({
      id: "robots.noindex",
      area: "Crawlability",
      severity: "critical",
      title: "Noindex directive detected",
      found: `A noindex directive was found in ${noindexSources.join("; ")}.`,
      why: "A noindex directive asks compliant search engines not to index the page.",
      action: "Keep noindex only when exclusion is intentional. Otherwise remove it from the CMS or template and revalidate.",
      evidenceIds: ["html.robots", "headers.x-robots-tag"],
      impact: "High",
      effort: "Low",
      owner: "SEO / Developer",
      validation: "Inspect the rendered source and response headers after publishing.",
      currentValue: noindexSources.join("; "),
      recommendedValue: "index,follow or no restrictive directive when indexing is intended",
      confidence: "High"
    }));
  }

  if (extracted.wordCount < 250) {
    results.push(finding({
      id: "content.depth",
      area: "Content & Search Intent",
      severity: "info",
      title: "Limited visible text was detected",
      found: `Approximately ${extracted.wordCount} visible words were extracted from the main content area.`,
      why: "Word count is not a ranking factor by itself; the question is whether the page fully satisfies its intended task.",
      action: "Review the page against user intent and add missing explanations, proof, examples or decision support only where useful.",
      evidenceIds: ["html.visible-text"],
      impact: "Medium",
      effort: "Medium",
      owner: "Content",
      validation: "Compare the revised page with the target query and confirm each important question is answered.",
      currentValue: `${extracted.wordCount} words`,
      recommendedValue: "Enough original content to fully satisfy the page intent",
      confidence: "Medium"
    }));
  }

  if (extracted.images.missingAlt > 0) {
    results.push(finding({
      id: "images.alt.missing",
      area: "Image SEO & Accessibility",
      severity: "warning",
      title: "Images without alt attributes detected",
      found: `${extracted.images.missingAlt} of ${extracted.images.total} images have no alt attribute.`,
      why: "Missing alt attributes can reduce accessibility and remove useful image context.",
      action: "Add concise alternative text for informative images and empty alt attributes for decorative images.",
      evidenceIds: ["html.images"],
      impact: "Medium",
      effort: "Low",
      owner: "Content / Developer",
      validation: "Inspect the rendered HTML and test representative pages with images disabled or a screen reader.",
      currentValue: `${extracted.images.missingAlt} missing`,
      recommendedValue: "Every image intentionally has descriptive or empty alt text",
      confidence: "High"
    }));
  }

  if (extracted.structuredData.invalidBlocks > 0) {
    results.push(finding({
      id: "schema.invalid",
      area: "Structured Data",
      severity: "warning",
      title: "Invalid JSON-LD blocks detected",
      found: `${extracted.structuredData.invalidBlocks} JSON-LD block(s) could not be parsed.`,
      why: "Malformed JSON-LD cannot be reliably interpreted by consumers.",
      action: implementationAction(extracted.platform, "schema"),
      evidenceIds: ["html.jsonld"],
      impact: "Medium",
      effort: "Medium",
      owner: "Developer / SEO",
      validation: "Parse the production JSON and test the relevant schema with an appropriate validator.",
      confidence: "High"
    }));
  } else if (extracted.structuredData.blocks === 0) {
    results.push(finding({
      id: "schema.absent",
      area: "Structured Data",
      severity: "info",
      title: "No JSON-LD structured data detected",
      found: "The fetched HTML contains no application/ld+json block.",
      why: "Structured data can clarify entities and page type when a supported vocabulary accurately describes the content.",
      action: "Add only schema that matches visible content and business reality; do not add markup solely to chase rich results.",
      evidenceIds: ["html.jsonld"],
      impact: "Low",
      effort: "Medium",
      owner: "SEO / Developer",
      validation: "Validate the markup and confirm all claims are visible or otherwise supported on the page.",
      confidence: "High"
    }));
  }

  if (extracted.accessibility.unlabeledInputs > 0 || extracted.accessibility.unnamedButtons > 0 || extracted.accessibility.duplicateIds > 0) {
    results.push(finding({
      id: "accessibility.static",
      area: "Accessibility",
      severity: "warning",
      title: "Static accessibility issues detected",
      found: `${extracted.accessibility.unlabeledInputs} unlabeled form control(s), ${extracted.accessibility.unnamedButtons} unnamed button(s), and ${extracted.accessibility.duplicateIds} duplicate ID(s) were found.`,
      why: "Accessible names and unique identifiers are important for keyboard and assistive-technology users.",
      action: "Associate labels with controls, provide accessible button names, and make all IDs unique.",
      evidenceIds: ["html.accessibility"],
      impact: "High",
      effort: "Medium",
      owner: "Developer / UX",
      validation: "Run keyboard and screen-reader checks after fixing the rendered components.",
      confidence: "High"
    }));
  }

  if (mobile.available && mobile.performance !== null && mobile.performance < 0.8) {
    const lcp = mobile.metrics.lcp;
    results.push(finding({
      id: "performance.mobile",
      area: "Performance",
      severity: mobile.performance < 0.5 ? "critical" : "warning",
      title: "Mobile Lighthouse performance needs attention",
      found: `Mobile performance score: ${Math.round(mobile.performance * 100)}${lcp !== null ? `; lab LCP: ${Math.round(lcp)} ms` : ""}.`,
      why: "Slow mobile rendering can reduce usability and make content harder to consume.",
      action: "Prioritize the largest verified opportunities, then retest the same URL under comparable conditions.",
      evidenceIds: ["pagespeed.mobile"],
      impact: "High",
      effort: "High",
      owner: "Developer / Performance",
      validation: "Rerun mobile PageSpeed and compare both lab evidence and available field data.",
      currentValue: `${Math.round(mobile.performance * 100)}/100`,
      recommendedValue: "Improve verified bottlenecks; do not optimize only for a score",
      confidence: "High"
    }));
  }

  if (desktop.available && mobile.available && desktop.performance !== null && mobile.performance !== null && desktop.performance - mobile.performance > 0.2) {
    results.push(finding({
      id: "performance.device-gap",
      area: "Performance",
      severity: "notice",
      title: "Large mobile-to-desktop performance gap",
      found: `Mobile scored ${Math.round(mobile.performance * 100)}, while desktop scored ${Math.round(desktop.performance * 100)}.`,
      why: "A large gap can indicate mobile CPU, responsive-image, JavaScript or layout pressure.",
      action: "Investigate mobile-specific bottlenecks rather than applying a second independent score deduction.",
      evidenceIds: ["pagespeed.mobile", "pagespeed.desktop"],
      impact: "Medium",
      effort: "Medium",
      owner: "Developer / Performance",
      validation: "Compare audit details for both strategies after each change.",
      confidence: "High"
    }));
  }

  const robots = scan.discovery.robots;
  if (!robots.available) {
    results.push(finding({
      id: "robots.unavailable",
      area: "Crawlability",
      severity: "info",
      title: "robots.txt was unavailable",
      found: robots.error || `No usable robots.txt response was returned from ${robots.url}.`,
      why: "A robots file is not mandatory, but an unavailable or broken file can hide intended crawler guidance.",
      action: "Confirm whether a robots.txt file is intended and return a valid plain-text response when used.",
      evidenceIds: ["robots.fetch"],
      impact: "Low",
      effort: "Low",
      owner: "Developer / SEO",
      validation: "Open the robots URL directly and confirm its status and content type.",
      confidence: "High"
    }));
  }

  if (robots.available && robots.sitemapUrls.length === 0) {
    results.push(finding({
      id: "robots.sitemap.declaration",
      area: "Crawlability",
      severity: "info",
      title: "No sitemap declaration found in robots.txt",
      found: "The robots.txt file did not declare a Sitemap directive.",
      why: "A declaration can make sitemap discovery more explicit, although search engines may discover sitemaps elsewhere.",
      action: "Add the canonical absolute sitemap URL to robots.txt if the sitemap is intended for public discovery.",
      evidenceIds: ["robots.content"],
      impact: "Low",
      effort: "Low",
      owner: "SEO / Developer",
      validation: "Refetch robots.txt and confirm the absolute HTTPS sitemap URL is present.",
      confidence: "High"
    }));
  }

  const availableSitemaps = scan.discovery.sitemaps.filter((item) => item.available);
  if (scan.discovery.sitemaps.length > 0 && availableSitemaps.length === 0) {
    results.push(finding({
      id: "sitemap.unavailable",
      area: "Crawlability",
      severity: "warning",
      title: "Sitemap could not be parsed",
      found: scan.discovery.sitemaps.map((item) => `${item.url}: ${item.error || item.status || "unavailable"}`).join("; "),
      why: "A malformed or unavailable sitemap can reduce the usefulness of submitted URL discovery data.",
      action: "Return valid XML, use absolute canonical URLs and keep sitemap files within protocol limits.",
      evidenceIds: ["sitemap.fetch"],
      impact: "Medium",
      effort: "Medium",
      owner: "Developer / SEO",
      validation: "Fetch and parse the sitemap again after deployment.",
      confidence: "High"
    }));
  }

  const directSitemap = availableSitemaps.find((item) => item.containsSubmittedUrl !== null);
  if (directSitemap?.containsSubmittedUrl === false) {
    results.push(finding({
      id: "sitemap.page.absent",
      area: "Crawlability",
      severity: "notice",
      title: "Audited page was not found in the sampled sitemap evidence",
      found: `The normalized submitted URL was not found in ${directSitemap.url}.`,
      why: "Sitemap inclusion can support URL discovery, but absence does not prove the page is unindexed.",
      action: "Include the canonical URL when the page is intended to be indexable and belongs in that sitemap.",
      evidenceIds: ["sitemap.urls"],
      impact: "Medium",
      effort: "Low",
      owner: "SEO / Developer",
      validation: "Regenerate the sitemap and confirm the canonical URL appears exactly once.",
      confidence: "Medium"
    }));
  }

  const broken = checkedLinks.filter((link) => link.outcome === "client-error" || link.outcome === "server-error");
  if (broken.length > 0) {
    results.push(finding({
      id: "links.broken.confirmed",
      area: "Internal & External Links",
      severity: "warning",
      title: "Confirmed broken destinations detected",
      found: `${broken.length} checked destination(s) returned a confirmed 4xx or 5xx response.`,
      why: "Broken links interrupt user journeys and can waste crawling effort.",
      action: "Update, remove or redirect each confirmed destination; recheck after publishing.",
      evidenceIds: ["links.checked"],
      impact: "Medium",
      effort: "Low",
      owner: "Content / Developer",
      validation: "Run the link checker again and confirm the updated destinations return an intended response.",
      confidence: "High"
    }));
  }

  if (extracted.links.emptyAnchors > 0 || extracted.links.genericAnchors > 0) {
    results.push(finding({
      id: "links.anchor-text",
      area: "Internal & External Links",
      severity: "info",
      title: "Weak or empty anchor text detected",
      found: `${extracted.links.emptyAnchors} empty and ${extracted.links.genericAnchors} generic anchor(s) were detected.`,
      why: "Descriptive link names help users and assistive technology understand the destination.",
      action: "Replace generic wording with concise destination-oriented labels where context does not already make the link clear.",
      evidenceIds: ["html.links"],
      impact: "Low",
      effort: "Low",
      owner: "Content / UX",
      validation: "Review links out of context and confirm each name remains understandable.",
      confidence: "High"
    }));
  }

  const jsHeavy = extracted.platform === "JavaScript application" || extracted.platform === "Next.js";
  if (scan.page.evidenceMode === "server-html" && (jsHeavy || scan.page.rendering.attempted)) {
    results.push(finding({
      id: "evidence.rendering-limitation",
      area: "Evidence Integrity",
      severity: "info",
      title: "Server-delivered HTML evidence has rendering limits",
      found: scan.page.rendering.reason || "The audit used server-delivered HTML without a successful rendered-browser snapshot.",
      why: "Client-side content, injected schema, links and accessibility states may differ after JavaScript execution.",
      action: "Use Auto or Rendered Browser mode when JavaScript-generated content is important, then compare the evidence modes.",
      evidenceIds: ["page.evidence-mode", "page.rendering"],
      impact: "Medium",
      effort: "Low",
      owner: "Developer / SEO",
      validation: "Run the same URL with rendered-browser evidence and compare title, headings, links, schema and visible text.",
      confidence: "High"
    }));
  }

  return results;
}

export function calculateScore(findings: Finding[]): number {
  const deduction = findings.reduce((total, item) => total + SEVERITY_DEDUCTION[item.severity], 0);
  return Math.max(0, Math.min(100, 100 - deduction));
}

export function calculateEvidenceCoverage(scan: ScanResponse, extracted: ExtractedEvidence, checkedLinks: CheckedLink[]): number {
  const weights = [
    [18, Boolean(scan.page.html)],
    [10, Object.keys(scan.page.headers).length > 0],
    [8, scan.discovery.robots.available],
    [8, scan.discovery.sitemaps.some((item) => item.available)],
    [18, scan.pageSpeed.mobile.available],
    [10, scan.pageSpeed.desktop.available],
    [8, checkedLinks.length > 0 || extracted.links.total === 0],
    [8, true],
    [6, extracted.structuredData.blocks > 0 || extracted.structuredData.invalidBlocks === 0],
    [6, true]
  ] as const;
  const total = weights.reduce((sum, [weight]) => sum + weight, 0);
  const earned = weights.reduce((sum, [weight, available]) => sum + (available ? weight : 0), 0);
  return Math.round((earned / total) * 100);
}

export function buildAuditReport(scan: ScanResponse, form: AuditFormData, checkedLinks: CheckedLink[] = []): AuditReport {
  const extracted = extractEvidence(scan);
  const findings = buildFindings(scan, extracted, form, checkedLinks);
  const evidenceCoverage = calculateEvidenceCoverage(scan, extracted, checkedLinks);
  const jsHeavy = extracted.platform === "JavaScript application" || extracted.platform === "Next.js";
  const renderingLimited = scan.page.evidenceMode === "server-html" && (jsHeavy || scan.page.rendering.attempted);
  const scoreStatus = evidenceCoverage < 60 ? "withheld" : evidenceCoverage < 80 || renderingLimited ? "provisional" : "final";
  const limitations = [
    ...(renderingLimited ? [scan.page.rendering.reason || "JavaScript rendering was not available; HTML-based findings are provisional."] : []),
    ...scan.errors
  ];
  const articleIntelligence = buildArticleIntelligence(
    scan,
    extracted,
    findings,
    form,
    calculateScore(findings),
    scoreStatus
  );
  const summary = {
    critical: findings.filter((item) => item.severity === "critical").length,
    warnings: findings.filter((item) => item.severity === "warning").length,
    notices: findings.filter((item) => item.severity === "notice").length,
    infos: findings.filter((item) => item.severity === "info").length,
    passes: findings.filter((item) => item.severity === "pass").length
  };

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    form,
    page: scan.page,
    discovery: scan.discovery,
    pageSpeed: scan.pageSpeed,
    extracted,
    checkedLinks,
    findings,
    score: calculateScore(findings),
    scoreStatus,
    evidenceCoverage,
    summary,
    ruleSet: "2026.07-forensics-v4-article-intelligence",
    limitations,
    articleIntelligence
  };
}

export function selectLinkDestinations(extracted: ExtractedEvidence, maxLinks = 15): string[] {
  const seen = new Set<string>();
  const internal = extracted.linkCandidates.filter((item) => item.internal);
  const external = extracted.linkCandidates.filter((item) => !item.internal);
  const selected: string[] = [];

  for (const item of [...internal.slice(0, 10), ...external.slice(0, 5)]) {
    const normalized = item.destination.split("#")[0];
    if (!seen.has(normalized)) {
      seen.add(normalized);
      selected.push(normalized);
    }
    if (selected.length >= maxLinks) break;
  }
  return selected;
}

export function rebuildReportWithLinks(report: AuditReport, scan: ScanResponse, checkedLinks: CheckedLink[]): AuditReport {
  return buildAuditReport(scan, report.form, checkedLinks);
}

export function buildAiEvidence(report: AuditReport): unknown {
  return {
    caseId: report.id,
    url: report.page.finalUrl,
    pageType: report.form.pageType,
    targetMarket: report.form.country,
    pageLanguage: report.form.pageLanguage,
    primaryKeyword: report.form.primaryKeyword,
    platform: {
      name: report.extracted.platform,
      confidence: report.extracted.platformConfidence
    },
    score: report.score,
    scoreStatus: report.scoreStatus,
    evidenceCoverage: report.evidenceCoverage,
    articleIntelligence: report.articleIntelligence,
    confirmedEvidence: {
      status: report.page.status,
      evidenceMode: report.page.evidenceMode,
      rendering: report.page.rendering,
      title: report.extracted.title,
      description: report.extracted.metaDescription,
      canonical: report.extracted.canonical,
      h1s: report.extracted.h1s,
      wordCount: report.extracted.wordCount,
      declaredLanguage: report.extracted.lang,
      detectedLanguage: report.extracted.detectedLanguage,
      hreflangCodes: report.extracted.hreflangCodes,
      ogLocale: report.extracted.ogLocale,
      pageSignals: report.extracted.pageSignals,
      imagesMissingAlt: report.extracted.images.missingAlt,
      schemaTypes: report.extracted.structuredData.types,
      mobilePerformance: report.pageSpeed.mobile.performance,
      mobileMetrics: report.pageSpeed.mobile.metrics,
      desktopPerformance: report.pageSpeed.desktop.performance,
      robotsAvailable: report.discovery.robots.available,
      sitemapCount: report.discovery.sitemaps.length,
      articleSignals: report.extracted.articleSignals,
      articleContentSnapshot: report.extracted.articleContent,
      checkedLinkOutcomes: report.checkedLinks.reduce<Record<string, number>>((acc, link) => {
        acc[link.outcome] = (acc[link.outcome] || 0) + 1;
        return acc;
      }, {})
    },
    findings: report.findings
      .filter((item) => item.severity !== "pass")
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        title: item.title,
        severity: item.severity,
        found: item.found,
        action: item.action,
        evidenceIds: item.evidenceIds
      }))
  };
}
