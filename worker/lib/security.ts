import type { BrowserWorker } from "@cloudflare/puppeteer";
import type { AuditicleQuotaCoordinator, QuotaRule, QuotaSnapshot } from "./quota";

export interface WorkerEnv {
  ASSETS: Fetcher;
  BROWSER: BrowserWorker;
  QUOTA_COORDINATOR: DurableObjectNamespace<AuditicleQuotaCoordinator>;
  SITE_URL?: string;
  PUBLIC_CONTACT_EMAIL?: string;
  CONTACT_EMAIL?: string;
  DONATION_URL?: string;
  TURNSTILE_REQUIRED?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  DAILY_AUDIT_LIMIT?: string;
  GLOBAL_DAILY_AUDIT_LIMIT?: string;
  RENDERED_BROWSER_DAILY_LIMIT?: string;
  AI_DAILY_REQUEST_LIMIT?: string;
  GEMINI_DAILY_REQUEST_LIMIT?: string;
  GROQ_DAILY_REQUEST_LIMIT?: string;
  OPENROUTER_DAILY_REQUEST_LIMIT?: string;
  PAGESPEED_CACHE_TTL_SECONDS?: string;
  ROBOTS_CACHE_TTL_SECONDS?: string;
  SITEMAP_CACHE_TTL_SECONDS?: string;
  SESSION_TTL_SECONDS?: string;
  MAX_HTML_BYTES?: string;
  MAX_LINKS?: string;
  LINK_BATCH_SIZE?: string;
  MAX_LINK_BATCHES?: string;
  SITEMAP_URL_PARSE_LIMIT?: string;
  RENDERED_BROWSER_ENABLED?: string;
  RENDER_TIMEOUT_MS?: string;
  PAGESPEED_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  AI_PROVIDER_ORDER?: string;
  AI_REPORT_PROVIDER_ORDER?: string;
  TRANSLATION_PROVIDER_ORDER?: string;
  GEMINI_MODEL?: string;
  GROQ_MODEL?: string;
  GROQ_REPORT_MODEL?: string;
  GROQ_TRANSLATION_MODEL?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_REPORT_MODEL?: string;
  OPENROUTER_TRANSLATION_MODEL?: string;
  AI_REPORTS_PER_SESSION?: string;
  TRANSLATIONS_PER_SESSION?: string;
}

export interface DailyUsage {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
  global?: {
    used: number;
    limit: number;
    remaining: number;
    resetsAt: string;
  };
}

export class AuditError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "AuditError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class DailyLimitError extends AuditError {
  usage: DailyUsage;

  constructor(usage: DailyUsage) {
    super(
      "DAILY_LIMIT_REACHED",
      "You have reached today’s audit limit. Your allowance resets at 00:00 UTC.",
      429,
      usage
    );
    this.name = "DailyLimitError";
    this.usage = usage;
  }
}

const PRIVATE_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "host.docker.internal"
]);

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(message: string, status = 400, code?: string, details?: unknown): Response {
  return json({ error: message, ...(code ? { code } : {}), ...(details !== undefined ? { details } : {}) }, { status });
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("Origin");
  if (!origin) throw new AuditError("MISSING_ORIGIN", "Missing request origin.", 403);
  const requestUrl = new URL(request.url);
  const originUrl = new URL(origin);
  if (originUrl.host !== requestUrl.host || originUrl.protocol !== requestUrl.protocol) {
    throw new AuditError("CROSS_ORIGIN_REJECTED", "Cross-origin request rejected.", 403);
  }
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && parts[2] === 0) ||
    (a === 192 && b === 0 && parts[2] === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    a >= 224
  );
}

function isPrivateIpv6(host: string): boolean {
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(mapped)) return isPrivateIpv4(mapped);
  }
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:") ||
    normalized === "2001:db8::"
  );
}

