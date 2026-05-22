// Détecteur de boucle infinie sur les tools.
//
// Si les 3 derniers tours ont appelé EXACTEMENT le même tool avec les mêmes args
// et tous ont échoué → on force l'arrêt. Pattern observé en prod :
//   - LLM qui appelle execute_tool({key:"noop"}) en boucle pour "ne rien faire"
//   - LLM qui retry un tool inexistant 10× de suite
//   - LLM qui spamme un tool dont l'erreur ne change pas
//
// Sans ce garde-fou, on consomme le budget max_loops et le token quota pour rien.

/**
 * Calcule la signature d'un tour de tools (nom + statut + 100 premiers chars du résultat).
 */
function _signatureOf(toolResults) {
  return toolResults
    .map(r => `${r.name}:${r.status}:${(r.content || '').slice(0, 100)}`)
    .join('|');
}

/**
 * Vérifie si on est dans une boucle. Si oui, mute jobContext (recentToolSigs)
 * et retourne true. L'appelant doit alors stopper proprement.
 *
 * @param {object} jobContext - state du job (mute _recentToolSigs)
 * @param {Array} toolResults - résultats du tour courant
 * @returns {boolean} true si boucle détectée
 */
function detectInfiniteLoop(jobContext, toolResults) {
  if (!jobContext || !toolResults?.length) return false;
  const signature = _signatureOf(toolResults);
  jobContext._recentToolSigs = (jobContext._recentToolSigs || []).concat(signature).slice(-3);
  const sigs = jobContext._recentToolSigs;
  const allSame = sigs.length === 3 && sigs.every(s => s === sigs[0]);
  const allFailed = sigs.length === 3 && toolResults.every(r => r.status === 'error');
  return allSame && allFailed;
}

/**
 * Message system injecté quand on détecte une boucle, pour que le LLM comprenne
 * au prochain restart pourquoi on l'a arrêté.
 */
function buildLoopBreakMessage(toolName) {
  return {
    role: 'user',
    content: `[SYSTÈME] Tu as appelé le même tool "${toolName}" 3 fois de suite avec le même résultat d'erreur. C'est une boucle. STOP. Si tu n'as plus rien à faire, réponds juste par du texte (1-2 phrases) pour clore la tâche. Ne rappelle PAS ce tool.`,
  };
}

module.exports = { detectInfiniteLoop, buildLoopBreakMessage };
