// Radar — EXPLORATION AGENTIQUE de l'arborescence de fichiers.
//
// Plutôt qu'un balayage aveugle (maxDepth/maxItems fixes qui ratent les dossiers
// profonds OU noient le système sous 10 000 fichiers), on descend INTELLIGEMMENT :
// à chaque dossier, une IA juge s'il vaut la peine d'explorer plus loin. Un dossier
// « Clients / Contrats / Projets » → on descend ; « .cache / node_modules / Corbeille
// / Photos perso » → on s'arrête. Budget borné (nb de dossiers visités) → maîtrisé.
//
// Déterministe pour le pré-filtrage (junk évident) ; LLM pour la zone grise.

const { llmCompleteJSON } = require('./llm');

// dossiers SANS intérêt métier → jamais explorés (pré-filtre gratuit, sans LLM)
const JUNK = /^(\.|node_modules$|\.git$|\.cache$|cache$|tmp$|temp$|corbeille$|trash$|\.trash|thumbnails?$|\.thumbnails|photos?$|images?$|videos?$|musique$|music$|@eaDir$|\.ds_store)/i;
const DOC_EXTS = /\.(pdf|docx?|xlsx?|odt|ods|csv|txt|md|rtf|pptx?)$/i;
const baseName = (p) => String(p || '').replace(/\/+$/, '').split('/').pop() || '/';

/** Enlève le préfixe DAV (/remote.php/dav/files/<user>/) → chemin relatif propre. */
function stripDav(p) {
  let s = decodeURIComponent(String(p || ''));
  const m = /\/remote\.php\/dav\/files\/[^/]+(\/.*)$/.exec(s);
  if (m) s = m[1];
  return s.replace(/\/+$/, '');
}

/** Liste UN niveau via WebDAV PROPFIND Depth 1 (direct — pas de dépendance registre).
 * @returns {{folders:[], files:[]}} */
async function listLevel(path, { credentials }) {
  let utils; try { ({ utils } = require('../plugins/repos/nextcloud/functions/utils')); } catch { return { folders: [], files: [] }; }
  const res = await utils.webdavRequest({ credentials }, path, { method: 'PROPFIND', headers: { Depth: '1' } }).catch(() => null);
  if (!res || !res.ok || !res.data) return { folders: [], files: [] };
  const items = utils.parseWebdavMultistatus(res.data) || [];
  const root = stripDav(path) || '';
  const folders = [], files = [];
  for (const it of items) {
    const raw = it.path || it.href || '';
    const isDir = /\/$/.test(raw) || it.isFolder === true || it.type === 'dir' || it.resourcetype === 'collection';
    const fp = stripDav(raw);
    if (!fp || fp === root) continue;                                  // soi-même
    if (isDir) folders.push({ path: fp, name: baseName(fp) });
    else files.push({ path: fp, name: baseName(fp), size: it.size, mime: it.contentType });
  }
  return { folders, files };
}

/** L'IA décide quels sous-dossiers méritent l'exploration. @returns {Set<path>} */
async function judgeFolders(parentPath, folders, depth, complete) {
  if (!folders.length) return new Set();
  // pré-filtre : junk évident exclu, dossiers manifestement métier inclus sans LLM
  const gray = [], keep = new Set();
  for (const f of folders) {
    if (JUNK.test(f.name)) continue;
    if (/client|fournisseur|projet|contrat|devis|facture|commande|dossier|affaire|chantier|analyse|technique|juridique|compta|rh|2020|2021|2022|2023|2024|2025|2026/i.test(f.name)) { keep.add(f.path); continue; }
    gray.push(f);
  }
  if (gray.length && typeof complete === 'function') {
    const out = await complete(`Tu explores l'arborescence de fichiers d'une entreprise pour en cartographier les documents métier (devis, factures, contrats, projets, analyses techniques). Profondeur actuelle : ${depth}.
Dossier parent : ${parentPath}
Sous-dossiers à juger : ${gray.map(f => f.name).join(' | ')}
Lesquels valent la peine d'explorer (contenu métier potentiel) vs sans intérêt (système, perso, médias) ?
Réponds JSON : {"explore":["nom1","nom2"]}`, { maxTokens: 200 }).catch(() => null);
    const names = new Set((out && Array.isArray(out.explore) ? out.explore : []).map(s => String(s).toLowerCase()));
    for (const f of gray) if (names.has(f.name.toLowerCase())) keep.add(f.path);
  }
  return keep;
}

/**
 * Explore l'arborescence en descendant seulement là où c'est pertinent.
 * @param opts.roots      points de départ (défaut ['/'])
 * @param opts.maxFolders budget de dossiers visités (défaut 80)
 * @param opts.maxDepth   profondeur max de sécurité (défaut 8)
 * @returns {{ files, foldersVisited, explored, skipped }}
 */
async function exploreTree(workspaceId, { roots = ['/'], maxFolders = 80, maxDepth = 8, complete = llmCompleteJSON, deps } = {}) {
  if (!deps) {
    const { registry } = require('../plugins/registry');
    const Credential = require('../db/models/credential.model');
    const { decrypt } = require('../utils/enc');
    const cred = await Credential.findOne({ providerKey: { $in: ['nextcloudFiles', 'nextcloud'] } }).lean();
    deps = { registry, credentials: cred ? decrypt(cred.secret) : null };
  }
  const files = [], explored = [], skipped = [];
  const queue = roots.map(p => ({ path: p.replace(/\/+$/, '') || '/', depth: 0 }));
  let visited = 0; const seen = new Set();
  while (queue.length && visited < maxFolders) {
    const { path, depth } = queue.shift();
    if (seen.has(path)) continue; seen.add(path); visited++;
    const { folders, files: lvlFiles } = await listLevel(path, deps);
    explored.push(path);
    for (const f of lvlFiles) if (DOC_EXTS.test(f.name)) files.push(f);
    if (depth >= maxDepth) continue;
    const keep = await judgeFolders(path, folders, depth + 1, complete);
    for (const f of folders) {
      if (keep.has(f.path)) queue.push({ path: f.path, depth: depth + 1 });
      else skipped.push(f.path);
    }
  }
  return { files, foldersVisited: visited, explored, skipped };
}

module.exports = { exploreTree, listLevel, judgeFolders, JUNK, DOC_EXTS };
