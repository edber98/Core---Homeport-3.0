// Radar — détection de DOUBLONS / double-saisie (Étage 2). La même entité réelle
// saisie dans deux systèmes (ex. un client dans Dolibarr ET dans un CRM, avec un
// nom légèrement différent) que la dé-dup par clé forte n'a pas fusionnée. On les
// repère par similarité de nom + sources distinctes → proposition de fusion/synchro.

const { nameSimilarity } = require('./analytics');

/**
 * Détection de doublons en CASCADE (predict-or-ask) :
 *   sim ≥ threshold (0.82) → doublon sûr (règle, gratuit) ;
 *   grayLow ≤ sim < threshold → ZONE GRISE → le LLM tranche (si activé) ;
 *   sim < grayLow → ignoré.
 * @param opts.useLLM - arbitrage LLM de la zone grise (défaut : RADAR_LLM_MATCH_ENABLED)
 */
async function findDuplicates(workspaceId, { coreTypes = ['Party', 'Project', 'WorkItem', 'Transaction', 'Asset'], threshold = 0.82, grayLow = 0.45, minLabel = 4, useLLM, maxLLM = 25, limit = 25, complete } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const { areSameEntity, llmMatchEnabled } = require('./learning/llm-match');
  const llmOn = useLLM != null ? useLLM : llmMatchEnabled();
  const ents = await RadarEntity.find({ workspaceId, coreType: { $in: coreTypes } })
    .select('canonicalKey label coreType subtype attributes sources').lean();
  const sysOf = (e) => [...new Set((e.sources || []).map(s => s.providerKey))];

  // 1) candidats par similarité de nom (≥ grayLow), dédupliqués
  const candidates = [], seen = new Set();
  for (let i = 0; i < ents.length; i++) {
    for (let j = i + 1; j < ents.length; j++) {
      const a = ents[i], b = ents[j];
      if (a.coreType !== b.coreType) continue;
      if (!a.label || !b.label || a.label.length < minLabel || b.label.length < minLabel) continue;
      const sim = nameSimilarity(a.label, b.label);
      if (sim < grayLow) continue;
      const pairKey = [a.canonicalKey, b.canonicalKey].sort().join('|');
      if (seen.has(pairKey)) continue; seen.add(pairKey);
      candidates.push({ a, b, sim });
    }
  }
  candidates.sort((x, y) => y.sim - x.sim);

  // 2) règle pour les sûrs, LLM pour la zone grise
  const out = []; let llmUsed = 0;
  for (const c of candidates) {
    const { a, b, sim } = c;
    const sa = sysOf(a), sb = sysOf(b);
    const crossSystem = sa.some(s => !sb.includes(s)) || sb.some(s => !sa.includes(s));
    let verified = null, llmReason = null;
    if (sim >= threshold) verified = 'rule';
    else if (llmOn && llmUsed < maxLLM) {
      llmUsed++;
      const v = await areSameEntity({ ...a, systems: sa }, { ...b, systems: sb }, complete).catch(() => null);
      if (v && v.same) { verified = 'llm'; llmReason = v.reason; } else continue;
    } else continue;
    out.push({
      coreType: a.coreType, similarity: Math.round(sim * 100), verified,
      a: { key: a.canonicalKey, label: a.label, systems: sa },
      b: { key: b.canonicalKey, label: b.label, systems: sb },
      crossSystem, score: Math.round(sim * 100) + (crossSystem ? 10 : 0) + (verified === 'llm' ? 5 : 0),
      reason: llmReason || `« ${a.label} » et « ${b.label} » se ressemblent (${Math.round(sim * 100)}%)${crossSystem ? ' et viennent de systèmes différents → double-saisie probable' : ''}.`,
    });
  }
  return out.sort((x, y) => y.score - x.score).slice(0, limit);
}

module.exports = { findDuplicates };