export function validatePublicUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new AuditError("INVALID_URL", "Enter a valid absolute URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new AuditError("UNSUPPORTED_PROTOCOL", "Only HTTP and HTTPS URLs are allowed.");
  if (url.username || url.password) throw new AuditError("URL_CREDENTIALS_REJECTED", "URLs containing credentials are not allowed.");
  if (url.port && !["80", "443"].includes(url.port)) throw new AuditError("NON_STANDARD_PORT", "Only standard web ports are allowed.");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    PRIVATE_HOSTS.has(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost") ||
    isPrivateIpv4(host) ||
    isPrivateIpv6(host)
  ) {
    throw new AuditError("PRIVATE_TARGET_REJECTED", "Private or local network targets are not allowed.", 403);
  }
  url.hash = "";
  return url;
}

type DnsJsonAnswer = { type?: number; data?: string };
type DnsJsonResponse = { Status?: number; Answer?: DnsJsonAnswer[] };
const dnsValidationCache = new Map<string, { expiresAt: number; promise: Promise<void> }>();

async function queryDnsAddresses(hostname: string, type: "A" | "AAAA"): Promise<string[]> {
  const endpoint = new URL("https://cloudflare-dns.com/dns-query");
  endpoint.searchParams.set("name", hostname);
  endpoint.searchParams.set("type", type);
  const response = await fetch(endpoint.toString(), {
    headers: { Accept: "application/dns-json" },
    signal: AbortSignal.timeout(5_000)
  });
  if (!response.ok) throw new Error(`dns-http-${response.status}`);
  const payload = await response.json() as DnsJsonResponse;
  if (payload.Status !== 0 && payload.Status !== 3) throw new Error(`dns-status-${payload.Status ?? "unknown"}`);
  const expectedType = type === "A" ? 1 : 28;
  return (payload.Answer || [])
    .filter((answer) => answer.type === expectedType && typeof answer.data === "string")
    .map((answer) => String(answer.data).trim());
}

export async function assertPublicNetworkTarget(input: string | URL): Promise<void> {
  const url = validatePublicUrl(input.toString());
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    throw new AuditError("PRIVATE_TARGET_REJECTED", "Private or local network targets are not allowed.", 403);
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(":")) return;

  const now = Date.now();
  const cached = dnsValidationCache.get(hostname);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = (async () => {
    const results = await Promise.allSettled([
      queryDnsAddresses(hostname, "A"),
      queryDnsAddresses(hostname, "AAAA")
    ]);
    const addresses = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (!addresses.length) {
      const allFailed = results.every((result) => result.status === "rejected");
      throw new AuditError(
        allFailed ? "TARGET_DNS_CHECK_FAILED" : "TARGET_DNS_UNRESOLVED",
        allFailed ? "The target DNS safety check could not be completed." : "The target hostname did not resolve to a public IP address.",
        502,
        { hostname }
      );
    }
    for (const address of addresses) {
      if (isPrivateIpv4(address) || isPrivateIpv6(address)) {
        throw new AuditError("PRIVATE_TARGET_REJECTED", "The target hostname resolves to a private, local, reserved, or non-routable address.", 403, { hostname });
      }
    }
  })();
  dnsValidationCache.set(hostname, { expiresAt: now + 300_000, promise });
  try {
    await promise;
  } catch (error) {
    dnsValidationCache.delete(hostname);
    throw error;
  }
}

export async function readLimitedText(response: Response, maxBytes: number): Promise<{ text: string; bytes: number }> {
  if (!response.body) return { text: "", bytes: 0 };
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    throw new AuditError("HTML_TOO_LARGE", `The response exceeded the ${(maxBytes / 1_000_000).toFixed(1)} MB evidence limit.`, 413, { maxBytes });
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new AuditError("HTML_TOO_LARGE", `The response exceeded the ${(maxBytes / 1_000_000).toFixed(1)} MB evidence limit.`, 413, { maxBytes });
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(merged), bytes };
}

