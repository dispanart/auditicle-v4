import puppeteer from "@cloudflare/puppeteer";
import type { EvidenceModeRequest, PageEvidence, RobotsEvidence } from "../../src/types";
import type { WorkerEnv } from "./security";
import {
  assertPublicNetworkTarget,
  AuditError,
  fetchWithRedirectValidation,
  readLimitedText,
  reserveRenderedBrowserAttempt,
  validatePublicUrl
} from "./security";



async function evidenceCacheKey(namespace: string, id: string): Promise<Request> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id));
  const token = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return new Request(`https://auditicle.internal/evidence/${namespace}/${token}`);
}

async function readEvidenceCache<T>(namespace: string, id: string): Promise<T | null> {
  if (typeof caches === "undefined") return null;
  const cache = (caches as unknown as { default: Cache }).default;
  const response = await cache.match(await evidenceCacheKey(namespace, id));
  if (!response) return null;
  try { return await response.json() as T; } catch { return null; }
}

async function writeEvidenceCache(namespace: string, id: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (typeof caches === "undefined" || ttlSeconds <= 0) return;
  const ttl = Math.max(60, Math.floor(ttlSeconds));
  const cache = (caches as unknown as { default: Cache }).default;
  await cache.put(
    await evidenceCacheKey(namespace, id),
    new Response(JSON.stringify(value), {
      headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttl}` }
    })
  );
}

function boundedTtl(value: string | undefined, fallback: number, min = 300, max = 86_400): number {
  return Math.max(min, Math.min(max, Number(value || fallback)));
}

const SELECTED_HEADERS = [
  "content-type",
  "content-language",
  "x-robots-tag",
  "cache-control",
  "last-modified",
  "etag",
  "content-security-policy",
  "strict-transport-security"
];
const ROBOT_PRODUCT_TOKEN = "AuditicleBot";

function headerRecord(headers: Headers | Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of SELECTED_HEADERS) {
    const value = headers instanceof Headers ? headers.get(name) : headers[name] || headers[name.toLowerCase()];
    if (value) result[name] = value;
  }
  return result;
}

export function classifyTargetStatus(status: number): { code: string; message: string; status: number } | null {
  if (status >= 200 && status < 300) return null;
  if (status === 401 || status === 403) return { code: "TARGET_FORBIDDEN", message: `The target server denied access with HTTP ${status}.`, status: 403 };
  if (status === 404 || status === 410) return { code: "TARGET_NOT_FOUND", message: `The requested page returned HTTP ${status}.`, status: 404 };
  if (status === 429) return { code: "TARGET_RATE_LIMITED", message: "The target is temporarily rate-limiting audit requests.", status: 429 };
  if (status >= 500) return { code: "TARGET_SERVER_ERROR", message: `The target server returned HTTP ${status}.`, status: 502 };
  return { code: "TARGET_HTTP_ERROR", message: `The target returned HTTP ${status}.`, status: 400 };
}

export function detectBotChallenge(html: string, status = 200): { detected: boolean; marker?: string } {
  const sample = html.slice(0, 250_000).toLowerCase();
  const platformMarkers = [
    "cdn-cgi/challenge-platform",
    "cf-chl-",
    "checking your browser before accessing",
    "security verification required"
  ];
  const challengeLanguage = [
    "verify you are human",
    "please verify you are a human",
    "just a moment",
    "attention required",
    "enable javascript and cookies"
  ];
  const captchaMarkers = ["captcha-container", "g-recaptcha", "hcaptcha"];
  const platform = platformMarkers.find((marker) => sample.includes(marker));
  if (platform) return { detected: true, marker: platform };

  const visible = sample
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const visibleWords = visible ? visible.split(/\s+/).length : 0;
  const languageMarker = challengeLanguage.find((marker) => sample.includes(marker));
  const captchaMarker = captchaMarkers.find((marker) => sample.includes(marker));
  const challengeStatus = [401, 403, 429, 503].includes(status);

  if (challengeStatus && (languageMarker || captchaMarker)) {
    return { detected: true, marker: languageMarker || captchaMarker };
  }
  if (visibleWords < 120 && languageMarker && captchaMarker) {
    return { detected: true, marker: languageMarker };
  }
  return { detected: false };
}

export interface ParsedRobots {
  sitemapUrls: string[];
  groups: Array<{ agents: string[]; allow: string[]; disallow: string[] }>;
}

export function parseRobots(content: string): ParsedRobots {
  const sitemapUrls: string[] = [];
  const groups: ParsedRobots["groups"] = [];
  let current: ParsedRobots["groups"][number] | null = null;
  let currentHasRules = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const hashIndex = rawLine.indexOf("#");
    const line = (hashIndex >= 0 ? rawLine.slice(0, hashIndex) : rawLine).trim();
    if (!line || !line.includes(":")) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "sitemap") {
      if (!value) continue;
      try { sitemapUrls.push(validatePublicUrl(value).toString()); } catch { /* ignore malformed sitemap */ }
      continue;
    }
    if (key === "user-agent") {
      if (!value) continue;
      if (!current || currentHasRules) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
        currentHasRules = false;
      }
      current.agents.push(value);
      continue;
    }
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      currentHasRules = true;
      if (!value) continue;
      if (key === "allow") current.allow.push(value);
      else current.disallow.push(value);
    }
  }
  return { sitemapUrls: [...new Set(sitemapUrls)], groups };
}

function robotsPatternRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const core = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = core
    .split("*")
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}${anchored ? "$" : ""}`);
}

function patternSpecificity(pattern: string): number {
  return new TextEncoder().encode(pattern.replace(/\*/g, "").replace(/\$$/, "")).byteLength;
}

export function evaluateRobotsAccess(
  targetUrl: string,
  parsed: ParsedRobots,
  productToken = ROBOT_PRODUCT_TOKEN
): { userAgent: string; matchedAgent: string | null; matchedRule: string | null; allowed: boolean; decision: "allowed" | "disallowed" } {
  const token = productToken.toLowerCase();
  let matchingGroups = parsed.groups.filter((group) => group.agents.some((agent) => agent.toLowerCase() === token));
  let matchedAgent: string | null = matchingGroups.length ? productToken : null;
  if (!matchingGroups.length) {
    matchingGroups = parsed.groups.filter((group) => group.agents.some((agent) => agent.trim() === "*"));
    matchedAgent = matchingGroups.length ? "*" : null;
  }
  if (!matchingGroups.length) return { userAgent: productToken, matchedAgent: null, matchedRule: null, allowed: true, decision: "allowed" };

  const url = validatePublicUrl(targetUrl);
  const target = `${url.pathname || "/"}${url.search}`;
  const rules = matchingGroups.flatMap((group) => [
    ...group.allow.map((pattern) => ({ type: "allow" as const, pattern })),
    ...group.disallow.map((pattern) => ({ type: "disallow" as const, pattern }))
  ]);
  const matches = rules
    .filter((rule) => {
      try { return robotsPatternRegex(rule.pattern).test(target); } catch { return false; }
    })
    .map((rule) => ({ ...rule, specificity: patternSpecificity(rule.pattern) }))
    .sort((a, b) => b.specificity - a.specificity || (a.type === "allow" ? -1 : 1));

  if (!matches.length) return { userAgent: productToken, matchedAgent, matchedRule: null, allowed: true, decision: "allowed" };
  const bestSpecificity = matches[0].specificity;
  const tied = matches.filter((item) => item.specificity === bestSpecificity);
  const winner = tied.find((item) => item.type === "allow") || tied[0];
  const allowed = winner.type === "allow";
  return {
    userAgent: productToken,
    matchedAgent,
    matchedRule: `${winner.type === "allow" ? "Allow" : "Disallow"}: ${winner.pattern}`,
    allowed,
    decision: allowed ? "allowed" : "disallowed"
  };
}

export async function preflightRobots(pageUrl: string, env: WorkerEnv): Promise<RobotsEvidence> {
  const page = validatePublicUrl(pageUrl);
  const robotsUrl = new URL("/robots.txt", page.origin).toString();
  const cacheId = page.origin;
  const cached = await readEvidenceCache<Omit<RobotsEvidence, "access">>("robots", cacheId);
  if (cached) {
    const access = cached.available
      ? evaluateRobotsAccess(page.toString(), { sitemapUrls: cached.sitemapUrls, groups: cached.groups })
      : { userAgent: ROBOT_PRODUCT_TOKEN, matchedAgent: null, matchedRule: null, allowed: true, decision: "unavailable" as const };
    if (!access.allowed) {
      throw new AuditError("ROBOTS_DISALLOWED", "The target URL is disallowed for AuditicleBot by robots.txt.", 403, {
        robotsUrl: cached.url, targetUrl: page.toString(), matchedUserAgent: access.matchedAgent,
        matchedRule: access.matchedRule, decision: "disallowed", cached: true
      });
    }
    return { ...cached, access, cached: true } as RobotsEvidence;
  }

  try {
    const { response, finalUrl } = await fetchWithRedirectValidation(
      robotsUrl,
      { headers: { Accept: "text/plain,*/*;q=0.5" } },
      { timeoutMs: 12_000, maxRedirects: 5 }
    );
    if (response.status >= 500) {
      throw new AuditError("ROBOTS_UNREACHABLE", "robots.txt is temporarily unreachable, so Auditicle must conservatively stop this crawl.", 503, {
        robotsUrl: finalUrl.toString(), status: response.status
      });
    }
    if (response.status >= 400) {
      const base = {
        url: finalUrl.toString(), status: response.status, available: false, content: "", sitemapUrls: [], groups: [],
        error: `robots.txt returned HTTP ${response.status}; RFC 9309 permits access when the file is unavailable.`,
        fetchedAt: new Date().toISOString()
      };
      await writeEvidenceCache("robots", cacheId, base, Math.min(900, boundedTtl(env.ROBOTS_CACHE_TTL_SECONDS, 3600)));
      return {
        ...base,
        access: { userAgent: ROBOT_PRODUCT_TOKEN, matchedAgent: null, matchedRule: null, allowed: true, decision: "unavailable" }
      } as RobotsEvidence;
    }
    const { text } = await readLimitedText(response, 512_000);
    const parsed = parseRobots(text);
    const access = evaluateRobotsAccess(page.toString(), parsed);
    const base = {
      url: finalUrl.toString(), status: response.status, available: true, content: text,
      sitemapUrls: parsed.sitemapUrls, groups: parsed.groups, fetchedAt: new Date().toISOString()
    };
    await writeEvidenceCache("robots", cacheId, base, boundedTtl(env.ROBOTS_CACHE_TTL_SECONDS, 3600));
    if (!access.allowed) {
      throw new AuditError("ROBOTS_DISALLOWED", "The target URL is disallowed for AuditicleBot by robots.txt.", 403, {
        robotsUrl: base.url, targetUrl: page.toString(), matchedUserAgent: access.matchedAgent,
        matchedRule: access.matchedRule, decision: "disallowed"
      });
    }
    return { ...base, access } as RobotsEvidence;
  } catch (error) {
    if (error instanceof AuditError) {
      if (["ROBOTS_DISALLOWED", "ROBOTS_UNREACHABLE"].includes(error.code)) throw error;
      if (["TARGET_TIMEOUT", "TARGET_NETWORK_ERROR"].includes(error.code)) {
        throw new AuditError("ROBOTS_UNREACHABLE", "robots.txt could not be reached, so Auditicle must conservatively stop this crawl.", 503, {
          robotsUrl, reason: error.message
        });
      }
      throw error;
    }
    throw new AuditError("ROBOTS_UNREACHABLE", "robots.txt could not be reached, so Auditicle must conservatively stop this crawl.", 503, { robotsUrl });
  }
}

function pageFromResponse(
  requestedUrl: string,
  response: Response,
  finalUrl: URL,
  redirects: Array<{ url: string; status: number; location?: string }>,
  text: string,
  bytes: number,
  requestedMode: EvidenceModeRequest
): PageEvidence {
  return {
    requestedUrl: validatePublicUrl(requestedUrl).toString(),
    finalUrl: finalUrl.toString(),
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get("content-type") || "",
    bytes,
    serverBytes: bytes,
    fetchedAt: new Date().toISOString(),
    headers: headerRecord(response.headers),
    redirects,
    html: text,
    evidenceMode: "server-html",
    rendering: {
      requestedMode,
      usedMode: "server-html",
      attempted: false,
      available: false,
      autoTriggered: false,
      reason: requestedMode === "server" ? "Server-delivered HTML was explicitly selected." : undefined
    }
  };
}

async function fetchServerPage(
  inputUrl: string,
  initialRobots: RobotsEvidence,
  env: WorkerEnv,
  requestedMode: EvidenceModeRequest
): Promise<{ page: PageEvidence; robots: RobotsEvidence }> {
  const maxBytes = Math.max(100_000, Math.min(1_000_000, Number(env.MAX_HTML_BYTES || 1_000_000)));
  let current = validatePublicUrl(inputUrl);
  let effectiveRobots = initialRobots;
  const redirects: Array<{ url: string; status: number; location?: string }> = [];

  for (let hop = 0; hop <= 5; hop += 1) {
    const robotsOrigin = new URL(effectiveRobots.url).origin;
    if (current.origin !== robotsOrigin) {
      effectiveRobots = await preflightRobots(current.toString(), env);
    } else if (effectiveRobots.available) {
      const access = evaluateRobotsAccess(current.toString(), { sitemapUrls: effectiveRobots.sitemapUrls, groups: effectiveRobots.groups });
      if (!access.allowed) {
        throw new AuditError("ROBOTS_DISALLOWED", "A redirect target is disallowed for AuditicleBot by robots.txt.", 403, {
          robotsUrl: effectiveRobots.url,
          targetUrl: current.toString(),
          matchedUserAgent: access.matchedAgent,
          matchedRule: access.matchedRule,
          decision: "disallowed",
          redirectHop: hop
        });
      }
    }

    const { response } = await fetchWithRedirectValidation(current, {}, { timeoutMs: 20_000, maxRedirects: 0 });
    const location = response.headers.get("location");
    if ([301, 302, 303, 307, 308].includes(response.status) && location) {
      redirects.push({ url: current.toString(), status: response.status, location });
      if (hop === 5) throw new AuditError("TOO_MANY_REDIRECTS", "The target exceeded the redirect limit.", 400);
      current = validatePublicUrl(new URL(location, current).toString());
      continue;
    }

    const contentType = response.headers.get("content-type") || "";
    const statusProblem = classifyTargetStatus(response.status);
    if (statusProblem) {
      if (/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        try {
          const sample = await readLimitedText(response, Math.min(maxBytes, 300_000));
          const challenge = detectBotChallenge(sample.text, response.status);
          if (challenge.detected) {
            throw new AuditError("BOT_CHALLENGE", "A bot-protection challenge prevented trustworthy evidence collection.", 403, { marker: challenge.marker, httpStatus: response.status });
          }
        } catch (error) {
          if (error instanceof AuditError && error.code === "BOT_CHALLENGE") throw error;
        }
      }
      throw new AuditError(statusProblem.code, statusProblem.message, statusProblem.status, { targetUrl: current.toString(), httpStatus: response.status });
    }

    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      throw new AuditError("NON_HTML_RESPONSE", `The URL returned “${contentType || "unknown content type"}”, not an HTML document.`, 415, { contentType });
    }
    const { text, bytes } = await readLimitedText(response, maxBytes);
    const challenge = detectBotChallenge(text, response.status);
    if (challenge.detected) {
      throw new AuditError("BOT_CHALLENGE", "A bot-protection challenge prevented trustworthy evidence collection.", 403, { marker: challenge.marker });
    }
    return {
      page: pageFromResponse(inputUrl, response, current, redirects, text, bytes, requestedMode),
      robots: effectiveRobots
    };
  }

  throw new AuditError("TARGET_UNRESOLVED", "Unable to resolve the target URL.", 502);
}

