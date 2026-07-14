import type { AuditFormData, ExtractedEvidence, Finding, Severity } from "../types";

const LANGUAGE: Record<string, { code: string; locale: string }> = {
  English: { code: "en", locale: "en-US" },
  Indonesian: { code: "id", locale: "id-ID" },
  Spanish: { code: "es", locale: "es-ES" },
  French: { code: "fr", locale: "fr-FR" },
  German: { code: "de", locale: "de-DE" },
  Portuguese: { code: "pt", locale: "pt-BR" },
  Italian: { code: "it", locale: "it-IT" },
  Dutch: { code: "nl", locale: "nl-NL" },
  Japanese: { code: "ja", locale: "ja-JP" },
  Korean: { code: "ko", locale: "ko-KR" },
  "Simplified Chinese": { code: "zh", locale: "zh-CN" },
  Arabic: { code: "ar", locale: "ar-SA" },
  Hindi: { code: "hi", locale: "hi-IN" }
};

const MARKET: Record<string, { region: string; locale: string; currency: string }> = {
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

function primaryTag(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, "-").split("-")[0] || "";
}

function schemaHas(extracted: ExtractedEvidence, expected: string[]): boolean {
  const actual = new Set(extracted.structuredData.types.map((type) => type.toLowerCase()));
  return expected.some((type) => actual.has(type.toLowerCase()));
}

function item(input: Finding): Finding {
  return input;
}

function schemaFinding(
  extracted: ExtractedEvidence,
  pageType: string,
  id: string,
  expected: string[],
  title: string,
  why: string,
  severity: Severity = "notice"
): Finding | null {
  if (schemaHas(extracted, expected)) return null;
  return item({
    id,
    area: "Page-type Evidence",
    severity,
    title,
    found: `Selected page type: ${pageType}. Detected schema types: ${extracted.structuredData.types.length ? extracted.structuredData.types.join(", ") : "none"}.`,
    why,
    action: `Add accurate ${expected.join(" or ")} structured data only when it matches visible content and business reality.`,
    evidenceIds: ["html.jsonld", "user.page-type"],
    impact: severity === "warning" ? "High" : "Medium",
    effort: "Medium",
    owner: "SEO / Developer",
    validation: "Validate the production JSON-LD and confirm every property is supported by visible or authoritative data.",
    confidence: "High"
  });
}

