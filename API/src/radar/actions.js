// Radar — moteur d'ACTIONS (Étage 5, S4). Transforme les recommandations en
// opérations RÉELLES : fusionner deux doublons, rattacher un élément à un client,
// ou exécuter une action dans un logiciel via la capacité `write` d'un plugin
// (relance, mise à jour de statut…). Les actions modifiant un logiciel tiers passent
// par une validation (allowWrite) — jamais d'écriture silencieuse non autorisée.

/**
 * Fusionne deux entités du graphe (drop → keep) : sources, alias, rôles, attributs
 * fusionnés ; relations de `drop` ré-aiguillées vers `keep` ; `drop` supprimée.
 * Idempotent. Résout enfin un doublon/double-saisie.
 */
async function mergeEntities(workspaceId, keepKey, dropKey) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');
  if (keepKey === dropKey) return { ok: false, error: 'same_entity' };
  const keep = await RadarEntity.findOne({ workspaceId, canonicalKey: keepKey });
  const drop = await RadarEntity.findOne({ workspaceId, canonicalKey: dropKey });
  if (!keep || !drop) return { ok: false, error: 'entity_not_found' };

  // fusion des champs
  keep.sources = dedupSources([...(keep.sources || []), ...(drop.sources || [])]);
  keep.aliasKeys = [...new Set([...(keep.aliasKeys || []), ...(drop.aliasKeys || []), drop.canonicalKey])];
  keep.roles = [...new Set([...(keep.roles || []), ...(drop.roles || [])])];
  keep.attributes = { ...(drop.attributes || {}), ...(keep.attributes || {}) };
  keep.markModified('sources'); keep.markModified('attributes');
  await keep.save();

  // ré-aiguillage des relations de drop (et ses alias) vers keep
  const dropKeys = [drop.canonicalKey, ...(drop.aliasKeys || [])];
  let rewired = 0;
  for (const field of ['fromKey', 'toKey']) {
    const rels = await RadarRelation.find({ workspaceId, [field]: { $in: dropKeys } });
    for (const r of rels) {
      r[field] = keepKey;
      // évite l'auto-relation et les doublons
      if (r.fromKey === r.toKey) { await RadarRelation.deleteOne({ _id: r._id }); continue; }
      try { await r.save(); rewired++; }
      catch { await RadarRelation.deleteOne({ _id: r._id }); }  // doublon (index unique) → on jette
    }
  }
  await RadarEntity.deleteOne({ _id: drop._id });
  return { ok: true, kept: keepKey, merged: dropKey, rewired };
}

function dedupSources(sources) {
  const seen = new Set(), out = [];
  for (const s of sources) { const k = `${s.connectorId || ''}:${s.providerKey}:${s.externalId || ''}`; if (seen.has(k)) continue; seen.add(k); out.push(s); }
  return out;
}

/** Rattache une entité à un client (applique une suggestion de corrélation). */
async function applyCorrelation(workspaceId, fromKey, toKey, role = 'client') {
  const RadarRelation = require('../db/models/radar-relation.model');
  await RadarRelation.updateOne(
    { workspaceId, fromKey, toKey, type: 'relates_to', role },
    { $set: { confidence: 1, source: 'user', evidence: { via: 'user_confirmation' } } },
    { upsert: true }
  );
  return { ok: true, fromKey, toKey };
}

/**
 * Exécute une action dans un logiciel tiers via une capacité `write` (relance,
 * mise à jour de statut…). allowWrite obligatoire (validation humaine/playbook).
 */
async function executeWrite({ connector, capability, args, allowWrite = false, log }) {
  const { execCapability } = require('./capability-registry');
  return execCapability({ connector, capability, args, allowWrite, log });
}

/**
 * Exécute une ACTION issue d'une recommandation (R4). Dispatch selon le type.
 * Les actions sur le GRAPHE (fusion, rattachement) sont sûres et immédiates.
 * Les actions WRITE vers un logiciel tiers exigent allowWrite (validation).
 * @returns {Promise<{ok, ...}>}
 */
async function executeAction(workspaceId, action = {}) {
  switch (action.type) {
    case 'fusionner':
      if (!action.keepKey || !action.dropKey) return { ok: false, error: 'cles_manquantes' };
      return mergeEntities(workspaceId, action.keepKey, action.dropKey);
    case 'rattacher':
      if (!action.fromKey || !action.toKey) return { ok: false, error: 'cles_manquantes' };
      return applyCorrelation(workspaceId, action.fromKey, action.toKey, action.role || 'client');
    case 'write':
      if (!action.allowWrite) return { ok: false, error: 'write_requires_approval' };
      return executeWrite(action);
    default:
      // Actions non encore automatisées (relance, contrôle…) → renvoyées pour info.
      return { ok: false, error: 'action_non_executable', note: 'Action à traiter manuellement pour l\'instant.', type: action.type };
  }
}

module.exports = { mergeEntities, applyCorrelation, executeWrite, executeAction };
