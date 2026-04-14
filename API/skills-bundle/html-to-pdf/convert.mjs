#!/usr/bin/env node
// Convert HTML (inline or file) to a PDF using Chromium headless (--print-to-pdf).
// Lighter than puppeteer — works with the system chromium bundled in the image.
//
// Spec (stdin):
// { html?: string, source?: "file.html", format?: "A4"|"Letter"|...,
//   landscape?: bool, margin?: {top,bottom,left,right}, outputName?: string }
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const WORKSPACE = process.env.HOMEPORT_WORKSPACE || '/workspace';
const IN_DIR = path.join(WORKSPACE, 'in');
const OUT_DIR = path.join(WORKSPACE, 'out');
const CHROMIUM = process.env.CHROMIUM_BIN
  || process.env.PUPPETEER_EXECUTABLE_PATH
  || '/usr/bin/chromium-browser';

function die(msg, code = 1) {
  process.stderr.write(String(msg) + '\n');
  process.exit(code);
}

function slugify(text, fb = 'document') {
  if (!text) return fb;
  return String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fb;
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

// Parse dimension like "20mm", "1in" → numeric points (not critical; pass through to chromium args)
function parseMargin(m) {
  const def = { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' };
  if (!m || typeof m !== 'object') return def;
  return {
    top: m.top || def.top,
    bottom: m.bottom || def.bottom,
    left: m.left || def.left,
    right: m.right || def.right,
  };
}

async function main() {
  const raw = await readStdin();
  if (!raw || !raw.trim()) die('empty_stdin');
  let spec;
  try { spec = JSON.parse(raw); }
  catch (e) { die('invalid_json:' + e.message); }
  if (!spec || typeof spec !== 'object') die('spec_must_be_object');

  // Resolve input HTML path
  let htmlPath;
  let tmpDir = null;
  if (typeof spec.html === 'string' && spec.html.trim()) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-html-'));
    htmlPath = path.join(tmpDir, 'input.html');
    fs.writeFileSync(htmlPath, spec.html, 'utf8');
  } else if (typeof spec.source === 'string' && spec.source) {
    const p = path.join(IN_DIR, spec.source);
    if (!fs.existsSync(p)) die('source_not_found:' + spec.source);
    htmlPath = p;
  } else {
    die('missing_html_or_source');
  }

  const format = spec.format || 'A4';
  const landscape = !!spec.landscape;
  const margin = parseMargin(spec.margin);
  const outName = spec.outputName || 'document';

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${slugify(outName)}.pdf`);

  // Chromium headless args. Uses --print-to-pdf which is supported without puppeteer.
  const args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    `--print-to-pdf=${outPath}`,
    '--no-pdf-header-footer',
    `--default-background-color=FFFFFFFF`,
    'file://' + htmlPath,
  ];
  // Paper size: chromium supports --print-to-pdf with implicit page size only; we use CSS @page injection fallback when needed.
  // For simple A4/Letter it generally respects the default. For custom, we write a CSS-first HTML.
  if (landscape || format !== 'A4' || spec.margin) {
    // Build a wrapper html with @page rules.
    const orientation = landscape ? 'landscape' : 'portrait';
    const pageCss = `@page { size: ${format} ${orientation}; margin: ${margin.top} ${margin.right} ${margin.bottom} ${margin.left}; }`;
    const original = fs.readFileSync(htmlPath, 'utf8');
    const injected = original.includes('</head>')
      ? original.replace('</head>', `<style>${pageCss}</style></head>`)
      : `<!doctype html><html><head><meta charset="utf-8"><style>${pageCss}</style></head><body>${original}</body></html>`;
    if (!tmpDir) tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-html-'));
    htmlPath = path.join(tmpDir, 'input.html');
    fs.writeFileSync(htmlPath, injected, 'utf8');
    args[args.length - 1] = 'file://' + htmlPath;
  }

  try {
    await runChromium(CHROMIUM, args, 60000);
  } catch (e) {
    die('render_failed:' + (e && e.message || e));
  } finally {
    if (tmpDir) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} }
  }

  if (!fs.existsSync(outPath)) die('output_missing');
  const size = fs.statSync(outPath).size;
  if (size > 50 * 1024 * 1024) { fs.unlinkSync(outPath); die('output_too_large'); }
  process.stdout.write(path.relative(WORKSPACE, outPath).replace(/\\/g, '/') + '\n');
}

function runChromium(bin, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    p.stderr.on('data', (c) => { stderr += c.toString(); });
    const t = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('render_timeout')); }, timeoutMs);
    p.on('error', (e) => { clearTimeout(t); reject(e); });
    p.on('exit', (code) => {
      clearTimeout(t);
      if (code === 0) resolve();
      else reject(new Error(`chromium_exit_${code}:${stderr.slice(0, 500)}`));
    });
  });
}

main().catch((e) => die('unhandled_error:' + (e && e.message || e)));
