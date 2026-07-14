import { describe, expect, it } from "vitest";
import { validateTranslation } from "../worker/lib/ai";

const source = {
  ui: {
    "toolbar.translate": "Translate report",
    "actions.owner": "Owner"
  },
  labels: {
    caseOverview: "Case overview",
    articleIntelligence: "Article intelligence",
    simpleAuditResult: "Simple audit result",
    actionPlan: "Forensic action plan",
    performance: "Mobile and desktop performance",
    discovery: "Robots and sitemap evidence",
    links: "Link evidence ledger",
    aiNarrative: "Evidence-grounded consultant narrative",
    disclaimer: "Disclaimer"
  },
  findings: [{
    id: "canonical.mismatch",
    area: "Crawlability",
    title: "Canonical points to another path",
    found: "The canonical URL points to a different public path.",
    why: "Search systems may consolidate signals toward another URL.",
    action: "Align the canonical URL with the preferred public article URL.",
    validation: "Inspect the rendered canonical element and rerun the audit.",
    owner: "Editorial and developer",
    currentValue: "Current canonical points elsewhere",
    recommendedValue: "Use the preferred article URL"
  }],
  limitations: ["Rendered browser evidence was not available for this case."],
  messages: { renderingReason: "Browser rendering timed out and server HTML was used." },
  performance: {
    mobile: {
      error: "PageSpeed evidence was unavailable for the mobile strategy.",
      opportunities: [{ id: "unused-css", title: "Reduce unused CSS", description: "Remove rules that are not required by the article page." }]
    },
    desktop: {
      error: "No PageSpeed error was recorded.",
      opportunities: []
    }
  },
  linkErrors: [{ destination: "https://example.com/source", error: "The destination returned a client error." }],
  articleIntelligence: {
    methodologyNote: "The readiness view is based only on collected public evidence.",
    dimensions: [{
      key: "technicalSeo",
      label: "Technical SEO",
      summary: "The technical foundation is useful but still incomplete.",
      strengths: ["The public page returned a successful response."],
      gaps: ["The canonical target requires editorial review."]
    }]
  },
  aiNarrative: {
    executiveSummary: "The article has a solid evidence foundation with several material gaps.",
    dimensionAnalyses: [{
      key: "technicalSeo",
      score: 70,
      verdict: "Useful but incomplete",
      evidenceSummary: "The page is crawlable but its canonical target needs review.",
      strengths: ["The server returned a successful response."],
      gaps: ["The canonical path does not match the audited URL."],
      optimizationActions: ["Correct the canonical target and rerun the audit."]
    }],
    priorityRoadmap: [{
      priority: "P1",
      findingIds: ["canonical.mismatch"],
      action: "Correct the canonical target.",
      expectedEvidenceChange: "The next audit should show a matching canonical URL.",
      validation: "Inspect source HTML and rerun the audit."
    }],
    recommendations: [{
      findingId: "canonical.mismatch",
      explanation: "The canonical target can consolidate signals elsewhere.",
      fix: "Point the canonical element to the preferred article URL.",
      caution: "Confirm the preferred URL before deployment."
    }]
  },
  disclaimer: "Auditicle provides diagnostic information and does not guarantee rankings or AI citations."
};

