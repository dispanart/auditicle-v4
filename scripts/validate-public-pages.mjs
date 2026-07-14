import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const publicDir = join(root, "public");
const productionOrigin = "https://auditicle.site";
const requiredRootPages = [
  "features.html", "use-cases.html", "methodology.html", "docs.html", "privacy.html", "terms.html",
  "disclaimer.html", "about.html", "contact.html", "accessibility.html", "ai-transparency.html",
  "data-sources.html", "crawler-information.html", "system-status.html", "faq.html", "changelog.html"
];
const requiredCleanPages = [
  "free-article-seo-audit-tool", "article-seo-checker", "technical-seo-article-audit",
  "geo-readiness-audit", "aeo-readiness-checker", "rag-retrieval-readiness",
  "ai-citation-readiness-checker", "rendered-html-seo-audit", "article-readiness-benchmark-2026"
];
const errors = [];
const titles = new Set();
const descriptions = new Set();

async function walk(dir) {
  const output = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) output.push(...await walk(full));
    else output.push(full);
  }
  return output;
}
function publicPath(file) {
  return relative(publicDir, file).split(sep).join("/");
}
function routeFor(file) {
  const rel = publicPath(file);
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"/index.html".length)}`;
  return `/${rel}`;
}
function canonicalForRoute(route) { return `${productionOrigin}${route}`; }

const allPublicFiles = await walk(publicDir);
const fileSet = new Set(allPublicFiles.map(publicPath));
for (const name of requiredRootPages) if (!fileSet.has(name)) errors.push(`Missing required page: ${name}`);
for (const slug of requiredCleanPages) if (!fileSet.has(`${slug}/index.html`)) errors.push(`Missing required clean URL page: /${slug}`);
for (const asset of ["favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png", "android-chrome-192x192.png", "android-chrome-512x512.png", "og-auditicle.png"]) {
  if (!fileSet.has(asset)) errors.push(`Missing brand asset: ${asset}`);
}

if (!fileSet.has("404.html")) errors.push("Missing required page: 404.html");
else {
  const notFound = await readFile(join(publicDir, "404.html"), "utf8");
  if (!notFound.includes('content="noindex,follow"')) errors.push("404.html: missing noindex directive");
}

const sourceHome = await readFile(join(root, "index.html"), "utf8");
if (!sourceHome.includes("data-prerendered-home")) errors.push("index.html: missing prerendered homepage content");
if (!sourceHome.includes('rel="canonical" href="https://auditicle.site/"')) errors.push("index.html: invalid homepage canonical");
if (!sourceHome.includes("og-auditicle.png") || !sourceHome.includes("twitter:image")) errors.push("index.html: missing social image metadata");
if (!sourceHome.includes("favicon-32x32.png") || !sourceHome.includes("apple-touch-icon.png")) errors.push("index.html: missing favicon metadata");
if ((sourceHome.match(/<h1\b/g) || []).length !== 1) errors.push("index.html: expected exactly one h1");
for (const slug of requiredCleanPages) if (!sourceHome.includes(`href="/${slug}"`)) errors.push(`index.html: missing internal link to /${slug}`);

const htmlFiles = allPublicFiles.filter((file) => file.endsWith(".html") && publicPath(file) !== "404.html");
const routes = new Set(["/", ...htmlFiles.map(routeFor), "/404.html"]);
const assetRoutes = new Set(allPublicFiles.map((file) => `/${publicPath(file)}`));

function routeExists(target) {
  if (routes.has(target) || assetRoutes.has(target)) return true;
  if (target.endsWith("/") && routes.has(target.slice(0, -1))) return true;
  if (!target.endsWith("/") && routes.has(`${target}/`)) return true;
  return false;
}

for (const file of htmlFiles) {
  const name = publicPath(file);
  const route = routeFor(file);
  const html = await readFile(file, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1]?.trim();
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1]?.trim();
  if (!title) errors.push(`${name}: missing title`);
  else if (titles.has(title)) errors.push(`${name}: duplicate title: ${title}`);
  else titles.add(title);
  if (!description) errors.push(`${name}: missing description`);
  else if (descriptions.has(description)) errors.push(`${name}: duplicate description`);
  else descriptions.add(description);
  if (canonical !== canonicalForRoute(route)) errors.push(`${name}: invalid canonical ${canonical || "missing"}`);
  for (const token of ["og:title", "og:description", "og:url", "og:image", "twitter:card", "twitter:title", "twitter:description", "twitter:image", "application/ld+json", "data-theme-control", "favicon-32x32.png", "apple-touch-icon.png"]) {
    if (!html.includes(token)) errors.push(`${name}: missing ${token}`);
  }
  if ((html.match(/<h1\b/g) || []).length !== 1) errors.push(`${name}: expected exactly one h1`);
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); } catch (error) { errors.push(`${name}: invalid JSON-LD (${error.message})`); }
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) errors.push(`${name}: duplicate id values ${duplicates.join(", ")}`);
  for (const match of html.matchAll(/href="(\/[^"?#]*)/g)) {
    const target = match[1];
    if (!target || target.startsWith("/api/")) continue;
    if (!routeExists(target)) errors.push(`${name}: broken internal link ${target}`);
  }
}

const sitemap = await readFile(join(publicDir, "sitemap.xml"), "utf8");
for (const route of routes) {
  if (route === "/404.html") continue;
  const canonical = canonicalForRoute(route);
  if (!sitemap.includes(`<loc>${canonical}</loc>`)) errors.push(`sitemap.xml: missing ${canonical}`);
}
for (const lastmod of sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod[1])) errors.push(`sitemap.xml: invalid lastmod ${lastmod[1]}`);
  if (lastmod[1] !== "2026-07-14") errors.push(`sitemap.xml: unexpected auto-updated lastmod ${lastmod[1]}`);
}
const searchable = [sourceHome, ...(await Promise.all(htmlFiles.map((file) => readFile(file, "utf8"))))].join("\n");
if (/pricing/i.test(searchable)) errors.push("Pricing reference still exists in public HTML.");

const benchmark = JSON.parse(await readFile(join(publicDir, "data", "article-readiness-benchmark-2026.json"), "utf8"));
if (benchmark.sampleSize !== 0 || benchmark.resultsPublished !== false || benchmark.metrics !== null) errors.push("Benchmark placeholder must not publish fabricated results before data collection.");

if (errors.length) {
  console.error(`Public page validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Public page validation passed: homepage prerendered, ${htmlFiles.length} generated pages, production canonicals, favicon/OG metadata, stable sitemap lastmod, internal links resolved, benchmark results withheld.`);
