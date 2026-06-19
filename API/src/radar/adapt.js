// Passe ADAPTATIVE (R3) — le cerveau s'auto-met à jour après chaque observation.
//
// 1. Ré-entraîne les modèles statistiques sur les données fraîches (le modèle de
//    risque d'impayé suit l'évolution réelle, pas un instantané figé).
// 2. Détecte la DÉRIVE DE SCHÉMA (un logiciel ajoute/retire un champ) et ré-infère
//    le mapping concerné par LLM → le cerveau reste connecté sans intervention.
// 3. Re-type les entités (segments/natures) si de nouvelles sont apparues.
//
// Idempotent, sûr à rejouer. Appelé après une synchro (collector→linker) ou à la demande.

/**
 * @param {object} opts
 * @param {boolean} [opts.reinfer=false] - autorise la ré-inférence LLM des mappings dérivés
 * @param {boolean} [opts.reclassify=true] - re-type les entités
 * @returns {Promise<{model, drift, drifted, reclassified}>}
 */
async function runAdaptivePass(workspaceId, { reinfer = false, reclassify = true, log = () => {} } = {}) {
  const out = { model: null, drift: [], drifted: 0, reclassified: 0 };

  // 1. ré-entraînement du modèle de risque d'impayé
  try {
    const { trainPaymentRisk } = require('./learning/payment-risk');
    out.model = await trainPaymentRisk(workspaceId);
  } catch (e) { log(`[adapt] modèle: ${e.message}`); }

  // 2. détection de dérive de schéma
  try {
    const { detectDrift, reinferDrifted } = require('./graph/drift');
    out.drift = await detectDrift(workspaceId);
    if (reinfer && out.drift.length) {
      const RadarConnector = require('../db/models/radar-connector.model');
      const connectors = await RadarConnector.find({ workspaceId }).lean().catch(() => []);
      for (const c of connectors) {
        const r = await reinferDrifted(c).catch(() => null);
        if (r && r.reinferred) out.drifted += r.reinferred;
      }
    }
  } catch (e) { log(`[adapt] dérive: ${e.message}`); }

  // 3. re-typage sémantique (nouvelles entités)
  if (reclassify) {
    try { const { classifyWorkspace } = require('./graph/classify'); const c = await classifyWorkspace(workspaceId, { log }); out.reclassified = c.classified; }
    catch (e) { log(`[adapt] typage: ${e.message}`); }
  }

  log(`[adapt] modèle=${out.model?.status || '?'} · dérive=${out.drift.length} · ré-inférés=${out.drifted} · re-typés=${out.reclassified}`);
  return out;
}

module.exports = { runAdaptivePass };