const translated = {
  ui: {
    "toolbar.translate": "Terjemahan: Terjemahkan laporan",
    "actions.owner": "Penanggung jawab"
  },
  labels: {
    caseOverview: "Ringkasan kasus",
    articleIntelligence: "Intelijen artikel",
    simpleAuditResult: "Hasil audit sederhana",
    actionPlan: "Rencana tindakan forensik",
    performance: "Performa mobile dan desktop",
    discovery: "Bukti robots dan sitemap",
    links: "Buku besar bukti tautan",
    aiNarrative: "Narasi konsultan berbasis bukti",
    disclaimer: "Penafian"
  },
  findings: [{
    id: "canonical.mismatch",
    area: "Kemampuan perayapan",
    title: "Kanonikal mengarah ke jalur lain",
    found: "URL kanonikal mengarah ke jalur publik yang berbeda.",
    why: "Sistem pencarian dapat menggabungkan sinyal ke URL lain.",
    action: "Selaraskan URL kanonikal dengan URL artikel publik yang dipilih.",
    validation: "Periksa elemen kanonikal yang dirender lalu jalankan ulang audit.",
    owner: "Editorial dan pengembang",
    currentValue: "Kanonikal saat ini mengarah ke lokasi lain",
    recommendedValue: "Gunakan URL artikel yang dipilih"
  }],
  limitations: ["Bukti browser ter-render tidak tersedia untuk kasus ini."],
  messages: { renderingReason: "Rendering browser kehabisan waktu sehingga HTML server digunakan." },
  performance: {
    mobile: {
      error: "Bukti PageSpeed tidak tersedia untuk strategi mobile.",
      opportunities: [{ id: "unused-css", title: "Kurangi CSS yang tidak digunakan", description: "Hapus aturan yang tidak diperlukan oleh halaman artikel." }]
    },
    desktop: {
      error: "Tidak ada kesalahan PageSpeed yang tercatat.",
      opportunities: []
    }
  },
  linkErrors: [{ destination: "https://example.com/source", error: "Tujuan mengembalikan kesalahan klien." }],
  articleIntelligence: {
    methodologyNote: "Tampilan kesiapan hanya didasarkan pada bukti publik yang dikumpulkan.",
    dimensions: [{
      key: "technicalSeo",
      label: "SEO Teknis",
      summary: "Fondasi teknis berguna tetapi masih belum lengkap.",
      strengths: ["Halaman publik mengembalikan respons yang berhasil."],
      gaps: ["Target kanonikal memerlukan peninjauan editorial."]
    }]
  },
  aiNarrative: {
    executiveSummary: "Artikel memiliki fondasi bukti yang kuat dengan beberapa kesenjangan material.",
    dimensionAnalyses: [{
      key: "technicalSeo",
      score: 999,
      verdict: "Berguna tetapi belum lengkap",
      evidenceSummary: "Halaman dapat dirayapi tetapi target kanonikalnya perlu ditinjau.",
      strengths: ["Server mengembalikan respons yang berhasil."],
      gaps: ["Jalur kanonikal tidak cocok dengan URL yang diaudit."],
      optimizationActions: ["Perbaiki target kanonikal lalu jalankan ulang audit."]
    }],
    priorityRoadmap: [{
      priority: "P9",
      findingIds: ["wrong.finding"],
      action: "Perbaiki target kanonikal.",
      expectedEvidenceChange: "Audit berikutnya harus menunjukkan URL kanonikal yang cocok.",
      validation: "Periksa HTML sumber lalu jalankan ulang audit."
    }],
    recommendations: [{
      findingId: "canonical.mismatch",
      explanation: "Target kanonikal dapat menggabungkan sinyal ke lokasi lain.",
      fix: "Arahkan elemen kanonikal ke URL artikel yang dipilih.",
      caution: "Konfirmasikan URL pilihan sebelum deployment."
    }]
  },
  disclaimer: "Auditicle menyediakan informasi diagnostik dan tidak menjamin peringkat atau sitasi AI."
};

describe("complete report translation validation", () => {
  it("returns every supported translated field and strips translation prefixes", () => {
    const result = validateTranslation(translated, source);
    expect(result.ui["toolbar.translate"]).toBe("Terjemahkan laporan");
    expect(result.findings[0].owner).toBe("Editorial dan pengembang");
    expect(result.performance.mobile.opportunities[0].title).toBe("Kurangi CSS yang tidak digunakan");
    expect(result.linkErrors[0].destination).toBe("https://example.com/source");
    expect(result.articleIntelligence.dimensions[0].label).toBe("SEO Teknis");
  });

  it("preserves deterministic scores, priorities and finding IDs from the source", () => {
    const result = validateTranslation(translated, source);
    expect(result.aiNarrative.dimensionAnalyses[0].score).toBe(70);
    expect(result.aiNarrative.priorityRoadmap[0].priority).toBe("P1");
    expect(result.aiNarrative.priorityRoadmap[0].findingIds).toEqual(["canonical.mismatch"]);
  });

  it("rejects a response that omits a finding action", () => {
    const incomplete = structuredClone(translated);
    delete (incomplete.findings[0] as Record<string, unknown>).action;
    expect(() => validateTranslation(incomplete, source)).toThrow(/omitted visible text/i);
  });

  it("rejects unchanged English narrative prose", () => {
    const incomplete = structuredClone(translated);
    incomplete.aiNarrative.executiveSummary = source.aiNarrative.executiveSummary;
    expect(() => validateTranslation(incomplete, source)).toThrow(/left English text unchanged/i);
  });
});
