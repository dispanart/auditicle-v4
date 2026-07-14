import type { AiNarrative, AuditReport } from "../types";

const DISCLAIMER =
  "Auditicle provides automated diagnostic and educational information based on publicly accessible evidence and available third-party data. Results do not guarantee indexing, rankings, traffic, rich results, Core Web Vitals outcomes, AI Overview visibility, or citation by an AI system. Items labeled Analysis by Auditicle are internal interpretations and recommendations, not direct measurements or statements from Google. Review all technical, editorial, accessibility, legal, and business-critical changes before implementation.";

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function safeName(url: string): string {
  try {
    return new URL(url).hostname.replace(/[^a-z0-9.-]/gi, "-");
  } catch {
    return "auditicle-report";
  }
}

/**
 * Public exports deliberately omit the raw source HTML. The report keeps the
 * extracted evidence, selected headers, findings, link checks and measurements.
 */
export function buildSafeExportPayload(report: AuditReport, ai: AiNarrative | null) {
  const { html: _rawHtml, ...safePage } = report.page;
  return {
    report: { ...report, page: safePage },
    aiNarrative: ai,
    disclaimer: DISCLAIMER
  };
}

export function exportJson(report: AuditReport, ai: AiNarrative | null): void {
  download(
    `auditicle-${safeName(report.page.finalUrl)}.json`,
    JSON.stringify(buildSafeExportPayload(report, ai), null, 2),
    "application/json;charset=utf-8"
  );
}

function scoreLine(report: AuditReport): string {
  if (report.scoreStatus === "withheld") {
    return `Score: Withheld — evidence coverage ${report.evidenceCoverage}%`;
  }
  if (report.scoreStatus === "provisional") {
    return `Score: ${report.score}/100 (provisional)`;
  }
  return `Score: ${report.score}/100`;
}

export function exportText(report: AuditReport, ai: AiNarrative | null): void {
  const lines = [
    "AUDITICLE — SEO FORENSICS CASE FILE",
    "====================================",
    `Case ID: ${report.id}`,
    `URL: ${report.page.finalUrl}`,
    `Created: ${report.createdAt}`,
    scoreLine(report),
    `Evidence coverage: ${report.evidenceCoverage}%`,
    `Evidence mode: ${report.page.evidenceMode}`,
    `Rendered browser attempted: ${report.page.rendering.attempted ? "Yes" : "No"}`,
    `Platform: ${report.extracted.platform} (${report.extracted.platformConfidence})`,
    `Article intelligence: ${report.articleIntelligence.overallScore}/100 (${report.articleIntelligence.scoreStatus})`,
    "",
    "ARTICLE INTELLIGENCE SCORECARDS",
    "-------------------------------",
    ...report.articleIntelligence.dimensions.flatMap((item) => [
      `${item.label}: ${item.status === "withheld" ? "Withheld" : `${item.score}/100`} (${item.status})`,
      `Summary: ${item.summary}`,
      `Strengths: ${item.strengths.length ? item.strengths.join(" | ") : "None confirmed"}`,
      `Gaps: ${item.gaps.length ? item.gaps.join(" | ") : "No material gap detected"}`,
      ""
    ]),
    "AI CRAWLER EVIDENCE",
    "-------------------",
    ...report.articleIntelligence.aiCrawlerAccess.map((item) => `${item.crawler} [${item.purpose}]: ${item.allowed ? "Allowed" : "Blocked"}${item.matchedRule ? ` — ${item.matchedRule}` : ""}`),
    "",
    "LIMITATIONS",
    "-----------",
    ...(report.limitations.length ? report.limitations : ["No material evidence limitations were recorded."]),
    "",
    "PRIORITIZED FINDINGS",
    "--------------------"
  ];

  report.findings.forEach((item, index) => {
    lines.push(
      `${index + 1}. [${item.severity.toUpperCase()}] ${item.title}`,
      `Area: ${item.area}`,
      `Evidence: ${item.found}`,
      `Why it matters: ${item.why}`,
      `Recommended action: ${item.action}`,
      `Owner: ${item.owner} | Impact: ${item.impact} | Effort: ${item.effort}`,
      `Validation: ${item.validation}`,
      ""
    );
  });

  if (ai) {
    lines.push(
      "AI-ENHANCED CONSULTANT NARRATIVE",
      "--------------------------------",
      `Provider: ${ai.provider}`,
      `Model: ${ai.model}`,
      ai.executiveSummary,
      ""
    );
    lines.push("FIVE-DIMENSION AI REVIEW", "------------------------");
    ai.dimensionAnalyses.forEach((item) => {
      lines.push(
        `${item.key}: ${item.score}/100 — ${item.verdict}`,
        item.evidenceSummary,
        `Strengths: ${item.strengths.length ? item.strengths.join(" | ") : "None confirmed"}`,
        `Gaps: ${item.gaps.length ? item.gaps.join(" | ") : "No material gap detected"}`,
        `Optimization actions: ${item.optimizationActions.length ? item.optimizationActions.join(" | ") : "See deterministic findings"}`,
        ""
      );
    });
    if (ai.priorityRoadmap.length) {
      lines.push("PRIORITY ROADMAP", "----------------");
      ai.priorityRoadmap.forEach((item) => {
        lines.push(
          `${item.priority}: ${item.action}`,
          `Finding IDs: ${item.findingIds.join(", ")}`,
          `Expected evidence change: ${item.expectedEvidenceChange}`,
          `Validation: ${item.validation}`,
          ""
        );
      });
    }
    lines.push("FINDING-BY-FINDING RECOMMENDATIONS", "----------------------------------");
    ai.recommendations.forEach((item) => {
      lines.push(
        `${item.findingId}`,
        item.explanation,
        `Fix: ${item.fix}`,
        `Caution: ${item.caution}`,
        ""
      );
    });
  }

  lines.push("DISCLAIMER", "----------", DISCLAIMER);
  download(`auditicle-${safeName(report.page.finalUrl)}.txt`, lines.join("\n"), "text/plain;charset=utf-8");
}

export function printReport(): void {
  window.print();
}
