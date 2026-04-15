const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const { Types } = require('mongoose');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const FileRecord = require('../../db/models/file.model');
const { storeUpload, readStream, removeRecord, parseMaxSize } = require('../../services/file-storage');
const env = require('../../config/env');

let multer;
try { multer = require('multer'); } catch { multer = null; }

module.exports = function () {
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  const maxBytes = parseMaxSize(env.FILE_MAX_SIZE);
  const upload = multer
    ? multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes } })
    : null;

  // ── helpers ──
  async function resolveWorkspace(req) {
    const wsId = req.params.wsId || req.query.workspaceId || req.body?.workspaceId;
    if (!wsId) return null;
    let ws;
    if (Types.ObjectId.isValid(String(wsId))) ws = await Workspace.findById(wsId);
    else ws = await Workspace.findOne({ id: wsId });
    if (!ws || String(ws.companyId) !== req.user.companyId) return null;
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return null;
    return ws;
  }

  async function resolveFile(req) {
    const rawId = String(req.params.fileId);
    let file = null;
    if (Types.ObjectId.isValid(rawId)) file = await FileRecord.findById(rawId);
    if (!file) file = await FileRecord.findOne({ id: rawId });
    if (!file) return null;
    // Scope check: file must belong to user's company
    const ws = await Workspace.findById(file.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return null;
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return null;
    return file;
  }

  // ── POST /files/upload ──
  if (upload) {
    r.post('/workspaces/:wsId/files/upload', upload.single('file'), async (req, res) => {
      try {
        const ws = await resolveWorkspace(req);
        if (!ws) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
        if (!req.file) return res.apiError(400, 'no_file', 'No file provided');

        const lifecycle = req.body?.lifecycle || 'temp';
        const fileRef = await storeUpload(req.file, {
          workspaceId: ws._id,
          companyId: ws.companyId,
          uploadedBy: req.user.id || '',
          lifecycle,
        });

        res.status(201).json({ success: true, data: fileRef, requestId: req.requestId, ts: Date.now() });
      } catch (e) {
        console.error('[files] upload error', e);
        res.apiError(500, 'upload_failed', e.message);
      }
    });
  }

  // ── GET /files/:fileId ──  (stream download)
  r.get('/files/:fileId', async (req, res) => {
    try {
      const file = await resolveFile(req);
      if (!file) return res.apiError(404, 'file_not_found', 'File not found');

      const mime = file.mimeType || 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      // Inline for images (so <img src> works), attachment for others
      const disposition = mime.startsWith('image/') ? 'inline' : 'attachment';
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.name)}"`);
      if (file.size) res.setHeader('Content-Length', file.size);

      const stream = readStream(file);
      stream.pipe(res);
      stream.on('error', (e) => {
        console.error('[files] stream error', e);
        if (!res.headersSent) res.apiError(500, 'stream_error', 'Failed to read file');
      });
    } catch (e) {
      console.error('[files] download error', e);
      res.apiError(500, 'download_failed', e.message);
    }
  });

  // ── GET /files/:fileId/preview ──  (inline viewer pour docx/xlsx/pptx/pdf)
  // Retourne du HTML prêt à embarquer dans un iframe srcdoc (docx/xlsx)
  // ou le PDF stream directement (pdf/pptx converti à la volée).
  r.get('/files/:fileId/preview', async (req, res) => {
    try {
      const file = await resolveFile(req);
      if (!file) return res.apiError(404, 'file_not_found', 'File not found');

      const mime = (file.mimeType || '').toLowerCase();
      const ext = (file.name || '').toLowerCase().split('.').pop();
      const isDocx = mime.includes('wordprocessingml') || ext === 'docx';
      const isXlsx = mime.includes('spreadsheetml') || ext === 'xlsx';
      const isPptx = mime.includes('presentationml') || ext === 'pptx';
      const isPdf = mime === 'application/pdf' || ext === 'pdf';

      // PDF natif → streamer avec inline disposition pour le viewer navigateur
      if (isPdf) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
        const stream = readStream(file);
        stream.pipe(res);
        return;
      }

      // DOCX → mammoth → HTML
      if (isDocx) {
        let mammoth;
        try { mammoth = require('mammoth'); } catch { return res.apiError(500, 'mammoth_missing', 'mammoth lib unavailable'); }
        const chunks = [];
        const stream = readStream(file);
        for await (const c of stream) chunks.push(c);
        const buffer = Buffer.concat(chunks);
        const result = await mammoth.convertToHtml({ buffer }, {
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
          ],
        });
        const html = buildDocPreviewShell(result.value || '<p><em>Document vide</em></p>', file.name);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }

      // XLSX → SheetJS → HTML (tabs par feuille)
      if (isXlsx) {
        let XLSX;
        try { XLSX = require('xlsx'); } catch { return res.apiError(500, 'xlsx_missing', 'xlsx lib unavailable'); }
        const chunks = [];
        const stream = readStream(file);
        for await (const c of stream) chunks.push(c);
        const buffer = Buffer.concat(chunks);
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const sheetsHtml = wb.SheetNames.map((name, i) => {
          const sheet = wb.Sheets[name];
          const tableHtml = XLSX.utils.sheet_to_html(sheet, { id: `sheet-${i}`, editable: false });
          return `<section class="sheet" data-name="${escapeHtml(name)}" data-idx="${i}" style="display:${i === 0 ? 'block' : 'none'}">${tableHtml}</section>`;
        }).join('\n');
        const tabs = wb.SheetNames.map((n, i) => `<button class="tab${i === 0 ? ' active' : ''}" data-target="${i}">${escapeHtml(n)}</button>`).join('');
        const html = buildSheetPreviewShell(sheetsHtml, tabs, file.name);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }

      // PPTX → LibreOffice convert to PDF (fallback)
      if (isPptx) {
        return await streamLibreofficePdf(file, res);
      }

      return res.apiError(415, 'unsupported_preview', `Pas d'aperçu disponible pour ${mime || ext || 'ce format'}`);
    } catch (e) {
      console.error('[files] preview error', e);
      if (!res.headersSent) res.apiError(500, 'preview_failed', e.message);
    }
  });

  // ── GET /files/:fileId/meta ──
  r.get('/files/:fileId/meta', async (req, res) => {
    try {
      const file = await resolveFile(req);
      if (!file) return res.apiError(404, 'file_not_found', 'File not found');
      res.apiOk({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        lifecycle: file.lifecycle,
        createdAt: file.createdAt,
      });
    } catch (e) {
      res.apiError(500, 'meta_error', e.message);
    }
  });

  // ── DELETE /files/:fileId ──
  r.delete('/files/:fileId', async (req, res) => {
    try {
      const file = await resolveFile(req);
      if (!file) return res.apiError(404, 'file_not_found', 'File not found');
      await removeRecord(file);
      res.apiOk({ id: file.id });
    } catch (e) {
      console.error('[files] delete error', e);
      res.apiError(500, 'delete_failed', e.message);
    }
  });

  return r;
};

