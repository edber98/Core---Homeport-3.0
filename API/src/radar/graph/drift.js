// Radar — détection de DÉRIVE de schéma (R3.1). Le monde change : un logiciel
// ajoute/renomme un champ. Le checksum des champs sources (stocké sur le mapping)
// le détecte. En cas de dérive → ré-inférence ponctuelle du mapping (LLM, comme à
// l'apprentissage) → nouvelle version. « Ré-apprendre seulement quand le monde change. »

const { schemaChecksum } = require('./mapping');

/** Liste les mappings dont le schéma source a dérivé (vs un snapshot récent). */
async function detectDrift(workspaceId) {
  const RadarMapping = require('../../db/models/radar-mapping.model');
  const RadarSnapshot = require('../../db/models/radar-snapshot.model');
  const mappings = await RadarMapping.find({ status: 'active' }).lean();
  const out = [];
  for (const m of mappings) {
    const snap = await RadarSnapshot.findOne({ workspaceId, entityType: m.rawEntityType, deletedAt: null }).sort({ lastSeenAt: -1 }).lean();
    if (!snap || !snap.data) continue;
    const current = schemaChecksum(snap.data);
    if (m.checksum && current !== m.checksum) {
      out.push({ providerKey: m.providerKey, rawEntityType: m.rawEntityType, oldChecksum: m.checksum, newChecksum: current });
    }
  }
  return out;
}

/**
 * Ré-infère les mappings dérivés (échantillonne + LLM). Met à jour la version.
 * @returns Array<{ rawEntityType, status }>
 */
async function reinferDrifted(connector, { complete } = {}) {
  const drifts = await detectDrift(connector.workspaceId);
  const mine = drifts.filter(d => d.providerKey === connector.providerKey);
  if (!mine.length) return [];
  const { inferMapping } = require('./learn-mapping');
  const { saveLearnedMapping } = require('./learn-watch');
  const RadarSnapshot = require('../../db/models/radar-snapshot.model');
  const RadarMapping = require('../../db/models/radar-mapping.model');
  const out = [];
  for (const d of mine) {
    const snaps = await RadarSnapshot.find({ connectorId: connector._id, entityType: d.rawEntityType, deletedAt: null }).limit(6).lean();
    const samples = snaps.map(s => s.data).filter(Boolean);
    if (!samples.length) { out.push({ rawEntityType: d.rawEntityType, status: 'no_samples' }); continue; }
    const res = await inferMapping({ providerKey: connector.providerKey, rawEntityType: d.rawEntityType, samples, ...(complete ? { complete } : {}) });
    if (res && res.mapping) {
      const cur = await RadarMapping.findOne({ providerKey: connector.providerKey, rawEntityType: d.rawEntityType, workspaceId: connector.workspaceId }).lean();
      await saveLearnedMapping({ ...res.mapping, version: (cur?.version || 1) + 1 }, { workspaceId: connector.workspaceId, activate: res.valid });
      out.push({ rawEntityType: d.rawEntityType, status: res.valid ? 'reinferred' : 'draft', version: (cur?.version || 1) + 1 });
    } else out.push({ rawEntityType: d.rawEntityType, status: 'failed' });
  }
  return out;
}

module.exports = { detectDrift, reinferDrifted };