function normalizeNetworkError(error: unknown): never {
  if (error instanceof AuditError) throw error;
  const message = error instanceof Error ? error.message : String(error);
  if (/abort|timeout/i.test(message)) {
    throw new AuditError("TARGET_TIMEOUT", "The target did not respond within the allowed time.", 504);
  }
  throw new AuditError("TARGET_NETWORK_ERROR", "The target could not be reached from the audit network.", 502);
}

export async function fetchWithRedirectValidation(
  input: string | URL,
  init: RequestInit = {},
  options: { maxRedirects?: number; timeoutMs?: number } = {}
): Promise<{ response: Response; finalUrl: URL; redirects: Array<{ url: string; status: number; location?: string }> }> {
  const maxRedirects = options.maxRedirects ?? 5;
  const timeoutMs = options.timeoutMs ?? 15000;
  let current = validatePublicUrl(input.toString());
  const redirects: Array<{ url: string; status: number; location?: string }> = [];

  for (let attempt = 0; attempt <= maxRedirects; attempt += 1) {
    await assertPublicNetworkTarget(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
    let response: Response;
    try {
      response = await fetch(current.toString(), {
        ...init,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "AuditicleBot/4.8 (+https://auditicle.site/crawler-information.html)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
          ...(init.headers ?? {})
        }
      });
    } catch (error) {
      clearTimeout(timer);
      normalizeNetworkError(error);
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      redirects.push({ url: current.toString(), status: response.status, location: location ?? undefined });
      if (!location) return { response, finalUrl: current, redirects };
      if (attempt === maxRedirects) {
        if (maxRedirects === 0) return { response, finalUrl: current, redirects };
        throw new AuditError("TOO_MANY_REDIRECTS", "The target exceeded the redirect limit.", 400);
      }
      current = validatePublicUrl(new URL(location, current).toString());
      continue;
    }
    return { response, finalUrl: current, redirects };
  }
  throw new AuditError("TARGET_UNRESOLVED", "Unable to resolve the target URL.", 502);
}

async function cacheKey(namespace: string, id: string): Promise<Request> {
  const bytes = new TextEncoder().encode(id);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const token = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return new Request(`https://auditicle.internal/${namespace}/${token}`);
}

function resetAtUtcMidnight(): { resetsAt: string; ttl: number; day: string } {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return {
    resetsAt: next.toISOString(),
    ttl: Math.max(60, Math.ceil((next.getTime() - now.getTime()) / 1000) + 60),
    day: now.toISOString().slice(0, 10)
  };
}

async function dailyCounter(request: Request, env: WorkerEnv): Promise<{ key: Request; current: number; usage: DailyUsage; ttl: number; day: string }> {
  const limit = Math.max(1, Number(env.DAILY_AUDIT_LIMIT || 5));
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const { resetsAt, ttl, day } = resetAtUtcMidnight();
  const key = await cacheKey("daily-rate", `${ip}:${day}`);
  const cache = (caches as unknown as { default: Cache }).default;
  const currentResponse = await cache.match(key);
  const current = currentResponse ? Number(await currentResponse.text()) : 0;
  return {
    key,
    current,
    ttl,
    day,
    usage: { used: current, limit, remaining: Math.max(0, limit - current), resetsAt }
  };
}

function quotaStub(env: WorkerEnv) {
  if (!env.QUOTA_COORDINATOR) {
    throw new AuditError("QUOTA_BINDING_MISSING", "The global quota coordinator is not configured.", 500);
  }
  return env.QUOTA_COORDINATOR.getByName("auditicle-global-budget");
}

function globalAuditLimit(env: WorkerEnv): number {
  return Math.max(1, Number(env.GLOBAL_DAILY_AUDIT_LIMIT || 100));
}

function attachGlobalUsage(usage: DailyUsage, snapshot: QuotaSnapshot): DailyUsage {
  return {
    ...usage,
    global: {
      used: snapshot.used,
      limit: snapshot.limit,
      remaining: snapshot.remaining,
      resetsAt: snapshot.resetsAt
    }
  };
}

