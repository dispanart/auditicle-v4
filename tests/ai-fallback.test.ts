import { describe, expect, it } from "vitest";
import { buildDeterministicNarrative, generateNarrative } from "../worker/lib/ai";

const evidence = {
  scoreStatus: "final",
  evidenceCoverage: 91,
  articleIntelligence: {
    dimensions: [
      { key: "technicalSeo", score: 82, status: "final", summary: "Technical evidence summary", strengths: ["Canonical present"], gaps: ["One heading issue"] },
      { key: "geo", score: 74, status: "final", summary: "GEO evidence summary", strengths: ["Clear authorship"], gaps: ["Provenance can improve"] },
      { key: "aeo", score: 77, status: "final", summary: "AEO evidence summary", strengths: ["Direct answers"], gaps: ["FAQ coverage is limited"] },
      { key: "rag", score: 70, status: "provisional", summary: "RAG evidence summary", strengths: ["Segmentable sections"], gaps: ["Chunk context can improve"] },
      { key: "llmo", score: 68, status: "provisional", summary: "LLMO evidence summary", strengths: ["Source links present"], gaps: ["Citation anchors are inconsistent"] }
    ]
  },
  findings: [
    { id: "heading-order", severity: "warning", title: "Heading order", found: "A heading level is skipped.", action: "Restore a logical heading hierarchy.", validation: "Re-run the heading check." },
    { id: "canonical", severity: "pass", title: "Canonical", found: "Canonical is present.", action: "Preserve it.", validation: "Inspect source HTML." }
  ]
};

describe("deterministic consultant narrative", () => {
  it("preserves the five deterministic dimension scores and existing finding IDs", () => {
    const result = buildDeterministicNarrative(evidence);
    expect(result.dimensionAnalyses.map((item) => [item.key, item.score])).toEqual([
      ["technicalSeo", 82],
      ["geo", 74],
      ["aeo", 77],
      ["rag", 70],
      ["llmo", 68]
    ]);
    expect(result.priorityRoadmap.flatMap((item) => item.findingIds)).toEqual(["heading-order"]);
    expect(result.recommendations.map((item) => item.findingId)).toEqual(["heading-order"]);
  });

  it("is returned when no external provider key is configured", async () => {
    const result = await generateNarrative(evidence, {} as never);
    expect(result.provider).toBe("Auditicle deterministic");
    expect(result.model).toBe("rule-set-v4.7.1");
    expect(result.fallback).toBe(true);
    expect(result.dimensionAnalyses).toHaveLength(5);
  });
});
