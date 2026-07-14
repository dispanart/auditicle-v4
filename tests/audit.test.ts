import { describe, expect, it } from "vitest";
import { calculateScore, normalizeKeyword } from "../src/lib/audit";
import type { Finding } from "../src/types";

function makeFinding(severity: Finding["severity"]): Finding {
  return {
    id: severity,
    area: "Test",
    severity,
    title: "Test",
    found: "Evidence",
    why: "Reason",
    action: "Action",
    evidenceIds: ["test"],
    impact: "Low",
    effort: "Low",
    owner: "Tester",
    validation: "Validate",
    confidence: "High"
  };
}

describe("Auditicle deterministic helpers", () => {
  it("normalizes keyword whitespace and case", () => {
    expect(normalizeKeyword("  SEO   Forensics  ")).toBe("seo forensics");
  });

  it("deducts deterministic severity weights", () => {
    expect(calculateScore([makeFinding("critical"), makeFinding("warning"), makeFinding("notice")])).toBe(76);
  });

  it("never returns a score below zero", () => {
    expect(calculateScore(Array.from({ length: 20 }, () => makeFinding("critical")))).toBe(0);
  });

  it("does not deduct for pass findings", () => {
    expect(calculateScore([makeFinding("pass")])).toBe(100);
  });

  it("does not deduct for informational findings", () => {
    expect(calculateScore([makeFinding("info")])).toBe(100);
  });
});
