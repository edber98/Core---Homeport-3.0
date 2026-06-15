// Radar — facturation des appels IA (même circuit Panel que l'assistant).
//
// Tous les appels LLM du radar sont débités via panel-credits :
//   - missions        → déjà couvertes par runHarness (checkBeforeCall + debitTurn) ;
//   - superviseur     → checkBeforeCall avant la passe, débit de l'usage final ;
//   - filtre étage 2  → débit par workspace (le batch est découpé par workspace) ;
//   - critique mission → débit au workspace de la mission.
// Le payeur est l'acteur système du workspace (owner). insufficient_credits →
// l'appel radar est bloqué, comme dans l'assistant.

const panelCredits = require('../services/panel-credits/cjs-wrapper');
const { resolveSystemActor } = require('./actor');

/** Résout le payeur (owner du workspace). Null si billing désactivé ou pas d'acteur. */
async function resolveBillingFor(workspaceId, kind) {
  if (!panelCredits.isEnabled() || !workspaceId) return null;
  const actor = await resolveSystemActor(workspaceId);
  if (!actor) return null;
  return { userId: actor.userId, workspaceId: String(workspaceId), kind };
}

/** Pré-check (throw si modèle inconnu / solde insuffisant). */
async function checkBeforeRadarCall({ billing, provider, model, estimatedInputTokens = 2000, estimatedOutputTokens = 800 }) {
  if (!billing || !panelCredits.isEnabled()) return;
  await panelCredits.checkBeforeCall({ userId: billing.userId, provider, model, estimatedInputTokens, estimatedOutputTokens });
}

/**
 * Débite l'usage réel d'un appel radar. Throw sur insufficient_credits / quota
 * (le radar doit s'arrêter) ; silencieux sur erreur réseau Panel (best-effort,
 * comme l'assistant).
 */
async function debitRadarUsage({ billing, provider, model, usage, iter }) {
  if (!billing || !panelCredits.isEnabled() || !usage) return null;
  return panelCredits.debitTurn({
    userId: billing.userId,
    conversationId: `radar:${billing.kind}:${billing.workspaceId}`,
    iter: iter ?? Date.now(),
    provider, model, usage,
    context: { radar: billing.kind, workspaceId: billing.workspaceId },
  });
}

module.exports = { resolveBillingFor, checkBeforeRadarCall, debitRadarUsage, isBillingEnabled: () => panelCredits.isEnabled() };