export function shouldAutoRender(html: string): boolean {
  const source = html.toLowerCase();
  const stripped = source
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = stripped ? stripped.split(/\s+/).length : 0;
  const appMarkers = ["id=\"root\"", "id=\"app\"", "__next_data__", "/_next/", "data-reactroot", "ng-version", "vite"].filter((marker) => source.includes(marker)).length;
  return (wordCount < 180 && appMarkers >= 1) || (wordCount < 80 && (source.match(/<script\b/g) || []).length >= 4);
}

async function renderBrowserPage(
  url: string,
  serverPage: PageEvidence,
  robots: RobotsEvidence,
  env: WorkerEnv,
  requestedMode: EvidenceModeRequest,
  autoTriggered: boolean
): Promise<PageEvidence> {
  if (env.RENDERED_BROWSER_ENABLED === "false") {
    return { ...serverPage, rendering: { requestedMode, usedMode: "server-html", attempted: false, available: false, autoTriggered, reason: "Rendered-browser audits are disabled in this deployment." } };
  }
  const maxBytes = Math.max(100_000, Math.min(1_000_000, Number(env.MAX_HTML_BYTES || 1_000_000)));
  const timeout = Math.max(8_000, Math.min(45_000, Number(env.RENDER_TIMEOUT_MS || 30_000)));
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    const browserBudget = await reserveRenderedBrowserAttempt(env);
    if (!browserBudget.allowed) {
      return {
        ...serverPage,
        rendering: {
          requestedMode,
          usedMode: "server-html",
          attempted: false,
          available: false,
          autoTriggered,
          reason: `The deployment reached its daily rendered-browser attempt limit (${browserBudget.limit}); server HTML was used instead.`
        }
      };
    }
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; AuditicleBot/4.8; +https://auditicle.site/crawler-information.html)");
    await page.setRequestInterception(true);
    const robotsByOrigin = new Map<string, RobotsEvidence>([[new URL(url).origin, robots]]);
    page.on("request", async (request) => {
      const requestUrl = request.url();
      if (!/^https?:/i.test(requestUrl)) { await request.continue(); return; }
      try {
        const checked = validatePublicUrl(requestUrl);
        await assertPublicNetworkTarget(checked);
        const isMainNavigation = request.isNavigationRequest() && request.frame() === page.mainFrame();
        let applicableRobots = robotsByOrigin.get(checked.origin);
        if (isMainNavigation && !applicableRobots) {
          applicableRobots = await preflightRobots(checked.toString(), env);
          robotsByOrigin.set(checked.origin, applicableRobots);
        }
        if (applicableRobots) {
          const access = evaluateRobotsAccess(checked.toString(), { sitemapUrls: applicableRobots.sitemapUrls, groups: applicableRobots.groups });
          if (!access.allowed) { await request.abort("blockedbyclient"); return; }
        }
        await request.continue();
      } catch {
        await request.abort("blockedbyclient");
      }
    });
    const response = await page.goto(url, { waitUntil: "networkidle2", timeout });
    const finalUrl = validatePublicUrl(page.url());
    const status = response?.status() ?? 200;
    const statusProblem = classifyTargetStatus(status);
    if (statusProblem) throw new AuditError(statusProblem.code, statusProblem.message, statusProblem.status, { httpStatus: status, rendered: true });
    const html = await page.content();
    const bytes = new TextEncoder().encode(html).byteLength;
    if (bytes > maxBytes) throw new AuditError("HTML_TOO_LARGE", `The rendered document exceeded the ${(maxBytes / 1_000_000).toFixed(1)} MB evidence limit.`, 413, { maxBytes });
    const challenge = detectBotChallenge(html, status);
    if (challenge.detected) throw new AuditError("BOT_CHALLENGE", "A bot-protection challenge prevented rendered evidence collection.", 403, { marker: challenge.marker });
    const responseHeaders = response?.headers() || {};
    return {
      ...serverPage,
      finalUrl: finalUrl.toString(),
      status,
      statusText: "Rendered browser response",
      contentType: responseHeaders["content-type"] || serverPage.contentType,
      bytes,
      headers: { ...serverPage.headers, ...headerRecord(responseHeaders) },
      html,
      evidenceMode: "rendered-browser",
      rendering: {
        requestedMode,
        usedMode: "rendered-browser",
        attempted: true,
        available: true,
        autoTriggered,
        finalUrl: finalUrl.toString(),
        renderedAt: new Date().toISOString(),
        browserMsUsed: null
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rendered-browser audit failed.";
    const reason = /browser time limit|429/i.test(message)
      ? "Cloudflare Browser Run reached its current free-tier or rate limit. Server HTML was used instead."
      : /timeout/i.test(message)
        ? "Rendered-browser collection timed out. Server HTML was used instead."
        : `Rendered-browser evidence was unavailable: ${message}`;
    return {
      ...serverPage,
      rendering: { requestedMode, usedMode: "server-html", attempted: true, available: false, autoTriggered, reason }
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* close best effort */ }
    }
  }
}