// ── Preview helpers ─────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildDocPreviewShell(bodyHtml, name) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title><style>
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fafafa;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#262626;line-height:1.55}
.page{background:#fff;max-width:820px;margin:20px auto;padding:56px 64px;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.08);min-height:calc(100vh - 40px)}
h1{color:#e61982;font-size:26px;margin:0 0 16px;font-weight:700}
h2{color:#262626;font-size:20px;margin:24px 0 12px;font-weight:700}
h3{color:#262626;font-size:15px;margin:18px 0 8px;font-weight:700}
p{margin:0 0 12px}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
th{background:#e61982;color:#fff;padding:8px 12px;font-weight:600;text-align:left;border:none}
td{padding:6px 12px;border-bottom:1px solid #e5e5e5}
tr:nth-child(even) td{background:#fafafa}
img{max-width:100%;height:auto;border-radius:4px}
a{color:#e61982;text-decoration:none}
a:hover{text-decoration:underline}
ul,ol{padding-left:22px;margin:0 0 12px}
li{margin-bottom:4px}
blockquote{margin:12px 0;padding:8px 16px;border-left:3px solid #e61982;background:#fff5fa;color:#595959}
code{background:#f5f5f5;padding:2px 5px;border-radius:3px;font-size:.9em;font-family:Menlo,Monaco,Consolas,monospace}
@media (max-width:600px){.page{padding:24px 20px;margin:8px}}
::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:#d9d9d9;border-radius:4px}
</style></head><body><article class="page">${bodyHtml}</article></body></html>`;
}

function buildSheetPreviewShell(sheetsHtml, tabs, name) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)}</title><style>
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fafafa;font-family:-apple-system,"Segoe UI",Arial,sans-serif;color:#262626;font-size:13px}
.tabs{display:flex;gap:4px;padding:8px 12px;background:#fff;border-bottom:1px solid #e5e5e5;overflow-x:auto;position:sticky;top:0;z-index:10}
.tab{padding:6px 14px;border:1px solid #e5e5e5;border-radius:6px;background:#fafafa;cursor:pointer;font-size:12px;color:#595959;white-space:nowrap;transition:all .15s}
.tab:hover{border-color:#e61982;color:#e61982}
.tab.active{background:#e61982;color:#fff;border-color:#e61982;font-weight:600}
.sheet{padding:16px}
table{border-collapse:collapse;font-size:12px;width:auto;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.05);border-radius:4px;overflow:hidden}
td{border:1px solid #e5e5e5;padding:6px 10px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:first-child td{background:#e61982;color:#fff;font-weight:600;border-color:#e61982}
tr:nth-child(even):not(:first-child) td{background:#fafafa}
td[data-t="n"]{text-align:right;font-variant-numeric:tabular-nums}
::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:#d9d9d9;border-radius:4px}
</style></head><body>
<nav class="tabs">${tabs}</nav>
${sheetsHtml}
<script>
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const idx=btn.dataset.target;
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b===btn));
    document.querySelectorAll('.sheet').forEach(s=>s.style.display=(s.dataset.idx===idx?'block':'none'));
  });
});
</script>
</body></html>`;
}

async function streamLibreofficePdf(file, res) {
  const fs = require('fs');
  const fsp = require('fs/promises');
  const os = require('os');
  const path = require('path');
  const { spawn } = require('child_process');

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pptx-preview-'));
  const srcPath = path.join(tmpDir, file.name || 'input.pptx');
  try {
    // Dump source to tmp
    const chunks = [];
    const src = readStream(file);
    for await (const c of src) chunks.push(c);
    await fsp.writeFile(srcPath, Buffer.concat(chunks));

    // Run soffice --headless --convert-to pdf
    await new Promise((resolve, reject) => {
      const soffice = spawn('soffice', ['--headless', '--norestore', '--nolockcheck', '--convert-to', 'pdf', '--outdir', tmpDir, srcPath], { timeout: 60_000 });
      let stderr = '';
      soffice.stderr.on('data', (d) => { stderr += String(d); });
      soffice.on('error', reject);
      soffice.on('close', (code) => code === 0 ? resolve() : reject(new Error(`soffice exit ${code}: ${stderr.slice(-500)}`)));
    });

    const pdfPath = srcPath.replace(/\.[^.]+$/, '.pdf');
    if (!fs.existsSync(pdfPath)) throw new Error('PDF not produced by LibreOffice');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent((file.name || 'preview').replace(/\.[^.]+$/, '.pdf'))}"`);
    const rs = fs.createReadStream(pdfPath);
    rs.pipe(res);
    rs.on('close', () => { fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {}); });
  } catch (e) {
    fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    throw e;
  }
}
