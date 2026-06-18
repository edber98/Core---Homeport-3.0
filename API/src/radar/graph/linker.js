// Radar — linker : transforme les RadarSnapshot d'un connecteur en graphe
// (RadarEntity + RadarRelation), de façon déterministe et idempotente.
//
// Étage 1 du cerveau. Aucun LLM : on applique les RadarMapping (déclarés ou
// appris). Résolution d'identité par canonicalKey (clés fortes → une entité
// unique cross-connecteurs). Rejouable : re-linker ne duplique jamais.

const { applyMapping } = require('./mapping');
const { isValidCoreType, isValidRelation } = require('./ontology');

/** Charge les mappings applicables à un provider (workspace puis global). */
async function loadMappings(providerKey, workspaceId) {
  const RadarMapping = require('../../db/models/radar-mapping.model');
  const all = await RadarMapping.find({
    providerKey, status: 'active',
    $or: [{ workspaceId }, { workspaceId: null }],
  }).lean();
  // mapping workspace prioritaire sur global pour un même rawEntityType
  const byType = new Map();
  for (const m of all) {
    const cur = byType.get(m.rawEntityType);
    if (!cur || (m.workspaceId && !cur.workspaceId)) byType.set(m.rawEntityType, m);
  }
  return byType; // rawEntityType → mapping
}

/** Upsert d'une entité (dé-dup par canonicalKey, fusion des sources + alias). */
async function upsertEntity(RadarEntity, workspaceId, mapped, now, connectorId, providerKey, aliasKey) {
  const existing = await RadarEntity.findOne({ workspaceId, canonicalKey: mapped.canonicalKey });
  const source = { connectorId, providerKey, externalId: mapped.externalId, rawHash: mapped.rawHash };
  // Clé alternative provider:type:id (pour résoudre les arêtes vers une clé forte)
  const aliases = aliasKey && aliasKey !== mapped.canonicalKey ? [aliasKey] : [];
  if (!existing) {
    await RadarEntity.create({
      workspaceId, coreType: mapped.coreType, subtype: mapped.subtype,
      roles: mapped.roles, canonicalKey: mapped.canonicalKey, aliasKeys: aliases, label: mapped.label,
      attributes: mapped.attributes, sources: [source],
      firstSeenAt: now, lastSeenAt: now, lastChangedAt: now,
    });
    return 'created';
  }
  // Fusion : attributs mis à jour, rôles unionnés, source ajoutée/màj, alias unionnés
  const before = JSON.stringify(existing.attributes || {});
  existing.attributes = { ...existing.attributes, ...mapped.attributes };
  existing.roles = [...new Set([...(existing.roles || []), ...mapped.roles])];
  if (aliases.length) existing.aliasKeys = [...new Set([...(existing.aliasKeys || []), ...aliases])];
  if (mapped.label && !existing.label) existing.label = mapped.label;
  const si = existing.sources.findIndex(s => String(s.connectorId) === String(connectorId) && s.externalId === mapped.externalId);
  if (si >= 0) existing.sources[si].rawHash = mapped.rawHash;
  else existing.sources.push(source);
  existing.lastSeenAt = now;
  if (JSON.stringify(existing.attributes) !== before) existing.lastChangedAt = now;
  existing.markModified('attributes'); existing.markModified('sources');
  await existing.save();
  return 'updated';
}

/** Upsert d'une relation (dé-dup par from/to/type/role). */
async function upsertRelation(RadarRelation, workspaceId, fromKey, rel) {
  if (!isValidRelation(rel.type)) return false;
  await RadarRelation.updateOne(
    { workspaceId, fromKey, toKey: rel.toKey, type: rel.type, role: rel.role || null },
    { $set: { confidence: rel.confidence ?? 1, source: 'rule', evidence: rel.evidence } },
    { upsert: true }
  );
  return true;
}

/**
 * Linke tous les snapshots d'un connecteur dans le graphe.
 * @returns {Promise<{ entities:{created,updated,skipped}, relations:number, errors:string[] }>}
 */
async function linkConnector(connector, { now = new Date(), log = () => {} } = {}) {
  const RadarSnapshot = require('../../db/models/radar-snapshot.model');
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  const stats = { entities: { created: 0, updated: 0, skipped: 0 }, relations: 0, errors: [] };
  const mappings = await loadMappings(connector.providerKey, connector.workspaceId);
  if (!mappings.size) { stats.errors.push(`no_mapping: ${connector.providerKey}`); return stats; }

  const snaps = await RadarSnapshot.find({ connectorId: connector._id, deletedAt: null }).lean();
  for (const snap of snaps) {
    const mapping = mappings.get(snap.entityType);
    if (!mapping) { stats.entities.skipped++; continue; }
    if (!isValidCoreType(mapping.target.coreType)) {
      stats.errors.push(`invalid_coreType: ${mapping.target.coreType}`); continue;
    }
    const mapped = applyMapping(snap.data, mapping);
    if (!mapped) { stats.entities.skipped++; continue; }
    // Clé provider:type:id par laquelle les relations d'autres entités la référencent
    const aliasKey = `${connector.providerKey}:${mapping.rawEntityType}:${mapped.externalId}`;
    try {
      const r = await upsertEntity(RadarEntity, connector.workspaceId, mapped, now, connector._id, connector.providerKey, aliasKey);
      stats.entities[r]++;
      for (const rel of mapped.relations) {
        if (await upsertRelation(RadarRelation, connector.workspaceId, mapped.canonicalKey, rel)) stats.relations++;
      }
    } catch (e) { stats.errors.push(`${snap.entityType}/${snap.entityKey}: ${e.message}`); }
  }
  log(`[radar-linker] ${connector.providerKey}: +${stats.entities.created} entités, ${stats.entities.updated} maj, ${stats.relations} relations`);
  return stats;
}

module.exports = { linkConnector, loadMappings, upsertEntity, upsertRelation };
