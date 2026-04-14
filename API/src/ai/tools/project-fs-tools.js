// Project filesystem tools — capsule exposed when thread.mode === 'project'.
//
// All tools operate on a per-thread mirror/scratch cache and defer actual
// I/O to a connector-specific NodeTemplate (nc_file_get, gdrive_upload, …).
// The mapping from logical operation → NodeTemplate key is driven by
// CONNECTOR_MAP and the AiProjectRoot model bound to the thread.

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const AiProjectRoot = require('../../db/models/ai-project-root.model');
const {
  getCacheRoot, validatePath, ensureFileLocal, markDirty,
  syncDirtyToRemote, _locPaths,
} = require('../cache/project-cache');
const { isSensitivePath } = require('../permissions/sensitive-files');
const { executeMetaTool } = require('./meta-tools');

// ── Connector → NodeTemplate key mapping (MVP) ─────────────────────────────
const CONNECTOR_MAP = {
  nextcloud: {
    list:   'nc_file_list',
    read:   'nc_file_get',
    write:  'nc_file_upload',
    mkdir:  'nc_folder_create',
    delete: 'nc_file_delete',
    move:   'nc_file_move',
    search: 'nc_file_search',
  },
  google_drive: {
    list:   'gdrive_file_list',
    read:   'gdrive_file_get',
    write:  'gdrive_file_upload',
    mkdir:  'gdrive_folder_create',
    delete: 'gdrive_file_delete',
    move:   'gdrive_file_move',
    search: 'gdrive_file_search',
  },
  dropbox: {
    list:   'dropbox_file_list',
    read:   'dropbox_file_get',
    write:  'dropbox_file_upload',
    mkdir:  'dropbox_folder_create',
    delete: 'dropbox_file_delete',
    move:   'dropbox_file_move',
    search: 'dropbox_file_search',
  },
  onedrive_sharepoint: {
    // MVP: upload only — other ops will be added as plugin matures
    write: 'onedrive_file_upload',
  },
  local: {
    // Local connector uses the cache directly; no remote call needed
  },
};

// Aliases pour accepter toutes les variantes de providerKey
CONNECTOR_MAP['google-drive'] = CONNECTOR_MAP.google_drive;
CONNECTOR_MAP['googleDrive'] = CONNECTOR_MAP.google_drive;
CONNECTOR_MAP['onedrive-sharepoint'] = CONNECTOR_MAP.onedrive_sharepoint;
CONNECTOR_MAP['oneDrive'] = CONNECTOR_MAP.onedrive_sharepoint;
CONNECTOR_MAP['sharePoint'] = CONNECTOR_MAP.onedrive_sharepoint;
CONNECTOR_MAP['nextcloudFiles'] = CONNECTOR_MAP.nextcloud;

