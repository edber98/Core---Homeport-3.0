// Contrôle du widget todo_write : pré-flight, nudge, auto-close.
//
// 3 garde-fous distincts :
//
// 1. PRÉ-FLIGHT : si le user envoie une demande multi-étapes (regex sur verbes
//    + connecteurs), on injecte un system message AVANT le 1er call LLM pour
//    forcer todo_write en première action. Bien plus fiable qu'un nudge post-hoc.
//
// 2. NUDGE : si pendant un tour le LLM lance ≥2 tools "lourds" (spawn_subagent,
//    research_deep, execute_code, web_search/fetch) sans avoir appelé todo_write,
//    on injecte un reminder pour qu'il le fasse au prochain tour. Une seule fois
//    par job (flag _todoNudged).
//
// 3. AUTO-CLOSE : à la fin d'un harness (done/maxLoops/abort), si des todos sont
//    encore in_progress/pending, on les bascule en completed ou cancelled selon
//    qu'on a vu des widgets récents ou non. Évite que le frontend reste en
//    loading infini. Coordination avec _maybeResumeParent : si des subagents
//    tournent encore, on skip (resumeParent fermera).

const AiJob = require('../../db/models/ai-job.model');
const AiMessage = require('../../db/models/ai-message.model');

const HEAVY_TOOLS = new Set([
  'spawn_subagent', 'research_deep', 'execute_code', 'web_search', 'web_fetch',
]);

const MULTI_STEP_MARKERS = /\b(puis|ensuite|apr[eè]s|et\s+(?:ensuite|apr[eè]s|afficher?|g[eé]n[eé]rer?|cr[eé]er?|envoyer?|d[eé]poser?)|analyse[rz]?\b|[eé]tude|consolide[rz]?|chercher? et|g[eé]n[eé]r(?:e[rz]?|ation)|cr[eé]er? (?:un|le|la)|construir?e|faire? (?:un|le|la)|lance[rz]?|spawn)/i;
const ACTION_VERBS = /\b(cherche|analyse|trouve|g[eé]n[eé]re|cr[eé]e|affiche|envoie|t[eé]l[eé]charge|lance|fais|fait|d[eé]pose|extrais?|rassemble|compare|consolide)\b/gi;

const AUTO_RESUME_MARKERS = ['Tous les sous-agents lancés sont terminés', '[Pipeline complete]'];

// ─────────────────────────────────────────────────────────────────────────
// 1. PRÉ-FLIGHT
// ─────────────────────────────────────────────────────────────────────────

/**
 * Si la conversation contient un message user multi-étapes, injecte un system
 * message en position 1 (juste après le system prompt principal) pour forcer
 * todo_write en première action.
 *
 * Mutate la conversation. Idempotent (skip si auto-resume détecté).
 *
 * @param {Array} conversation
 * @param {string} mode
 * @param {object} logger
 * @returns {boolean} true si injection effectuée
 */