export async function peekDailyUsage(request: Request, env: WorkerEnv): Promise<DailyUsage> {
  const { usage } = await dailyCounter(request, env);
  if (usage.used >= usage.limit) throw new DailyLimitError(usage);
  const global = await quotaStub(env).peek("audits", globalAuditLimit(env));
  const combined = attachGlobalUsage(usage, global);
  if (!global.allowed) {
    throw new AuditError(
      "GLOBAL_DAILY_LIMIT_REACHED",
      "Auditicle has reached its application-wide audit allowance for today. Try again after 00:00 UTC.",
      429,
      combined
    );
  }
  return combined;
}

export async function commitDailyUsage(request: Request, sessionId: string, env: WorkerEnv): Promise<DailyUsage> {
  const cache = (caches as unknown as { default: Cache }).default;
  const sessionCountKey = await cacheKey("counted-session", sessionId);
  const alreadyCounted = await cache.match(sessionCountKey);
  const counter = await dailyCounter(request, env);
  if (alreadyCounted) {
    const global = await quotaStub(env).peek("audits", globalAuditLimit(env));
    return attachGlobalUsage(counter.usage, global);
  }
  if (counter.current >= counter.usage.limit) throw new DailyLimitError(counter.usage);

  const [global] = await quotaStub(env).reserve([{ scope: "audits", limit: globalAuditLimit(env), units: 1 }]);
  if (!global?.allowed) {
    throw new AuditError(
      "GLOBAL_DAILY_LIMIT_REACHED",
      "Auditicle has reached its application-wide audit allowance for today. Try again after 00:00 UTC.",
      429,
      attachGlobalUsage(counter.usage, global)
    );
  }

  const used = counter.current + 1;
  await Promise.all([
    cache.put(counter.key, new Response(String(used), { headers: { "Cache-Control": `max-age=${counter.ttl}` } })),
    cache.put(sessionCountKey, new Response("counted", { headers: { "Cache-Control": `max-age=${counter.ttl}` } }))
  ]);
  return attachGlobalUsage(
    { used, limit: counter.usage.limit, remaining: Math.max(0, counter.usage.limit - used), resetsAt: counter.usage.resetsAt },
    global
  );
}

export async function reserveGlobalBudget(env: WorkerEnv, rules: QuotaRule[]): Promise<QuotaSnapshot[]> {
  return quotaStub(env).reserve(rules);
}

export async function reserveRenderedBrowserAttempt(env: WorkerEnv): Promise<QuotaSnapshot> {
  const limit = Math.max(0, Number(env.RENDERED_BROWSER_DAILY_LIMIT || 20));
  const [snapshot] = await reserveGlobalBudget(env, [{ scope: "rendered-browser-attempts", limit, units: 1 }]);
  return snapshot;
}

export async function reserveAiProviderRequest(provider: "gemini" | "groq" | "openrouter", env: WorkerEnv): Promise<QuotaSnapshot[]> {
  const totalLimit = Math.max(0, Number(env.AI_DAILY_REQUEST_LIMIT || 30));
  const providerLimit = Math.max(0, Number(
    provider === "gemini" ? env.GEMINI_DAILY_REQUEST_LIMIT || 15
      : provider === "groq" ? env.GROQ_DAILY_REQUEST_LIMIT || 20
      : env.OPENROUTER_DAILY_REQUEST_LIMIT || 10
  ));
  return reserveGlobalBudget(env, [
    { scope: "ai-provider-requests", limit: totalLimit, units: 1 },
    { scope: `ai-provider-${provider}`, limit: providerLimit, units: 1 }
  ]);
}