export async function fetchPage(
  url: string,
  robots: RobotsEvidence,
  env: WorkerEnv,
  requestedMode: EvidenceModeRequest = "auto"
): Promise<{ page: PageEvidence; robots: RobotsEvidence }> {
  const serverResult = await fetchServerPage(url, robots, env, requestedMode);
  const autoTriggered = requestedMode === "auto" && shouldAutoRender(serverResult.page.html);
  const shouldRender = requestedMode === "rendered" || autoTriggered;
  if (!shouldRender) return serverResult;
  const page = await renderBrowserPage(serverResult.page.finalUrl, serverResult.page, serverResult.robots, env, requestedMode, autoTriggered);
  return { page, robots: serverResult.robots };
}

function decodeXml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}

function normalizeComparableUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    const path = url.pathname.replace(/\/$/, "") || "/";
    return `${url.origin}${path}${url.search}`;
  } catch { return value; }
}

interface CachedSitemapRecord {
  url: string;
  status: number | null;
  available: boolean;
  type: "urlset" | "index" | "unknown";
  urls: string[];
  lastmodCount: number;
  truncated: boolean;
  fetchedAt: string;
  error?: string;
}

function sitemapEvidenceFromCache(record: CachedSitemapRecord, submittedUrl: string, cached: boolean) {
  const target = normalizeComparableUrl(submittedUrl);
  return {
    url: record.url,
    status: record.status,
    available: record.available,
    type: record.type,
    urlCount: record.urls.length,
    lastmodCount: record.lastmodCount,
    sampleUrls: record.urls.slice(0, 12),
    containsSubmittedUrl: record.type === "urlset" ? record.urls.some((item) => normalizeComparableUrl(item) === target) : null,
    truncated: record.truncated,
    childSitemaps: record.type === "index" ? record.urls.slice(0, 2) : [],
    error: record.error,
    fetchedAt: record.fetchedAt,
    cached
  };
}

