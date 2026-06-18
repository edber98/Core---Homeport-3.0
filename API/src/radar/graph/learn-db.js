// Radar — connecteur BASE DE DONNÉES intelligent (pour les logiciels sans API).
//
// Le Radar se connecte à une base (MongoDB/MariaDB/Postgres…), NAVIGUE ses
// collections/tables, en échantillonne le contenu, et DÉDUIT pour chacune sa
// catégorie ontologique + le mapping (via le LLM, une fois). Les collections où il
// a un DOUTE sont marquées « brouillon » → demande de confirmation à l'utilisateur.
// Exécution ensuite déterministe. C'est le §10bis du plan appliqué aux bases.

const { inferMapping } = require('./learn-mapping');
const { saveLearnedMapping } = require('./learn-watch');

function extractArray(result, field) {
  if (!result) return [];
  if (field && Array.isArray(result[field])) return result[field];
  if (Array.isArray(result.data)) return result.data;
  const arr = Object.values(result).find(v => Array.isArray(v));
  return arr || [];
}

/**
 * Scanne une base : liste les collections, échantillonne, infère la catégorie de
 * chacune. @returns {collections, proposals:[{collection, target?, status, needsConfirmation, sampleCount}]}
 *   status: active (sûr) | draft (à confirmer) | empty | failed
 */
async function scanDatabase(connector, { sampleSize = 8, execCapability, complete } = {}) {
  const exec = execCapability || require('../capability-registry').execCapability;

  const listed = await exec({ connector, capability: 'listCollections', args: {} });
  if (!listed.ok) return { collections: 0, proposals: [], error: `list_failed: ${listed.error}` };
  let collections = extractArray(listed.result, 'collections');
  // tolère un tableau de chaînes OU d'objets {name}
  collections = collections.map(c => (typeof c === 'string' ? c : (c && (c.name || c.collection)))).filter(Boolean);

  const proposals = [];
  for (const coll of collections) {
    const sample = await exec({ connector, capability: 'queryCollection', args: { collection: coll, limit: sampleSize } });
    const docs = extractArray(sample.result, coll).filter(d => d && typeof d === 'object');
    if (!docs.length) { proposals.push({ collection: coll, status: 'empty' }); continue; }
    try {
      const res = await inferMapping({ providerKey: connector.providerKey, rawEntityType: coll, samples: docs, ...(complete ? { complete } : {}) });
      if (!res || !res.mapping) { proposals.push({ collection: coll, status: 'failed' }); continue; }
      // valide → actif ; doute → brouillon (confirmation requise)
      await saveLearnedMapping(res.mapping, { workspaceId: connector.workspaceId, activate: res.valid });
      proposals.push({
        collection: coll, target: res.mapping.target, valid: res.valid,
        status: res.valid ? 'active' : 'draft', needsConfirmation: !res.valid,
        errors: res.errors, sampleCount: docs.length,
      });
    } catch (e) { proposals.push({ collection: coll, status: 'failed', error: e?.message }); }
  }
  return { collections: collections.length, proposals };
}

module.exports = { scanDatabase, extractArray };