async function enforceSessionActionLimit(sessionId: string, action: string, limit: number, env: WorkerEnv, code: string, message: string): Promise<{ used: number; limit: number }> {
  const ttl = Math.max(300, Number(env.SESSION_TTL_SECONDS || 1800));
  const key = await cacheKey(`session-action-${action}`, sessionId);
  const cache = (caches as unknown as { default: Cache }).default;
  const currentResponse = await cache.match(key);
  const current = currentResponse ? Number(await currentResponse.text()) : 0;
  if (current >= limit) throw new AuditError(code, message, 429);
  const used = current + 1;
  await cache.put(key, new Response(String(used), { headers: { "Cache-Control": `max-age=${ttl}` } }));
  return { used, limit };
}

export async function enforceSessionLinkBatchLimit(sessionId: string, env: WorkerEnv): Promise<{ used: number; limit: number }> {
  const limit = Math.max(1, Math.min(3, Number(env.MAX_LINK_BATCHES || 1)));
  return enforceSessionActionLimit(sessionId, "link-batches", limit, env, "LINK_BATCH_LIMIT_REACHED", "The secured audit session has reached its link-check batch limit.");
}

export async function enforceSessionAiReportLimit(sessionId: string, env: WorkerEnv): Promise<{ used: number; limit: number }> {
  const limit = Math.max(1, Math.min(4, Number(env.AI_REPORTS_PER_SESSION || 1)));
  return enforceSessionActionLimit(sessionId, "ai-reports", limit, env, "AI_REPORT_LIMIT_REACHED", "The secured audit session has reached its consultant-narrative limit.");
}

export async function enforceSessionTranslationLimit(sessionId: string, env: WorkerEnv): Promise<{ used: number; limit: number }> {
  const limit = Math.max(1, Math.min(12, Number(env.TRANSLATIONS_PER_SESSION || 1)));
  return enforceSessionActionLimit(sessionId, "translations", limit, env, "TRANSLATION_LIMIT_REACHED", "The secured audit session has reached its report-translation limit.");
}

export async function requireCompletedAudit(sessionId: string): Promise<void> {
  const key = await cacheKey("counted-session", sessionId);
  const match = await (caches as unknown as { default: Cache }).default.match(key);
  if (!match) throw new AuditError("AUDIT_REQUIRED", "Complete a successful primary audit before using this endpoint.", 409);
}

export async function createSession(env: WorkerEnv): Promise<string> {
  const id = crypto.randomUUID();
  const ttl = Math.max(300, Number(env.SESSION_TTL_SECONDS || 1800));
  const key = await cacheKey("session", id);
  await (caches as unknown as { default: Cache }).default.put(key, new Response("ok", { headers: { "Cache-Control": `max-age=${ttl}` } }));
  return id;
}

export async function requireSession(request: Request): Promise<string> {
  const id = request.headers.get("X-Audit-Session")?.trim();
  if (!id) throw new AuditError("SESSION_EXPIRED", "Audit session is missing or expired.", 401);
  const key = await cacheKey("session", id);
  const match = await (caches as unknown as { default: Cache }).default.match(key);
  if (!match) throw new AuditError("SESSION_EXPIRED", "Audit session is missing or expired.", 401);
  return id;
}

export async function verifyTurnstile(token: string, request: Request, env: WorkerEnv): Promise<void> {
  const required = env.TURNSTILE_REQUIRED === "true";
  if (!required) return;
  if (!env.TURNSTILE_SECRET || !env.TURNSTILE_SITE_KEY) throw new AuditError("TURNSTILE_CONFIG_ERROR", "Turnstile is enabled but not fully configured.", 500);
  if (!token) throw new AuditError("TURNSTILE_REQUIRED", "Complete the security check before starting an audit.", 400);
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET);
  form.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
  if (!result.success) throw new AuditError("TURNSTILE_FAILED", "Security verification failed. Please refresh the check and try again.", 400);
}

export async function parseJsonBody<T>(request: Request, maxBytes = 100_000): Promise<T> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw new AuditError("REQUEST_TOO_LARGE", "Request body is too large.", 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new AuditError("REQUEST_TOO_LARGE", "Request body is too large.", 413);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AuditError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
}