// ── Tool definitions ───────────────────────────────────────────────────────
const PROJECT_FS_TOOL_DEFINITIONS = [
  {
    name: 'project_list_dir',
    description: "Liste les entrées d'un répertoire du projet (fichiers + sous-dossiers).",
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Chemin relatif (défaut: /)' },
      },
    },
  },
  {
    name: 'project_tree',
    description: 'Retourne une arborescence bornée à partir d\'un chemin racine.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        maxDepth: { type: 'number', description: 'Profondeur max (défaut: 3)' },
        maxEntries: { type: 'number', description: 'Nombre total max (défaut: 200)' },
        filePattern: { type: 'string', description: 'Regex filtrant les fichiers' },
        excludePatterns: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'project_read_file',
    description: 'Lit le contenu complet d\'un fichier (UTF-8 si texte, base64 sinon).',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'project_read_batch',
    description: 'Lit plusieurs fichiers en une seule requête. Respecte un budget d\'octets global.',
    parameters: {
      type: 'object',
      properties: {
        paths: { type: 'array', items: { type: 'string' } },
        maxTotalBytes: { type: 'number', description: 'Budget max (défaut: 2 Mo)' },
      },
      required: ['paths'],
    },
  },
  {
    name: 'project_grep',
    description: 'Recherche un pattern dans les fichiers du projet.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        path: { type: 'string' },
        filePattern: { type: 'string' },
        contextLines: { type: 'number' },
        maxMatches: { type: 'number' },
      },
      required: ['query'],
    },
  },
  {
    name: 'project_search',
    description: 'Recherche des fichiers par nom ou contenu (délègue au connecteur).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        path: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'project_write_file',
    description: 'Écrit (ou remplace) le contenu d\'un fichier.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string', description: 'Contenu (texte ou base64)' },
        contentType: { type: 'string' },
        syncImmediate: { type: 'boolean', description: 'Pousser tout de suite vers le distant' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'project_create_folder',
    description: 'Crée un dossier dans le projet.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'project_delete',
    description: 'Supprime un fichier ou un dossier.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        recursive: { type: 'boolean' },
      },
      required: ['path'],
    },
  },
  {
    name: 'project_move',
    description: 'Déplace ou renomme un fichier/dossier.',
    parameters: {
      type: 'object',
      properties: { from: { type: 'string' }, to: { type: 'string' } },
      required: ['from', 'to'],
    },
  },
  {
    name: 'project_refresh_tree',
    description: 'Rafraîchit l\'arborescence cachée depuis le connecteur.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'project_sync_remote',
    description: 'Synchronise les modifications locales (scratch) vers le distant.',
    parameters: { type: 'object', properties: {} },
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function _buildToolKey(connectorType, op) {
  const m = CONNECTOR_MAP[connectorType];
  if (!m) return null;
  return m[op] || null;
}

async function _loadRoot(threadId) {
  if (!threadId) return null;
  return AiProjectRoot.findOne({ threadId }).lean();
}

// Strip préfixes connecteur-spécifiques des paths pour éviter duplication
function _stripConnectorPrefix(connectorType, p) {
  if (typeof p !== 'string' || !p) return p;
  const t = String(connectorType || '').toLowerCase();
  if (t.includes('nextcloud')) {
    p = p.replace(/^\/?remote\.php\/dav\/files\/[^/]+/, '');
  }
  if (!p.startsWith('/')) p = '/' + p;
  return p || '/';
}

// Convertit un path connecteur (brut) en path RELATIF au rootPath du projet.
// Exemple : rootPath="/CBJ PJ12323/", path="/remote.php/dav/files/USER/CBJ PJ12323/Docs/a.pdf"
//   → "/Docs/a.pdf"
// Retourne null si path hors rootPath (sortie interdite).
function _toProjectRelative(root, rawPath) {
  if (typeof rawPath !== 'string') return null;
  let clean = _stripConnectorPrefix(root.connectorType, rawPath);
  const rp = _stripConnectorPrefix(root.connectorType, root.rootPath || '/').replace(/\/+$/, '');
  if (!rp || rp === '/') return clean.startsWith('/') ? clean : '/' + clean;
  if (clean === rp) return '/';
  if (clean.startsWith(rp + '/')) return clean.slice(rp.length) || '/';
  return null; // hors rootPath
}

// Vérifie qu'un path relatif projet, après résolution vers rootPath, reste DANS rootPath.
// Utilisé avant toute opération destructive ou lecture.
function _isInsideRoot(root, projectRelativePath) {
  const rp = _stripConnectorPrefix(root.connectorType, root.rootPath || '/').replace(/\/+$/, '') || '/';
  const resolved = path.posix.resolve(rp, String(projectRelativePath || '/').replace(/^[\\/]+/, ''));
  if (rp === '/') return true;
  return resolved === rp || resolved.startsWith(rp + '/');
}

async function _callConnector(root, op, args, metadata) {
  const key = _buildToolKey(root.connectorType, op);
  if (!key) {
    return { ok: false, error: `Connector ${root.connectorType} does not support op ${op}` };
  }
  const ctx = {
    workspaceId: metadata.workspaceId,
    companyId: metadata.companyId,
    userId: metadata.userId,
  };
  // Nettoie tout champ path dans args pour retirer préfixe éventuellement stocké
  const cleanedArgs = { ...args };
  for (const key of ['path', 'sourcePath', 'destPath', 'remotePath']) {
    if (typeof cleanedArgs[key] === 'string') {
      cleanedArgs[key] = _stripConnectorPrefix(root.connectorType, cleanedArgs[key]);
    }
  }
  const enrichedArgs = {
    ...(root.extraConfig || {}),
    ...(root.credentialId ? { credentialId: String(root.credentialId) } : {}),
    rootPath: _stripConnectorPrefix(root.connectorType, root.rootPath || '/'),
    ...cleanedArgs,
  };
  try {
    const res = await executeMetaTool('execute_tool', { key, args: enrichedArgs }, ctx);
    return res;
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

function _resolveRelToRoot(root, p) {
  const clean = String(p || '/').replace(/^[\\/]+/, '');
  return path.posix.join(root.rootPath || '/', clean);
}

function _guardSensitive(p) {
  if (isSensitivePath(p)) {
    return { ok: false, error: `Chemin sensible refusé : ${p}` };
  }
  return null;
}

// ── Executor factory ───────────────────────────────────────────────────────

function createProjectFsExecutor(metadata = {}, emit = () => {}) {
  const threadId = metadata.threadId;
  const workspaceId = metadata.workspaceId;

  async function _ctx() {
    const root = await _loadRoot(threadId);
    if (!root) throw new Error('Aucun AiProjectRoot associé à ce thread (mode project non configuré).');
    const cacheRoot = await getCacheRoot(workspaceId, threadId);
    return { root, cacheRoot };
  }

  // Normalise la sortie d'un list : strip préfixe WebDAV + rootPath, filtre hors rootPath
  function _normalizeListResult(root, res, opts = {}) {
    if (!res || res.ok === false) return res;
    const files = res.files || res.entries || res.items || [];
    const cleaned = [];
    const rootPathClean = _stripConnectorPrefix(root.connectorType, root.rootPath || '/').replace(/\/+$/, '') || '/';
    for (const e of (Array.isArray(files) ? files : [])) {
      const rawPath = e.path || e.fullPath || e.name || '';
      const relPath = _toProjectRelative(root, rawPath);
      if (relPath === null) continue; // hors rootPath, filtré
      if (relPath === '/' && !opts.includeSelf) continue; // exclure le dossier racine lui-même
      const pathEndsSlash = typeof rawPath === 'string' && rawPath.endsWith('/');
      const contentTypeEmpty = e.contentType === '' || e.contentType === null || e.contentType === undefined;
      const isDir = e.type === 'folder' || e.type === 'directory'
        || e.isFolder || e.is_dir
        || e.mimeType === 'application/vnd.google-apps.folder'
        || e['.tag'] === 'folder'
        || e.mime === 'httpd/unix-directory'
        || (pathEndsSlash && contentTypeEmpty);
      cleaned.push({
        name: e.name || relPath.split('/').filter(Boolean).pop() || '(sans nom)',
        path: relPath,
        type: isDir ? 'directory' : 'file',
        size: typeof e.size === 'number' ? e.size : 0,
        modifiedAt: e.modifiedAt || e.mtime || e.lastModified || e.server_modified || null,
        contentType: e.contentType || e.mimeType || null,
      });
    }
    return { ok: true, rootLabel: rootPathClean, totalCount: cleaned.length, entries: cleaned };
  }

  // Guard : refuse un path projet qui sort du rootPath
  function _guardInsideRoot(root, p) {
    if (!_isInsideRoot(root, p)) {
      return { ok: false, error: `Chemin hors du projet (rootPath=${root.rootPath}): ${p}` };
    }
    return null;
  }

  const tools = {
    async project_list_dir(input) {
      const { root } = await _ctx();
      const p = _stripConnectorPrefix(root.connectorType, input?.path || '/');
      const g = _guardSensitive(p); if (g) return g;
      const gr = _guardInsideRoot(root, p); if (gr) return gr;
      const remotePath = _resolveRelToRoot(root, p);
      const res = await _callConnector(root, 'list', { path: remotePath }, metadata);
      return _normalizeListResult(root, res);
    },

    async project_tree(input) {
      const { root } = await _ctx();
      const p = _stripConnectorPrefix(root.connectorType, input?.path || '/');
      const g = _guardSensitive(p); if (g) return g;
      const gr = _guardInsideRoot(root, p); if (gr) return gr;
      const remotePath = _resolveRelToRoot(root, p);
      const res = await _callConnector(root, 'list', {
        path: remotePath,
        recursive: true,
        maxDepth: input?.maxDepth || 3,
        maxEntries: input?.maxEntries || 200,
        filePattern: input?.filePattern || null,
        excludePatterns: input?.excludePatterns || null,
      }, metadata);
      return _normalizeListResult(root, res);
    },

    async project_read_file(input) {
      const { root, cacheRoot } = await _ctx();
      const p = _stripConnectorPrefix(root.connectorType, input?.path);
      if (!p) return { ok: false, error: 'path requis' };
      const g = _guardSensitive(p); if (g) return g;
      const gr = _guardInsideRoot(root, p); if (gr) return gr;

      const downloader = async (absPath) => {
        const res = await _callConnector(root, 'read',
          { path: _resolveRelToRoot(root, p), writeTo: absPath }, metadata);
        if (res && res.ok === false) {
          throw new Error(`download_failed: ${res.error || 'unknown'} (status=${res.status || '?'})`);
        }
        // Accepte plusieurs formats de retour : .content, .data (nc_file_get), .body
        const rawPayload = res?.content ?? res?.data ?? res?.body;
        const encoding = res?.encoding || (res?.rawResponse ? 'base64' : null);
        if (rawPayload !== undefined && !fs.existsSync(absPath)) {
          await fsp.mkdir(path.dirname(absPath), { recursive: true });
          const isBase64Guess = encoding === 'base64'
            || (typeof rawPayload === 'string' && /^[A-Za-z0-9+/=\r\n]+$/.test(rawPayload.slice(0, 200)) && rawPayload.length > 100);
          const buf = isBase64Guess
            ? Buffer.from(rawPayload, 'base64')
            : (Buffer.isBuffer(rawPayload) ? rawPayload : Buffer.from(String(rawPayload), 'utf8'));
          await fsp.writeFile(absPath, buf);
        } else if (res?.fileId && !fs.existsSync(absPath)) {
          // File stored via file-storage — resolve and stream to absPath
          try {
            const { createFilesHelper } = require('../../services/file-storage');
            const files = createFilesHelper({ workspaceId });
            const { stream } = await files.resolve(res.fileId);
            await new Promise((resolve, reject) => {
              const ws = fs.createWriteStream(absPath);
              stream.pipe(ws);
              ws.on('finish', resolve);
              ws.on('error', reject);
              stream.on('error', reject);
            });
          } catch (e) {
            throw new Error(`project_read_file: download failed (${e?.message})`);
          }
        }
        return { size: res?.size, contentType: res?.contentType, etag: res?.etag };
      };

      try {
        const { path: abs } = await ensureFileLocal({
          cacheRoot, threadId, workspaceId, relativePath: p, downloader,
        });
        const buf = await fsp.readFile(abs);
        // Detect text vs binary heuristically
        const isText = buf.length === 0 || buf.slice(0, Math.min(buf.length, 8000)).every(b =>
          b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 128);
        return isText
          ? { ok: true, path: p, content: buf.toString('utf8'), encoding: 'utf8', size: buf.length }
          : { ok: true, path: p, content: buf.toString('base64'), encoding: 'base64', size: buf.length };
      } catch (e) {
        return { ok: false, error: e?.message || String(e) };
      }
    },

    async project_read_batch(input) {
      const { root } = await _ctx();
      const rawPaths = Array.isArray(input?.paths) ? input.paths : [];
      const paths = rawPaths.map(p => _stripConnectorPrefix(root.connectorType, p));
      const maxTotal = Math.max(1, Math.min(input?.maxTotalBytes || 2 * 1024 * 1024, 10 * 1024 * 1024));
      const results = [];
      let used = 0;
      for (const p of paths) {
        if (used >= maxTotal) { results.push({ path: p, skipped: 'budget_exceeded' }); continue; }
        const r = await tools.project_read_file({ path: p });
        if (r?.ok && r.content) {
          used += (r.size || r.content.length || 0);
          results.push(r);
        } else {
          results.push({ path: p, ok: false, error: r?.error });
        }
      }
      return { ok: true, results, totalBytes: used };
    },

    async project_grep(input) {
      const { root } = await _ctx();
      const q = input?.query;
      if (!q) return { ok: false, error: 'query requis' };
      const p = _stripConnectorPrefix(root.connectorType, input?.path || '/');
      const g = _guardSensitive(p); if (g) return g;
      const gr = _guardInsideRoot(root, p); if (gr) return gr;

      // Prefer remote search if connector supports it
      const searchKey = _buildToolKey(root.connectorType, 'search');
      if (searchKey) {
        const res = await _callConnector(root, 'search', {
          query: q,
          path: _resolveRelToRoot(root, p),
          filePattern: input?.filePattern || null,
          contextLines: input?.contextLines || 2,
          maxMatches: input?.maxMatches || 100,
          mode: 'content',
        }, metadata);
        return _normalizeListResult(root, res); // filtre hors-rootPath
      }
      return { ok: false, error: 'Le connecteur ne supporte pas la recherche.' };
    },

    async project_search(input) {
      const { root } = await _ctx();
      if (!input?.query) return { ok: false, error: 'query requis' };
      const p = _stripConnectorPrefix(root.connectorType, input?.path || '/');
      const gr = _guardInsideRoot(root, p); if (gr) return gr;
      const res = await _callConnector(root, 'search', {
        query: input.query,
        path: input.path ? _resolveRelToRoot(root, p) : (root.rootPath || '/'),
      }, metadata);
      return _normalizeListResult(root, res); // filtre hors-rootPath
    },

    async project_write_file(input) {
      const { root, cacheRoot } = await _ctx();
      const p = _stripConnectorPrefix(root.connectorType, input?.path);
      if (!p) return { ok: false, error: 'path requis' };
      const g = _guardSensitive(p); if (g) return g;
      const gr = _guardInsideRoot(root, p); if (gr) return gr;

      const { scratch } = _locPaths(cacheRoot, p);
      await fsp.mkdir(path.dirname(scratch), { recursive: true });
      const buf = typeof input.content === 'string'
        ? (input.contentType?.startsWith('text/') || !/^[A-Za-z0-9+/=\s]+$/.test(input.content)
            ? Buffer.from(input.content, 'utf8')
            : Buffer.from(input.content, 'base64'))
        : Buffer.from(String(input.content || ''), 'utf8');
      await fsp.writeFile(scratch, buf);
      await markDirty({ cacheRoot, threadId, workspaceId, relativePath: p });

      let syncResult = null;
      if (input.syncImmediate) {
        syncResult = await tools.project_sync_remote();
      }
      emit({ type: 'canvas.files.tree', reason: 'write', path: p });
      return { ok: true, path: p, size: buf.length, dirty: !input.syncImmediate, sync: syncResult };
    },

    async project_create_folder(input) {
      const { root } = await _ctx();
      const p = _stripConnectorPrefix(root.connectorType, input?.path);
      if (!p) return { ok: false, error: 'path requis' };
      const g = _guardSensitive(p); if (g) return g;
      const gr = _guardInsideRoot(root, p); if (gr) return gr;
      const r = await _callConnector(root, 'mkdir',
        { path: _resolveRelToRoot(root, p) }, metadata);
      emit({ type: 'canvas.files.tree', reason: 'mkdir', path: p });
      return r;
    },

    async project_delete(input) {
      const { root } = await _ctx();
      const p = _stripConnectorPrefix(root.connectorType, input?.path);
      if (!p) return { ok: false, error: 'path requis' };
      const g = _guardSensitive(p); if (g) return g;
      const gr = _guardInsideRoot(root, p); if (gr) return gr;
      const r = await _callConnector(root, 'delete',
        { path: _resolveRelToRoot(root, p), recursive: !!input.recursive }, metadata);
      emit({ type: 'canvas.files.tree', reason: 'delete', path: p });
      return r;
    },

    async project_move(input) {
      const { root } = await _ctx();
      const from = _stripConnectorPrefix(root.connectorType, input?.from);
      const to = _stripConnectorPrefix(root.connectorType, input?.to);
      if (!from || !to) return { ok: false, error: 'from et to requis' };
      const g1 = _guardSensitive(from); if (g1) return g1;
      const g2 = _guardSensitive(to); if (g2) return g2;
      const gr1 = _guardInsideRoot(root, from); if (gr1) return gr1;
      const gr2 = _guardInsideRoot(root, to); if (gr2) return gr2;
      const r = await _callConnector(root, 'move',
        { from: _resolveRelToRoot(root, from), to: _resolveRelToRoot(root, to) },
        metadata);
      emit({ type: 'canvas.files.tree', reason: 'move', from, to });
      return r;
    },

    async project_refresh_tree() {
      const { root } = await _ctx();
      const r = await _callConnector(root, 'list',
        { path: root.rootPath || '/', recursive: true, maxDepth: 3, maxEntries: 200 },
        metadata);
      try {
        await AiProjectRoot.updateOne({ threadId }, {
          $set: {
            cachedTree: r?.tree || r?.entries || r?.data || r,
            treeRefreshedAt: new Date(),
          },
        });
      } catch { /* non-fatal */ }
      emit({ type: 'canvas.files.tree', reason: 'refresh' });
      return r;
    },

    async project_sync_remote() {
      const { root, cacheRoot } = await _ctx();
      const uploader = async (relativePath, absPath) => {
        // Read local file then upload
        const buf = await fsp.readFile(absPath);
        const content = buf.toString('base64');
        const res = await _callConnector(root, 'write', {
          path: _resolveRelToRoot(root, relativePath),
          content,
          encoding: 'base64',
        }, metadata);
        if (res?.ok === false || res?.error) {
          throw new Error(res.error || 'upload_failed');
        }
        return { etag: res?.etag, mtime: res?.mtime ? new Date(res.mtime) : null };
      };
      const out = await syncDirtyToRemote({ cacheRoot, threadId, uploader });
      emit({ type: 'canvas.files.tree', reason: 'sync', synced: out.synced });
      return { ok: true, ...out };
    },
  };

  return {
    definitions: PROJECT_FS_TOOL_DEFINITIONS,
    canHandle(name) { return name in tools; },
    async execute(name, input) {
      if (!(name in tools)) throw new Error(`Unknown project_fs tool: ${name}`);
      try {
        return await tools[name](input || {});
      } catch (e) {
        return { ok: false, error: e?.message || String(e) };
      }
    },
    async cleanup() { /* no-op; cache is kept across calls */ },
  };
}

module.exports = {
  PROJECT_FS_TOOL_DEFINITIONS,
  createProjectFsExecutor,
  CONNECTOR_MAP,
};