async function fetchSitemap(url: string, submittedUrl: string, env: WorkerEnv) {
  const cacheId = validatePublicUrl(url).toString();
  const cached = await readEvidenceCache<CachedSitemapRecord>("sitemap", cacheId);
  if (cached) return sitemapEvidenceFromCache(cached, submittedUrl, true);

  try {
    const { response, finalUrl } = await fetchWithRedirectValidation(url, { headers: { Accept: "application/xml,text/xml,text/plain;q=0.9,*/*;q=0.5" } }, { timeoutMs: 15_000, maxRedirects: 4 });
    const { text } = await readLimitedText(response, 1_500_000);
    const lower = text.toLowerCase();
    const type: "urlset" | "index" | "unknown" = lower.includes("<sitemapindex") ? "index" : lower.includes("<urlset") ? "urlset" : "unknown";
    const parseLimit = Math.max(100, Math.min(10_000, Number(env.SITEMAP_URL_PARSE_LIMIT || 10_000)));
    const urls: string[] = [];
    let truncated = false;
    for (const match of text.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)) {
      if (urls.length >= parseLimit) { truncated = true; break; }
      const decoded = decodeXml(match[1].trim());
      if (decoded) urls.push(decoded);
    }
    let lastmodCount = 0;
    for (const _match of text.matchAll(/<lastmod\b[^>]*>[\s\S]*?<\/lastmod>/gi)) {
      lastmodCount += 1;
      if (lastmodCount >= parseLimit) break;
    }
    const record: CachedSitemapRecord = {
      url: finalUrl.toString(), status: response.status, available: response.ok && type !== "unknown", type,
      urls, lastmodCount, truncated, fetchedAt: new Date().toISOString(),
      error: response.ok && type !== "unknown" ? undefined : `HTTP ${response.status} or unrecognized XML format.`
    };
    await writeEvidenceCache("sitemap", cacheId, record, boundedTtl(env.SITEMAP_CACHE_TTL_SECONDS, 21_600, 900, 86_400));
    return sitemapEvidenceFromCache(record, submittedUrl, false);
  } catch (error) {
    return { url, status: null, available: false, type: "unknown" as const, urlCount: 0, lastmodCount: 0, sampleUrls: [], containsSubmittedUrl: null, truncated: false, childSitemaps: [], cached: false, fetchedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "Sitemap request failed." };
  }
}

