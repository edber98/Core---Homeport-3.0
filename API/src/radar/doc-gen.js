// Radar — GÉNÉRATION de documents multi-formats.
//
// Le cerveau ne fait pas que lire : il PRODUIT des documents (devis récapitulatif,
// rapport d'analyse, export de données) dans le format voulu — txt, md, csv, html,
// xlsx (lib xlsx), docx (lib docx), et pdf (conversion LibreOffice depuis docx/html,
// best-effort). API unique : generateDocument(spec, format) → { buffer, filename, mime }.
//
// spec = { title, paragraphs?: string[], table?: { headers:[], rows:[[]] }, meta?:{} }

const FMT = {
  txt:  { ext: 'txt',  mime: 'text/plain' },
  md:   { ext: 'md',   mime: 'text/markdown' },
  csv:  { ext: 'csv',  mime: 'text/csv' },
  html: { ext: 'html', mime: 'text/html' },
  xlsx: { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  docx: { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  pdf:  { ext: 'pdf',  mime: 'application/pdf' },
};

function asTxt(spec) {
  const L = [spec.title || 'Document', ''];
  for (const p of spec.paragraphs || []) L.push(p, '');
  if (spec.table) { L.push(spec.table.headers.join('\t')); for (const r of spec.table.rows) L.push(r.join('\t')); }
  return L.join('\n');
}
function asMd(spec) {
  const L = [`# ${spec.title || 'Document'}`, ''];
  for (const p of spec.paragraphs || []) L.push(p, '');
  if (spec.table) { L.push('| ' + spec.table.headers.join(' | ') + ' |'); L.push('| ' + spec.table.headers.map(() => '---').join(' | ') + ' |'); for (const r of spec.table.rows) L.push('| ' + r.join(' | ') + ' |'); }
  return L.join('\n');
}
function asCsv(spec) {
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const L = [];
  if (spec.table) { L.push(spec.table.headers.map(esc).join(',')); for (const r of spec.table.rows) L.push(r.map(esc).join(',')); }
  return L.join('\n');
}
function asHtml(spec) {
  const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  let h = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(spec.title)}</title></head><body><h1>${esc(spec.title || 'Document')}</h1>`;
  for (const p of spec.paragraphs || []) h += `<p>${esc(p)}</p>`;
  if (spec.table) { h += '<table border="1" cellpadding="4"><thead><tr>' + spec.table.headers.map(x => `<th>${esc(x)}</th>`).join('') + '</tr></thead><tbody>' + spec.table.rows.map(r => '<tr>' + r.map(x => `<td>${esc(x)}</td>`).join('') + '</tr>').join('') + '</tbody></table>'; }
  return h + '</body></html>';
}
function asXlsx(spec) {
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();
  const aoa = [];
  if (spec.title) aoa.push([spec.title]);
  if (spec.table) { aoa.push(spec.table.headers); for (const r of spec.table.rows) aoa.push(r); }
  else for (const p of spec.paragraphs || []) aoa.push([p]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Document');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
async function asDocx(spec) {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell } = require('docx');
  const children = [new Paragraph({ text: spec.title || 'Document', heading: HeadingLevel.HEADING_1 })];
  for (const p of spec.paragraphs || []) children.push(new Paragraph({ children: [new TextRun(p)] }));
  if (spec.table) {
    children.push(new Table({ rows: [
      new TableRow({ children: spec.table.headers.map(h => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(h), bold: true })] })] })) }),
      ...spec.table.rows.map(r => new TableRow({ children: r.map(c => new TableCell({ children: [new Paragraph(String(c))] })) })),
    ] }));
  }
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

/** Convertit un buffer docx/html en PDF via LibreOffice (best-effort). @returns Buffer|null */
async function toPdf(srcBuffer, srcExt) {
  const fs = require('fs'), os = require('os'), path = require('path'), { execFile } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-pdf-'));
  const src = path.join(dir, `doc.${srcExt}`); fs.writeFileSync(src, srcBuffer);
  const bins = ['soffice', 'libreoffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice'];
  for (const bin of bins) {
    const ok = await new Promise((res) => execFile(bin, ['--headless', '--convert-to', 'pdf', '--outdir', dir, src], { timeout: 60000 }, (e) => res(!e)));
    if (ok) { const out = path.join(dir, 'doc.pdf'); if (fs.existsSync(out)) return fs.readFileSync(out); }
  }
  return null;   // LibreOffice indisponible
}

/** Génère un document dans le format demandé. @returns {{buffer, filename, mime, format}} */
async function generateDocument(spec = {}, format = 'docx') {
  const f = String(format).toLowerCase();
  const base = (spec.filename || spec.title || 'document').replace(/[\\/:*?"<>|]/g, '-').slice(0, 80);
  let buffer;
  if (f === 'txt') buffer = Buffer.from(asTxt(spec), 'utf8');
  else if (f === 'md') buffer = Buffer.from(asMd(spec), 'utf8');
  else if (f === 'csv') buffer = Buffer.from(asCsv(spec), 'utf8');
  else if (f === 'html') buffer = Buffer.from(asHtml(spec), 'utf8');
  else if (f === 'xlsx') buffer = asXlsx(spec);
  else if (f === 'docx') buffer = await asDocx(spec);
  else if (f === 'pdf') {
    const docxBuf = await asDocx(spec);
    buffer = await toPdf(docxBuf, 'docx');
    if (!buffer) { const html = Buffer.from(asHtml(spec), 'utf8'); buffer = await toPdf(html, 'html'); }
    if (!buffer) throw new Error('PDF indisponible (LibreOffice/soffice introuvable) — utilise docx/html.');
  } else throw new Error(`Format non supporté : ${format} (txt|md|csv|html|xlsx|docx|pdf)`);
  const meta = FMT[f] || FMT.txt;
  return { buffer, filename: `${base}.${meta.ext}`, mime: meta.mime, format: f };
}

/** Génère puis dépose le document dans Nextcloud. @returns {{path, filename, format}} */
async function generateAndUpload(spec, format, destFolder = '/RadarDemo/Genere') {
  const { registry } = require('../plugins/registry');
  const Credential = require('../db/models/credential.model');
  const { decrypt } = require('../utils/enc');
  const cred = await Credential.findOne({ providerKey: { $in: ['nextcloudFiles', 'nextcloud'] } }).lean();
  if (!cred) throw new Error('pas de credential Nextcloud');
  const credentials = decrypt(cred.secret);
  const gen = await generateDocument(spec, format);
  const mk = registry.resolve('nc_folder_create'); if (mk) await mk({ id: 'g', model: {} }, { payload: {} }, { path: destFolder }, { credentials, log: () => {} }).catch(() => {});
  const up = registry.resolve('nc_file_upload');
  const dest = `${destFolder}/${gen.filename}`;
  await up({ id: 'g', model: {} }, { payload: {} }, { path: dest, content: gen.buffer.toString('base64') }, { credentials, log: () => {} });
  return { path: dest, filename: gen.filename, format: gen.format };
}

module.exports = { generateDocument, generateAndUpload, toPdf, FORMATS: Object.keys(FMT) };
