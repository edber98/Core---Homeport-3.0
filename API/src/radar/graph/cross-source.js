// Résolution d'identité CROSS-SOURCE : une même entité réelle saisie dans
// PLUSIEURS logiciels (ex. un projet créé après une commande, dans Dolibarr ET
// OpenProject) doit devenir UNE seule entité à plusieurs `sources`.
//
// Pragmatique et prudent (predict-or-ask) :
//   - match FORT (nom très proche, a fortiori même client) → fusion automatique ;
//   - zone grise → SUGGESTION (on ne fusionne pas, on laisse l'humain confirmer) ;
//   - présent dans un seul logiciel → on ne touche à rien.
//
// Réutilise nameSimilarity (fautes de frappe/pluriels) + mergeEntities (recâble
// relations, fusionne sources/alias). Générique : tout coreType/subtype.

const { nameSimilarity } = require('../analytics');
const { mergeEntities } = require('../actions');

function providerOf(entity) {
  const p = entity.sources && entity.sources[0] && entity.sources[0].providerKey;
  return p || String(entity.canonicalKey || '').split(':')[0] || 'inconnu';
}

/**
 * Unifie les entités d'un type présentes dans plusieurs logiciels.
 * @param {object} opts
 * @param {string} [opts.coreType='Project'] @param {string} [opts.subtype='project']
 * @param {number} [opts.strong=0.82]  seuil de fusion automatique
 * @param {number} [opts.gray=0.62]    seuil de suggestion (gray..strong)
 * @param {boolean} [opts.apply=true]   false = dry-run (ne fusionne pas)
 * @returns {Promise<{ merged, suggestions, scanned }>}
 */
async function resolveCrossSource(workspaceId, { coreType = 'Project', subtype = 'project', strong = 0.82, strongWithClient = 0.75, gray = 0.62, apply = true, log = () => {} } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  const ents = await RadarEntity.find({ workspaceId, coreType, ...(subtype ? { subtype } : {}) })
    .select('canonicalKey aliasKeys label sources').lean();
  if (ents.length < 2) return { merged: 0, suggestions: [], scanned: ents.length };

  // client (Party) rattaché à chaque entité — un client commun renforce le match
  const keys = new Set();
  for (const e of ents) { keys.add(e.canonicalKey); for (const a of e.aliasKeys || []) keys.add(a); }
  const rels = await RadarRelation.find({ workspaceId, type: { $in: ['party_of', 'relates_to'] } }).select('fromKey toKey').lean();
  const ownerOf = new Map();
  const keyToCanon = new Map();
  for (const e of ents) { keyToCanon.set(e.canonicalKey, e.canonicalKey); for (const a of e.aliasKeys || []) keyToCanon.set(a, e.canonicalKey); }
  for (const r of rels) {
    const canon = keyToCanon.get(r.fromKey);
    if (canon && !ownerOf.has(canon)) ownerOf.set(canon, r.toKey);   // 1er client trouvé
  }

  // paires cross-source uniquement (providers différents)
  const merged = [];
  const suggestions = [];
  const gone = new Set();   // entités déjà fusionnées (ne pas réutiliser)
  for (let i = 0; i < ents.length; i++) {
    for (let j = i + 1; j < ents.length; j++) {
      const a = ents[i], b = ents[j];
      if (gone.has(a.canonicalKey) || gone.has(b.canonicalKey)) continue;
      if (providerOf(a) === providerOf(b)) continue;                 // même logiciel → pas cross-source
      let sim = nameSimilarity(a.label, b.label);
      const sameClient = ownerOf.get(a.canonicalKey) && ownerOf.get(a.canonicalKey) === ownerOf.get(b.canonicalKey);
      if (sameClient) sim = Math.min(1, sim + 0.15);                 // bonus client commun
      if (sim < gray) continue;
      // on garde l'entité au plus de sources, sinon Dolibarr (vérité de gestion), sinon a
      const keep = (b.sources?.length || 0) > (a.sources?.length || 0) ? b
        : providerOf(b) === 'dolibarr' && providerOf(a) !== 'dolibarr' ? b : a;
      const drop = keep === a ? b : a;
      // Match FORT : nom très proche, OU client commun + recouvrement de nom correct
      // (le client partagé est une preuve forte → on tolère un nom moins identique).
      const isStrong = sim >= strong || (sameClient && sim >= strongWithClient);
      if (isStrong) {
        if (apply) { await mergeEntities(workspaceId, keep.canonicalKey, drop.canonicalKey).catch(() => {}); }
        gone.add(drop.canonicalKey);
        merged.push({ keep: keep.canonicalKey, drop: drop.canonicalKey, label: keep.label, similarity: Math.round(sim * 100), sameClient: !!sameClient });
      } else {
        suggestions.push({ a: a.canonicalKey, b: b.canonicalKey, labels: [a.label, b.label], similarity: Math.round(sim * 100), sameClient: !!sameClient });
      }
    }
  }
  log(`[cross-source] ${coreType}.${subtype || ''}: ${merged.length} fusions, ${suggestions.length} suggestions`);
  return { merged: merged.length, mergedDetail: merged, suggestions, scanned: ents.length };
}

module.exports = { resolveCrossSource, providerOf };
