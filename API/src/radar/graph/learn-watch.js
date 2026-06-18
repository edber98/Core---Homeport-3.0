// Radar — dérive une watch spec à partir d'un RadarMapping (appris ou déclaré),
// et orchestre l'apprentissage complet de l'observabilité d'un connecteur :
//   échantillonner une capacité → inférer le mapping (LLM, une fois) → dériver la
//   watch → sauvegarder. C'est ce qui rend N'IMPORTE QUEL logiciel connectable
//   sans code (SAP, ERP industriels, etc.). Exécution ensuite 100% déterministe.

const { inferMapping } = require('./learn-mapping');

/**
 * Construit une watch spec déterministe depuis un mapping. Pure.
 * hashFields = champs qui, s'ils changent, doivent émettre un delta : tous les
 * champs bruts mappés + les champs de relations + les champs de rôles.
 */
function buildWatchSpec({ mapping, via }) {
  if (!mapping || !mapping.keyField) return null;
  const fields = new Set();
  for (const rawField of Object.values(mapping.fieldMap || {})) if (rawField) fields.add(String(rawField));
  for (const r of mapping.relationRules || []) if (r.viaField) fields.add(String(r.viaField));
  for (const r of mapping.roleRules || []) if (r.field) fields.add(String(r.field));
  // lignes d'articles : le tableau de lignes doit déclencher un delta s'il change
  // (ajout/retrait d'un produit sur une facture) → sinon les liens articles ratent les màj
  for (const lr of mapping.lineRules || []) if (lr.arrayField) fields.add(String(lr.arrayField));
  // ne pas inclure la clé elle-même (elle ne « change » pas par définition)
  fields.delete(mapping.keyField);
  return {
    entity: mapping.rawEntityType,
    via,
    key: mapping.keyField,
    hashFields: [...fields],
  };
}

/**
 * Apprend l'observabilité d'une entité pour un connecteur : échantillonne la
 * capacité, infère le mapping, dérive la watch. Ne sauvegarde PAS (laisse le
 * caller décider : validation utilisateur puis activation).
 *
 * @param {object} opts
 * @param {object} opts.connector - doc RadarConnector
 * @param {string} opts.capability - capacité de lecture à échantillonner (ex: listContacts)
 * @param {string} opts.entity - rawEntityType cible (ex: 'party')
 * @param {number} [opts.sampleSize=6]
 * @param {function} [opts.execCapability] - injection (tests) ; défaut capability-registry
 * @param {function} [opts.complete] - injection LLM (tests)
 * @returns {Promise<{ ok, mapping?, watch?, valid?, errors?, sampleCount?, error? }>}
 */
async function learnConnectorEntity({ connector, capability, entity, sampleSize = 6, execCapability, complete }) {
  const exec = execCapability || require('../capability-registry').execCapability;
  const res = await exec({ connector, capability, args: { limit: sampleSize } });
  if (!res.ok) return { ok: false, error: `sample_failed: ${res.error}` };

  // Extrait le tableau d'enregistrements (même convention que le collector)
  const result = res.result;
  let samples = Array.isArray(result?.data) ? result.data
    : (Array.isArray(result) ? result : Object.values(result || {}).find(v => Array.isArray(v) && v.length && typeof v[0] === 'object'));
  samples = (samples || []).filter(x => x && typeof x === 'object');
  if (!samples.length) return { ok: false, error: 'no_samples' };

  // Schéma de sortie DÉCLARÉ du connecteur (manifest/NodeTemplate de la capacité) :
  // signal fort fourni au LLM en plus des données réelles.
  const outputSchema = await resolveDeclaredSchema(connector, capability).catch(() => null);

  const inferred = await inferMapping({
    providerKey: connector.providerKey, rawEntityType: entity, samples, outputSchema,
    ...(complete ? { complete } : {}),
  });
  if (!inferred) return { ok: false, error: 'inference_failed' };

  const watch = buildWatchSpec({ mapping: inferred.mapping, via: capability });
  return {
    ok: true,
    mapping: inferred.mapping, watch,
    valid: inferred.valid, errors: inferred.errors,
    doubts: inferred.doubts, needsReview: inferred.needsReview,
    sampleCount: samples.length,
  };
}

/** Récupère le schéma de sortie déclaré du template branché sur cette capacité. */
async function resolveDeclaredSchema(connector, capability) {
  const { resolveCapabilityMapping } = require('../capability-registry');
  const provider = await require('../../db/models/provider.model').findOne({ key: connector.providerKey }).lean().catch(() => null);
  const mapping = resolveCapabilityMapping({
    providerRadar: provider?.radar, capabilityOverrides: connector.capabilityOverrides,
    family: connector.family, capability,
  });
  if (!mapping || !mapping.template) return null;
  const tpl = await require('../../db/models/node-template.model').findOne({ key: mapping.template }).lean().catch(() => null);
  return tpl?.outputHandles?.[0]?.schema || null;
}

/** Sauvegarde un mapping appris (upsert par provider+rawEntityType+workspace). */
async function saveLearnedMapping(mapping, { workspaceId = null, activate = false } = {}) {
  const RadarMapping = require('../../db/models/radar-mapping.model');
  const status = activate ? 'active' : (mapping.status || 'draft');
  await RadarMapping.updateOne(
    { providerKey: mapping.providerKey, rawEntityType: mapping.rawEntityType, workspaceId },
    { $set: { ...mapping, workspaceId, status, learnedBy: 'llm' }, $inc: { version: 0 } },
    { upsert: true }
  );
  return RadarMapping.findOne({ providerKey: mapping.providerKey, rawEntityType: mapping.rawEntityType, workspaceId }).lean();
}

module.exports = { buildWatchSpec, learnConnectorEntity, saveLearnedMapping };