function injectPreflightTodo(conversation, mode, logger) {
  try {
    const lastUserMsg = [...conversation].reverse().find(m => m.role === 'user');
    const text = String(lastUserMsg?.content || '').toLowerCase();
    const isAutoResume = AUTO_RESUME_MARKERS.some(marker => text.includes(marker));
    if (!text || text.length <= 30) return false;
    if (mode !== 'chat' && mode !== 'project') return false;
    if (isAutoResume) return false;

    const verbCount = (text.match(ACTION_VERBS) || []).length;
    const hasMulti = MULTI_STEP_MARKERS.test(text) || verbCount >= 2;
    if (!hasMulti) return false;

    conversation.splice(1, 0, {
      role: 'system',
      content: `[PROTOCOLE HOMEPORT] La demande utilisateur est multi-étapes. TA PREMIÈRE ACTION DOIT ÊTRE un appel \`todo_write\` avec 3-6 items couvrant le plan complet. Items au statut "pending" pour toute la suite, le premier que tu vas exécuter à "in_progress". SANS cet appel initial, l'utilisateur ne verra aucune checklist et ce sera une violation du protocole. Appelle todo_write IMMÉDIATEMENT, avant tout autre tool.`,
    });
    logger?.log?.('pré-flight todo_write : user request détectée comme multi-étapes, injection du reminder');
    return true;
  } catch (e) {
    logger?.warn?.('pré-flight todo check failed:', e?.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 2. NUDGE
// ─────────────────────────────────────────────────────────────────────────

/**
 * Décide si on doit nudger le LLM pour qu'il appelle todo_write au prochain
 * tour. Mute jobContext._seenTodoWrite et _todoNudged.
 *
 * @returns {{ shouldNudge: boolean, heavyCount: number }}
 */
function evaluateTodoNudge(pendingToolCalls, jobContext, logger) {
  const heavyCount = pendingToolCalls.filter(tc => HEAVY_TOOLS.has(tc.name)).length;
  const hasTodo = pendingToolCalls.some(tc => tc.name === 'todo_write');
  if (hasTodo && jobContext) jobContext._seenTodoWrite = true;

  const shouldNudge = !!(
    heavyCount >= 2
    && !hasTodo
    && !(jobContext?._seenTodoWrite)
    && !(jobContext?._todoNudged)
    && jobContext
  );
  if (shouldNudge) {
    logger?.log?.(`todo_write nudge : ${heavyCount} tools lourds sans checklist — push system reminder`);
    jobContext._todoNudged = true;
  }
  return { shouldNudge, heavyCount };
}

function buildNudgeMessage(heavyCount) {
  return {
    role: 'user',
    content: `[SYSTÈME — IMPORTANT] Tu viens d'exécuter ${heavyCount} tools lourds sans avoir créé de checklist via todo_write. C'est une VIOLATION du protocole. Au prochain tour LLM, ta TOUTE PREMIÈRE action DOIT être \`todo_write\` avec 3-6 items couvrant la tâche en cours et à venir, pour que l'utilisateur voie la progression. Les items déjà faits = status "completed", l'étape en cours = "in_progress", les prochaines = "pending". Ensuite continue ton travail normalement.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 3. AUTO-CLOSE
// ─────────────────────────────────────────────────────────────────────────

/**
 * Quand le harness se termine (done, abort, maxLoops, question), on vérifie
 * s'il reste des todos in_progress/pending. Si oui, on les marque comme
 * "cancelled" ou "completed" selon le contexte, pour que le frontend ne reste
 * pas en loading infini.
 *
 * COORDINATION avec job-runner._maybeResumeParent :
 * - Si des subagents sont encore actifs, on SKIP (resumeParent s'en occupera
 *   quand ils finiront, via sa propre logique d'auto-close).
 * - Si aucun subagent actif → ce harness est en fin de run simple, on ferme ici.
 *
 * @param {string} threadId
 * @param {object} logger
 */
async function autoCloseStaleTodos(threadId, logger) {
  if (!threadId) return;
  try {
    // NE PAS fermer si des subagents sont encore actifs sur ce thread.
    const activeSubagents = await AiJob.countDocuments({
      threadId,
      type: 'subagent',
      subagentType: { $nin: ['memory_extractor', 'project_doc_writer'] },
      status: { $in: ['queued', 'running', 'waiting_dependency', 'waiting_permission', 'paused'] },
    });
    if (activeSubagents > 0) {
      logger?.log?.(`skip auto-close todos: ${activeSubagents} subagents encore actifs`);
      return;
    }

    const todoMsg = await AiMessage.findOne({
      threadId,
      'metadata.kind': 'todo_list',
      'metadata.widgetId': { $regex: '^session-todos' },
    }).sort({ createdAt: -1 });
    if (!todoMsg) return;
    const todos = todoMsg.metadata?.todoList?.todos || [];
    const hasOpen = todos.some(t => t.status === 'in_progress' || t.status === 'pending');
    if (!hasOpen) return;

    const recentWidgets = await AiMessage.countDocuments({
      threadId,
      createdAt: { $gt: todoMsg.createdAt },
      'metadata.kind': { $in: ['structured', 'file_inline', 'canvas_html', 'diagram', 'image_inline'] },
    });
    const targetStatus = recentWidgets > 0 ? 'completed' : 'cancelled';
    const updated = todos.map(t => ({
      ...(t.toObject?.() || t),
      status: (t.status === 'completed' || t.status === 'cancelled') ? t.status : targetStatus,
    }));
    todoMsg.metadata = {
      ...(todoMsg.metadata?.toObject?.() || todoMsg.metadata),
      todoList: {
        ...(todoMsg.metadata?.todoList?.toObject?.() || todoMsg.metadata?.todoList),
        todos: updated,
        updatedAt: new Date(),
      },
      widgetUpdatedAt: new Date(),
    };
    await todoMsg.save();
    const { emitThreadEvent } = require('../jobs/job-events');
    emitThreadEvent(String(threadId), { type: 'ai.message.updated', messageId: String(todoMsg._id), kind: 'todo_list' });
    const openCount = todos.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
    logger?.log?.(`auto-close stale todos: ${openCount} items → ${targetStatus}`);
  } catch (e) {
    logger?.warn?.('auto-close stale todos failed:', e?.message);
  }
}

module.exports = {
  injectPreflightTodo,
  evaluateTodoNudge,
  buildNudgeMessage,
  autoCloseStaleTodos,
  HEAVY_TOOLS,
};
