import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const ignored = new Set(["node_modules", ".git", "dist", ".wrangler"]);
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".jsonc", ".html", ".css", ".md", ".txt", ".xml"]);
const suspicious = [
  /AIza[0-9A-Za-z_-]{30,}/g,
  /gsk_[0-9A-Za-z_-]{20,}/g,
  /sk-or-v1-[0-9A-Za-z_-]{20,}/g,
  /(?:api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}["']/gi
];

async function walk(dir) {
  const files = [];
  for (const name of await readdir(dir)) {
    if (ignored.has(name)) continue;
    const path = join(dir, name);
    const info = await stat(path);
    if (info.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const files = await walk(root);
const findings = [];
for (const file of files) {
  const extension = file.slice(file.lastIndexOf("."));
  if (!allowedExtensions.has(extension)) continue;
  const text = await readFile(file, "utf8");
  for (const pattern of suspicious) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(relative(root, file));
  }
}

if (findings.length) {
  console.error("Potential credential material found in:", [...new Set(findings)].join(", "));
  process.exit(1);
}
console.log("Security check passed: no obvious credential patterns found in source files.");
