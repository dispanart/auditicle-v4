import { reserveAiProviderRequest, type WorkerEnv } from "./security";

interface ProviderResult {
  provider: string;
  model: string;
  text: string;
}

interface ParsedNarrative {
  executiveSummary: string;
  dimensionAnalyses: Array<{
    key: "technicalSeo" | "geo" | "aeo" | "rag" | "llmo";
    score: number;
    verdict: string;
    evidenceSummary: string;
    strengths: string[];
    gaps: string[];
    optimizationActions: string[];
  }>;
  priorityRoadmap: Array<{
    priority: "P0" | "P1" | "P2";
    findingIds: string[];
    action: string;
    expectedEvidenceChange: string;
    validation: string;
  }>;
  recommendations: Array<{
    findingId: string;
    explanation: string;
    fix: string;
    caution: string;
  }>;
}

export const TRANSLATION_LANGUAGES = [
  "English",
  "Indonesian",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Dutch",
  "Japanese",
  "Korean",
  "Simplified Chinese",
  "Arabic",
  "Hindi"
] as const;

function narrativePrompt(evidence: unknown): string {
  return `You are the evidence-constrained article audit consultant inside Auditicle, an SEO forensics application.

TASK
Explain the supplied deterministic article audit in English across five dimensions:
1. Technical SEO
2. GEO readiness (generative search readiness)
3. AEO readiness (answer engine readiness)
4. RAG retrieval readiness
5. LLMO / AI citation readiness

IMPORTANT DEFINITIONS
- GEO and AEO are diagnostic views built on sound SEO, helpful content, crawlability, provenance and structure.
- RAG readiness means the public article is technically retrievable, segmentable, attributable and grounded; it does not prove any private RAG system will ingest it.
- LLMO readiness means observable AI-search discovery, provenance, extraction and citation signals; it does not predict or guarantee citations.

NON-NEGOTIABLE RULES
- Do not invent measurements, rankings, traffic, backlinks, index status, rich-result eligibility, AI citations, model ingestion, or business outcomes.
- Use only the supplied evidence and reduced article-content snapshot. Treat the snapshot as partial when it does not cover the full article.
- Do not claim that facts are accurate, original, authoritative, or consensus-supported unless the supplied evidence directly proves it.
- Do not change deterministic scores, score status, severity, finding IDs, numbers, URLs, crawler decisions, or quoted evidence.
- Every dimension score must exactly match articleIntelligence.dimensions.
- Recommendations and roadmap items must reference supplied finding IDs. If no relevant finding ID exists, explain the gap in the dimension analysis but do not invent an ID.
- Distinguish search-discovery crawlers from training crawlers. Blocking GPTBot or ClaudeBot is a publisher preference and must not be described as blocking ChatGPT or Claude search.
- Google Search AI features use the same Googlebot crawl controls as Google Search; do not invent a separate Google AI-search crawler.
- Explain uncertainty honestly.
- Return valid JSON only, with no markdown fences.

REQUIRED JSON SHAPE
{
  "executiveSummary": "3-5 sentence article-focused summary",
  "dimensionAnalyses": [
    {
      "key": "technicalSeo|geo|aeo|rag|llmo",
      "score": 0,
      "verdict": "short verdict",
      "evidenceSummary": "evidence-constrained explanation that may reference article excerpts without overstating full-page coverage",
      "strengths": ["observable strength"],
      "gaps": ["observable gap"],
      "optimizationActions": ["specific action"]
    }
  ],
  "priorityRoadmap": [
    {
      "priority": "P0|P1|P2",
      "findingIds": ["existing finding id"],
      "action": "implementation action",
      "expectedEvidenceChange": "what measurable evidence should change",
      "validation": "how to verify"
    }
  ],
  "recommendations": [
    {
      "findingId": "existing finding id",
      "explanation": "what the evidence means",
      "fix": "specific practical remediation",
      "caution": "validation or limitation"
    }
  ]
}

AUDIT EVIDENCE
${JSON.stringify(evidence)}`;
}
function translationPrompt(payload: unknown, targetLanguage: string): string {
  return `You are the controlled translation layer inside Auditicle.

TASK
Translate every human-readable string in the supplied English audit-report JSON into ${targetLanguage}.

NON-NEGOTIABLE RULES
- Return the exact same JSON keys, nesting, array lengths and array order.
- Translate all visible UI labels, finding prose, owners, limitations, rendering messages, PageSpeed errors and opportunity titles/descriptions, article-intelligence text, AI narrative text, and the disclaimer.
- Preserve IDs, object keys, scores, numbers, HTTP codes, dates, URLs, domains, model names, schema types, code, technical abbreviations and evidence values exactly.
- Do not add, remove, summarize, reinterpret, soften, or strengthen any finding.
- Do not change severity, priority, score, finding IDs, crawler decisions, metrics, URLs, or measurements.
- Never prefix translated text with words such as "Translation:" or "Terjemahan:".
- Keep product and protocol names such as Auditicle, PageSpeed, Googlebot, Cloudflare, JSON, HTML, HTTP, SEO, GEO, AEO, RAG and LLMO unchanged where appropriate.
- Return valid JSON only, without markdown fences or commentary.

SOURCE JSON
${JSON.stringify(payload)}`;
}
function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}


