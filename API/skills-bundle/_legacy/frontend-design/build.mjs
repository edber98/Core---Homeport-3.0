#!/usr/bin/env node
/**
 * Build an HTML artifact (single page or multi-page) from a JSON spec.
 *
 * Spec (stdin):
 * {
 *   "title": "My site",
 *   "theme": "light" | "dark" | "brand",
 *   "html": "<body>…</body>",     // optional for single-page
 *   "css": "…",                    // optional extra CSS
 *   "js":  "…",                    // optional extra JS
 *   "pages": [ {"path": "about.html", "html": "…"} ]   // if set, multi-page
 * }
 *
 * Output:
 *   - single page: /workspace/out/<slug>.html
 *   - multi-page:  /workspace/out/<slug>/index.html (+ subpages)
 */
import { readFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

const WORKSPACE_ROOT = process.env.HOMEPORT_WORKSPACE || "/workspace";
const OUT_DIR = join(WORKSPACE_ROOT, "out");
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;

function die(msg, code = 1) {
  process.stderr.write(String(msg) + "\n");
  process.exit(code);
}

function readSpec() {
  try {
    const raw = readFileSync(0, "utf8");
    if (!raw || !raw.trim()) die("empty_stdin: expected a JSON spec on stdin");
    return JSON.parse(raw);
  } catch (e) {
    if (e instanceof SyntaxError) die("invalid_json: " + e.message);
    die("stdin_error: " + (e?.message || e));
  }
}

function slugify(text, fallback = "document") {
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
  light: {
    bg: "#ffffff",
    text: "#1f2937",
    primary: "#2563eb",
    muted: "#6b7280",
    card: "#f9fafb",
    border: "#e5e7eb",
  },
  dark: {
    bg: "#0b1020",
    text: "#e5e7eb",
    primary: "#60a5fa",
    muted: "#9ca3af",
    card: "#111827",
    border: "#1f2937",
  },
  brand: {
    bg: "#ffffff",
    text: "#111827",
    primary: "#7c3aed",
    muted: "#6b7280",
    card: "#faf5ff",
    border: "#e9d5ff",
  },
};

function themeCss(themeName) {
  const t = THEMES[themeName] || THEMES.light;
  return `:root{--hp-bg:${t.bg};--hp-text:${t.text};--hp-primary:${t.primary};--hp-muted:${t.muted};--hp-card:${t.card};--hp-border:${t.border};}
body{background:var(--hp-bg);color:var(--hp-text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;}
a{color:var(--hp-primary);}`;
}

function renderHtmlPage({ title, themeName, bodyHtml, extraCss, extraJs, navLinks }) {
  const bodyIsFull = /^\s*<(!doctype|html|head|body)/i.test(bodyHtml || "");
  if (bodyIsFull) {
    // Pass-through when caller provides a full doc — just ensure theme is injected.
    return bodyHtml;
  }
  const nav = Array.isArray(navLinks) && navLinks.length
    ? `<nav style="display:flex;gap:12px;padding:16px 24px;border-bottom:1px solid var(--hp-border);background:var(--hp-card);">${navLinks
        .map(l => `<a href="${l.href}" style="text-decoration:none;font-weight:500;">${escapeHtml(l.label)}</a>`)
        .join("")}</nav>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title || "Document")}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>${themeCss(themeName)}
${extraCss || ""}</style>
</head>
<body>
${nav}
<main class="container mx-auto px-4 py-8">
${bodyHtml || ""}
</main>
${extraJs ? `<script>${extraJs}</script>` : ""}
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function ensureOutDir() {
  mkdirSync(OUT_DIR, { recursive: true });
}

function safePathUnder(root, subpath) {
  const resolved = resolve(root, subpath);
  const normalizedRoot = resolve(root);
  if (!resolved.startsWith(normalizedRoot + sep) && resolved !== normalizedRoot) {
    die("path_escape: " + subpath);
  }
  return resolved;
}

function checkSize(path) {
  try {
    const { size } = statSync(path);
    if (size > MAX_OUTPUT_BYTES) die(`output_too_large: ${size}`);
  } catch (e) {
    die("output_missing: " + (e?.message || e));
  }
}

function main() {
  const spec = readSpec();
  if (!spec || typeof spec !== "object") die("spec_must_be_object");

  const title = spec.title || "page";
  const themeName = spec.theme || "light";
  const extraCss = spec.css || "";
  const extraJs = spec.js || "";
  const slug = slugify(title, "page");

  ensureOutDir();

  if (Array.isArray(spec.pages) && spec.pages.length) {
    const siteDir = join(OUT_DIR, slug);
    mkdirSync(siteDir, { recursive: true });
    const navLinks = spec.pages.map(p => ({ href: p.path, label: p.label || p.path }));

    for (const p of spec.pages) {
      if (!p || typeof p !== "object" || !p.path) continue;
      const pagePath = safePathUnder(siteDir, p.path);
      mkdirSync(dirname(pagePath), { recursive: true });
      const html = renderHtmlPage({
        title: p.title || title,
        themeName,
        bodyHtml: p.html || "",
        extraCss,
        extraJs,
        navLinks,
      });
      writeFileSync(pagePath, html, "utf8");
    }

    // Ensure index.html exists
    const indexPath = join(siteDir, "index.html");
    try { statSync(indexPath); }
    catch {
      const firstPage = spec.pages[0];
      const html = renderHtmlPage({
        title,
        themeName,
        bodyHtml: firstPage?.html || "<h1>Welcome</h1>",
        extraCss, extraJs, navLinks,
      });
      writeFileSync(indexPath, html, "utf8");
    }

    checkSize(indexPath);
    const rel = `out/${slug}/index.html`;
    process.stdout.write(rel + "\n");
    return;
  }

  const outPath = join(OUT_DIR, `${slug}.html`);
  const html = renderHtmlPage({
    title,
    themeName,
    bodyHtml: spec.html || "<h1>" + escapeHtml(title) + "</h1>",
    extraCss,
    extraJs,
  });
  writeFileSync(outPath, html, "utf8");
  checkSize(outPath);
  process.stdout.write(`out/${slug}.html\n`);
}

try {
  main();
} catch (e) {
  die("unhandled_error: " + (e?.message || e));
}
