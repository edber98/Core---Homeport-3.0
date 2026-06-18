// Radar — interrogation du Knowledge Graph (lecture pour missions/superviseur + UI).
// Remplace les re-fouilles des providers : on lit le sous-graphe d'une entité.
//
// Les relations référencent des clés provider:type:id (ex: 'dolibarr:party:74')
// alors qu'une entité à clé forte est stockée sous 'email:...'. On résout via le
// champ aliasKeys. Générique : vaut pour tout provider.

const SELECT = 'canonicalKey aliasKeys coreType subtype roles label attributes';

/** Mappe chaque clé (canonicalKey + aliasKeys) → la canonicalKey de l'entité. Pure. */
function keyIndex(entities) {
  const idx = new Map();
  for (const e of entities) {
    idx.set(e.canonicalKey, e.canonicalKey);
    for (const a of e.aliasKeys || []) idx.set(a, e.canonicalKey);
  }
  return idx;
}

/** Charge les entités référencées par un ensemble de clés (canonical OU alias). */
async function resolveEntities(workspaceId, keys) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  if (!keys.length) return [];
  return RadarEntity.find({
    workspaceId,
    $or: [{ canonicalKey: { $in: keys } }, { aliasKeys: { $in: keys } }],
  }).select(SELECT).lean();
}

/** Sous-graphe d'une entité : ses voisins (entités liées + relations), via alias. */
async function neighborhood(workspaceId, canonicalKey, { depth = 1 } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  const center = await RadarEntity.findOne({ workspaceId, canonicalKey }).select(SELECT).lean();
  if (!center) return null;

  const collected = new Map([[center.canonicalKey, center]]);
  // Toutes les clés (canonical + alias) par lesquelles le centre peut être référencé
  let frontierKeys = [center.canonicalKey, ...(center.aliasKeys || [])];
  const seenCanon = new Set([center.canonicalKey]);
  const relations = [];

  for (let d = 0; d < depth; d++) {
    const rels = await RadarRelation.find({
      workspaceId, $or: [{ fromKey: { $in: frontierKeys } }, { toKey: { $in: frontierKeys } }],
    }).lean();
    if (!rels.length) break;
    // Résoudre les endpoints en entités
    const endpointKeys = new Set();
    for (const r of rels) { endpointKeys.add(r.fromKey); endpointKeys.add(r.toKey); }
    const ents = await resolveEntities(workspaceId, [...endpointKeys]);
    const idx = keyIndex(ents);
    const nextKeys = [];
    for (const r of rels) {
      relations.push({ from: idx.get(r.fromKey) || r.fromKey, to: idx.get(r.toKey) || r.toKey, type: r.type, role: r.role });
    }
    for (const e of ents) {
      if (!seenCanon.has(e.canonicalKey)) {
        seenCanon.add(e.canonicalKey);
        collected.set(e.canonicalKey, e);
        nextKeys.push(e.canonicalKey, ...(e.aliasKeys || []));
      }
    }
    frontierKeys = nextKeys;
    if (!frontierKeys.length) break;
  }
  return { center, entities: [...collected.values()], relations: dedupeRels(relations) };
}