async function enforceProviderBudget(provider: "gemini" | "groq" | "openrouter", env: WorkerEnv): Promise<void> {
  const snapshots = await reserveAiProviderRequest(provider, env);
  if (!snapshots.length || snapshots.some((snapshot) => !snapshot.allowed)) {
    throw new Error("daily-provider-budget-exhausted");
  }
}

async function callGemini(prompt: string, env: WorkerEnv, task: "report" | "translation"): Promise<ProviderResult> {
  if (!env.GEMINI_API_KEY) throw new Error("not-configured");
  await enforceProviderBudget("gemini", env);
  const model = env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      signal: timeoutSignal(35_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: task === "translation" ? 7200 : 3600,
          responseMimeType: "application/json"
        }
      })
    }
  );
  const payload = await response.json() as any;
  if (!response.ok) throw new Error(`http-${response.status}:${payload?.error?.status || "provider-error"}`);
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || "").join("") || "";
  if (!text) throw new Error("empty-response");
  return { provider: "Google Gemini", model, text };
}

async function callGroq(prompt: string, env: WorkerEnv, task: "report" | "translation"): Promise<ProviderResult> {
  if (!env.GROQ_API_KEY) throw new Error("not-configured");
  await enforceProviderBudget("groq", env);
  const model = task === "translation"
    ? env.GROQ_TRANSLATION_MODEL || env.GROQ_MODEL || "openai/gpt-oss-20b"
    : env.GROQ_REPORT_MODEL || env.GROQ_MODEL || "openai/gpt-oss-120b";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal: timeoutSignal(28_000),
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Return valid JSON only. Never invent or change evidence." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_completion_tokens: task === "translation" ? 7000 : 3200,
      response_format: { type: "json_object" }
    })
  });
  const payload = await response.json() as any;
  if (!response.ok) throw new Error(`http-${response.status}:${payload?.error?.type || "provider-error"}`);
  const text = payload?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("empty-response");
  return { provider: "Groq", model: payload?.model || model, text };
}

async function callOpenRouter(prompt: string, env: WorkerEnv, task: "report" | "translation"): Promise<ProviderResult> {
  if (!env.OPENROUTER_API_KEY) throw new Error("not-configured");
  await enforceProviderBudget("openrouter", env);
  const model = task === "translation"
    ? env.OPENROUTER_TRANSLATION_MODEL || env.OPENROUTER_MODEL || "openrouter/free"
    : env.OPENROUTER_REPORT_MODEL || env.OPENROUTER_MODEL || "openrouter/free";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: timeoutSignal(40_000),
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.SITE_URL || "https://auditicle.site",
      "X-Title": "Auditicle SEO Forensics Lab"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Return valid JSON only. Never invent or change evidence." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: task === "translation" ? 7000 : 3200,
      response_format: { type: "json_object" }
    })
  });
  const payload = await response.json() as any;
  if (!response.ok) throw new Error(`http-${response.status}:${payload?.error?.code || "provider-error"}`);
  const text = payload?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("empty-response");
  return { provider: "OpenRouter", model: payload?.model || model, text };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("invalid-json");
  }
}

