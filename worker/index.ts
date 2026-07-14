import { generateNarrative, translateReport, TRANSLATION_LANGUAGES } from "./lib/ai";
import { checkLinks, discoverSite, fetchPage, preflightRobots, runPageSpeed } from "./lib/evidence";
import {
  assertSameOrigin,
  AuditError,
  commitDailyUsage,
  createSession,
  DailyLimitError,
  enforceSessionAiReportLimit,
  enforceSessionLinkBatchLimit,
  enforceSessionTranslationLimit,
  errorResponse,
  json,
  parseJsonBody,
  peekDailyUsage,
  requireCompletedAudit,
  requireSession,
  verifyTurnstile,
  type WorkerEnv
} from "./lib/security";
import type { EvidenceModeRequest } from "../src/types";

const VERSION = "4.8.0";

async function handleApi(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/api/health") {
    return json({ status: "ok", version: VERSION, architecture: "single-worker", renderedBrowser: env.RENDERED_BROWSER_ENABLED !== "false" });
  }

  if (request.method === "GET" && url.pathname === "/api/public-config") {
    const providerNames = new Set([
      ...(env.AI_REPORT_PROVIDER_ORDER || env.AI_PROVIDER_ORDER || "gemini,groq,openrouter").split(","),
      ...(env.TRANSLATION_PROVIDER_ORDER || "groq,gemini,openrouter").split(",")
    ].map((item) => item.trim().toLowerCase()).filter(Boolean));
    const providers = [...providerNames].filter((provider) => {
      if (provider === "gemini") return Boolean(env.GEMINI_API_KEY);
      if (provider === "groq") return Boolean(env.GROQ_API_KEY);
      if (provider === "openrouter") return Boolean(env.OPENROUTER_API_KEY);
      return false;
    });
    return json({
      version: VERSION,
      siteUrl: env.SITE_URL || `${url.protocol}//${url.host}`,
      contactEmail: env.PUBLIC_CONTACT_EMAIL || env.CONTACT_EMAIL || "hello@auditicle.site",
      donationUrl: env.DONATION_URL || null,
      turnstileRequired: env.TURNSTILE_REQUIRED === "true",
      turnstileSiteKey: env.TURNSTILE_SITE_KEY || null,
      pageSpeedEnabled: true,
      aiProviders: providers,
      deterministicNarrativeAvailable: true,
      dailyAuditLimit: Math.max(1, Number(env.DAILY_AUDIT_LIMIT || 5)),
      globalDailyAuditLimit: Math.max(1, Number(env.GLOBAL_DAILY_AUDIT_LIMIT || 100)),
      renderedBrowserDailyLimit: Math.max(0, Number(env.RENDERED_BROWSER_DAILY_LIMIT || 20)),
      aiDailyRequestLimit: Math.max(0, Number(env.AI_DAILY_REQUEST_LIMIT || 30)),
      evidenceCache: {
        pageSpeedSeconds: Math.max(21_600, Math.min(86_400, Number(env.PAGESPEED_CACHE_TTL_SECONDS || 43_200))),
        robotsSeconds: Math.max(300, Math.min(86_400, Number(env.ROBOTS_CACHE_TTL_SECONDS || 3_600))),
        sitemapSeconds: Math.max(900, Math.min(86_400, Number(env.SITEMAP_CACHE_TTL_SECONDS || 21_600)))
      },
      defaultEvidenceMode: "auto",
      translationLanguages: [...TRANSLATION_LANGUAGES],
      maxLinks: Math.max(1, Math.min(15, Number(env.MAX_LINKS || 5))),
      linkBatchSize: Math.max(1, Math.min(10, Number(env.LINK_BATCH_SIZE || 5))),
      maxLinkBatches: Math.max(1, Math.min(3, Number(env.MAX_LINK_BATCHES || 1))),
      renderedBrowserEnabled: env.RENDERED_BROWSER_ENABLED !== "false",
      renderedBrowserDailyAllowance: "Rendered-browser usage is subject to the Cloudflare Browser Run allowance on this account."
    });
  }

  if (request.method !== "POST") return errorResponse("Method not allowed.", 405, "METHOD_NOT_ALLOWED");
  assertSameOrigin(request);

  if (url.pathname === "/api/session") {
    const body = await parseJsonBody<{ turnstileToken?: string }>(request, 20_000);
    await verifyTurnstile(body.turnstileToken || "", request, env);
    const usage = await peekDailyUsage(request, env);
    const sessionId = await createSession(env);
    return json({ sessionId, usage });
  }

  const sessionId = await requireSession(request);

  if (url.pathname === "/api/scan") {
    const body = await parseJsonBody<{ url?: string; evidenceMode?: EvidenceModeRequest }>(request, 30_000);
    if (!body.url) throw new AuditError("URL_REQUIRED", "Website URL is required.");
    const evidenceMode: EvidenceModeRequest = ["auto", "server", "rendered"].includes(body.evidenceMode || "auto")
      ? (body.evidenceMode || "auto") as EvidenceModeRequest
      : "auto";

    // Robots preflight is deliberately completed before any page, browser or PageSpeed fetch.
    const initialRobots = await preflightRobots(body.url, env);
    const fetched = await fetchPage(body.url, initialRobots, env, evidenceMode);
    const page = fetched.page;
    const robots = fetched.robots;

    // A quota unit is committed only after trustworthy primary HTML evidence exists.
    const usage = await commitDailyUsage(request, sessionId, env);
    const errors: string[] = [];
    if (page.rendering.attempted && !page.rendering.available && page.rendering.reason) errors.push(page.rendering.reason);

    const [discoveryResult, mobile, desktop] = await Promise.allSettled([
      discoverSite(page.finalUrl, robots, env),
      runPageSpeed(page.finalUrl, "mobile", env),
      runPageSpeed(page.finalUrl, "desktop", env)
    ]);

    const discovery = discoveryResult.status === "fulfilled"
      ? discoveryResult.value
      : { robots, sitemaps: [] };
    if (discoveryResult.status === "rejected") errors.push("Sitemap evidence is unavailable.");

    const unavailablePageSpeed = (strategy: "mobile" | "desktop", reason: unknown) => ({
      available: false,
      strategy,
      fetchedAt: new Date().toISOString(),
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null,
      metrics: { fcp: null, lcp: null, cls: null, tbt: null, speedIndex: null, inp: null, ttfb: null },
      fieldData: {},
      opportunities: [],
      error: reason instanceof Error ? reason.message : "PageSpeed data is unavailable."
    });

    const mobileValue = mobile.status === "fulfilled" ? mobile.value : unavailablePageSpeed("mobile", mobile.reason);
    const desktopValue = desktop.status === "fulfilled" ? desktop.value : unavailablePageSpeed("desktop", desktop.reason);
    if (!mobileValue.available) errors.push(`Mobile PageSpeed: ${mobileValue.error}`);
    if (!desktopValue.available) errors.push(`Desktop PageSpeed: ${desktopValue.error}`);

    return json({ page, discovery, pageSpeed: { mobile: mobileValue, desktop: desktopValue }, errors, usage });
  }

  if (url.pathname === "/api/check-links") {
    await requireCompletedAudit(sessionId);
    await enforceSessionLinkBatchLimit(sessionId, env);
    const body = await parseJsonBody<{ urls?: string[] }>(request, 40_000);
    const links = await checkLinks(Array.isArray(body.urls) ? body.urls : [], env);
    return json({ links });
  }

  if (url.pathname === "/api/ai-report") {
    await requireCompletedAudit(sessionId);
    await enforceSessionAiReportLimit(sessionId, env);
    const body = await parseJsonBody<{ evidence?: unknown }>(request, 80_000);
    if (!body.evidence) throw new AuditError("EVIDENCE_REQUIRED", "Audit evidence is required.");
    return json(await generateNarrative(body.evidence, env));
  }

  if (url.pathname === "/api/translate-report") {
    await requireCompletedAudit(sessionId);
    await enforceSessionTranslationLimit(sessionId, env);
    const body = await parseJsonBody<{ payload?: unknown; targetLanguage?: string }>(request, 125_000);
    if (!body.payload) throw new AuditError("REPORT_REQUIRED", "Report content is required.");
    if (!body.targetLanguage) throw new AuditError("LANGUAGE_REQUIRED", "Translation language is required.");
    return json(await translateReport(body.payload, body.targetLanguage, env));
  }

  return errorResponse("API route not found.", 404, "API_NOT_FOUND");
}

