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
