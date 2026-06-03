// Routes /ai/threads/:threadId/project-root/* + /ai/project-connectors/*
//
// Le "project root" associe un thread à un fichier-system distant (Nextcloud, Google Drive,
// Dropbox, OneDrive, SharePoint) pour que l'agent puisse lire/écrire des fichiers projet.
//
//   POST   /ai/threads/:id/project-root            associe un connector au thread
//   GET    /ai/threads/:id/project-root            lit la config actuelle
//   PUT    /ai/threads/:id/project-root            MAJ (partial)
//   POST   /ai/threads/:id/project-root/refresh    rafraîchit l'arbre + persiste dans canvas
//   DELETE /ai/threads/:id/project-root            détache le connector
//
//   GET    /ai/project-connectors                  liste credentials connector-compatibles
//   GET    /ai/project-connectors/browse           parcourt un répertoire remote

const { Types } = require('mongoose');
const AiThread = require('../../../db/models/ai-thread.model');
const AiProjectRoot = require('../../../db/models/ai-project-root.model');
const AiCanvasState = require('../../../db/models/ai-canvas-state.model');
const Credential = require('../../../db/models/credential.model');
const Provider = require('../../../db/models/provider.model');
const { createProjectFsExecutor, CONNECTOR_MAP } = require('../../../ai/tools/project-fs-tools');
const { executeTool } = require('../../../ai/tools/tool-executor');
const { requireThreadAccess } = require('../../../ai/access/thread-access');
const { ensureWorkspaceAccess } = require('./_shared');

const CONNECTOR_KEYS = ['nextcloudFiles', 'googleDrive', 'dropbox', 'oneDrive', 'sharePoint'];

/**
 * Résout un id court (cred_xxx) en ObjectId. Renvoie null si introuvable, ou
 * l'id original s'il est déjà un ObjectId valide.
 */
async function _resolveCredentialId(credentialId) {
  if (!credentialId) return null;
  if (Types.ObjectId.isValid(credentialId)) return credentialId;
  const cred = await Credential.findOne({ id: credentialId }, '_id').lean();
  return cred ? cred._id : false; // false = explicit "not found"
}

/**
 * Convertit un flat list d'entries (path: '/a/b/c.txt') en arbre hiérarchique
 * pour affichage canvas.
 */
function _entriesToTree(entries, rootLabel) {
  const treeRoot = { name: rootLabel, path: '/', type: 'directory', children: [] };
  for (const e of entries) {
    const parts = String(e.path || '').split('/').filter(Boolean);
    let cur = treeRoot;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partPath = '/' + parts.slice(0, i + 1).join('/');
      const isLast = i === parts.length - 1;
      let next = cur.children.find(c => c.name === part);
      if (!next) {
        next = { name: part, path: partPath, type: isLast ? (e.type || 'file') : 'directory', children: [] };
        cur.children.push(next);
      }
      cur = next;
    }
  }
  return treeRoot;
}

