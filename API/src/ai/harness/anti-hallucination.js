// Garde anti-hallucination : empêche le LLM parent de produire un livrable
// alors qu'il vient de déléguer la production à un sous-agent async.
//
// Symptôme observé en prod : le LLM appelle spawn_subagent(async) ET display_file
// dans le MÊME tour. Le subagent n'a pas encore tourné → il n'y a aucun fichier
// à afficher. Le LLM hallucine donc le contenu.
//
// Règle : si pendingToolCalls contient un spawn async (async:true ou depends_on),
// on bloque les FINALIZER_TOOLS du même tour. Le subagent doit produire le
// livrable lui-même.
//
// EXCEPTION : si le finalizer cible un widgetId qui existe déjà dans le thread,
// c'est un UPDATE (pas une hallucination) → on laisse passer.

const AiMessage = require('../../db/models/ai-message.model');

const FINALIZER_TOOLS = new Set([
  'render_structured', 'display_file', 'display_image',
  'render_interactive_canvas', 'generate_diagram', 'generate_document',
  'canvas_html',
]);

function _hasAsyncSpawn(pendingToolCalls) {
  return pendingToolCalls.some(tc =>
    tc.name === 'spawn_subagent'
    && (tc.input?.async === true || (Array.isArray(tc.input?.depends_on) && tc.input.depends_on.length > 0))
  );
}

/**
 * Détermine quels tool IDs doivent être bloqués pour anti-hallucination.
 *
 * @param {Array} pendingToolCalls
 * @param {string} threadId
 * @param {object} logger - harness/logger.js
 * @returns {Promise<{ blockedIds: Set<string>, hasAsyncSpawn: boolean }>}
 */
async function detectHallucinationRisk(pendingToolCalls, threadId, logger) {
  const hasAsyncSpawn = _hasAsyncSpawn(pendingToolCalls);
  const blockedIds = new Set();
  if (!hasAsyncSpawn) return { blockedIds, hasAsyncSpawn };

  const finalizersInTurn = pendingToolCalls.filter(tc => FINALIZER_TOOLS.has(tc.name));
  if (!finalizersInTurn.length) return { blockedIds, hasAsyncSpawn };

  for (const fin of finalizersInTurn) {
    const widgetId = fin.input?.widgetId ? String(fin.input.widgetId) : null;
    let isExistingUpdate = false;
    if (widgetId && threadId) {
      try {
        const existing = await AiMessage.findOne(
          { threadId, 'metadata.widgetId': widgetId },
          { _id: 1 }
        ).lean();
        if (existing) isExistingUpdate = true;
      } catch (e) {
        logger?.warn?.(`widget lookup failed for ${widgetId}: ${e?.message}`);
      }
    }
    if (isExistingUpdate) {
      logger?.log?.(`${fin.name} AUTORISÉ (widgetId=${widgetId} existe déjà → update, pas hallucination)`);
      continue;
    }
    logger?.warn?.(`ANTI-HALLUCINATION : blocage ${fin.name} (id=${fin.id}) car spawn_subagent async est dans le même tour → le subagent doit produire le livrable, pas le parent`);
    blockedIds.add(fin.id);
  }
  return { blockedIds, hasAsyncSpawn };
}

/**
 * Construit le tool_result simulé pour un finalizer bloqué.
 * @param {string} toolName
 * @returns {{ ok: false, error: string, message: string }}
 */
function buildBlockedResult(toolName) {
  return {
    ok: false,
    error: 'finalizer_blocked_by_async_spawn',
    message: `Tu as appelé ${toolName} DANS LE MÊME TOUR que spawn_subagent(async). Le subagent que tu viens de lancer est responsable du livrable. TU NE DOIS PAS produire ${toolName} toi-même maintenant — tu hallucinerais des données que le subagent n'a pas encore fournies. CONDUITE : termine ce tour avec 1-2 phrases narratives ("Subagents lancés, je reviens avec les résultats") puis STOP. L'auto-resume te réveillera quand les subagents auront fini, avec leurs vraies données.`,
  };
}

module.exports = { detectHallucinationRisk, buildBlockedResult, FINALIZER_TOOLS };
