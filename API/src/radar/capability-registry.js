// Radar — Capability Registry.
//
// Seule porte par laquelle le radar (collecteurs, missions, test wizard) touche
// les providers : famille + capacité → NodeTemplate concret → handler plugin,
// avec credentials déchiffrés injectés via opts (jamais exposés à l'appelant
// au-delà du handler, même pattern que l'engine).
//
// La résolution du mapping est pure (testable sans DB) ; les fonctions exec*
// font les accès Mongo.

const { FAMILIES, normalizeRadarBlocks, capabilityKind } = require('./families');

/**
 * Résout le mapping d'une capacité pour un provider + overrides éventuels.
 * Pure (pas de DB). Priorité : overrides du connecteur > bloc radar du provider.
 *
 * @param {object} opts
 * @param {Array|object} [opts.providerRadar] - bloc(s) radar du Provider
 * @param {object} [opts.capabilityOverrides] - { [capability]: { template, args } } du RadarConnector
 * @param {string} opts.family
 * @param {string} opts.capability
 * @returns {{ template: string, args: object } | null}
 */
function resolveCapabilityMapping({ providerRadar, capabilityOverrides, family, capability }) {
  if (!FAMILIES[family] || !FAMILIES[family].capabilities[capability]) return null;
  const override = capabilityOverrides && capabilityOverrides[capability];
  if (override && override.template) {
    return { template: String(override.template), args: { ...(override.args || {}) } };
  }
  const blocks = normalizeRadarBlocks(providerRadar);
  const block = blocks.find(b => b && b.family === family);
  const spec = block && block.capabilities && block.capabilities[capability];
  if (!spec || !spec.template) return null;
  return { template: String(spec.template), args: { ...(spec.args || {}) } };
}

/** Liste les capacités effectivement disponibles (mappées) pour un provider/famille. Pure. */
function listAvailableCapabilities({ providerRadar, capabilityOverrides, family }) {
  const contract = FAMILIES[family] && FAMILIES[family].capabilities;
  if (!contract) return [];
  return Object.keys(contract)
    .filter(cap => !!resolveCapabilityMapping({ providerRadar, capabilityOverrides, family, capability: cap }))
    .map(cap => ({ capability: cap, kind: contract[cap].kind, description: contract[cap].description }));
}

/** Entrées watch d'un provider pour une famille (collecteurs, phase 2). Pure. */
function listWatchSpecs({ providerRadar, family }) {
  const block = normalizeRadarBlocks(providerRadar).find(b => b && b.family === family);
  return (block && block.watch) || [];
}

/**
 * Exécute une capacité pour un connecteur donné.
 * Lecture seule par défaut : les capacités `write` sont refusées sauf `allowWrite: true`
 * (posé uniquement par la boucle de validation des cards / playbooks autonomes).
 *
 * @param {object} opts
 * @param {object} opts.connector - doc RadarConnector (lean ou hydraté)
 * @param {string} opts.capability
 * @param {object} [opts.args] - arguments fusionnés par-dessus les args par défaut du mapping
 * @param {boolean} [opts.allowWrite=false]
 * @param {function} [opts.log]
 * @returns {Promise<{ ok: boolean, result?: any, error?: string }>}
 */
async function execCapability({ connector, capability, args = {}, allowWrite = false, log } = {}) {
  if (!connector) return { ok: false, error: 'connector_missing' };
  const family = connector.family;
  const kind = capabilityKind(family, capability);
  if (!kind) return { ok: false, error: `capability_unknown: ${family}.${capability}` };
  if (kind === 'write' && !allowWrite) return { ok: false, error: 'write_capability_requires_approval' };

  const Provider = require('../db/models/provider.model');
  const provider = await Provider.findOne({ key: connector.providerKey }).lean();
  if (!provider) return { ok: false, error: `provider_not_found: ${connector.providerKey}` };

  const mapping = resolveCapabilityMapping({
    providerRadar: provider.radar,
    capabilityOverrides: connector.capabilityOverrides,
    family,
    capability,
  });
  if (!mapping) return { ok: false, error: `capability_not_mapped: ${family}.${capability} (provider ${connector.providerKey})` };

  const { registry } = require('../plugins/registry');
  const fn = registry.resolve(mapping.template);
  if (!fn) return { ok: false, error: `handler_not_found: ${mapping.template}` };

  // Credentials déchiffrés — uniquement pour le handler (jamais retournés)
  let credentials = undefined;
  if (connector.credentialId) {
    const Credential = require('../db/models/credential.model');
    const { decrypt } = require('../utils/enc');
    const cred = await Credential.findById(connector.credentialId).lean();
    if (!cred) return { ok: false, error: 'credential_not_found' };
    try { credentials = decrypt(cred.secret); } catch { return { ok: false, error: 'credential_decrypt_failed' }; }
  }

  const inputs = { ...mapping.args, ...args };
  const node = { id: `radar_${connector.id || connector._id || 'cap'}`, model: { template: mapping.template, context: inputs } };
  try {
    const result = await fn(node, { payload: {} }, inputs, { credentials, log: log || (() => {}) });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

/**
 * Exécute la capacité de test du connecteur (wizard / santé) : celle de la
 * famille si le provider la mappe, sinon la PREMIÈRE capacité de lecture
 * disponible (ex: Dolibarr ne mappe pas listOpportunities mais a listQuotes).
 * Retourne un petit échantillon, jamais les credentials.
 */
async function execTestCapability(connector, { log } = {}) {
  const fam = FAMILIES[connector && connector.family];
  if (!fam) return { ok: false, error: `family_unknown: ${connector && connector.family}` };
  const Provider = require('../db/models/provider.model');
  const provider = await Provider.findOne({ key: connector.providerKey }).select('radar').lean();
  const available = listAvailableCapabilities({
    providerRadar: provider && provider.radar,
    capabilityOverrides: connector.capabilityOverrides,
    family: connector.family,
  });
  let capability = fam.testCapability;
  if (!available.find(c => c.capability === capability)) {
    const firstRead = available.find(c => c.kind === 'read');
    if (!firstRead) return { ok: false, error: `no_read_capability_mapped: ${connector.providerKey}/${connector.family}` };
    capability = firstRead.capability;
  }
  const out = await execCapability({ connector, capability, args: { limit: 5 }, log });
  return { ...out, capability };
}

module.exports = {
  resolveCapabilityMapping,
  listAvailableCapabilities,
  listWatchSpecs,
  execCapability,
  execTestCapability,
};