/** Cherche récursivement un array d'entries dans un objet imbriqué (provider response). */
function _findEntriesArray(obj, depth = 0) {
  if (depth > 4 || !obj) return null;
  for (const key of ['entries', 'files', 'items', 'children', 'contents', 'list']) {
    if (Array.isArray(obj[key])) return obj[key];
  }
  if (Array.isArray(obj)) return obj;
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const found = _findEntriesArray(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** Strip les préfixes connecteur-spécifiques pour normaliser les paths. */
function _stripConnectorPrefix(p) {
  if (typeof p !== 'string') return p;
  // Nextcloud WebDAV: /remote.php/dav/files/<user>/ -> /
  p = p.replace(/^\/?remote\.php\/dav\/files\/[^/]+/, '');
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

function _normalizeEntry(e) {
  const rawPath = e.path || e.fullPath || e.name || '';
  const relPath = _stripConnectorPrefix(rawPath);
  const pathEndsSlash = typeof rawPath === 'string' && rawPath.endsWith('/');
  const contentTypeEmpty = e.contentType === '' || e.contentType === null;
  const isDir = e.type === 'folder' || e.type === 'directory'
    || e.isFolder || e.is_dir
    || e.mimeType === 'application/vnd.google-apps.folder'
    || e['.tag'] === 'folder'
    || e.mime === 'httpd/unix-directory'
    || (pathEndsSlash && contentTypeEmpty);
  return {
    name: e.name || e.title || relPath.split('/').filter(Boolean).pop() || '(sans nom)',
    path: relPath,
    type: isDir ? 'directory' : 'file',
    size: typeof e.size === 'number' ? e.size : 0,
    modifiedAt: e.modifiedAt || e.mtime || e.lastModified || e.server_modified || null,
    contentType: e.contentType || e.mimeType || null,
  };
}

module.exports = function registerProjectRootRoutes(r) {
  // ── Associer un connector au thread ────────────────────────────────
  r.post('/ai/threads/:threadId/project-root', requireThreadAccess('edit'), async (req, res) => {
    const thread = req.aiThread;
    const { connectorType, credentialId, rootPath, label, extraConfig } = req.body || {};
    if (!connectorType) return res.apiError(400, 'connector_required', 'connectorType required');
    const resolvedCredId = await _resolveCredentialId(credentialId);
    if (resolvedCredId === false) return res.apiError(404, 'credential_not_found', `Credential '${credentialId}' introuvable`);

    const doc = await AiProjectRoot.findOneAndUpdate(
      { threadId: thread._id },
      {
        $set: {
          workspaceId: thread.workspaceId,
          connectorType,
          credentialId: resolvedCredId || undefined,
          rootPath: rootPath || '/',
          label: label || '',
          extraConfig: extraConfig || {},
        },
        $setOnInsert: { threadId: thread._id },
      },
      { upsert: true, new: true }
    );
    // Mirror léger dans thread metadata pour affichage rapide UI
    await AiThread.updateOne({ _id: thread._id }, {
      $set: {
        'metadata.projectRoot': {
          connectorType, credentialId: credentialId || null,
          rootPath: rootPath || '/', label: label || '',
        },
      },
    });
    res.status(201).json({ success: true, data: doc, requestId: req.requestId, ts: Date.now() });
  });

  // ── Lire la config ─────────────────────────────────────────────────
  r.get('/ai/threads/:threadId/project-root', requireThreadAccess('view'), async (req, res) => {
    const doc = await AiProjectRoot.findOne({ threadId: req.aiThread._id }).lean();
    if (!doc) return res.apiError(404, 'not_configured', 'No project root for this thread');
    res.apiOk(doc);
  });

  // ── MAJ partielle ──────────────────────────────────────────────────
  r.put('/ai/threads/:threadId/project-root', requireThreadAccess('edit'), async (req, res) => {
    const patch = {};
    for (const k of ['connectorType', 'credentialId', 'rootPath', 'label', 'extraConfig']) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    if (patch.credentialId !== undefined) {
      const resolved = await _resolveCredentialId(patch.credentialId);
      if (resolved === false) return res.apiError(404, 'credential_not_found', `Credential '${patch.credentialId}' introuvable`);
      patch.credentialId = resolved || undefined;
    }
    const doc = await AiProjectRoot.findOneAndUpdate(
      { threadId: req.aiThread._id },
      { $set: patch },
      { new: true }
    );
    if (!doc) return res.apiError(404, 'not_configured', 'No project root for this thread');
    res.apiOk(doc);
  });

  // ── Refresh arbre + persiste dans canvas ───────────────────────────
  r.post('/ai/threads/:threadId/project-root/refresh', requireThreadAccess('edit'), async (req, res) => {
    const doc = await AiProjectRoot.findOne({ threadId: req.aiThread._id });
    if (!doc) return res.apiError(404, 'not_configured', 'No project root for this thread');
    try {
      const exec = createProjectFsExecutor(
        { threadId: req.aiThread._id, workspaceId: req.aiThread.workspaceId, userId: req.user.id, companyId: req.user.companyId },
        () => {}
      );
      const result = await exec.execute('project_refresh_tree', {});
      const entries = (result && result.entries) || [];
      const treeRoot = _entriesToTree(entries, doc.label || 'Projet');
      // Persiste dans AiCanvasState.files pour affichage panel
      await AiCanvasState.updateOne(
        { threadId: req.aiThread._id },
        {
          $set: {
            'files.rootLabel': doc.label || 'Projet',
            'files.tree': treeRoot.children,
            'files.lastRefreshedAt': new Date(),
          },
          $setOnInsert: { threadId: req.aiThread._id },
        },
        { upsert: true }
      );
      res.apiOk({ tree: treeRoot.children, entries, rootLabel: doc.label || 'Projet' });
    } catch (e) {
      res.apiError(500, 'refresh_error', e?.message || 'Failed to refresh tree');
    }
  });

  // ── Détacher le connector ──────────────────────────────────────────
  r.delete('/ai/threads/:threadId/project-root', requireThreadAccess('edit'), async (req, res) => {
    await AiProjectRoot.deleteOne({ threadId: req.aiThread._id });
    await AiThread.updateOne({ _id: req.aiThread._id }, { $unset: { 'metadata.projectRoot': 1 } });
    res.apiOk({ deleted: true });
  });

  // ── Liste les credentials connector-compatibles dispo dans le workspace
  r.get('/ai/project-connectors', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const credentials = await Credential.find(
      { workspaceId: ws._id, providerKey: { $in: CONNECTOR_KEYS } },
      'id _id name providerKey'
    ).lean();
    const providers = await Provider.find(
      { key: { $in: CONNECTOR_KEYS } },
      'key name title iconUrl'
    ).lean();
    res.apiOk({
      connectors: providers.map(p => ({
        key: p.key,
        name: p.title || p.name,
        icon: p.iconUrl || null,
        credentials: credentials.filter(c => c.providerKey === p.key)
          .map(c => ({ id: c.id || String(c._id), name: c.name })),
      })),
    });
  });

  // ── Browse remote path — appelle le NodeTemplate list du connector ──
  r.get('/ai/project-connectors/browse', async (req, res) => {
    const ws = await ensureWorkspaceAccess(req, res);
    if (!ws) return;
    const { connectorType, credentialId, path: listPath = '/' } = req.query;
    if (!connectorType || !credentialId) {
      return res.apiError(400, 'missing_params', 'connectorType and credentialId required');
    }
    const map = CONNECTOR_MAP[connectorType];
    if (!map || !map.list) {
      return res.apiError(400, 'unsupported_connector', `${connectorType} ne supporte pas le listing`);
    }
    try {
      const result = await executeTool(map.list, { path: listPath, credentialId }, {
        workspaceId: ws._id,
        companyId: req.user.companyId,
        userId: req.user.id,
      });
      const entries = _findEntriesArray(result) || [];
      const normalized = entries.map(_normalizeEntry);
      res.apiOk({ path: listPath, entries: normalized, count: normalized.length });
    } catch (err) {
      res.apiError(500, 'browse_failed', err.message || String(err));
    }
  });
};
