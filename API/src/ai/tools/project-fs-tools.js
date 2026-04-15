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
    description: 'Lit un fichier du projet. Les PDF et images sont retournés comme content blocks multimodaux : tu les LIS DIRECTEMENT via ta vision (bien plus fiable qu\'un parsing regex Python pour factures, contrats, documents scannés). Pour les fichiers texte (code, json, md, csv), le contenu UTF-8 est retourné. Utilise asText:true pour forcer l\'extraction texte d\'un PDF si besoin.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        asText: { type: 'boolean', description: 'Force l\'extraction texte même pour PDF (désactive le mode vision multimodal). Défaut: false.' },
      },
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
    description: `Écrit (ou remplace) un fichier dans le projet.

RÈGLE OBLIGATOIRE — choisis EXACTEMENT un des deux modes :
  • Mode A (binaires : xlsx/docx/pptx/pdf/images/zip) : passer UNIQUEMENT fileId, JAMAIS content. Le fileId vient de execute_code.producedFiles[i].fileId ou generate_document.fileId.
  • Mode B (texte court < 100 Ko : md, json, txt, csv, code) : passer content + contentType, JAMAIS fileId.

NE JAMAIS utiliser content pour des binaires — ça corrompt le fichier (tu obtiendras un Word avec du base64 dedans au lieu d'un vrai xlsx). Si tu as un fileId disponible, utilise-le TOUJOURS même pour du texte.`,
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Chemin cible relatif à la racine projet' },
        fileId: { type: 'string', description: 'REQUIS pour binaires : ID FileRecord retourné par execute_code.producedFiles ou generate_document. Mode exclusif avec content.' },
        content: { type: 'string', description: 'Contenu TEXTE UTF-8 uniquement (jamais pour binaires). Mode exclusif avec fileId. Limite 100 Ko.' },
        contentType: { type: 'string', description: 'Requis avec content. Ex: text/plain, application/json, text/markdown.' },
        syncImmediate: { type: 'boolean', description: 'Pousser vers le distant (défaut: true)' },
      },
      required: ['path'],
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

      const name = p.split('/').filter(Boolean).pop() || 'file';
      const ext = (name.split('.').pop() || '').toLowerCase();
      const mimeMap = {
        pdf: 'application/pdf',
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac',
      };
      const guessedMime = mimeMap[ext];
      const wantMultimodal = input?.asText !== true;
      const isPdfByExt = guessedMime === 'application/pdf';
      const isImageByExt = guessedMime?.startsWith('image/');
      const isAudioByExt = guessedMime?.startsWith('audio/');

      // ── FAST PATH multimodal : PDF/image/audio → download en mémoire, pas de cache disque ──
      if (wantMultimodal && (isPdfByExt || isImageByExt || isAudioByExt)) {
        try {
          const res = await _callConnector(root, 'read', { path: _resolveRelToRoot(root, p) }, metadata);
          if (!res || res.ok === false) {
            return { ok: false, error: `Lecture échouée : ${res?.error || 'unknown'} (status=${res?.status || '?'})` };
          }

          // Helpers pour résoudre différents formats de réponse connecteur
          const { createFilesHelper } = require('../../services/file-storage');
          const filesHelper = createFilesHelper({ workspaceId });
          async function resolveFileRefToBuffer(ref) {
            if (!ref) return null;
            if (typeof ref === 'object' && (ref._type === 'fileRef' || ref.fileId)) {
              const target = typeof ref === 'object' ? (ref.fileId || ref.id) : ref;
              const { stream } = await filesHelper.resolve(ref);
              const chunks = [];
              for await (const c of stream) chunks.push(c);
              return Buffer.concat(chunks);
            }
            return null;
          }

          let buf;
          // 1. fileRef dans res.file (pattern nc_file_get, dropbox_download_file, etc.)
          const fileRef = res.file || res.fileRef || (typeof res.fileId === 'string' ? { fileId: res.fileId } : null);
          if (fileRef && typeof fileRef === 'object') {
            try {
              buf = await resolveFileRefToBuffer(fileRef);
            } catch (e) {
              console.error('[project_read_file] resolveFileRef failed:', e?.message);
            }
          }
          // 2. Fallback : contenu inline (content/data/body/buffer/base64)
          if (!buf) {
            const rawPayload = res.content ?? res.data ?? res.body ?? res.buffer ?? res.base64;
            if (Buffer.isBuffer(rawPayload)) {
              buf = rawPayload;
            } else if (rawPayload && typeof rawPayload === 'object' && rawPayload.type === 'Buffer' && Array.isArray(rawPayload.data)) {
              buf = Buffer.from(rawPayload.data);
            } else if (typeof rawPayload === 'string') {
              const looksBase64 = /^[A-Za-z0-9+/=\r\n]+$/.test(rawPayload.slice(0, 200));
              buf = looksBase64 ? Buffer.from(rawPayload, 'base64') : Buffer.from(rawPayload, 'utf8');
            }
          }
          if (!buf) {
            const keysLog = res && typeof res === 'object' ? Object.keys(res).join(',') : typeof res;
            console.error('[project_read_file] Payload non reconnu, keys:', keysLog);
            return { ok: false, error: `Contenu non récupérable depuis le connecteur (clés reçues: ${keysLog}).` };
          }
          // Validation magic bytes PDF
          const isPdf = isPdfByExt || (buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46);
          const mime = isPdf ? 'application/pdf' : guessedMime;
          if (isPdf && buf.length > 32 * 1024 * 1024) {
            return { ok: false, error: 'PDF trop volumineux pour analyse multimodale (>32 MB). Relance avec asText:true.' };
          }
          if (isAudioByExt && buf.length > 25 * 1024 * 1024) {
            return { ok: false, error: 'Audio trop volumineux (>25 MB) pour analyse directe.' };
          }
          if (isImageByExt && buf.length > 10 * 1024 * 1024) {
            return { ok: false, error: 'Image trop volumineuse (>10 MB).' };
          }
          const base64 = buf.toString('base64');
          const blockType = isPdf ? 'document' : (isAudioByExt ? 'audio' : 'image');
          return {
            ok: true,
            path: p,
            mimeType: mime,
            size: buf.length,
            _contentBlocks: [{
              type: blockType,
              source: { type: 'base64', media_type: mime, data: base64 },
              name,
            }],
            message: isPdf
              ? `PDF "${name}" chargé. Analyse-le directement via ta vision (numéros, dates, montants, fournisseurs, lignes).`
              : (isAudioByExt ? `Audio "${name}" chargé. Analyse/transcris-le directement.` : `Image "${name}" chargée.`),
          };
        } catch (e) {
          return { ok: false, error: `Lecture multimodale échouée : ${e?.message || e}` };
        }
      }

      // ── Flow normal : texte ou asText:true → passe par le cache disque ──
      const downloader = async (absPath) => {
        const res = await _callConnector(root, 'read',
          { path: _resolveRelToRoot(root, p), writeTo: absPath }, metadata);
        if (res && res.ok === false) {
          throw new Error(`download_failed: ${res.error || 'unknown'} (status=${res.status || '?'})`);
        }
        await fsp.mkdir(path.dirname(absPath), { recursive: true });

        // 1. fileRef retourné par le connecteur (pattern nc_file_get etc.)
        const fileRef = res?.file || res?.fileRef;
        const fileIdOnly = !fileRef && typeof res?.fileId === 'string' ? res.fileId : null;
        if ((fileRef || fileIdOnly) && !fs.existsSync(absPath)) {
          try {
            const { createFilesHelper } = require('../../services/file-storage');
            const files = createFilesHelper({ workspaceId });
            const { stream } = await files.resolve(fileRef || fileIdOnly);
            await new Promise((resolve, reject) => {
              const ws = fs.createWriteStream(absPath);
              stream.pipe(ws);
              ws.on('finish', resolve);
              ws.on('error', reject);
              stream.on('error', reject);
            });
            return { size: res?.size, contentType: res?.contentType, etag: res?.etag };
          } catch (e) {
            throw new Error(`project_read_file: download via fileRef failed (${e?.message})`);
          }
        }

        // 2. Contenu inline (content/data/body)
        const rawPayload = res?.content ?? res?.data ?? res?.body;
        const encoding = res?.encoding || (res?.rawResponse ? 'base64' : null);
        if (rawPayload !== undefined && !fs.existsSync(absPath)) {
          const isBase64Guess = encoding === 'base64'
            || (typeof rawPayload === 'string' && /^[A-Za-z0-9+/=\r\n]+$/.test(rawPayload.slice(0, 200)) && rawPayload.length > 100);
          const buf = isBase64Guess
            ? Buffer.from(rawPayload, 'base64')
            : (Buffer.isBuffer(rawPayload) ? rawPayload : Buffer.from(String(rawPayload), 'utf8'));
          await fsp.writeFile(absPath, buf);
        }
        return { size: res?.size, contentType: res?.contentType, etag: res?.etag };
      };

      try {
        const { path: abs } = await ensureFileLocal({
          cacheRoot, threadId, workspaceId, relativePath: p, downloader,
        });
        const buf = await fsp.readFile(abs);
        // Mode texte uniquement ici (multimodal déjà retourné plus haut via fast-path)
        const isText = buf.length === 0 || buf.slice(0, Math.min(buf.length, 8000)).every(b =>
          b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 128);
        return isText
          ? { ok: true, path: p, content: buf.toString('utf8'), encoding: 'utf8', size: buf.length }
          : { ok: true, path: p, content: buf.toString('base64'), encoding: 'base64', size: buf.length, mimeType: guessedMime };
      } catch (e) {
        return { ok: false, error: e?.message || String(e) };
      }
    },

    async project_read_batch(input) {
      const { root } = await _ctx();
      const rawPaths = Array.isArray(input?.paths) ? input.paths : [];
      const paths = rawPaths.map(p => _stripConnectorPrefix(root.connectorType, p));
      const maxTotal = Math.max(1, Math.min(input?.maxTotalBytes || 2 * 1024 * 1024, 10 * 1024 * 1024));
      const multimodalLimit = Math.max(1, Math.min(input?.maxMultimodalFiles || 5, 20));
      const results = [];
      const _contentBlocks = [];
      let used = 0;
      let multimodalCount = 0;
      for (const p of paths) {
        if (used >= maxTotal && multimodalCount >= multimodalLimit) {
          results.push({ path: p, ok: false, skipped: 'budget_exceeded' });
          continue;
        }
        const r = await tools.project_read_file({ path: p });
        if (!r?.ok) {
          results.push({ path: p, ok: false, error: r?.error || 'read_failed' });
          continue;
        }
        // Cas multimodal : PDF / image / audio — on renvoie les _contentBlocks
        // au LLM agrégés avec le batch pour qu'il puisse les lire en vision.
        if (Array.isArray(r._contentBlocks) && r._contentBlocks.length) {
          if (multimodalCount >= multimodalLimit) {
            results.push({ path: p, ok: false, skipped: `multimodal_limit (${multimodalLimit})` });
            continue;
          }
          _contentBlocks.push(...r._contentBlocks);
          multimodalCount += 1;
          used += r.size || 0;
          results.push({
            path: p, ok: true, mimeType: r.mimeType, size: r.size,
            multimodalAttached: true, message: r.message,
          });
          continue;
        }
        // Cas texte classique
        if (r.content != null) {
          used += (r.size || r.content.length || 0);
          results.push(r);
        } else {
          results.push({ path: p, ok: false, error: 'no_content' });
        }
      }
      const out = { ok: true, results, totalBytes: used, multimodalCount };
      if (_contentBlocks.length) out._contentBlocks = _contentBlocks;
      return out;
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

      // ── Mode fileId : transfert binaire efficace via FileRecord (comme openai_vision etc.) ──
      if (input.fileId) {
        // Copie le fichier depuis FileRecord vers scratch local (pour cache cohérent)
        try {
          const { createFilesHelper } = require('../../services/file-storage');
          const files = createFilesHelper({ workspaceId });
          const { scratch } = _locPaths(cacheRoot, p);
          await fsp.mkdir(path.dirname(scratch), { recursive: true });
          const { stream } = await files.resolve(input.fileId);
          await new Promise((resolve, reject) => {
            const ws = fs.createWriteStream(scratch);
            stream.pipe(ws);
            ws.on('finish', resolve);
            ws.on('error', reject);
            stream.on('error', reject);
          });
          const stat = await fsp.stat(scratch);
          await markDirty({ cacheRoot, threadId, workspaceId, relativePath: p });

          // Upload distant en passant le fileId — tool-executor le convertit en fileRef
          // et le handler du connecteur (nc_file_upload etc.) stream le binaire.
          const syncImmediate = input.syncImmediate !== false;
          let uploadResult = null;
          if (syncImmediate) {
            const remotePath = _resolveRelToRoot(root, p);
            uploadResult = await _callConnector(root, 'write', {
              path: remotePath,
              file: input.fileId,  // ← champ "file" type:'file' dans manifest → conversion auto
            }, metadata);
            if (uploadResult?.ok !== false) {
              // Clean: déplace scratch → mirror, unset dirty
              const { mirror } = _locPaths(cacheRoot, p);
              await fsp.mkdir(path.dirname(mirror), { recursive: true });
              await fsp.rename(scratch, mirror).catch(() => fsp.copyFile(scratch, mirror));
              try { await fsp.unlink(scratch); } catch {}
            }
          }
          emit({ type: 'canvas.files.tree', reason: 'write', path: p });
          return {
            ok: uploadResult ? (uploadResult.ok !== false) : true,
            path: p,
            size: stat.size,
            dirty: !syncImmediate,
            sync: uploadResult,
            mode: 'fileId',
          };
        } catch (e) {
          return { ok: false, error: `Erreur transfert fileId: ${e?.message || e}` };
        }
      }

      // ── Mode content (texte ou base64 court) — rétrocompat ──
      if (typeof input.content !== 'string' || !input.content) {
        return { ok: false, error: 'project_write_file requiert soit fileId (binaires), soit content (texte). Reçu ni l\'un ni l\'autre.' };
      }
      // Garde-fou : si path suggère un binaire (xlsx/docx/pptx/pdf/zip/png/etc.)
      // ET content > 100 Ko, on refuse — l'agent doit utiliser fileId
      const ext = (p.split('.').pop() || '').toLowerCase();
      const binaryExts = new Set(['xlsx','xls','docx','doc','pptx','ppt','pdf','zip','gz','tar','png','jpg','jpeg','gif','webp','mp3','mp4','wav']);
      if (binaryExts.has(ext) && input.content.length > 100_000) {
        return {
          ok: false,
          error: `Fichier ${ext.toUpperCase()} > 100 Ko : ne passe pas par content (ça va corrompre le fichier). Récupère le fileId depuis execute_code.producedFiles ou generate_document.fileId, puis rappelle project_write_file({path, fileId}).`,
        };
      }
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
      return { ok: true, path: p, size: buf.length, dirty: !input.syncImmediate, sync: syncResult, mode: 'content' };
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

    async project_refresh_tree(input = {}) {
      const { root } = await _ctx();
      const maxDepth = Math.max(1, Math.min(input.maxDepth || 3, 10));
      const maxEntries = Math.max(1, Math.min(input.maxEntries || 300, 2000));

      // Walk BFS : le connecteur list ne fait que Depth:1, on récursive nous-mêmes
      const allEntries = [];
      const queue = [{ relPath: '/', depth: 0 }];
      const seen = new Set(['/']);
      let truncated = false;

      while (queue.length && allEntries.length < maxEntries) {
        const { relPath, depth } = queue.shift();
        const rawRes = await _callConnector(root, 'list',
          { path: _resolveRelToRoot(root, relPath) }, metadata);
        const normalized = _normalizeListResult(root, rawRes, { includeSelf: false });
        if (!normalized || normalized.ok === false) continue;
        for (const e of (normalized.entries || [])) {
          if (allEntries.length >= maxEntries) { truncated = true; break; }
          allEntries.push(e);
          if (e.type === 'directory' && depth + 1 < maxDepth && !seen.has(e.path)) {
            seen.add(e.path);
            queue.push({ relPath: e.path, depth: depth + 1 });
          }
        }
      }

      // Persiste la cachedTree dans AiProjectRoot pour usage contextuel (prompt)
      try {
        await AiProjectRoot.updateOne({ threadId }, {
          $set: { cachedTree: allEntries, treeRefreshedAt: new Date() },
        });
      } catch { /* non-fatal */ }

      emit({ type: 'canvas.files.tree', reason: 'refresh' });
      return { ok: true, totalCount: allEntries.length, entries: allEntries, truncated };
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
