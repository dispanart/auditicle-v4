import type {
  AiNarrative,
  CheckedLink,
  DailyUsage,
  PublicConfig,
  ScanResponse,
  TranslatedReportContent
} from "../types";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
    });
  } catch {
    throw new ApiError("The connection to Auditicle was interrupted. Check your network and retry evidence collection.", 0, "NETWORK_INTERRUPTED");
  }

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string; code?: string; details?: unknown }
    | T
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error || payload.message
        : null;
    const code = payload && typeof payload === "object" && "code" in payload ? payload.code : undefined;
    const details = payload && typeof payload === "object" && "details" in payload ? payload.details : undefined;
    throw new ApiError(message || `Request failed with HTTP ${response.status}`, response.status, code, details);
  }

  return payload as T;
}

export function getPublicConfig(): Promise<PublicConfig> {
  return requestJson<PublicConfig>("/api/public-config");
}

export async function createAuditSession(turnstileToken: string): Promise<{ sessionId: string; usage: DailyUsage }> {
  return requestJson<{ sessionId: string; usage: DailyUsage }>("/api/session", {
    method: "POST",
    body: JSON.stringify({ turnstileToken })
  });
}

export function runScan(
  sessionId: string,
  input: { url: string; evidenceMode: "auto" | "server" | "rendered" }
): Promise<ScanResponse> {
  return requestJson<ScanResponse>("/api/scan", {
    method: "POST",
    headers: { "X-Audit-Session": sessionId },
    body: JSON.stringify(input)
  });
}

export async function checkLinks(
  sessionId: string,
  urls: string[]
): Promise<CheckedLink[]> {
  const result = await requestJson<{ links: CheckedLink[] }>("/api/check-links", {
    method: "POST",
    headers: { "X-Audit-Session": sessionId },
    body: JSON.stringify({ urls })
  });
  return result.links;
}

export function generateAiNarrative(
  sessionId: string,
  evidence: unknown
): Promise<AiNarrative> {
  return requestJson<AiNarrative>("/api/ai-report", {
    method: "POST",
    headers: { "X-Audit-Session": sessionId },
    body: JSON.stringify({ evidence })
  });
}

export function translateAuditReport(
  sessionId: string,
  payload: unknown,
  targetLanguage: string
): Promise<TranslatedReportContent> {
  return requestJson<TranslatedReportContent>("/api/translate-report", {
    method: "POST",
    headers: { "X-Audit-Session": sessionId },
    body: JSON.stringify({ payload, targetLanguage })
  });
}
