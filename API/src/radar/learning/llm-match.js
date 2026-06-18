// Radar — arbitrage LLM de correspondance d'entités (predict-or-ask). Le flou
// déterministe tranche les cas clairs ; le LLM n'intervient QUE dans la zone grise
// (« ITBS » vs « IT-BS », « Sté Dupont » vs « Dupont SARL ») où les règles échouent.
// Gardé par RADAR_LLM_MATCH_ENABLED (coûte des tokens). La réponse humaine ensuite
// devient un exemple appris (k-NN) → le LLM est de moins en moins nécessaire.

const { llmCompleteJSON } = require('../llm');

function llmMatchEnabled() {
  return ['1', 'true', 'on', 'yes'].includes(String(process.env.RADAR_LLM_MATCH_ENABLED || '').trim().toLowerCase());
}

/**
 * Le LLM juge si deux entités désignent la MÊME chose réelle.
 * @param {object} a - { label, coreType, subtype?, attributes?, systems? }
 * @param {object} b
 * @param {function} [complete] - injection (tests) ; défaut llmCompleteJSON
 * @returns {Promise<{ same: boolean, confidence: number, reason: string }|null>}
 */
async function areSameEntity(a, b, complete = llmCompleteJSON) {
  const out = await complete(`Tu compares deux enregistrements d'une entreprise pour savoir s'ils désignent LA MÊME chose réelle (même client, même projet, même produit…), saisie en double ou dans deux logiciels avec des libellés différents.

A : ${JSON.stringify({ label: a.label, type: `${a.coreType}${a.subtype ? '/' + a.subtype : ''}`, systèmes: a.systems, attributs: compact(a.attributes) })}
B : ${JSON.stringify({ label: b.label, type: `${b.coreType}${b.subtype ? '/' + b.subtype : ''}`, systèmes: b.systems, attributs: compact(b.attributes) })}

Considère les abréviations, sigles, fautes de frappe, formes juridiques (SARL/SAS), accents, casse. Mais NE confonds PAS deux choses distinctes qui se ressemblent (ex. deux factures de numéros différents, deux projets différents d'un même client).

Réponds UNIQUEMENT en JSON : {"same": true|false, "confidence": 0..1, "reason": "courte justification"}`, { maxTokens: 300 });
  if (!out || typeof out.same !== 'boolean') return null;
  return { same: out.same, confidence: Number(out.confidence) || 0.5, reason: out.reason || '' };
}

function compact(attrs) {
  if (!attrs || typeof attrs !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(attrs).slice(0, 8)) out[k] = typeof v === 'string' ? v.slice(0, 40) : v;
  return out;
}

module.exports = { areSameEntity, llmMatchEnabled };
