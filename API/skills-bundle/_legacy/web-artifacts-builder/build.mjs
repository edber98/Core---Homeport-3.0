#!/usr/bin/env node
/**
 * Build a multi-page web bundle and zip it.
 *
 * Spec (stdin):
 * {
 *   "title": "My Site",
 *   "framework": "vanilla" | "react-cdn",
 *   "theme": "light" | "dark" | "brand",
 *   "pages": [ {"path": "about.html", "spec": {…page-level spec…}} ],
 *   "shared": { "css": "…", "js": "…" },
 *   "assets": [ {"path":"assets/logo.txt", "content":"…"} ]
 * }
 *
 * Output: /workspace/out/website.zip
 */
import { readFileSync, mkdirSync, writeFileSync, statSync, createWriteStream } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const WORKSPACE_ROOT = process.env.HOMEPORT_WORKSPACE || "/workspace";
const OUT_DIR = join(WORKSPACE_ROOT, "out");
const TMP_DIR = join(WORKSPACE_ROOT, "tmp");
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;

function die(msg, code = 1) {
  process.stderr.write(String(msg) + "\n");
  process.exit(code);
}

function readSpec() {
  try {
    const raw = readFileSync(0, "utf8");
    if (!raw || !raw.trim()) die("empty_stdin");
    return JSON.parse(raw);
  } catch (e) {
    if (e instanceof SyntaxError) die("invalid_json: " + e.message);
    die("stdin_error: " + (e?.message || e));
  }
}

function slugify(text, fallback = "website") {
  if (!text) return fallback;
  const s = String(text)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || fallback;
}

const THEMES = {
  light: { bg: "#ffffff", text: "#1f2937", primary: "#2563eb" },
  dark:  { bg: "#0b1020", text: "#e5e7eb", primary: "#60a5fa" },
  brand: { bg: "#ffffff", text: "#111827", primary: "#7c3aed" },
};

function themeCss(themeName) {
  const t = THEMES[themeName] || THEMES.light;
  return `:root{--hp-bg:${t.bg};--hp-text:${t.text};--hp-primary:${t.primary};}
body{background:var(--hp-bg);color:var(--hp-text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:0;}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function safePathUnder(root, subpath) {
  const resolved = resolve(root, subpath);
  const normalizedRoot = resolve(root);
  if (!resolved.startsWith(normalizedRoot + sep) && resolved !== normalizedRoot) {
    die("path_escape: " + subpath);
  }
  return resolved;
}

function renderPage({ title, themeName, framework, page, navLinks, sharedCss, sharedJs }) {
  const ps = page.spec || {};
  const bodyHtml = ps.html || "<h1>" + escapeHtml(ps.title || title) + "</h1>";

  const nav = Array.isArray(navLinks) && navLinks.length
    ? `<nav style="display:flex;gap:12px;padding:12px 24px;border-bottom:1px solid #e5e7eb;background:#f9fafb;">${navLinks
        .map(l => `<a href="${l.href}" style="text-decoration:none;">${escapeHtml(l.label)}</a>`)
        .join("")}</nav>`
    : "";

  const reactHead = framework === "react-cdn" ? `
<script type="importmap">
{"imports":{"react":"https://esm.sh/react@18","react-dom":"https://esm.sh/react-dom@18/client"}}
</script>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(ps.title || title)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="shared.css">
${reactHead}
<style>${ps.css || ""}</style>
</head>
<body>
${nav}
<main class="container mx-auto px-4 py-8">
${bodyHtml}
</main>
<script src="shared.js"></script>
${ps.js ? `<script${framework === "react-cdn" ? ' type="module"' : ""}>${ps.js}</script>` : ""}
</body>
</html>`;
}

function writeAll(spec, siteDir) {
  mkdirSync(siteDir, { recursive: true });
  const themeName = spec.theme || "light";
  const framework = spec.framework || "vanilla";
  const title = spec.title || "Website";

  const shared = spec.shared || {};
  writeFileSync(join(siteDir, "shared.css"), themeCss(themeName) + "\n" + (shared.css || ""), "utf8");
  writeFileSync(join(siteDir, "shared.js"), shared.js || "", "utf8");

  const pages = Array.isArray(spec.pages) ? spec.pages.filter(p => p && typeof p === "object" && p.path) : [];
  const navLinks = pages.map(p => ({
    href: p.path,
    label: (p.spec && p.spec.title) || p.label || p.path,
  }));

  if (!pages.length) {
    // Fallback single index
    writeFileSync(join(siteDir, "index.html"),
      renderPage({ title, themeName, framework, page: { path: "index.html", spec: {} }, navLinks: [], sharedCss: "", sharedJs: "" }),
      "utf8");
  }

  for (const p of pages) {
    const dest = safePathUnder(siteDir, p.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, renderPage({ title, themeName, framework, page: p, navLinks, sharedCss: shared.css || "", sharedJs: shared.js || "" }), "utf8");
  }

  // Ensure index.html
  try { statSync(join(siteDir, "index.html")); } catch {
    const first = pages[0];
    writeFileSync(join(siteDir, "index.html"),
      renderPage({ title, themeName, framework, page: { path: "index.html", spec: first?.spec || {} }, navLinks, sharedCss: "", sharedJs: "" }),
      "utf8");
  }

  // Assets
  for (const asset of (spec.assets || [])) {
    if (!asset || typeof asset !== "object" || !asset.path) continue;
    const dest = safePathUnder(siteDir, asset.path);
    mkdirSync(dirname(dest), { recursive: true });
    if (typeof asset.content === "string") {
      writeFileSync(dest, asset.content, asset.encoding === "base64" ? "base64" : "utf8");
    }
  }
}

async function zipSite(siteDir, zipPath) {
  // Try the `zip` CLI first (common on Linux/mac).
  try {
    execFileSync("zip", ["-r", "-q", zipPath, "."], { cwd: siteDir, stdio: ["ignore", "ignore", "pipe"] });
    return true;
  } catch (_) {
    // fallback: try archiver
  }

  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const archiver = require("archiver");
    return await new Promise((resolvePromise, rejectPromise) => {
      const output = createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });
      output.on("close", () => resolvePromise(true));
      archive.on("error", rejectPromise);
      archive.pipe(output);
      archive.directory(siteDir, false);
      archive.finalize();
    });
  } catch (e) {
    die("zip_unavailable: neither `zip` CLI nor `archiver` module found (" + (e?.message || e) + ")");
  }
}

async function main() {
  const spec = readSpec();
  if (!spec || typeof spec !== "object") die("spec_must_be_object");

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });

  const slug = slugify(spec.title, "website");
  const buildId = createHash("sha1").update(slug + ":" + Date.now()).digest("hex").slice(0, 8);
  const siteDir = join(TMP_DIR, `${slug}-${buildId}`);

  writeAll(spec, siteDir);

  const zipPath = join(OUT_DIR, `${slug}.zip`);
  await zipSite(siteDir, zipPath);

  try {
    const { size } = statSync(zipPath);
    if (size > MAX_OUTPUT_BYTES) die(`output_too_large: ${size}`);
  } catch (e) {
    die("output_missing: " + (e?.message || e));
  }

  process.stdout.write(`out/${slug}.zip\n`);
}

main().catch(e => die("unhandled_error: " + (e?.message || e)));
