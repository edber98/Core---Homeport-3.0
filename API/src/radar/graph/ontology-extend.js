// Radar — extension dynamique de l'ontologie. Quand le LLM rencontre un concept
// métier spécifique (centre de formation → session, émargement ; expert-comptable →
// déclaration_tva, liasse ; santé → consultation…), il crée un nouveau SOUS-TYPE
// sous un coreType universel existant. Ajouté au registre RadarOntologyType
// (données, pas code) → l'ontologie s'adapte à CHAQUE métier sans rien recoder.
// Les coreTypes (9) + relations + rôles restent le squelette fermé.

const { isValidCoreType, isKnownSubtype } = require('./ontology');

/**
 * Enregistre un sous-type de domaine s'il est nouveau. @returns {added, key} | null
 * @param {object} opts - { coreType, subtype, label?, category?, source?, workspaceId? }
 */
async function ensureSubtype({ coreType, subtype, label, category, source = 'llm', workspaceId = null }) {
  if (!isValidCoreType(coreType) || !subtype) return null;
  if (isKnownSubtype(coreType, subtype)) return { added: false, key: `${coreType}.${subtype}`.toLowerCase() };
  const RadarOntologyType = require('../../db/models/radar-ontology-type.model');
  const key = `${coreType}.${subtype}`.toLowerCase();
  const existing = await RadarOntologyType.findOne({ key, workspaceId }).lean();
  if (existing) return { added: false, key };
  await RadarOntologyType.create({
    key, coreType, subtype, label: label || subtype, category: category || null,
    source, status: 'active', workspaceId,
  });
  return { added: true, key };
}

module.exports = { ensureSubtype };