function dedupeRels(rels) {
  const seen = new Set();
  return rels.filter(r => { const k = `${r.from}|${r.to}|${r.type}|${r.role || ''}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Compte des entités par coreType/subtype + relations + sources (vue d'ensemble). */
async function graphSummary(workspaceId) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  const [byType, byRelType, relCount, entCount] = await Promise.all([
    RadarEntity.aggregate([
      { $match: { workspaceId } },
      { $group: { _id: { coreType: '$coreType', subtype: '$subtype' }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
    RadarRelation.aggregate([
      { $match: { workspaceId } },
      { $group: { _id: '$type', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
    RadarRelation.countDocuments({ workspaceId }),
    RadarEntity.countDocuments({ workspaceId }),
  ]);
  return {
    entities: entCount, relations: relCount,
    byType: byType.map(b => ({ coreType: b._id.coreType, subtype: b._id.subtype, count: b.n })),
    byRelationType: byRelType.map(b => ({ type: b._id, count: b.n })),
  };
}

/** Entités d'un type, filtrables par rôle/sous-type/texte. */
async function listEntities(workspaceId, { coreType, subtype, role, q, limit = 100 } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const query = { workspaceId };
  if (coreType) query.coreType = coreType;
  if (subtype) query.subtype = subtype;
  if (role) query.roles = role;
  if (q) query.$or = [{ label: new RegExp(escapeRe(q), 'i') }, { canonicalKey: new RegExp(escapeRe(q), 'i') }];
  return RadarEntity.find(query).limit(Math.min(Number(limit) || 100, 1000)).select(SELECT).lean();
}

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * Données pour la vue graphe : entités (filtrées) + relations entre elles, avec
 * endpoints résolus vers les canonicalKeys. Filtrable par type/rôle.
 */
async function graphData(workspaceId, { coreType, subtype, role, q, limit = 300, includeNeighbors = true } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  const entities = await listEntities(workspaceId, { coreType, subtype, role, q, limit });
  if (!entities.length) return { entities: [], relations: [] };
  let idx = keyIndex(entities);
  const keys = [...idx.keys()];
  // Relations dont AU MOINS un endpoint est dans l'ensemble affiché
  const rels = await RadarRelation.find({
    workspaceId, $or: [{ fromKey: { $in: keys } }, { toKey: { $in: keys } }],
  }).limit(4000).lean();

  // CRUCIAL : on tire les entités VOISINES (l'autre bout des relations) même si
  // elles sont hors du filtre / au-delà de la limite. Sinon, en filtrant par type
  // (ex. emails), les liens vers les clients/factures disparaissent → « rien de relié ».
  let allEntities = entities;
  if (includeNeighbors) {
    const missing = new Set();
    for (const r of rels) { if (!idx.get(r.fromKey)) missing.add(r.fromKey); if (!idx.get(r.toKey)) missing.add(r.toKey); }
    if (missing.size) {
      const neighbors = await RadarEntity.find({
        workspaceId, $or: [{ canonicalKey: { $in: [...missing] } }, { aliasKeys: { $in: [...missing] } }],
      }).select(SELECT).limit(2000).lean();
      const known = new Set(entities.map(e => e.canonicalKey));
      const extra = neighbors.filter(n => !known.has(n.canonicalKey)).map(n => ({ ...n, _neighbor: true }));
      allEntities = [...entities, ...extra];
      idx = keyIndex(allEntities);
    }
  }

  const relations = [];
  for (const r of rels) {
    const from = idx.get(r.fromKey), to = idx.get(r.toKey);
    if (from && to) relations.push({ from, to, type: r.type, role: r.role });
  }
  return { entities: allEntities, relations: dedupeRels(relations) };
}

/** Lignée d'une entité : entité + ses sources (snapshots bruts) + mappings appliqués. */
async function lineage(workspaceId, canonicalKey) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarSnapshot = require('../../db/models/radar-snapshot.model');
  const RadarMapping = require('../../db/models/radar-mapping.model');
  const entity = await RadarEntity.findOne({ workspaceId, canonicalKey }).lean();
  if (!entity) return null;
  const sources = [];
  for (const s of entity.sources || []) {
    const snaps = await RadarSnapshot.find({ connectorId: s.connectorId, entityKey: s.externalId })
      .select('entityType entityKey data contentHash lastChangedAt').limit(3).lean();
    for (const snap of snaps) {
      const mapping = await RadarMapping.findOne({
        providerKey: s.providerKey, rawEntityType: snap.entityType, status: 'active',
        $or: [{ workspaceId }, { workspaceId: null }],
      }).select('rawEntityType target fieldMap valueMap relationRules roleRules learnedBy version').lean();
      sources.push({ providerKey: s.providerKey, snapshot: snap, mapping });
    }
  }
  return { entity, sources };
}

module.exports = { neighborhood, graphSummary, listEntities, graphData, lineage, keyIndex, resolveEntities };
