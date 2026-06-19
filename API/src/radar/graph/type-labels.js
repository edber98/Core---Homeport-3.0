// Résolution DYNAMIQUE des libellés de sous-types depuis le registre d'ontologie
// (RadarOntologyType). Aucun dictionnaire codé en dur : les libellés viennent de la
// base, et tout nouveau sous-type créé par le LLM (ensureSubtype) y apporte le sien.
// Fallback : le sous-type brut lui-même. C'est ce qui rend l'affichage 100% dynamique.

/** @returns {Promise<(subtype:string)=>string>} fonction de résolution libellé. */
async function loadTypeLabels() {
  const RadarOntologyType = require('../../db/models/radar-ontology-type.model');
  const rows = await RadarOntologyType.find().select('subtype label').lean().catch(() => []);
  const m = new Map();
  for (const r of rows) if (r.subtype) m.set(r.subtype, r.label || r.subtype);
  return (subtype) => m.get(subtype) || subtype || '';
}

module.exports = { loadTypeLabels };
