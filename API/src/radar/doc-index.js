// Radar — INDEX DOCUMENTAIRE / RAG (zéro infra).
//
// On lit le texte des documents pertinents (via l'explorateur agentique → on ne scanne
// pas 800 fichiers à l'aveugle), on stocke texte + fréquences de termes (TF), et on
// répond à « où est le contrat de X ? » / « trouve l'analyse technique de Y » par un
// TF-IDF cosinus en mémoire. À l'échelle, brancher des embeddings + ChromaDB/pgvector
// derrière searchDocs() sans changer l'appelant (askRadar).

const STOP = new Set('le la les un une des de du et à a au aux en pour par sur dans avec sans ce cette ces son sa ses leur que qui dont est sont the of and to in for on'.split(' '));
function tokenize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter(t => t.length >= 3 && !STOP.has(t));
}
function termFreq(tokens) { const tf = {}; for (const t of tokens) tf[t] = (tf[t] || 0) + 1; return tf; }

/**
 * Indexe les documents : explore l'arbo (agentique), télécharge le texte, stocke TF.
 * @param opts.roots/maxFolders → passés à l'explorateur ; opts.pathPrefix → filtre simple
 * @returns {{ indexed, skipped, totalFiles }}
 */
async function indexDocuments(workspaceId, { roots, maxFolders, pathPrefix = null, useExplorer = true, maxFiles = 200, complete } = {}) {
  const RadarDocChunk = require('../db/models/radar-doc-chunk.model');
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');
  const { downloadText } = require('./doc-queue');
  const { exploreTree } = require('./tree-explorer');
  const { registry } = require('../plugins/registry');
  const Credential = require('../db/models/credential.model');
  const { decrypt } = require('../utils/enc');
  const cred = await Credential.findOne({ providerKey: { $in: ['nextcloudFiles', 'nextcloud'] } }).lean();
  const credentials = cred ? decrypt(cred.secret) : null;
  const fetchText = (p) => downloadText(p, { registry, credentials });

  // 1) liste des fichiers à indexer : soit l'explorateur agentique, soit les Documents du graphe
  let targets = [];
  if (useExplorer) {
    const ex = await exploreTree(workspaceId, { roots: roots || ['/'], maxFolders: maxFolders || 80, complete }).catch(() => null);
    if (ex) targets = ex.files.map(f => ({ path: f.path, label: f.name }));
  }
  if (!targets.length) {     // fallback : Documents déjà dans le graphe
    const q = { workspaceId, coreType: { $in: ['Document', 'Asset'] }, subtype: 'file' };
    if (pathPrefix) q['attributes.path'] = new RegExp('^' + pathPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const docs = await RadarEntity.find(q).select('canonicalKey label attributes').lean();
    targets = docs.map(d => ({ path: d.attributes?.path, label: d.label, key: d.canonicalKey }));
  }
  // On n'indexe QUE des documents bureautiques (pdf/docx/xlsx/txt/md…) — jamais le code,
  // les images, archives, dotfiles de config (.eslintrc, .dockerignore…) qui polluent le RAG.
  const { DOC_EXTS } = require('./tree-explorer');
  const isBusinessDoc = (p, label) => DOC_EXTS.test(String(p || '')) && !/(^|\/)\.[^/]+$/.test(String(label || p || '')) && !/(^|\/)(node_modules|\.git)\//i.test(String(p || ''));
  targets = targets.filter(t => t.path && isBusinessDoc(t.path, t.label)).slice(0, maxFiles);
  // Nettoie les chunks JUNK déjà indexés (images/code/archives/dotfiles) → RAG propre.
  await RadarDocChunk.deleteMany({ workspaceId, path: { $not: DOC_EXTS } }).catch(() => {});

  let indexed = 0, skipped = 0, graphed = 0;
  for (const t of targets) {
    const text = await fetchText(t.path).catch(() => null);
    if (!text || text.length < 20) { skipped++; continue; }
    const key = t.key || `nextcloudFiles:file:${t.path}`;
    const tf = termFreq(tokenize(`${t.label} ${text}`));
    await RadarDocChunk.updateOne({ workspaceId, entityKey: key },
      { $set: { label: t.label, path: t.path, text: text.slice(0, 6000), tf, nTokens: Object.keys(tf).length } },
      { upsert: true });
    indexed++;
    // upsert dans le GRAPHE (si découvert par l'explorateur, pas déjà ingéré) → ferme la
    // boucle : correlateFilesToDeals + doc-queue peuvent relier ce fichier aux pièces.
    if (!t.key) {
      const parentPath = String(t.path).replace(/\/[^/]+$/, '') || '/';
      const r = await RadarEntity.updateOne({ workspaceId, canonicalKey: key },
        { $set: { coreType: 'Document', subtype: 'file', label: t.label, attributes: { path: t.path, parentPath }, sources: [{ providerKey: 'nextcloudFiles', externalId: t.path }] },
          $setOnInsert: { firstSeenAt: new Date(), lastSeenAt: new Date() } }, { upsert: true }).catch(() => null);
      if (r && r.upsertedCount) graphed++;
      // relation part_of vers le DOSSIER parent → le fichier apparaît DANS son dossier
      // (sinon les dossiers semblent vides dans la mémoire). On crée le dossier si absent.
      const folderKey = `nextcloudFiles:folder:${parentPath}`;
      await RadarEntity.updateOne({ workspaceId, canonicalKey: folderKey },
        { $set: { coreType: 'Asset', subtype: 'folder', label: parentPath.split('/').pop() || parentPath, attributes: { path: parentPath }, sources: [{ providerKey: 'nextcloudFiles', externalId: parentPath }] },
          $setOnInsert: { firstSeenAt: new Date(), lastSeenAt: new Date() } }, { upsert: true }).catch(() => {});
      await RadarRelation.updateOne({ workspaceId, fromKey: key, toKey: folderKey, type: 'part_of', role: 'folder' },
        { $set: { confidence: 1, source: 'explorer' } }, { upsert: true }).catch(() => {});
    }
  }
  return { indexed, skipped, graphed, totalFiles: targets.length };
}

/**
 * Recherche documentaire (RAG) : « où est le contrat de X ? » → documents classés par
 * pertinence TF-IDF, avec leur EMPLACEMENT (chemin) et un extrait. @returns Array
 */
async function searchDocs(workspaceId, query, { topK = 6 } = {}) {
  const RadarDocChunk = require('../db/models/radar-doc-chunk.model');
  const chunks = await RadarDocChunk.find({ workspaceId }).lean();
  if (!chunks.length) return [];
  const qTok = tokenize(query); if (!qTok.length) return [];

  // IDF sur le corpus
  const N = chunks.length, df = {};
  for (const c of chunks) for (const t of Object.keys(c.tf || {})) df[t] = (df[t] || 0) + 1;
  const idf = (t) => Math.log((N + 1) / ((df[t] || 0) + 1)) + 1;

  const scored = chunks.map(c => {
    const tf = c.tf instanceof Map ? Object.fromEntries(c.tf) : (c.tf || {});
    let score = 0;
    for (const t of qTok) if (tf[t]) score += (1 + Math.log(tf[t])) * idf(t);
    // bonus si le terme apparaît dans le nom/chemin (signal fort de sujet)
    const hay = `${c.label} ${c.path}`.toLowerCase();
    for (const t of qTok) if (hay.includes(t)) score += 2;
    return { c, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, topK);

  return scored.map(({ c, score }) => ({
    entityKey: c.entityKey, label: c.label, path: c.path,
    score: Math.round(score * 10) / 10,
    snippet: (c.text || '').replace(/\s+/g, ' ').trim().slice(0, 240),
  }));
}

module.exports = { indexDocuments, searchDocs, tokenize };
