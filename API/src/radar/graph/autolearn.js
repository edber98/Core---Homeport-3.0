// Radar — auto-apprentissage des mappings manquants (zéro-hardcode).
//
// Quand un connecteur observe un type d'enregistrement SANS RadarMapping, on
// échantillonne quelques snapshots, le LLM infère le mapping (une fois), on le
// sauvegarde, puis le linker l'applique — déterministe à vie. C'est le §10bis du
// plan cerveau : « le LLM trouve comment ça marche puis sauvegarde la méthode ».
//
// Gardé par RADAR_AUTOLEARN_ENABLED (consomme du LLM). Best-effort.

const { inferMapping } = require('./learn-mapping');
const { saveLearnedMapping } = require('./learn-watch');

function autolearnEnabled() {
  return ['1', 'true', 'on', 'yes'].includes(String(process.env.RADAR_AUTOLEARN_ENABLED || '').trim().toLowerCase());
}

/**
 * Apprend les mappings manquants d'un connecteur depuis ses snapshots.
 * @param {object} connector - doc RadarConnector
 * @param {object} [opts] - { complete (LLM injection tests), sampleSize, log }
 * @returns {Promise<Array<{rawEntityType, valid, error?}>>}
 */
async function autoLearnConnector(connector, { complete, sampleSize = 6, log = () => {} } = {}) {
  const RadarSnapshot = require('../../db/models/radar-snapshot.model');
  const RadarMapping = require('../../db/models/radar-mapping.model');

  // types déjà couverts (workspace + global)
  const existing = await RadarMapping.find({
    providerKey: connector.providerKey, status: { $ne: 'deprecated' },
    $or: [{ workspaceId: connector.workspaceId }, { workspaceId: null }],
  }).select('rawEntityType').lean();
  const mapped = new Set(existing.map(m => m.rawEntityType));

  const types = await RadarSnapshot.distinct('entityType', { connectorId: connector._id, deletedAt: null });
  const out = [];
  for (const rawType of types) {
    if (mapped.has(rawType)) continue;
    const snaps = await RadarSnapshot.find({ connectorId: connector._id, entityType: rawType, deletedAt: null }).limit(sampleSize).lean();
    const samples = snaps.map(s => s.data).filter(Boolean);
    if (!samples.length) continue;
    try {
      const res = await inferMapping({ providerKey: connector.providerKey, rawEntityType: rawType, samples, ...(complete ? { complete } : {}) });
      if (!res || !res.mapping) { out.push({ rawEntityType: rawType, valid: false, error: 'inference_failed' }); continue; }
      // activé seulement si valide ; sinon brouillon (proposé pour validation humaine)
      await saveLearnedMapping(res.mapping, { workspaceId: connector.workspaceId, activate: res.valid });
      out.push({ rawEntityType: rawType, valid: res.valid, target: res.mapping.target });
      log(`[radar-autolearn] ${connector.providerKey}/${rawType} → ${res.mapping.target.coreType}.${res.mapping.target.subtype || ''} (${res.valid ? 'actif' : 'brouillon'})`);
    } catch (e) {
      out.push({ rawEntityType: rawType, valid: false, error: e?.message || String(e) });
    }
  }
  return out;
}

module.exports = { autoLearnConnector, autolearnEnabled };
