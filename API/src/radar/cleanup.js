// Radar — purge en cascade des données dérivées d'un connecteur.
//
// La mémoire (snapshots, deltas, entités, relations) est DÉRIVÉE d'un connecteur.
// Supprimer un connecteur doit donc nettoyer ce qu'il a produit : sinon on garde
// des entités orphelines. Une entité vue par PLUSIEURS connecteurs n'est pas
// supprimée — on retire seulement la source du connecteur en question ; elle ne
// disparaît que si elle n'a plus aucune source.

/**
 * Purge tout ce qu'un connecteur a produit. Idempotent.
 * @returns {Promise<{ snapshots, deltas, entitiesRemoved, entitiesDetached, relations }>}
 */
async function purgeConnectorData(connector) {
  const RadarSnapshot = require('../db/models/radar-snapshot.model');
  const RadarDelta = require('../db/models/radar-delta.model');
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');

  const wsId = connector.workspaceId;
  const cid = connector._id;
  const out = { snapshots: 0, deltas: 0, entitiesRemoved: 0, entitiesDetached: 0, relations: 0 };

  out.snapshots = (await RadarSnapshot.deleteMany({ connectorId: cid })).deletedCount || 0;
  out.deltas = (await RadarDelta.deleteMany({ connectorId: cid })).deletedCount || 0;

  // Entités issues (au moins en partie) de ce connecteur
  const ents = await RadarEntity.find({ workspaceId: wsId, 'sources.connectorId': cid });
  const removedKeys = [];
  for (const e of ents) {
    const before = (e.sources || []).length;
    e.sources = (e.sources || []).filter(s => String(s.connectorId) !== String(cid));
    if (!e.sources.length) {
      removedKeys.push(e.canonicalKey, ...(e.aliasKeys || []));
      await RadarEntity.deleteOne({ _id: e._id });
      out.entitiesRemoved++;
    } else if (e.sources.length !== before) {
      e.markModified('sources'); await e.save();
      out.entitiesDetached++;
    }
  }

  // Relations touchant une entité supprimée (par clé canonique ou alias)
  if (removedKeys.length) {
    const r = await RadarRelation.deleteMany({
      workspaceId: wsId, $or: [{ fromKey: { $in: removedKeys } }, { toKey: { $in: removedKeys } }],
    });
    out.relations = r.deletedCount || 0;
  }
  return out;
}

module.exports = { purgeConnectorData };