function providerOrder(value: string | undefined, fallback: string): string[] {
  return (value || fallback)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function providerConfigured(provider: string, env: WorkerEnv): boolean {
  if (provider === "gemini") return Boolean(env.GEMINI_API_KEY);
  if (provider === "groq") return Boolean(env.GROQ_API_KEY);
  if (provider === "openrouter") return Boolean(env.OPENROUTER_API_KEY);
  return false;
}

async function runProviders(
  prompt: string,
  env: WorkerEnv,
  options: { order: string[]; task: "report" | "translation" }
): Promise<ProviderResult & { fallback: boolean }> {
  const failures: Array<{ provider: string; reason: string }> = [];
  let attempted = 0;

  for (const provider of options.order) {
    if (!providerConfigured(provider, env)) continue;
    const fallback = attempted > 0;
    attempted += 1;
    try {
      let result: ProviderResult;
      if (provider === "gemini") result = await callGemini(prompt, env, options.task);
      else if (provider === "groq") result = await callGroq(prompt, env, options.task);
      else if (provider === "openrouter") result = await callOpenRouter(prompt, env, options.task);
      else continue;
      return { ...result, fallback };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      failures.push({ provider, reason });
      console.warn("Configured AI provider failed", { provider, reason });
    }
  }

  if (!attempted) throw new Error("no-configured-provider");
  console.error("All configured AI providers failed", { failures });
  throw new Error("all-configured-providers-failed");
}

function cleanString(value: unknown, max = 3000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanStringArray(value: unknown, maxItems = 8, maxLength = 1200): string[] {
  return (Array.isArray(value) ? value : [])
    .map((item) => cleanString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function validateNarrative(value: unknown, validFindingIds: Set<string>, expectedDimensions: any[]): ParsedNarrative {
  if (!value || typeof value !== "object") throw new Error("AI response has an invalid structure.");
  const record = value as Record<string, unknown>;
  const executiveSummary = cleanString(record.executiveSummary);
  if (!executiveSummary) throw new Error("AI response is missing an executive summary.");

  const dimensionKeys = ["technicalSeo", "geo", "aeo", "rag", "llmo"] as const;
  const expectedByKey = new Map(expectedDimensions.map((item: any) => [String(item?.key || ""), Number(item?.score)]));
  const rawDimensions = Array.isArray(record.dimensionAnalyses) ? record.dimensionAnalyses : [];
  const byKey = new Map(rawDimensions.map((item: any) => [String(item?.key || ""), item]));
  const dimensionAnalyses = dimensionKeys.map((key) => {
    const item = byKey.get(key) as Record<string, unknown> | undefined;
    const expectedScore = expectedByKey.get(key);
    if (!item || !Number.isFinite(expectedScore)) throw new Error(`AI response is missing dimension ${key}.`);
    return {
      key,
      score: expectedScore as number,
      verdict: cleanString(item.verdict, 500) || "Evidence-constrained review",
      evidenceSummary: cleanString(item.evidenceSummary, 2200) || "See the deterministic scorecard and findings.",
      strengths: cleanStringArray(item.strengths, 6, 900),
      gaps: cleanStringArray(item.gaps, 8, 900),
      optimizationActions: cleanStringArray(item.optimizationActions, 8, 1200)
    };
  });

  const rawRoadmap = Array.isArray(record.priorityRoadmap) ? record.priorityRoadmap : [];
  const priorityRoadmap = rawRoadmap.map((item) => {
    if (!item || typeof item !== "object") return null;
    const entry = item as Record<string, unknown>;
    const priority = ["P0", "P1", "P2"].includes(String(entry.priority)) ? String(entry.priority) as "P0" | "P1" | "P2" : "P2";
    const findingIds = (Array.isArray(entry.findingIds) ? entry.findingIds : [])
      .map((id) => cleanString(id, 160))
      .filter((id) => validFindingIds.has(id))
      .slice(0, 6);
    const action = cleanString(entry.action, 1800);
    const expectedEvidenceChange = cleanString(entry.expectedEvidenceChange, 1400);
    const validation = cleanString(entry.validation, 1400);
    if (!findingIds.length || !action || !validation) return null;
    return { priority, findingIds, action, expectedEvidenceChange, validation };
  }).filter(Boolean).slice(0, 8) as ParsedNarrative["priorityRoadmap"];

  const rawRecommendations = Array.isArray(record.recommendations) ? record.recommendations : [];
  const recommendations = rawRecommendations
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      const findingId = cleanString(entry.findingId, 160);
      if (!validFindingIds.has(findingId)) return null;
      const explanation = cleanString(entry.explanation, 1800);
      const fix = cleanString(entry.fix, 1800);
      const caution = cleanString(entry.caution, 1200);
      if (!explanation || !fix) return null;
      return { findingId, explanation, fix, caution: caution || "Validate the change against the rendered page and original evidence." };
    })
    .filter(Boolean)
    .slice(0, 12) as ParsedNarrative["recommendations"];
  return { executiveSummary, dimensionAnalyses, priorityRoadmap, recommendations };
}
function sentenceCase(value: string): string {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

export function buildDeterministicNarrative(evidence: any): ParsedNarrative {
  const dimensions = Array.isArray(evidence?.articleIntelligence?.dimensions) ? evidence.articleIntelligence.dimensions : [];
  const findings = Array.isArray(evidence?.findings) ? evidence.findings : [];
  const scoreStatus = String(evidence?.scoreStatus || "provisional");
  const coverage = Number(evidence?.evidenceCoverage || 0);
  const actionable = findings.filter((item: any) => item && item.severity !== "pass").slice(0, 12);

  const dimensionAnalyses = dimensions.map((dimension: any) => {
    const strengths = Array.isArray(dimension?.strengths) ? dimension.strengths.map(String).filter(Boolean).slice(0, 6) : [];
    const gaps = Array.isArray(dimension?.gaps) ? dimension.gaps.map(String).filter(Boolean).slice(0, 8) : [];
    return {
      key: String(dimension?.key || "technicalSeo") as ParsedNarrative["dimensionAnalyses"][number]["key"],
      score: Number(dimension?.score || 0),
      verdict: dimension?.status === "withheld" ? "Score withheld because evidence is insufficient" : `${sentenceCase(String(dimension?.status || "provisional"))} evidence-based readiness review`,
      evidenceSummary: String(dimension?.summary || "See the deterministic scorecard and linked evidence identifiers."),
      strengths,
      gaps,
      optimizationActions: gaps.length
        ? gaps.slice(0, 5).map((gap: string) => `Address the documented gap: ${gap}`)
        : ["Preserve the confirmed strengths and re-run the audit after material page changes."]
    };
  }) as ParsedNarrative["dimensionAnalyses"];

  const priorityFor = (severity: string): "P0" | "P1" | "P2" => severity === "critical" ? "P0" : severity === "warning" ? "P1" : "P2";
  const priorityRoadmap = actionable.slice(0, 8).map((item: any) => ({
    priority: priorityFor(String(item.severity || "notice")),
    findingIds: [String(item.id)],
    action: String(item.action || "Review the deterministic finding and implement an evidence-backed correction."),
    expectedEvidenceChange: `The next audit should no longer reproduce finding ${String(item.id)} or should show stronger linked evidence.`,
    validation: String(item.validation || "Re-run the audit and inspect the source-labeled evidence.")
  }));

  const recommendations = actionable.map((item: any) => ({
    findingId: String(item.id),
    explanation: String(item.found || item.title || "The deterministic audit recorded this finding."),
    fix: String(item.action || "Implement the deterministic recommendation."),
    caution: String(item.validation || "Validate the public page after implementation and keep a rollback path.")
  }));

  return {
    executiveSummary: `Auditicle completed a ${scoreStatus} deterministic article audit with ${coverage}% evidence coverage. The consultant narrative below is assembled from the existing scorecards and finding ledger without calling an external AI provider. It does not add measurements, change severity, or predict rankings or AI citations.`,
    dimensionAnalyses,
    priorityRoadmap,
    recommendations
  };
}

export async function generateNarrative(evidence: any, env: WorkerEnv) {
  const serialized = JSON.stringify(evidence);
  if (serialized.length > 55_000) throw new Error("Audit evidence is too large for the consultant narrative endpoint.");
  const validFindingIds = new Set<string>(
    Array.isArray(evidence?.findings)
      ? evidence.findings.map((item: any) => String(item?.id || "")).filter(Boolean)
      : []
  );
  try {
    const result = await runProviders(narrativePrompt(evidence), env, {
      task: "report",
      order: providerOrder(
        env.AI_REPORT_PROVIDER_ORDER || env.AI_PROVIDER_ORDER,
        "gemini,groq,openrouter"
      )
    });
    const parsed = validateNarrative(extractJson(result.text), validFindingIds, Array.isArray(evidence?.articleIntelligence?.dimensions) ? evidence.articleIntelligence.dimensions : []);
    return {
      provider: result.provider,
      model: result.model,
      fallback: result.fallback,
      generatedAt: new Date().toISOString(),
      ...parsed
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.warn("Using deterministic consultant narrative fallback", { reason });
    return {
      provider: "Auditicle deterministic",
      model: "rule-set-v4.7.1",
      fallback: true,
      generatedAt: new Date().toISOString(),
      ...buildDeterministicNarrative(evidence)
    };
  }
}

const TRANSLATION_METADATA_KEYS = new Set([
  "id", "key", "findingId", "findingIds", "priority", "score", "destination",
  "status", "severity", "impact", "effort", "provider", "model", "generatedAt"
]);

const STABLE_TECHNICAL_TERMS = new Set([
  "Auditicle", "PageSpeed", "Googlebot", "OAI-SearchBot", "Claude-SearchBot",
  "Cloudflare", "Gemini", "Groq", "OpenRouter", "JSON", "TXT", "PDF", "HTML",
  "CSS", "JavaScript", "HTTP", "HTTPS", "URL", "SEO", "GEO", "AEO", "RAG",
  "LLMO", "AI", "P0", "P1", "P2"
]);

function cleanTranslatedString(value: unknown, max = 5000): string {
  const cleaned = cleanString(value, max);
  return cleaned.replace(/^(?:translation|translated text|terjemahan)\s*:\s*/i, "").trim();
}

function shouldRequireChangedTranslation(value: string, path: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || STABLE_TECHNICAL_TERMS.has(trimmed)) return false;
  if (/^(?:https?:\/\/|mailto:|tel:|www\.|\/|#)/i.test(trimmed)) return false;
  if (/^[A-Z0-9_.:/@+\-]{2,}$/.test(trimmed)) return false;
  if (/^[\d\s.,:%+\-/]+$/.test(trimmed)) return false;
  if (/\.(?:com|org|net|io|site|dev|app)(?:\/|$)/i.test(trimmed) && !/\s/.test(trimmed)) return false;
  const words = trimmed.match(/[A-Za-z][A-Za-z'’-]*/g) || [];
  if (path.includes(".ui.") || path.includes(".labels.") || path === "ui" || path === "labels") return words.length > 0;
  if (/\.(?:area|title|owner|label|verdict)$/.test(path)) return words.length > 0;
  return words.length >= 3 || trimmed.length >= 28;
}

function finalPathKey(path: string): string {
  const match = path.match(/\.([^.[\]]+)$/);
  return match?.[1] || path;
}

function assertTranslationCoverage(translated: unknown, source: unknown, path = "root"): void {
  if (typeof source === "string") {
    if (typeof translated !== "string" || !cleanTranslatedString(translated)) {
      throw new Error(`Translation omitted visible text at ${path}.`);
    }
    const sourceValue = source.trim();
    const translatedValue = cleanTranslatedString(translated);
    if (TRANSLATION_METADATA_KEYS.has(finalPathKey(path))) return;
    if (shouldRequireChangedTranslation(sourceValue, path) && translatedValue.toLocaleLowerCase() === sourceValue.toLocaleLowerCase()) {
      throw new Error(`Translation left English text unchanged at ${path}.`);
    }
    return;
  }

  if (source === null || typeof source === "number" || typeof source === "boolean") {
    if (translated === undefined) throw new Error(`Translation omitted protected value at ${path}.`);
    return;
  }

  if (Array.isArray(source)) {
    if (!Array.isArray(translated) || translated.length !== source.length) {
      throw new Error(`Translation omitted visible text or changed array length at ${path}.`);
    }
    source.forEach((item, index) => assertTranslationCoverage(translated[index], item, `${path}[${index}]`));
    return;
  }

  if (source && typeof source === "object") {
    if (!translated || typeof translated !== "object" || Array.isArray(translated)) {
      throw new Error(`Translation omitted object content at ${path}.`);
    }
    const translatedRecord = translated as Record<string, unknown>;
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      if (!(key in translatedRecord)) throw new Error(`Translation omitted visible text at ${path}.${key}.`);
      assertTranslationCoverage(translatedRecord[key], value, `${path}.${key}`);
    }
  }
}

function requiredText(value: unknown, source: unknown, max: number, path: string): string {
  const cleaned = cleanTranslatedString(value, max);
  if (!cleaned) throw new Error(`Translation omitted visible text at ${path}.`);
  return cleaned || String(source || "");
}

export function validateTranslation(value: unknown, source: any): any {
  if (!value || typeof value !== "object") throw new Error("Translation response has an invalid structure.");
  assertTranslationCoverage(value, source);
  const record = value as Record<string, any>;

  const uiSource = source?.ui || {};
  const ui = Object.fromEntries(Object.keys(uiSource).map((key) => [key, requiredText(record.ui?.[key], uiSource[key], 500, `ui.${key}`)]));

  const sourceLabels = source?.labels || {};
  const labels = Object.fromEntries(Object.keys(sourceLabels).map((key) => [key, requiredText(record.labels?.[key], sourceLabels[key], 220, `labels.${key}`)]));

  const translatedFindings = Array.isArray(record.findings) ? record.findings : [];
  const byId = new Map(translatedFindings.map((item: any) => [String(item?.id || ""), item]));
  const findings = (Array.isArray(source?.findings) ? source.findings : []).map((original: any) => {
    const translated = byId.get(String(original.id)) as Record<string, unknown>;
    return {
      id: String(original.id),
      area: requiredText(translated?.area, original.area, 300, `findings.${original.id}.area`),
      title: requiredText(translated?.title, original.title, 700, `findings.${original.id}.title`),
      found: requiredText(translated?.found, original.found, 2600, `findings.${original.id}.found`),
      why: requiredText(translated?.why, original.why, 2600, `findings.${original.id}.why`),
      action: requiredText(translated?.action, original.action, 2600, `findings.${original.id}.action`),
      validation: requiredText(translated?.validation, original.validation, 2200, `findings.${original.id}.validation`),
      ...(original.owner !== undefined ? { owner: requiredText(translated?.owner, original.owner, 500, `findings.${original.id}.owner`) } : {}),
      ...(original.currentValue !== undefined ? { currentValue: requiredText(translated?.currentValue, original.currentValue, 1200, `findings.${original.id}.currentValue`) } : {}),
      ...(original.recommendedValue !== undefined ? { recommendedValue: requiredText(translated?.recommendedValue, original.recommendedValue, 1200, `findings.${original.id}.recommendedValue`) } : {})
    };
  });

  const limitations = (Array.isArray(source?.limitations) ? source.limitations : []).map((item: any, index: number) => requiredText(record.limitations?.[index], item, 1800, `limitations[${index}]`));
  const messages = source?.messages ? {
    renderingReason: requiredText(record.messages?.renderingReason, source.messages.renderingReason, 1800, "messages.renderingReason")
  } : undefined;

  const translatePerformanceDevice = (device: "mobile" | "desktop") => {
    const original = source?.performance?.[device];
    if (!original) return undefined;
    const candidate = record.performance?.[device];
    const byOpportunityId = new Map((Array.isArray(candidate?.opportunities) ? candidate.opportunities : []).map((item: any) => [String(item?.id || ""), item]));
    return {
      error: requiredText(candidate?.error, original.error, 1800, `performance.${device}.error`),
      opportunities: (Array.isArray(original.opportunities) ? original.opportunities : []).map((item: any) => {
        const translated = byOpportunityId.get(String(item.id)) as Record<string, unknown>;
        return {
          id: String(item.id),
          title: requiredText(translated?.title, item.title, 1000, `performance.${device}.${item.id}.title`),
          description: requiredText(translated?.description, item.description, 2200, `performance.${device}.${item.id}.description`)
        };
      })
    };
  };
  const mobile = translatePerformanceDevice("mobile");
  const desktop = translatePerformanceDevice("desktop");
  const performance = mobile || desktop ? { ...(mobile ? { mobile } : {}), ...(desktop ? { desktop } : {}) } : undefined;

  const translatedLinkErrors = Array.isArray(record.linkErrors) ? record.linkErrors : [];
  const linkByDestination = new Map(translatedLinkErrors.map((item: any) => [String(item?.destination || ""), item]));
  const linkErrors = (Array.isArray(source?.linkErrors) ? source.linkErrors : []).map((original: any) => {
    const candidate = linkByDestination.get(String(original.destination)) as Record<string, unknown>;
    return {
      destination: String(original.destination),
      error: requiredText(candidate?.error, original.error, 1800, `linkErrors.${original.destination}.error`)
    };
  });

  const sourceArticle = source?.articleIntelligence;
  const translatedArticle = record.articleIntelligence;
  const articleIntelligence = sourceArticle ? {
    methodologyNote: requiredText(translatedArticle?.methodologyNote, sourceArticle.methodologyNote, 3000, "articleIntelligence.methodologyNote"),
    dimensions: (Array.isArray(sourceArticle.dimensions) ? sourceArticle.dimensions : []).map((original: any) => {
      const candidate = Array.isArray(translatedArticle?.dimensions)
        ? translatedArticle.dimensions.find((item: any) => String(item?.key) === String(original.key))
        : null;
      return {
        key: String(original.key),
        label: requiredText(candidate?.label, original.label, 300, `articleIntelligence.${original.key}.label`),
        summary: requiredText(candidate?.summary, original.summary, 1600, `articleIntelligence.${original.key}.summary`),
        strengths: (Array.isArray(original.strengths) ? original.strengths : []).map((item: any, index: number) => requiredText(candidate?.strengths?.[index], item, 900, `articleIntelligence.${original.key}.strengths[${index}]`)),
        gaps: (Array.isArray(original.gaps) ? original.gaps : []).map((item: any, index: number) => requiredText(candidate?.gaps?.[index], item, 900, `articleIntelligence.${original.key}.gaps[${index}]`))
      };
    })
  } : undefined;

  const sourceAi = source?.aiNarrative;
  const translatedAi = record.aiNarrative;
  const aiNarrative = sourceAi ? {
    executiveSummary: requiredText(translatedAi?.executiveSummary, sourceAi.executiveSummary, 3000, "aiNarrative.executiveSummary"),
    dimensionAnalyses: (Array.isArray(sourceAi.dimensionAnalyses) ? sourceAi.dimensionAnalyses : []).map((original: any) => {
      const candidate = Array.isArray(translatedAi?.dimensionAnalyses)
        ? translatedAi.dimensionAnalyses.find((item: any) => String(item?.key) === String(original.key))
        : null;
      return {
        key: String(original.key),
        score: Number(original.score),
        verdict: requiredText(candidate?.verdict, original.verdict, 600, `aiNarrative.${original.key}.verdict`),
        evidenceSummary: requiredText(candidate?.evidenceSummary, original.evidenceSummary, 2200, `aiNarrative.${original.key}.evidenceSummary`),
        strengths: (Array.isArray(original.strengths) ? original.strengths : []).map((item: any, index: number) => requiredText(candidate?.strengths?.[index], item, 900, `aiNarrative.${original.key}.strengths[${index}]`)),
        gaps: (Array.isArray(original.gaps) ? original.gaps : []).map((item: any, index: number) => requiredText(candidate?.gaps?.[index], item, 900, `aiNarrative.${original.key}.gaps[${index}]`)),
        optimizationActions: (Array.isArray(original.optimizationActions) ? original.optimizationActions : []).map((item: any, index: number) => requiredText(candidate?.optimizationActions?.[index], item, 1200, `aiNarrative.${original.key}.optimizationActions[${index}]`))
      };
    }),
    priorityRoadmap: (Array.isArray(sourceAi.priorityRoadmap) ? sourceAi.priorityRoadmap : []).map((original: any, index: number) => {
      const candidate = Array.isArray(translatedAi?.priorityRoadmap) ? translatedAi.priorityRoadmap[index] : null;
      return {
        priority: String(original.priority),
        findingIds: Array.isArray(original.findingIds) ? original.findingIds.map(String) : [],
        action: requiredText(candidate?.action, original.action, 1800, `aiNarrative.priorityRoadmap[${index}].action`),
        expectedEvidenceChange: requiredText(candidate?.expectedEvidenceChange, original.expectedEvidenceChange, 1400, `aiNarrative.priorityRoadmap[${index}].expectedEvidenceChange`),
        validation: requiredText(candidate?.validation, original.validation, 1400, `aiNarrative.priorityRoadmap[${index}].validation`)
      };
    }),
    recommendations: (Array.isArray(sourceAi.recommendations) ? sourceAi.recommendations : []).map((original: any) => {
      const candidate = Array.isArray(translatedAi?.recommendations)
        ? translatedAi.recommendations.find((item: any) => String(item?.findingId) === String(original.findingId))
        : null;
      return {
        findingId: String(original.findingId),
        explanation: requiredText(candidate?.explanation, original.explanation, 1800, `aiNarrative.recommendations.${original.findingId}.explanation`),
        fix: requiredText(candidate?.fix, original.fix, 1800, `aiNarrative.recommendations.${original.findingId}.fix`),
        caution: requiredText(candidate?.caution, original.caution, 1200, `aiNarrative.recommendations.${original.findingId}.caution`)
      };
    })
  } : undefined;

  return {
    ui,
    labels,
    findings,
    limitations,
    ...(messages ? { messages } : {}),
    ...(performance ? { performance } : {}),
    linkErrors,
    ...(articleIntelligence ? { articleIntelligence } : {}),
    ...(aiNarrative ? { aiNarrative } : {}),
    disclaimer: requiredText(record.disclaimer, source?.disclaimer, 5000, "disclaimer")
  };
}

function buildTranslationChunks(payload: any): any[] {
  if (JSON.stringify(payload).length <= 28_000) return [payload];
  const chunks: any[] = [];
  const primary: any = {};
  for (const key of ["ui", "labels", "limitations", "messages", "disclaimer"]) {
    if (payload[key] !== undefined) primary[key] = payload[key];
  }
  if (Object.keys(primary).length) chunks.push(primary);
  const findings = Array.isArray(payload.findings) ? payload.findings : [];
  for (let index = 0; index < findings.length; index += 10) chunks.push({ findings: findings.slice(index, index + 10) });
  const evidence: any = {};
  for (const key of ["performance", "linkErrors", "articleIntelligence"]) {
    if (payload[key] !== undefined) evidence[key] = payload[key];
  }
  if (Object.keys(evidence).length) chunks.push(evidence);
  if (payload.aiNarrative) {
    chunks.push({ aiNarrative: { executiveSummary: payload.aiNarrative.executiveSummary, dimensionAnalyses: payload.aiNarrative.dimensionAnalyses } });
    chunks.push({ aiNarrative: { priorityRoadmap: payload.aiNarrative.priorityRoadmap, recommendations: payload.aiNarrative.recommendations } });
  }
  return chunks;
}

function mergeTranslationChunk(target: any, chunk: any): void {
  if (chunk.ui) target.ui = { ...(target.ui || {}), ...chunk.ui };
  if (chunk.labels) target.labels = { ...(target.labels || {}), ...chunk.labels };
  if (chunk.findings) target.findings = [...(target.findings || []), ...chunk.findings];
  if (chunk.limitations) target.limitations = chunk.limitations;
  if (chunk.messages) target.messages = { ...(target.messages || {}), ...chunk.messages };
  if (chunk.performance) target.performance = { ...(target.performance || {}), ...chunk.performance };
  if (chunk.linkErrors) target.linkErrors = chunk.linkErrors;
  if (chunk.articleIntelligence) target.articleIntelligence = chunk.articleIntelligence;
  if (chunk.aiNarrative) target.aiNarrative = { ...(target.aiNarrative || {}), ...chunk.aiNarrative };
  if (chunk.disclaimer !== undefined) target.disclaimer = chunk.disclaimer;
}

async function callTranslationProvider(provider: string, prompt: string, env: WorkerEnv): Promise<ProviderResult> {
  if (provider === "gemini") return callGemini(prompt, env, "translation");
  if (provider === "groq") return callGroq(prompt, env, "translation");
  if (provider === "openrouter") return callOpenRouter(prompt, env, "translation");
  throw new Error("unsupported-provider");
}

async function runTranslationProviders(sourceChunk: any, targetLanguage: string, env: WorkerEnv, order: string[]) {
  const failures: Array<{ provider: string; reason: string }> = [];
  let configuredIndex = 0;
  for (const provider of order) {
    if (!providerConfigured(provider, env)) continue;
    const fallback = configuredIndex > 0;
    configuredIndex += 1;
    try {
      const result = await callTranslationProvider(provider, translationPrompt(sourceChunk, targetLanguage), env);
      const parsed = extractJson(result.text);
      assertTranslationCoverage(parsed, sourceChunk, `provider.${provider}`);
      return { ...result, parsed, fallback };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      failures.push({ provider, reason });
      console.warn("Configured translation provider failed or returned incomplete output", { provider, reason });
    }
  }
  if (!configuredIndex) throw new Error("no-configured-provider");
  console.error("All configured translation providers failed", { failures });
  throw new Error("all-configured-translation-providers-failed");
}

export async function translateReport(payload: any, targetLanguage: string, env: WorkerEnv) {
  if (!TRANSLATION_LANGUAGES.includes(targetLanguage as any) || targetLanguage === "English") {
    throw new Error("Choose a supported non-English translation language.");
  }
  const serialized = JSON.stringify(payload);
  if (serialized.length > 95_000) throw new Error("The report is too large for translation.");
  const order = providerOrder(env.TRANSLATION_PROVIDER_ORDER, "groq,gemini,openrouter");
  const chunks = buildTranslationChunks(payload);
  const merged: any = {};
  const providers: string[] = [];
  const models: string[] = [];
  let fallback = false;
  for (const chunk of chunks) {
    const result = await runTranslationProviders(chunk, targetLanguage, env, order);
    mergeTranslationChunk(merged, result.parsed);
    if (!providers.includes(result.provider)) providers.push(result.provider);
    if (!models.includes(result.model)) models.push(result.model);
    fallback = fallback || result.fallback || providers.length > 1;
  }
  const parsed = validateTranslation(merged, payload);
  return {
    targetLanguage,
    provider: providers.join(" + "),
    model: models.join(" + "),
    fallback,
    generatedAt: new Date().toISOString(),
    ...parsed
  };
}

