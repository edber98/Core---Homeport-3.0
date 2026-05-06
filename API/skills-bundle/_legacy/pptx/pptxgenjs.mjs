#!/usr/bin/env node
/**
 * Create a modern .pptx presentation using pptxgenjs.
 *
 * Spec (stdin):
 * {
 *   "title": "Deck",
 *   "author": "Optional",
 *   "theme": "light" | "dark" | "brand" | {primary, text, bg},
 *   "masterSlide": {title, background?, objects?: [{rect|text|image: {...}}]},
 *   "slides": [
 *     {
 *       "layout": "title" | "content" | "two_content" | "title_only" | "blank",
 *       "title":  "…",
 *       "subtitle": "…",
 *       "body":     "…",              // plain text
 *       "bullets": [{text, level}],    // bullet list
 *       "bullets2":[{text, level}],    // two_content right column
 *       "images":  [{path, x, y, w, h}],
 *       "shapes":  [{type, x, y, w, h, fill?}],
 *       "charts":  [{type: "bar"|"line"|"pie"|"doughnut"|"area"|"radar",
 *                    data: [{name, labels, values}], options: {...}}],
 *       "tables":  [{headers, rows, x, y, w}],
 *       "notes":   "Speaker notes",
 *       "background": "#rrggbb"
 *     }
 *   ]
 * }
 *
 * Output: /workspace/out/<slug>.pptx → prints the relative path on stdout.
 */
import { readFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const WORKSPACE_ROOT = process.env.HOMEPORT_WORKSPACE || '/workspace';
const IN_DIR = join(WORKSPACE_ROOT, 'in');
const OUT_DIR = join(WORKSPACE_ROOT, 'out');
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;

function die(msg, code = 1) {
  process.stderr.write(String(msg) + '\n');
  process.exit(code);
}

function slugify(s) {
  return String(s || 'presentation')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'presentation';
}

function readStdin() {
  try {
    const buf = readFileSync(0);
    if (!buf || buf.length === 0) die('empty_stdin');
    return JSON.parse(buf.toString('utf8'));
  } catch (e) {
    die(`invalid_json: ${e.message}`);
  }
  return null;
}

function resolveTheme(theme) {
  if (theme && typeof theme === 'object') {
    return {
      primary: (theme.primary || '6366f1').replace('#', ''),
      text:    (theme.text    || '111827').replace('#', ''),
      bg:      (theme.bg      || 'FFFFFF').replace('#', ''),
      accent:  (theme.accent  || theme.primary || '6366f1').replace('#', ''),
    };
  }
  switch (String(theme || 'light').toLowerCase()) {
    case 'dark':  return { primary: '6366f1', text: 'E5E7EB', bg: '0F172A', accent: '38BDF8' };
    case 'brand': return { primary: '6366f1', text: 'F9FAFB', bg: '0F172A', accent: '22D3EE' };
    case 'light':
    default:      return { primary: '6366f1', text: '111827', bg: 'FFFFFF', accent: '8B5CF6' };
  }
}

function ensureOutDir() {
  try { mkdirSync(OUT_DIR, { recursive: true }); } catch (e) { die(`mkdir_failed: ${e.message}`); }
}

async function loadPptxgen() {
  try {
    const mod = await import('pptxgenjs');
    return mod.default || mod;
  } catch (e) {
    die(`pptxgenjs_not_installed: ${e.message}`);
  }
}

function resolveImagePath(p) {
  if (!p) return null;
  if (p.startsWith('/')) return existsSync(p) ? p : null;
  const candidate = join(IN_DIR, p);
  return existsSync(candidate) ? candidate : null;
}

const CHART_TYPES = new Set(['bar', 'line', 'pie', 'doughnut', 'area', 'radar']);

function buildChartDef(pptx, chart) {
  if (!chart || !CHART_TYPES.has(chart.type)) {
    die(`invalid_chart_type: ${chart?.type}`);
  }
  const typeMap = {
    bar:      pptx.ChartType.bar,
    line:     pptx.ChartType.line,
    pie:      pptx.ChartType.pie,
    doughnut: pptx.ChartType.doughnut,
    area:     pptx.ChartType.area,
    radar:    pptx.ChartType.radar,
  };
  return typeMap[chart.type];
}

function renderSlide(pptx, slide, theme, masterName) {
  const s = pptx.addSlide(masterName ? { masterName } : undefined);
  if (slide.background) s.background = { color: String(slide.background).replace('#', '') };

  const layout = slide.layout || 'content';

  // Title
  if (slide.title) {
    if (layout === 'title') {
      s.addText(slide.title, {
        x: 0.5, y: 2.2, w: 9, h: 1.2,
        fontSize: 40, bold: true, color: theme.text, align: 'center',
        fontFace: 'Calibri',
      });
      if (slide.subtitle) {
        s.addText(slide.subtitle, {
          x: 0.5, y: 3.5, w: 9, h: 0.8,
          fontSize: 20, color: theme.primary, align: 'center',
          fontFace: 'Calibri',
        });
      }
    } else {
      s.addText(slide.title, {
        x: 0.5, y: 0.3, w: 9, h: 0.8,
        fontSize: 28, bold: true, color: theme.text, fontFace: 'Calibri',
      });
    }
  }

  // Bullets / body
  const renderBullets = (bullets, x, y, w, h) => {
    if (!Array.isArray(bullets) || !bullets.length) return;
    const lines = bullets.map((b) => ({
      text: String(b.text || ''),
      options: { bullet: { indent: 20 }, indentLevel: Math.max(0, Math.min(4, b.level || 0)) },
    }));
    s.addText(lines, { x, y, w, h, fontSize: 16, color: theme.text, fontFace: 'Calibri', valign: 'top' });
  };

  if (layout === 'two_content') {
    renderBullets(slide.bullets,  0.5, 1.3, 4.3, 4.5);
    renderBullets(slide.bullets2, 5.2, 1.3, 4.3, 4.5);
  } else if (layout !== 'title' && layout !== 'title_only' && layout !== 'blank') {
    renderBullets(slide.bullets, 0.5, 1.3, 9, 4.5);
    if (slide.body && !slide.bullets) {
      s.addText(String(slide.body), {
        x: 0.5, y: 1.3, w: 9, h: 4.5,
        fontSize: 16, color: theme.text, fontFace: 'Calibri', valign: 'top',
      });
    }
  }

  // Images
  for (const img of slide.images || []) {
    const p = resolveImagePath(img.path);
    if (!p) die(`image_not_found:${img.path}`);
    s.addImage({ path: p, x: img.x ?? 1, y: img.y ?? 1.3, w: img.w ?? 6, h: img.h ?? 4 });
  }

  // Shapes
  for (const sh of slide.shapes || []) {
    const t = (sh.type || 'rect').toLowerCase();
    const shapeMap = {
      rect:       pptx.ShapeType.rect,
      roundrect:  pptx.ShapeType.roundRect,
      ellipse:    pptx.ShapeType.ellipse,
      line:       pptx.ShapeType.line,
    };
    const shapeType = shapeMap[t] || pptx.ShapeType.rect;
    s.addShape(shapeType, {
      x: sh.x ?? 0.5, y: sh.y ?? 1.3, w: sh.w ?? 3, h: sh.h ?? 1,
      fill: sh.fill ? { color: String(sh.fill).replace('#', '') } : { color: theme.primary },
      line: sh.line ? { color: String(sh.line).replace('#', '') } : undefined,
    });
  }

  // Charts
  for (const chart of slide.charts || []) {
    const type = buildChartDef(pptx, chart);
    const series = Array.isArray(chart.data) ? chart.data : [];
    const labels = series[0]?.labels || [];
    const data = series.map((sr) => ({
      name: sr.name || 'Série',
      labels: sr.labels || labels,
      values: sr.values || [],
    }));
    const opts = {
      x: 1, y: 1.3, w: 8, h: 4.5,
      showLegend: true, legendPos: 'b',
      chartColors: [theme.primary, theme.accent, '34D399', 'F59E0B', 'EC4899'],
      ...(chart.options || {}),
    };
    s.addChart(type, data, opts);
  }

  // Tables
  for (const tbl of slide.tables || []) {
    const headers = (tbl.headers || []).map((h) => ({
      text: String(h),
      options: { bold: true, fill: { color: theme.primary }, color: 'FFFFFF' },
    }));
    const rows = (tbl.rows || []).map((row) =>
      row.map((cell) => ({ text: String(cell), options: { color: theme.text } }))
    );
    const allRows = headers.length ? [headers, ...rows] : rows;
    s.addTable(allRows, {
      x: tbl.x ?? 0.5, y: tbl.y ?? 1.3, w: tbl.w ?? 9,
      fontSize: 12, fontFace: 'Calibri', border: { pt: 1, color: 'D1D5DB' },
    });
  }

  // Notes
  if (slide.notes) s.addNotes(String(slide.notes));
}

function registerMaster(pptx, spec, theme) {
  const master = spec.masterSlide;
  if (!master) return null;
  const name = master.title || 'HP_MASTER';
  const objects = [];
  for (const obj of master.objects || []) {
    if (obj.rect) {
      objects.push({ rect: {
        x: obj.rect.x ?? 0, y: obj.rect.y ?? 0, w: obj.rect.w ?? 10, h: obj.rect.h ?? 0.4,
        fill: { color: String(obj.rect.fill || theme.primary).replace('#', '') },
      }});
    } else if (obj.text) {
      objects.push({ text: {
        text: String(obj.text.text || ''),
        options: {
          x: 0.3, y: 0.1, w: 5, h: 0.4,
          fontSize: 12, color: 'FFFFFF', ...(obj.text.options || {}),
        },
      }});
    } else if (obj.image) {
      const p = resolveImagePath(obj.image.path);
      if (p) objects.push({ image: {
        path: p,
        x: obj.image.x ?? 0.2, y: obj.image.y ?? 0.1,
        w: obj.image.w ?? 1,  h: obj.image.h ?? 0.4,
      }});
    }
  }
  pptx.defineSlideMaster({
    title: name,
    background: { color: String(master.background || theme.bg).replace('#', '') },
    objects,
  });
  return name;
}

(async function main() {
  const spec = readStdin();
  if (!spec || typeof spec !== 'object') die('spec_must_be_object');

  ensureOutDir();
  const theme = resolveTheme(spec.theme);
  const Pptx = await loadPptxgen();
  const pptx = new Pptx();

  pptx.author = spec.author || 'Homeport';
  pptx.company = spec.company || 'Homeport';
  pptx.title = spec.title || 'Presentation';
  pptx.layout = 'LAYOUT_WIDE';

  const masterName = registerMaster(pptx, spec, theme);

  const slides = Array.isArray(spec.slides) ? spec.slides : [];
  if (!slides.length) die('no_slides');

  for (const slide of slides) {
    renderSlide(pptx, slide, theme, masterName);
  }

  const slug = slugify(spec.title);
  const filename = `${slug}.pptx`;
  const absOut = join(OUT_DIR, filename);

  try {
    await pptx.writeFile({ fileName: absOut });
  } catch (e) {
    die(`save_failed: ${e.message}`);
  }

  try {
    const st = statSync(absOut);
    if (st.size > MAX_OUTPUT_BYTES) die('output_too_large');
  } catch (e) {
    die(`output_missing: ${e.message}`);
  }

  process.stdout.write(`out/${filename}\n`);
})().catch((e) => {
  die(`unhandled_error: ${e.message}`);
});
