#!/usr/bin/env node
/**
 * docx-create : génère un .docx depuis un JSON spec sur stdin.
 * Implémentation docx-js suivant le SKILL.md Anthropic officiel.
 *
 * Invocation (via sandbox) :
 *   node /app/skills-bundle/docx/create.mjs < spec.json
 *
 * Spec attendu (format du tool generate_document de Kinn) :
 * {
 *   "title": "Mon document",
 *   "accent_color": "#E61982",    // hex, défaut rose Kinn
 *   "base_font": "Arial",
 *   "paragraphs": [
 *     { "heading": 1, "text": "Titre H1" },
 *     { "heading": 2, "text": "Titre H2" },
 *     { "text": "Paragraphe classique." },
 *     { "bullets": ["item 1", "item 2"] },
 *     { "numbered": ["étape 1", "étape 2"] },
 *     { "table": { "headers": ["a","b"], "rows": [["1","2"]] } }
 *   ]
 * }
 *
 * Sortie : écrit dans $WORKSPACE_OUT/<slug>.docx et printe le chemin relatif sur stdout.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageOrientation,
} from 'docx';

// ── Helpers ────────────────────────────────────────────────────
function die(msg, code = 1) {
  process.stderr.write(String(msg) + '\n');
  process.exit(code);
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

function slugify(text, fallback = 'document') {
  if (!text) return fallback;
  const slug = String(text)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}

function hexToColor(hx) {
  const v = String(hx || '').replace(/^#/, '').trim();
  return /^[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : 'E61982';
}

// ── Builders ──────────────────────────────────────────────────
function buildParagraph(block, ctx) {
  // { heading: 1|2|3|4, text }
  if (typeof block.heading === 'number') {
    const levelMap = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 };
    return new Paragraph({
      heading: levelMap[Math.max(1, Math.min(4, block.heading))] || HeadingLevel.HEADING_2,
      children: [new TextRun({ text: String(block.text || ''), bold: true, color: ctx.accent })],
    });
  }
  // { bullets: [...] }
  if (Array.isArray(block.bullets)) {
    return block.bullets.map(item => new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun({ text: String(item), font: ctx.font, size: 22 })],
    }));
  }
  // { numbered: [...] }
  if (Array.isArray(block.numbered)) {
    return block.numbered.map(item => new Paragraph({
      numbering: { reference: 'numbers', level: 0 },
      children: [new TextRun({ text: String(item), font: ctx.font, size: 22 })],
    }));
  }
  // { table: { headers, rows } }
  if (block.table && typeof block.table === 'object') {
    return [buildTable(block.table, ctx), new Paragraph({ text: '' })];
  }
  // { text: "..." } par défaut
  return new Paragraph({
    children: [new TextRun({ text: String(block.text || ''), font: ctx.font, size: 22 })],
  });
}

function buildTable(spec, ctx) {
  const headers = Array.isArray(spec.headers) ? spec.headers : [];
  const rows = Array.isArray(spec.rows) ? spec.rows : [];
  const nCols = Math.max(headers.length, ...rows.map(r => r.length), 1);
  const contentWidth = 9360; // US Letter - 1" margins
  const colWidth = Math.floor(contentWidth / nCols);
  const columnWidths = Array(nCols).fill(colWidth);
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: border, bottom: border, left: border, right: border };

  const tableRows = [];
  if (headers.length) {
    tableRows.push(new TableRow({
      tableHeader: true,
      children: Array.from({ length: nCols }).map((_, i) => new TableCell({
        borders,
        width: { size: colWidth, type: WidthType.DXA },
        shading: { fill: ctx.accent, type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({
            text: String(headers[i] ?? ''),
            bold: true, color: 'FFFFFF', font: ctx.font, size: 22,
          })],
        })],
      })),
    }));
  }
  for (const row of rows) {
    tableRows.push(new TableRow({
      children: Array.from({ length: nCols }).map((_, i) => new TableCell({
        borders,
        width: { size: colWidth, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: String(row[i] ?? ''), font: ctx.font, size: 20 })],
        })],
      })),
    }));
  }

  return new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths,
    rows: tableRows,
  });
}

// ── Main ──────────────────────────────────────────────────────
(async () => {
  const raw = await readStdin();
  if (!raw?.trim()) die('empty_stdin: expected JSON spec on stdin');
  let spec;
  try { spec = JSON.parse(raw); } catch (e) { die(`invalid_json: ${e.message}`); }

  // Accepte les 2 formes : { title, paragraphs } OU { title, spec: { paragraphs } }
  const inner = (spec && typeof spec.spec === 'object') ? spec.spec : spec;
  const title = spec.title || inner.title || 'Document';
  const paragraphs = Array.isArray(inner.paragraphs) ? inner.paragraphs : [];
  if (!paragraphs.length) die('invalid_spec: paragraphs[] must be non-empty');

  const accent = hexToColor(inner.accent_color || '#E61982');
  const font = inner.base_font || 'Arial';
  const ctx = { accent, font };

  // Build document children
  const children = [];
  for (const block of paragraphs) {
    if (!block || typeof block !== 'object') continue;
    const built = buildParagraph(block, ctx);
    if (Array.isArray(built)) children.push(...built);
    else if (built) children.push(built);
  }

  const doc = new Document({
    creator: 'Kinn',
    title,
    description: title,
    styles: {
      default: { document: { run: { font, size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 40, bold: true, font, color: accent },
          paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font, color: accent },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font, color: accent },
          paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
        { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 22, bold: true, italics: true, font, color: '595959' },
          paragraph: { spacing: { before: 120, after: 60 }, outlineLevel: 3 } },
      ],
    },
    numbering: {
      config: [
        { reference: 'bullets', levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }] },
        { reference: 'numbers', levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }] },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);

  const outDir = process.env.WORKSPACE_OUT
    || path.join(process.env.HOMEPORT_WORKSPACE || '/workspace', 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const slug = slugify(title);
  const outPath = path.join(outDir, `${slug}.docx`);
  fs.writeFileSync(outPath, buffer);

  const rel = path.relative(path.dirname(outDir), outPath);
  process.stdout.write(rel + '\n');
})().catch((e) => die(`create_failed: ${e?.message || e}`));