export async function discoverSite(pageUrl: string, robots: RobotsEvidence, env: WorkerEnv) {
  const page = validatePublicUrl(pageUrl);
  const sitemapTargets = robots.sitemapUrls.length ? robots.sitemapUrls.slice(0, 3) : [new URL("/sitemap.xml", page.origin).toString()];
  const parents = await Promise.all(sitemapTargets.map((url) => fetchSitemap(url, pageUrl, env)));
  const childTargets = parents.flatMap((item) => item.childSitemaps).slice(0, 2);
  const children = await Promise.all(childTargets.map((url) => fetchSitemap(url, pageUrl, env)));
  const sitemaps = [...parents, ...children].map(({ childSitemaps: _children, ...item }) => item);
  return { robots, sitemaps };
}

function score(category: unknown): number | null {
  if (!category || typeof category !== "object") return null;
  const value = (category as { score?: unknown }).score;
  return typeof value === "number" ? value : null;
}
function numericAudit(audits: Record<string, any>, id: string): number | null {
  const value = audits[id]?.numericValue;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function parseFieldData(payload: any): Record<string, string | number | null> {
  const metrics = payload?.loadingExperience?.metrics || payload?.originLoadingExperience?.metrics || {};
  const result: Record<string, string | number | null> = {};
  for (const [key, value] of Object.entries<any>(metrics)) result[key] = typeof value?.percentile === "number" ? value.percentile : value?.category || null;
  return result;
}
const OPPORTUNITY_IDS = ["render-blocking-resources","unused-javascript","unused-css-rules","uses-optimized-images","uses-responsive-images","modern-image-formats","offscreen-images","font-display","mainthread-work-breakdown","third-party-summary","server-response-time","dom-size","long-tasks","lcp-lazy-loaded","network-requests"];

export async function runPageSpeed(pageUrl: string, strategy: "mobile" | "desktop", env: WorkerEnv) {
  const safePageUrl = validatePublicUrl(pageUrl);
  await assertPublicNetworkTarget(safePageUrl);
  const cacheId = `${strategy}:${safePageUrl.toString()}`;
  const cached = await readEvidenceCache<any>("pagespeed", cacheId);
  if (cached) return { ...cached, cached: true };

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", safePageUrl.toString());
  endpoint.searchParams.set("strategy", strategy);
  ["performance", "accessibility", "best-practices", "seo"].forEach((category) => endpoint.searchParams.append("category", category));
  if (env.PAGESPEED_API_KEY) endpoint.searchParams.set("key", env.PAGESPEED_API_KEY);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), 55_000);
    const response = await fetch(endpoint.toString(), { signal: controller.signal });
    clearTimeout(timer);
    const payload = await response.json() as any;
    if (!response.ok) throw new Error(payload?.error?.message || `PageSpeed returned HTTP ${response.status}.`);
    const lighthouse = payload.lighthouseResult || {};
    const categories = lighthouse.categories || {};
    const audits = lighthouse.audits || {};
    const opportunities = OPPORTUNITY_IDS.map((id) => {
      const item = audits[id];
      if (!item || item.score === 1) return null;
      return { id, title: item.title || id, description: String(item.description || "").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").slice(0, 500), savingsMs: typeof item.details?.overallSavingsMs === "number" ? item.details.overallSavingsMs : null, savingsBytes: typeof item.details?.overallSavingsBytes === "number" ? item.details.overallSavingsBytes : null };
    }).filter(Boolean).slice(0, 12);
    const result = { available: true, strategy, fetchedAt: new Date().toISOString(), cached: false, performance: score(categories.performance), accessibility: score(categories.accessibility), bestPractices: score(categories["best-practices"]), seo: score(categories.seo), metrics: { fcp: numericAudit(audits, "first-contentful-paint"), lcp: numericAudit(audits, "largest-contentful-paint"), cls: numericAudit(audits, "cumulative-layout-shift"), tbt: numericAudit(audits, "total-blocking-time"), speedIndex: numericAudit(audits, "speed-index"), inp: numericAudit(audits, "interaction-to-next-paint"), ttfb: numericAudit(audits, "server-response-time") }, fieldData: parseFieldData(payload), opportunities };
    await writeEvidenceCache("pagespeed", cacheId, result, boundedTtl(env.PAGESPEED_CACHE_TTL_SECONDS, 43_200, 21_600, 86_400));
    return result;
  } catch (error) {
    return { available: false, strategy, fetchedAt: new Date().toISOString(), cached: false, performance: null, accessibility: null, bestPractices: null, seo: null, metrics: { fcp: null, lcp: null, cls: null, tbt: null, speedIndex: null, inp: null, ttfb: null }, fieldData: {}, opportunities: [], error: error instanceof Error ? error.message : "PageSpeed request failed." };
  }
}