export function buildContextualFindings(extracted: ExtractedEvidence, form: AuditFormData): Finding[] {
  const findings: Finding[] = [];
  const expectedLanguage = LANGUAGE[form.pageLanguage] || { code: primaryTag(form.pageLanguage), locale: form.pageLanguage };
  const declaredCode = primaryTag(extracted.lang);
  const detectedCode = LANGUAGE[extracted.detectedLanguage]?.code || primaryTag(extracted.detectedLanguage);
  const market = MARKET[form.country] || MARKET.Global;

  if (!extracted.lang) {
    findings.push(item({
      id: "localization.lang.missing",
      area: "Localization & Accessibility",
      severity: "notice",
      title: "Document language is not declared",
      found: `The html element has no lang attribute. Selected page language: ${form.pageLanguage}.`,
      why: "An accurate language declaration helps assistive technology and search systems interpret the page.",
      action: `Set an accurate BCP 47 value such as lang=\"${expectedLanguage.locale}\" on the html element.`,
      evidenceIds: ["html.lang", "user.page-language"],
      impact: "Medium",
      effort: "Low",
      owner: "Developer",
      validation: "Inspect the rendered html element and compare it with the actual page content.",
      currentValue: "Missing",
      recommendedValue: expectedLanguage.locale,
      confidence: "High"
    }));
  } else if (expectedLanguage.code && declaredCode !== expectedLanguage.code) {
    findings.push(item({
      id: "localization.lang.mismatch",
      area: "Localization & Accessibility",
      severity: "warning",
      title: "Declared language does not match the selected page language",
      found: `The page declares lang=\"${extracted.lang}\", while the selected language is ${form.pageLanguage}.`,
      why: "A mismatched declaration can cause incorrect pronunciation and weaken locale interpretation.",
      action: "Confirm the actual content language, then correct either the audit selection or the rendered lang attribute.",
      evidenceIds: ["html.lang", "user.page-language"],
      impact: "High",
      effort: "Low",
      owner: "Developer / Content",
      validation: "Compare the rendered text, selected language and html lang value on the production page.",
      currentValue: extracted.lang,
      recommendedValue: expectedLanguage.locale,
      confidence: "High"
    }));
  } else {
    findings.push(item({
      id: "localization.lang.pass",
      area: "Localization & Accessibility",
      severity: "pass",
      title: "Declared language matches the selected page language",
      found: `The page declares lang=\"${extracted.lang}\" and the selected language is ${form.pageLanguage}.`,
      why: "Consistent language metadata supports accessibility and locale interpretation.",
      action: "Keep the declaration synchronized with visible content.",
      evidenceIds: ["html.lang", "user.page-language"],
      impact: "Medium",
      effort: "Low",
      owner: "Developer / Content",
      validation: "Recheck after localization or template changes.",
      confidence: "High"
    }));
  }

  if (extracted.detectedLanguage !== "Unknown" && detectedCode && expectedLanguage.code && detectedCode !== expectedLanguage.code) {
    findings.push(item({
      id: "localization.content-language.mismatch",
      area: "Localization & Accessibility",
      severity: extracted.detectedLanguageConfidence === "high" ? "warning" : "notice",
      title: "Visible content may not match the selected page language",
      found: `Selected language: ${form.pageLanguage}. Heuristic text detection: ${extracted.detectedLanguage} (${extracted.detectedLanguageConfidence} confidence).`,
      why: "Language inconsistency can confuse users and lead to inaccurate metadata or hreflang implementation.",
      action: "Review the main content manually. Correct the selection, content, or metadata only after confirmation.",
      evidenceIds: ["html.visible-text", "user.page-language"],
      impact: "Medium",
      effort: "Low",
      owner: "Content / SEO",
      validation: "Have a fluent reviewer confirm the primary language of the page.",
      currentValue: extracted.detectedLanguage,
      recommendedValue: form.pageLanguage,
      confidence: extracted.detectedLanguageConfidence === "high" ? "High" : "Medium"
    }));
  }

  if (form.country !== "Global" && extracted.hreflangCodes.length > 0) {
    const region = market.region.toLowerCase();
    const hasMarketVariant = extracted.hreflangCodes.some((code) => code === "x-default" || code.endsWith(`-${region}`));
    if (!hasMarketVariant) {
      findings.push(item({
        id: "localization.hreflang.market-missing",
        area: "International SEO",
        severity: "notice",
        title: "Hreflang set does not include the selected target market",
        found: `Detected hreflang values: ${extracted.hreflangCodes.join(", ")}. No ${market.region} regional variant or x-default was found.`,
        why: "When alternate regional pages exist, complete reciprocal hreflang relationships help identify the appropriate version.",
        action: `If a dedicated ${form.country} version exists, add a reciprocal value such as ${expectedLanguage.code}-${market.region}. Otherwise verify the selected target market.`,
        evidenceIds: ["html.hreflang", "user.target-market"],
        impact: "Medium",
        effort: "Medium",
        owner: "SEO / Developer",
        validation: "Validate reciprocal hreflang links across every alternate page.",
        confidence: "High"
      }));
    }
  }

  if (form.country !== "Global" && extracted.ogLocale) {
    const ogRegion = extracted.ogLocale.replace("_", "-").split("-")[1]?.toUpperCase() || "";
    if (ogRegion && market.region && ogRegion !== market.region) {
      findings.push(item({
        id: "localization.og-locale.mismatch",
        area: "International SEO",
        severity: "notice",
        title: "Open Graph locale differs from the selected target market",
        found: `og:locale is ${extracted.ogLocale}; selected target market is ${form.country}.`,
        why: "Declared social locale metadata should describe the locale of the shared page.",
        action: `Confirm the intended market and use an accurate locale such as ${market.locale} only when it matches the page.`,
        evidenceIds: ["html.og-locale", "user.target-market"],
        impact: "Low",
        effort: "Low",
        owner: "SEO / Developer",
        validation: "Inspect the rendered Open Graph metadata and test a representative shared URL.",
        currentValue: extracted.ogLocale,
        recommendedValue: market.locale,
        confidence: "High"
      }));
    }
  }

  if (form.pageType === "Product Page" && form.country !== "Global" && extracted.pageSignals.currencyCodes.length > 0 && market.currency && !extracted.pageSignals.currencyCodes.includes(market.currency)) {
    findings.push(item({
      id: "localization.currency.mismatch",
      area: "International SEO",
      severity: "warning",
      title: "Detected currency does not match the selected target market",
      found: `Detected currency signals: ${extracted.pageSignals.currencyCodes.join(", ")}. Expected market currency: ${market.currency}.`,
      why: "A market and currency mismatch can create poor purchase experiences and inaccurate product expectations.",
      action: "Confirm the target market, then align visible price, structured-data currency and checkout behavior.",
      evidenceIds: ["html.visible-text", "user.target-market"],
      impact: "High",
      effort: "Medium",
      owner: "Commerce / Developer",
      validation: "Test the product page and checkout from the intended market configuration.",
      currentValue: extracted.pageSignals.currencyCodes.join(", "),
      recommendedValue: market.currency,
      confidence: "Medium"
    }));
  }

  const addSchema = (finding: Finding | null) => { if (finding) findings.push(finding); };

  if (form.pageType === "Article") {
    addSchema(schemaFinding(extracted, form.pageType, "pagetype.article.schema", ["Article", "BlogPosting", "NewsArticle"], "Article schema was not detected", "Article markup can clarify headline, author, dates and publisher relationships when implemented accurately."));
    if (extracted.authorSignals.length === 0 || extracted.dateSignals.length === 0) {
      findings.push(item({
        id: "pagetype.article.provenance",
        area: "Page-type Evidence",
        severity: "warning",
        title: "Article provenance signals are incomplete",
        found: `Author signals: ${extracted.authorSignals.length ? extracted.authorSignals.join(", ") : "not detected"}; date signals: ${extracted.dateSignals.length ? extracted.dateSignals.join(", ") : "not detected"}.`,
        why: "Readers need transparent authorship and publication context to assess provenance and freshness.",
        action: "Add visible, accurate author attribution plus publication and modification dates where applicable.",
        evidenceIds: ["html.trust-signals", "user.page-type"],
        impact: "High",
        effort: "Low",
        owner: "Editorial / Developer",
        validation: "Confirm the information is visible, accurate and consistent with structured data.",
        confidence: "Medium"
      }));
    }
    if (extracted.wordCount < 500) {
      findings.push(item({
        id: "pagetype.article.depth",
        area: "Page-type Evidence",
        severity: "notice",
        title: "Article depth deserves editorial review",
        found: `Approximately ${extracted.wordCount} visible words were extracted for a page classified as an Article.`,
        why: "Article length is not a ranking factor, but thin coverage may fail to answer the intended question.",
        action: "Evaluate topic completeness, evidence, examples and source transparency instead of targeting an arbitrary word count.",
        evidenceIds: ["html.visible-text", "user.page-type"],
        impact: "Medium",
        effort: "Medium",
        owner: "Editorial",
        validation: "Compare the page against the query intent and confirm important questions are answered.",
        confidence: "Medium"
      }));
    }
  } else if (form.pageType === "Product Page") {
    addSchema(schemaFinding(extracted, form.pageType, "pagetype.product.schema", ["Product"], "Product schema was not detected", "Product markup can clarify product identity, offers and availability when it matches the visible page.", "warning"));
    if (extracted.pageSignals.priceSignals === 0) {
      findings.push(item({
        id: "pagetype.product.price",
        area: "Page-type Evidence",
        severity: "warning",
        title: "No visible price signal was detected",
        found: "The page was classified as a Product Page, but no clear price or currency pattern was extracted.",
        why: "Product visitors usually need transparent price and purchase context.",
        action: "Confirm that price, currency, availability and offer conditions are visible and consistent with structured data.",
        evidenceIds: ["html.visible-text", "user.page-type"],
        impact: "High",
        effort: "Medium",
        owner: "Commerce / Content",
        validation: "Test the rendered product page and compare visible values with Product and Offer markup.",
        confidence: "Medium"
      }));
    }
  } else if (form.pageType === "Homepage") {
    addSchema(schemaFinding(extracted, form.pageType, "pagetype.home.schema", ["Organization", "LocalBusiness", "WebSite"], "Homepage entity schema was not detected", "A homepage can use accurate Organization or WebSite markup to clarify the primary entity."));
    if (extracted.pageSignals.navigationLinks < 3) {
      findings.push(item({
        id: "pagetype.home.navigation",
        area: "Page-type Evidence",
        severity: "notice",
        title: "Homepage navigation appears limited",
        found: `${extracted.pageSignals.navigationLinks} links were detected inside navigation elements.`,
        why: "A homepage normally acts as a discovery hub for important sections and user tasks.",
        action: "Review whether primary services, categories, support and trust pages are discoverable through meaningful navigation.",
        evidenceIds: ["html.navigation", "user.page-type"],
        impact: "Medium",
        effort: "Medium",
        owner: "UX / SEO",
        validation: "Test navigation with keyboard, mobile viewport and representative user tasks.",
        confidence: "Medium"
      }));
    }
  } else if (form.pageType === "Landing Page") {
    if (extracted.pageSignals.buttons + extracted.pageSignals.forms === 0) {
      findings.push(item({
        id: "pagetype.landing.cta",
        area: "Page-type Evidence",
        severity: "notice",
        title: "No clear conversion control was detected",
        found: "No button, submit control or form was detected on the selected Landing Page.",
        why: "A landing page normally supports one clear next action, although informational landing pages may be an exception.",
        action: "Confirm the intended user task and provide a clear, accessible next step only when conversion is part of the page purpose.",
        evidenceIds: ["html.controls", "user.page-type"],
        impact: "Medium",
        effort: "Low",
        owner: "UX / Marketing",
        validation: "Test the primary journey on mobile and desktop and verify the control has an accessible name.",
        confidence: "Medium"
      }));
    }
  } else if (form.pageType === "Category Page") {
    addSchema(schemaFinding(extracted, form.pageType, "pagetype.category.schema", ["ItemList", "CollectionPage", "BreadcrumbList"], "Category-list schema was not detected", "Collection and breadcrumb markup can clarify category structure when it mirrors visible content."));
    if (extracted.pageSignals.listItems < 3 && extracted.links.internal < 5) {
      findings.push(item({
        id: "pagetype.category.items",
        area: "Page-type Evidence",
        severity: "notice",
        title: "Category listing signals are limited",
        found: `${extracted.pageSignals.listItems} list item(s) and ${extracted.links.internal} internal link(s) were detected.`,
        why: "A category page normally helps users discover a meaningful set of related items.",
        action: "Confirm that the collection is visible, crawlable and supported by descriptive introductory context.",
        evidenceIds: ["html.links", "html.lists", "user.page-type"],
        impact: "Medium",
        effort: "Medium",
        owner: "Content / Developer",
        validation: "Review the rendered collection, pagination and canonical behavior.",
        confidence: "Medium"
      }));
    }
  } else if (form.pageType === "Documentation") {
    addSchema(schemaFinding(extracted, form.pageType, "pagetype.docs.schema", ["TechArticle", "Article"], "Documentation schema was not detected", "TechArticle or Article markup can clarify documentation authorship and update context when accurate."));
    if (extracted.pageSignals.codeBlocks === 0 && extracted.wordCount < 450) {
      findings.push(item({
        id: "pagetype.docs.depth",
        area: "Page-type Evidence",
        severity: "notice",
        title: "Documentation support signals are limited",
        found: `${extracted.wordCount} visible words and ${extracted.pageSignals.codeBlocks} code block(s) were detected.`,
        why: "Documentation should provide enough procedural context, examples or reference detail for the intended task.",
        action: "Review prerequisites, steps, examples, expected output, version context and troubleshooting guidance.",
        evidenceIds: ["html.visible-text", "html.code", "user.page-type"],
        impact: "Medium",
        effort: "Medium",
        owner: "Documentation / Engineering",
        validation: "Have a new user complete the documented task without undocumented assumptions.",
        confidence: "Medium"
      }));
    }
    if (extracted.dateSignals.length === 0) {
      findings.push(item({
        id: "pagetype.docs.updated",
        area: "Page-type Evidence",
        severity: "notice",
        title: "Documentation freshness signal was not detected",
        found: "No publication or modification date signal was detected.",
        why: "Version-sensitive documentation benefits from visible freshness and compatibility context.",
        action: "Add an accurate last-updated date or version marker when the content changes over time.",
        evidenceIds: ["html.trust-signals", "user.page-type"],
        impact: "Medium",
        effort: "Low",
        owner: "Documentation",
        validation: "Confirm the date updates only when substantive content changes.",
        confidence: "Medium"
      }));
    }
  }

  return findings;
}
