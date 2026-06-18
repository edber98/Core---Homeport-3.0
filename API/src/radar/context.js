// Radar — contexte entreprise : interprétation LLM + accès.
//
// Transforme une description libre (« on est une usine de cartonnage, on produit
// sur commande, beaucoup de maintenance machine ») en structure exploitable par le
// cerveau : secteur, activités, familles radar pertinentes, indicateurs clés. Le
// LLM est appelé UNE fois (à la saisie) ; ensuite tout est stocké.

const { llmCompleteJSON } = require('./llm');
const { FAMILY_KEYS } = require('./families');

/**
 * Interprète une description d'entreprise → structure. LLM (injection en test).
 * @returns {Promise<{sector, activities, suggestedFamilies, keyMetrics, summary}>}
 */
async function interpretContext(description, complete = llmCompleteJSON) {
  if (!description || !String(description).trim()) return null;
  const out = await complete(`Tu analyses l'activité d'une entreprise pour configurer un système de supervision.

## Description de l'entreprise
"${String(description).slice(0, 2000)}"

## Familles de logiciels surveillables
${FAMILY_KEYS.join(', ')} (+ industry pour capteurs/production, payment, marketing, devops…)

## Ta tâche
Déduis la structure métier. Réponds UNIQUEMENT en JSON :
{
 "sector": "un mot-clé court (industrie | expert_comptable | informatique | sante | btp | commerce | services | …)",
 "activities": ["3 à 6 activités clés, ex: production, maintenance, facturation"],
 "suggestedFamilies": ["familles radar pertinentes parmi la liste + industry si capteurs/production"],
 "keyMetrics": ["3 à 5 indicateurs clés du métier, ex: OEE, marge, trésorerie, délai de livraison"],
 "summary": "une phrase résumant l'activité et ce que le radar doit surveiller en priorité"
}`, { maxTokens: 700 });

  if (!out || !out.sector) return null;
  return {
    sector: String(out.sector).toLowerCase().replace(/\s+/g, '_'),
    activities: Array.isArray(out.activities) ? out.activities.slice(0, 8) : [],
    suggestedFamilies: Array.isArray(out.suggestedFamilies) ? out.suggestedFamilies : [],
    keyMetrics: Array.isArray(out.keyMetrics) ? out.keyMetrics.slice(0, 6) : [],
    summary: out.summary || '',
  };
}

async function getContext(workspaceId) {
  const RadarCompanyContext = require('../db/models/radar-company-context.model');
  return RadarCompanyContext.findOne({ workspaceId }).lean();
}

/** Sauve la description + (re)interprète via LLM. */
async function saveContext(workspaceId, description, { complete } = {}) {
  const RadarCompanyContext = require('../db/models/radar-company-context.model');
  const interp = await interpretContext(description, complete || llmCompleteJSON).catch(() => null);
  const set = { description, source: 'user' };
  if (interp) Object.assign(set, interp, { interpretedAt: new Date(), source: 'llm' });
  await RadarCompanyContext.updateOne({ workspaceId }, { $set: set }, { upsert: true });
  return RadarCompanyContext.findOne({ workspaceId }).lean();
}

module.exports = { interpretContext, getContext, saveContext };