export { AuditicleQuotaCoordinator } from "./lib/quota";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const productionHost = new URL(env.SITE_URL || "https://auditicle.site").hostname.toLowerCase();
    const requestHost = url.hostname.toLowerCase();
    if (requestHost === "www.auditicle.site") {
      return Response.redirect(`https://auditicle.site${url.pathname}${url.search}`, 301);
    }
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env);
      if (requestHost !== productionHost && url.pathname === "/robots.txt") {
        return new Response("User-agent: *\nDisallow: /\n", {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }
        });
      }
      const assetResponse = await env.ASSETS.fetch(request);
      if (requestHost !== productionHost) {
        const headers = new Headers(assetResponse.headers);
        headers.set("X-Robots-Tag", "noindex, nofollow");
        return new Response(assetResponse.body, { status: assetResponse.status, statusText: assetResponse.statusText, headers });
      }
      return assetResponse;
    } catch (error) {
      if (error instanceof DailyLimitError) return errorResponse(error.message, error.status, error.code, error.usage);
      if (error instanceof AuditError) {
        console.warn("Auditicle controlled error", { path: url.pathname, code: error.code, message: error.message });
        return errorResponse(error.message, error.status, error.code, error.details);
      }
      const message = error instanceof Error ? error.message : "Unexpected server error.";
      console.error("Auditicle request failed", { path: url.pathname, message });
      return errorResponse("Auditicle encountered an unexpected server error.", 500, "INTERNAL_ERROR");
    }
  }
} satisfies ExportedHandler<WorkerEnv>;
