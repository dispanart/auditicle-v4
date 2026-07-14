import { describe, expect, it } from "vitest";
import { buildContextualFindings } from "../src/lib/contextual";
import type { AuditFormData, ExtractedEvidence } from "../src/types";

function evidence(overrides: Partial<ExtractedEvidence> = {}): ExtractedEvidence {
  return {
    title: "Example",
    metaDescription: "Example description",
    canonical: "https://example.com/",
    robotsMeta: "",
    xRobotsTag: "",
    h1s: ["Example"],
    h2s: [],
    wordCount: 800,
    lang: "en-US",
    detectedLanguage: "English",
    detectedLanguageConfidence: "high",
    hreflangCodes: [],
    ogLocale: "en_US",
    viewport: "width=device-width, initial-scale=1",
    authorSignals: ["rel=author"],
    dateSignals: ["time[datetime]"],
    platform: "Generic HTML",
    platformConfidence: "low",
    images: { total: 0, missingAlt: 0, emptyAlt: 0 },
    links: { total: 10, internal: 8, external: 2, emptyAnchors: 0, genericAnchors: 0 },
    structuredData: { blocks: 1, types: ["Article"], invalidBlocks: 0 },
    pageSignals: { navigationLinks: 5, forms: 0, buttons: 1, codeBlocks: 0, listItems: 4, priceSignals: 0, currencyCodes: [] },
    accessibility: { unlabeledInputs: 0, unnamedButtons: 0, duplicateIds: 0, headingOrderWarnings: 0 },
    linkCandidates: [],
    ...overrides
  };
}

const form: AuditFormData = {
  url: "https://example.com/",
  primaryKeyword: "example",
  secondaryKeyword: "",
  country: "United States",
  pageLanguage: "English",
  pageType: "Article",
  evidenceMode: "auto"
};

describe("context-aware rules", () => {
  it("passes when declared language matches the selected page language", () => {
    const findings = buildContextualFindings(evidence(), form);
    expect(findings.some((item) => item.id === "localization.lang.pass")).toBe(true);
    expect(findings.some((item) => item.id === "localization.lang.mismatch")).toBe(false);
  });

  it("warns when the declared language conflicts with the selected language", () => {
    const findings = buildContextualFindings(evidence({ lang: "id-ID", detectedLanguage: "Indonesian" }), form);
    expect(findings.find((item) => item.id === "localization.lang.mismatch")?.severity).toBe("warning");
  });

  it("uses product-specific schema and price expectations", () => {
    const productForm = { ...form, pageType: "Product Page", country: "Indonesia" };
    const findings = buildContextualFindings(evidence({ structuredData: { blocks: 0, types: [], invalidBlocks: 0 } }), productForm);
    expect(findings.some((item) => item.id === "pagetype.product.schema")).toBe(true);
    expect(findings.some((item) => item.id === "pagetype.product.price")).toBe(true);
  });
});
