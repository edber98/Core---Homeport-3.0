// Mailbox — drain des messages reçus pendant l'exécution d'un agent.
//
// Pattern claude-code / openclaw SendMessageTool : pendant qu'un agent tourne,
// des messages peuvent s'empiler à 2 niveaux :
//   1. AiJob.pendingMessages → spécifique à un job (sub-agent, async resume)
//   2. AiThread.pendingMessages → niveau thread, accessible à TOUS les agents
//      du thread (main agent qui n'a pas d'AiJob, sub-agents qui partagent le
//      thread, etc.). Alimenté par POST /threads/:id/mailbox.
//
// Au début de chaque tour LLM, on drain les 2 sources et on les injecte comme
// un message user système (entre balises XML).
//
// Idempotent : chaque message a un flag `delivered=true` après inject → pas de
// double-livraison entre tours, ni cross-agent (un message destiné au parent
// ne sera consommé qu'une fois — par le 1er agent qui drain).

const AiJob = require('../../db/models/ai-job.model');
const AiThread = require('../../db/models/ai-thread.model');

function _renderIncomingBlocks(pending) {
  return pending.map(m => {
    const who = m.fromName || m.from || 'user';
    const when = m.createdAt ? new Date(m.createdAt).toISOString() : '';
    return `<incoming-message from="${who}"${when ? ` at="${when}"` : ''}>\n${m.message}\n</incoming-message>`;
  }).join('\n\n');
}

/**
 * Drain les messages pendants (job + thread) et retourne un message à pousser
 * dans la conversation. Null si rien à drainer.
 *
 * @param {object} jobContext - { jobId?, threadId? }
 * @param {object} logger - harness logger
 * @returns {Promise<{ message: object, count: number } | null>}
 */
async function drainMailbox(jobContext, logger) {
  const jobId = jobContext?.jobId;
  const threadId = jobContext?.threadId || jobContext?._threadId;
  // Tous les agents actifs du thread (main + sub-agents en mode synchrone ou
  // async) peuvent drain la thread mailbox. Idempotence via `delivered=true` →
  // un message n'est livré qu'à un seul agent (le 1er qui le draine).
  // Si c'est un sub-agent qui reçoit un message destiné au parent, le prompt
  // lui dit de forwarder via send_message_to_agent({to:'parent'}).
  // Cas critique : en mode SYNCHRONE, le main agent attend → seul le sub-agent
  // tourne → si on bloquait sa thread mailbox, l'user ne pourrait pas l'arrêter.

  if (!jobId && !threadId) return null;

  const allPending = [];
  let jobPending = [];
  let threadPending = [];

  try {
    // 1. Drain job-level mailbox (toujours OK pour ce job spécifique)
    if (jobId) {
      const j = await AiJob.findOne({ id: jobId }, 'pendingMessages').lean();
      jobPending = (j?.pendingMessages || []).filter(m => m && !m.delivered);
      allPending.push(...jobPending);
    }

    // 2. Drain thread-level mailbox — tout agent actif peut le faire.
    if (threadId) {
      const t = await AiThread.findById(threadId, 'pendingMessages').lean();
      threadPending = (t?.pendingMessages || []).filter(m => m && !m.delivered);
      allPending.push(...threadPending);
    }

    if (!allPending.length) return null;

    // Log détaillé pour traçabilité (cas openclaw style : voir qui prend quoi)
    const isSubagent = !!jobContext?.parentJobId;
    const agentLabel = isSubagent ? `SUB-AGENT(${jobContext.subagentType || '?'}, depth=${jobContext.depth || '?'})` : 'MAIN-AGENT';
    const preview = allPending.map(m => `"${String(m.message || '').slice(0, 60).replace(/\n/g, ' ')}…" from ${m.fromName || m.from || '?'}`).join(' | ');
    logger?.log?.(`📬 mailbox drain → ${agentLabel}: ${allPending.length} message(s) [job=${jobPending.length}, thread=${threadPending.length}] :: ${preview}`);

    // ── Liste des sub-agents actifs (pour aider le main à forwarder) ────
    // Quand le main reçoit un mailbox pendant que des sub-agents tournent, il
    // doit utiliser send_message_to_agent vers chacun (pattern openclaw).
    // Sans cette liste dans le prompt, le LLM relance spawn_subagent par erreur
    // → bug constaté (3 sub-agents qui font le même travail, livrable doublé).
    let activeSubsContext = '';
    if (threadId && !isSubagent) {
      try {
        const staleAt = new Date(Date.now() - 3 * 60_000);
        const activeSubs = await AiJob.find(
          {
            threadId,
            type: 'subagent',
            status: { $in: ['queued', 'running', 'waiting_dependency', 'waiting_permission', 'paused'] },
            subagentType: { $nin: ['memory_extractor', 'project_doc_writer'] },
          },
          'id subagentType status startedAt'
        ).limit(10).lean();
        const fresh = activeSubs.filter(s => !s.startedAt || new Date(s.startedAt) >= staleAt);
        if (fresh.length) {
          const lines = fresh.map(s => `- jobId=${s.id} · type=${s.subagentType} · status=${s.status}`);
          activeSubsContext = `\n\n📡 SUB-AGENTS ACTUELLEMENT EN COURS DANS CE THREAD :\n${lines.join('\n')}\n\n⚠️ Si ce message user contient une CONTRAINTE (ex: "max 2 sources", "stop", "ajoute X aussi"), tu DOIS la transmettre aux sub-agents existants via \`send_message_to_agent({to: "<jobId>", message: "..."})\` — un appel par sub-agent concerné. **NE SPAWN PAS un nouveau sub-agent** : les anciens continueraient leur travail en parallèle → doublon. Une fois forwardé, ré-écris à l'user en 1 phrase ("J'ai transmis ta consigne à Tim et Marie").`;
        }
      } catch (e) {
        // non-fatal — on continue sans la liste
      }
    }

    const blocks = _renderIncomingBlocks(allPending);
    const subagentForwardHint = isSubagent
      ? `\n\nSi tu es un sous-agent et que le message s'adresse manifestement à ton parent, tu peux le forwarder via send_message_to_agent({to:'parent'}).`
      : '';
    const message = {
      role: 'user',
      content: `[MESSAGES REÇUS PENDANT TON EXÉCUTION — tiens-en compte]\n\n${blocks}\n\n(Fin des messages. Continue ta tâche en intégrant ces instructions si pertinent. Si une question attend une réponse, réponds-y clairement avant de continuer.${subagentForwardHint})${activeSubsContext}`,
    };

    // Marque comme delivered (non-bloquant, best-effort)
    if (jobId && jobPending.length) {
      AiJob.updateOne(
        { id: jobId },
        { $set: { 'pendingMessages.$[elem].delivered': true } },
        { arrayFilters: [{ 'elem.delivered': { $ne: true } }] }
      ).catch(() => {});
    }
    if (threadId && threadPending.length) {
      AiThread.updateOne(
        { _id: threadId },
        { $set: { 'pendingMessages.$[elem].delivered': true } },
        { arrayFilters: [{ 'elem.delivered': { $ne: true } }] }
      ).catch(() => {});
    }

    return { message, count: allPending.length };
  } catch (e) {
    logger?.warn?.('mailbox drain failed:', e?.message);
    return null;
  }
}

module.exports = { drainMailbox };
