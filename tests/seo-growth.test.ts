import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFile(join(root, path), "utf8");

describe("V4.8 SEO growth and free-tier safeguards", () => {
  it("ships meaningful prerendered homepage content and production social metadata", async () => {
    const html = await read("index.html");
    expect(html).toContain("data-prerendered-home");
    expect(html).toContain("Five independent evidence-based scorecards");
    expect(html).toContain('rel="canonical" href="https://auditicle.site/"');
    expect(html).toContain('property="og:image" content="https://auditicle.site/og-auditicle.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  it("generates every distinct high-intent clean URL", async () => {
    const slugs = [
      "free-article-seo-audit-tool", "article-seo-checker", "technical-seo-article-audit",
      "geo-readiness-audit", "aeo-readiness-checker", "rag-retrieval-readiness",
      "ai-citation-readiness-checker", "rendered-html-seo-audit"
    ];
    for (const slug of slugs) {
      const html = await read(`public/${slug}/index.html`);
      expect(html).toContain(`<link rel="canonical" href="https://auditicle.site/${slug}">`);
      expect(html).toContain("Example");
      expect(html).toContain('href="/#audit-form"');
    }
  });

  it("keeps benchmark results withheld before validated data exists", async () => {
    const status = JSON.parse(await read("public/data/article-readiness-benchmark-2026.json"));
    expect(status.targetSample).toBe(1000);
    expect(status.sampleSize).toBe(0);
    expect(status.resultsPublished).toBe(false);
    expect(status.metrics).toBeNull();
  });

  it("uses the requested free launch limits and donation URL", async () => {
    const config = await read("wrangler.jsonc");
    for (const token of [
      '"TURNSTILE_REQUIRED": "true"', '"DAILY_AUDIT_LIMIT": "5"',
      '"MAX_LINK_BATCHES": "1"', '"LINK_BATCH_SIZE": "5"',
      '"AI_REPORTS_PER_SESSION": "1"', '"TRANSLATIONS_PER_SESSION": "1"',
      '"DONATION_URL": "https://sociabuzz.com/dispa/donate"'
    ]) expect(config).toContain(token);
    expect(config).toContain('"QUOTA_COORDINATOR"');
    expect(config).toContain('"cpu_ms": 10');
    expect(config).toContain('"subrequests": 50');
  });

  it("adds noindex response protection for non-production hostnames", async () => {
    const worker = await read("worker/index.ts");
    expect(worker).toContain('headers.set("X-Robots-Tag", "noindex, nofollow")');
    expect(worker).toContain("requestHost !== productionHost");
  });
});
