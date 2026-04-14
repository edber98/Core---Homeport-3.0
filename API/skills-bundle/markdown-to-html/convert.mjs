#!/usr/bin/env node
// Convert Markdown to a styled, standalone HTML page using `marked`.
// Reads JSON spec from stdin, writes the HTML file into /workspace/out/.
import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE = process.env.HOMEPORT_WORKSPACE || '/workspace';
const OUT_DIR = path.join(WORKSPACE, 'out');

function die(msg, code = 1) {
  process.stderr.write(String(msg) + '\n');
  process.exit(code);
}

function slugify(text, fallback = 'document') {
  if (!text) return fallback;
  return String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

const GITHUB_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
         color: #24292f; max-width: 960px; margin: 40px auto; padding: 0 24px; line-height: 1.6; }
  h1, h2, h3 { border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
  h1 { font-size: 2em; } h2 { font-size: 1.5em; } h3 { font-size: 1.25em; border: 0; }
  code { background: #f6f8fa; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; }
  table { border-collapse: collapse; margin: 1em 0; }
  th, td { border: 1px solid #d0d7de; padding: 8px 14px; }
  th { background: #f6f8fa; }
  blockquote { border-left: 4px solid #d0d7de; padding-left: 1em; color: #57606a; margin: 1em 0; }
  a { color: #0969da; text-decoration: none; }
  a:hover { text-decoration: underline; }
  img { max-width: 100%; }
`;

async function main() {
  const raw = await readStdin();
  if (!raw || !raw.trim()) die('empty_stdin');
  let spec;
  try { spec = JSON.parse(raw); }
  catch (e) { die('invalid_json:' + e.message); }
  if (!spec || typeof spec !== 'object') die('spec_must_be_object');

  const title = spec.title || 'document';
  const md = spec.markdown;
  if (!md || typeof md !== 'string' || !md.trim()) die('empty_markdown');
  const theme = (spec.theme || 'github').toLowerCase();
  const outName = spec.outputName || title;

  let marked;
  try { ({ marked } = await import('marked')); }
  catch (e) { die('marked not installed: ' + e.message); }

  marked.setOptions({ gfm: true, breaks: false });
  let body;
  try { body = marked.parse(md); }
  catch (e) { die('markdown_parse_failed:' + e.message); }

  let html;
  if (theme === 'tailwind') {
    html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config = { theme: { extend: {} } };</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tailwindcss/typography@0.5/dist/typography.min.css" />
</head>
<body class="bg-gray-50">
  <main class="max-w-4xl mx-auto py-12 px-6">
    <article class="prose prose-slate lg:prose-lg max-w-none bg-white p-10 rounded-xl shadow-sm">
      ${body}
    </article>
  </main>
</body>
</html>`;
  } else {
    html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${GITHUB_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${slugify(outName)}.html`);
  try { fs.writeFileSync(outPath, html, 'utf8'); }
  catch (e) { die('save_failed:' + e.message); }

  const size = fs.statSync(outPath).size;
  if (size > 50 * 1024 * 1024) { fs.unlinkSync(outPath); die('output_too_large'); }
  process.stdout.write(path.relative(WORKSPACE, outPath).replace(/\\/g, '/') + '\n');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

main().catch((e) => die('unhandled_error:' + (e && e.message || e)));
