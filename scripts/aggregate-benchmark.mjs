import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = process.cwd();
const inputDir = join(root, "benchmark", "input");
const outputDir = join(root, "public", "data");
const TARGET_SAMPLE = 1000;
const VALID_PLATFORMS = new Set(["WordPress", "Next.js", "Webflow", "Custom CMS", "Other", "Unknown"]);
const SCORE_KEYS = ["technical", "geo", "aeo", "rag", "llmo"];

function bool(value, field) {
  if (typeof value !== "boolean") throw new Error(`${field} must be true or false`);
  return value;
}
function integer(value, field, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${field} must be an integer between ${min} and ${max}`);
  return value;
}
function score(value, field) { return integer(value, field, 0, 100); }
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Number(((sorted[middle - 1] + sorted[middle]) / 2).toFixed(1));
}
function percent(count, total) { return total ? Number(((count / total) * 100).toFixed(1)) : null; }

function validateRecord(record, sourceName) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error(`${sourceName}: expected one JSON object`);
  const id = String(record.id || "").trim();
  if (!/^[a-z0-9][a-z0-9_-]{5,80}$/i.test(id)) throw new Error(`${sourceName}: id must be a non-identifying stable token`);
  const platform = VALID_PLATFORMS.has(record.platform) ? record.platform : "Unknown";
  const scores = {};
  for (const key of SCORE_KEYS) scores[key] = score(record.scores?.[key], `${sourceName}.scores.${key}`);
  return {
    id,
    platform,
    visibleAuthor: bool(record.visibleAuthor, `${sourceName}.visibleAuthor`),
    dateModified: bool(record.dateModified, `${sourceName}.dateModified`),
    thinServerHtml: bool(record.thinServerHtml, `${sourceName}.thinServerHtml`),
    citationLinks: integer(record.citationLinks, `${sourceName}.citationLinks`, 0, 1000),
    scores
  };
}

await mkdir(inputDir, { recursive: true });
await mkdir(outputDir, { recursive: true });
const names = (await readdir(inputDir)).filter((name) => extname(name).toLowerCase() === ".json").sort();
const records = [];
const seen = new Set();
for (const name of names) {
  const parsed = JSON.parse(await readFile(join(inputDir, name), "utf8"));
  const batch = Array.isArray(parsed) ? parsed : [parsed];
  batch.forEach((item, index) => {
    const record = validateRecord(item, `${name}[${index}]`);
    if (seen.has(record.id)) throw new Error(`${name}: duplicate record id ${record.id}`);
    seen.add(record.id);
    records.push(record);
  });
}

const sampleSize = records.length;
const platforms = {};
for (const platform of VALID_PLATFORMS) {
  const rows = records.filter((record) => record.platform === platform);
  if (!rows.length) continue;
  platforms[platform] = {
    sampleSize: rows.length,
    missingVisibleAuthorPercent: percent(rows.filter((r) => !r.visibleAuthor).length, rows.length),
    missingDateModifiedPercent: percent(rows.filter((r) => !r.dateModified).length, rows.length),
    thinServerHtmlPercent: percent(rows.filter((r) => r.thinServerHtml).length, rows.length),
    noCitationLinksPercent: percent(rows.filter((r) => r.citationLinks === 0).length, rows.length),
    medianScores: Object.fromEntries(SCORE_KEYS.map((key) => [key, median(rows.map((r) => r.scores[key]))]))
  };
}

const frozen = sampleSize >= TARGET_SAMPLE;
const aggregate = {
  schemaVersion: "1.0",
  study: "Auditicle Article Readiness Benchmark 2026",
  targetSample: TARGET_SAMPLE,
  sampleSize,
  status: frozen ? "sample-complete-pending-publication-review" : "data-collection",
  resultsPublished: false,
  generatedAt: new Date().toISOString(),
  methodologyUrl: "https://auditicle.site/article-readiness-benchmark-2026",
  safeguards: [
    "No page URLs, hostnames, personal data, raw HTML, or article text are published in this aggregate file.",
    "Results remain unpublished until the sample is complete, duplicates are removed, and quality checks are documented.",
    "Platform comparisons require an adequate sample and are descriptive, not causal."
  ],
  metrics: sampleSize ? {
    missingVisibleAuthorPercent: percent(records.filter((r) => !r.visibleAuthor).length, sampleSize),
    missingDateModifiedPercent: percent(records.filter((r) => !r.dateModified).length, sampleSize),
    thinServerHtmlPercent: percent(records.filter((r) => r.thinServerHtml).length, sampleSize),
    noCitationLinksPercent: percent(records.filter((r) => r.citationLinks === 0).length, sampleSize),
    medianScores: Object.fromEntries(SCORE_KEYS.map((key) => [key, median(records.map((r) => r.scores[key]))]))
  } : null,
  platforms
};

await writeFile(join(outputDir, "article-readiness-benchmark-2026.json"), `${JSON.stringify(aggregate, null, 2)}\n`);
const csvHeader = "platform,sample_size,missing_visible_author_percent,missing_date_modified_percent,thin_server_html_percent,no_citation_links_percent,median_technical,median_geo,median_aeo,median_rag,median_llmo\n";
const csvRows = Object.entries(platforms).map(([platform, row]) => [
  platform, row.sampleSize, row.missingVisibleAuthorPercent, row.missingDateModifiedPercent,
  row.thinServerHtmlPercent, row.noCitationLinksPercent,
  ...SCORE_KEYS.map((key) => row.medianScores[key])
].join(","));
await writeFile(join(outputDir, "article-readiness-benchmark-2026-platforms.csv"), csvHeader + (csvRows.length ? `${csvRows.join("\n")}\n` : ""));
console.log(`Benchmark aggregate written: ${sampleSize}/${TARGET_SAMPLE} validated records; public results remain withheld.`);