async function checkOneLink(destination: string, env: WorkerEnv) {
  const checkedAt = new Date().toISOString();
  try {
    await preflightRobots(destination, env);
    let result;
    try {
      result = await fetchWithRedirectValidation(destination, { method: "HEAD" }, { timeoutMs: 10_000, maxRedirects: 4 });
      if ([400, 403, 405].includes(result.response.status)) result = await fetchWithRedirectValidation(destination, { method: "GET", headers: { Range: "bytes=0-1023" } }, { timeoutMs: 10_000, maxRedirects: 4 });
    } catch {
      result = await fetchWithRedirectValidation(destination, { method: "GET", headers: { Range: "bytes=0-1023" } }, { timeoutMs: 10_000, maxRedirects: 4 });
    }
    const status = result.response.status;
    const outcome = status >= 500 ? "server-error" : status >= 400 ? "client-error" : result.redirects.length ? "redirect" : "working";
    return { destination, finalUrl: result.finalUrl.toString(), status, statusText: result.response.statusText, contentType: result.response.headers.get("content-type"), redirects: result.redirects, outcome, checkedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Link check failed.";
    return { destination, finalUrl: null, status: null, statusText: "", contentType: null, redirects: [], outcome: /timeout|aborted/i.test(message) ? "timeout" : "unavailable", error: message, checkedAt };
  }
}

export async function checkLinks(urls: string[], env: WorkerEnv) {
  const maxLinks = Math.max(1, Math.min(10, Number(env.LINK_BATCH_SIZE || 5)));
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const value of urls.slice(0, maxLinks * 2)) {
    try {
      const url = validatePublicUrl(value).toString();
      if (!seen.has(url)) { seen.add(url); normalized.push(url); }
      if (normalized.length >= maxLinks) break;
    } catch { /* invalid/private targets excluded */ }
  }
  const results: any[] = new Array(normalized.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(6, normalized.length) }, async () => {
    while (cursor < normalized.length) { const index = cursor++; results[index] = await checkOneLink(normalized[index], env); }
  });
  await Promise.all(workers);
  return results;
}
