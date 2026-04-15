// memory-extractor-hook — déclenche un subagent `memory_extractor` async après
// chaque tour assistant dans un thread mode='project'.
//
// Responsabilités :
//  - Skip si mode !== 'project' → perf (pas de subagent sur threads non-projets).
//  - Debounce : si un job memory_extractor tourne déjà pour ce thread, skip.
//  - Crée un AiJob "parent" éphémère pour rattacher le subagent (required par
//    le sub-runner qui exige un parent valide).
//  - Prompt court construit depuis les 4 derniers messages + entries existantes.
//  - Budget : maxLoops=3 (une seule boucle LLM est nécessaire pour un
//    tool call vers suggest_memory_entries).
//  - Après run, émet un event 'memory.pending.update' sur le thread bus pour
//    informer le frontend actif (si le stream SSE est encore ouvert).

const AiJob = require('../db/models/ai-job.model');
const AiMessage = require('../db/models/ai-message.model');
const AiProjectKnowledge = require('../db/models/ai-project-knowledge.model');

/**
 * Lance un extracteur en arrière-plan (ne throw jamais).
 * @param {object} args
 * @param {object} args.thread - AiThread doc (mongoose ou lean)
 * @param {object} args.user   - req.user
 * @param {string} [args.lastAssistantMessageId] - _id du dernier message assistant créé
 */
// Regex rapides pour détecter les échanges triviaux (pas de matière à mémoriser)
const TRIVIAL_USER_PATTERNS = /^(ok|oui|non|merci|bonjour|salut|hello|hi|bye|ciao|ça va|ca va|yes|no|cool|super|ptn|hmm|\?|\!)[\s\!\?\.]*$/i;
const HAS_FACT_HINTS = /\b(\d{1,4}[\/\-\.]\d{1,2}|\d+\s*(€|euros?|k€|k|eur|\$|%)|mail|email|@|http|url|deadline|\d{2,}\s*(jan|fev|mar|avr|mai|juin|juil|aou|sep|oct|nov|dec)|client|projet|budget|contact|nom|compte|siret|iban|tel|tél)/i;

async function triggerMemoryExtractor({ thread, user, lastAssistantMessageId }) {
  const _t0 = Date.now();
  try {
    if (process.env.AI_DISABLE_MEMORY_EXTRACTOR === '1') {
      console.log('[memory-extractor] disabled via AI_DISABLE_MEMORY_EXTRACTOR');
      return;
    }
    if (!thread || thread.mode !== 'project') {
      console.log('[memory-extractor] skip: not project mode (mode=' + thread?.mode + ')');
      return;
    }
    console.log('[memory-extractor] trigger START thread=' + thread._id);

    const threadId = thread._id;

    // ── Debounce : 1 extractor actif max par thread ──
    const existing = await AiJob.findOne({
      threadId,
      subagentType: 'memory_extractor',
      status: { $in: ['queued', 'running', 'waiting_dependency', 'waiting_permission'] },
    }).lean();
    if (existing) {
      const hb = existing.heartbeatAt ? new Date(existing.heartbeatAt).getTime() : 0;
      const stale = hb && (Date.now() - hb) > 2 * 60 * 1000;
      if (!stale) return;
      try { await AiJob.updateOne({ id: existing.id }, { $set: { status: 'error', error: 'stale_timeout' } }); } catch {}
    }

    // ── Load 4 derniers messages + entries existantes ──
    const recent = await AiMessage.find({ threadId })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();
    recent.reverse();

    // Si uniquement 1 message user sans réponse, rien à analyser
    if (!recent.length || !recent.some(m => m.role === 'assistant')) return;

    // ── Skip triviaux : évite de déclencher sur "ça va", "ok", "merci"… ──
    const lastUser = [...recent].reverse().find(m => m.role === 'user');
    const lastAsst = [...recent].reverse().find(m => m.role === 'assistant');
    const userText = (lastUser?.content || '').trim();
    const asstText = (lastAsst?.content || '').trim();
    // 1. User message trop court ou purement social → skip
    if (userText.length < 40 && !HAS_FACT_HINTS.test(userText)) {
      console.log('[memory-extractor] skip: user trivial (' + userText.length + ' chars)');
      return;
    }
    if (TRIVIAL_USER_PATTERNS.test(userText)) {
      console.log('[memory-extractor] skip: user message social');
      return;
    }
    // 2. Pas de matière factuelle dans le dernier échange → skip
    const combined = userText + '\n' + asstText;
    if (!HAS_FACT_HINTS.test(combined)) {
      console.log('[memory-extractor] skip: no fact hints detected');
      return;
    }
    // 3. Réponse assistant trop courte → probablement une clarification, pas un résultat
    if (asstText.length < 120) {
      console.log('[memory-extractor] skip: assistant answer short (' + asstText.length + ' chars)');
      return;
    }

    const existingDoc = await AiProjectKnowledge.findOne({ threadId }).lean();
    const existingEntries = existingDoc?.entries || [];
    const existingSnippet = existingEntries.length
      ? existingEntries
          .filter(e => e.status !== 'rejected')
          .map(e => `- ${e.key} = ${JSON.stringify(e.value)}${e.status === 'pending' ? ' [PENDING]' : ''}`)
          .slice(0, 60)
          .join('\n')
      : '(aucune)';

    const messagesSnippet = recent.map(m => {
      const role = m.role === 'assistant' ? 'assistant' : (m.role === 'user' ? 'user' : m.role);
      const text = (m.content || '').slice(0, 1200);
      return `${role}: ${text}`;
    }).join('\n---\n');

    const prompt = `Analyse cet échange et propose max 3 entries pertinentes
à ajouter à la mémoire projet (ou [] si rien de durable).

=== Messages récents ===
${messagesSnippet}

=== Connaissances projet déjà enregistrées ===
${existingSnippet}

Rappel : appelle UNE SEULE FOIS suggest_memory_entries puis STOP.`;

    // ── Crée un AiJob parent éphémère (required par sub-runner) ──
    const parentJob = await AiJob.create({
      threadId,
      workspaceId: thread.workspaceId,
      userId: user?._id || user?.id,
      companyId: user?.companyId,
      type: 'long_task',
      status: 'completed', // parent déjà fini, sert juste d'ancre
      mode: thread.mode || 'project',
      startedAt: new Date(),
      finishedAt: new Date(),
      result: { summary: 'Parent éphémère pour memory_extractor', artifacts: [] },
    });

    // Spawn async (setImmediate dans sub-runner)
    // maxLoops=1 : UN SEUL tour LLM (qui appelle suggest_memory_entries), pas de
    // tour supplémentaire parasite. Après le tool, la loop se termine d'elle-même.
    console.log('[memory-extractor] spawning subagent (parentJob=' + parentJob.id + ')');
    const { spawnSubagent } = require('./subagent/sub-runner');
    const res = await spawnSubagent({
      parentJobId: parentJob.id,
      subagentType: 'memory_extractor',
      async: true,
      prompt,
      maxLoops: 1,
    });
    console.log('[memory-extractor] spawned jobId=' + res?.jobId + ' (elapsed=' + (Date.now() - _t0) + 'ms)');

    // Hook après fin du job pour émettre un event thread-level
    if (res?.jobId) {
      _watchJobAndNotify(res.jobId, threadId, lastAssistantMessageId).catch(() => {});
    }
  } catch (e) {
    console.error('[memory-extractor] FAILED after ' + (Date.now() - _t0) + 'ms:', e?.message, e?.stack);
  }
}

/**
 * Poll léger sur le job : dès qu'il passe en completed/error, émet un event
 * `memory.pending.update` sur le bus thread pour rafraîchir le badge côté UI.
 * Si le stream SSE du thread est encore ouvert, il reçoit l'event.
 */
async function _watchJobAndNotify(jobId, threadId, sourceMessageId) {
  const { onJobEvent, emitThreadEvent } = require('./jobs/job-events');
  let settled = false;
  const off = onJobEvent(jobId, async (ev) => {
    if (settled) return;
    if (ev?.type === 'job.status' && (ev.status === 'completed' || ev.status === 'error' || ev.status === 'cancelled')) {
      settled = true;
      off();
      try {
        const doc = await AiProjectKnowledge.findOne({ threadId }).lean();
        const pendingCount = (doc?.entries || []).filter(e => e.status === 'pending').length;
        emitThreadEvent(String(threadId), {
          type: 'memory.pending.update',
          threadId: String(threadId),
          pendingCount,
          sourceMessageId: sourceMessageId ? String(sourceMessageId) : null,
        });

        // Si au moins 1 entry pending a été créée PAR CE JOB → message hint discret
        // (on vérifie s'il y a eu au moins 1 pending après le job).
        if (pendingCount > 0) {
          // On ne crée un system_hint que si la dernière entry pending a été
          // créée récemment (moins de 2 min) ET qu'il n'y a pas déjà un hint
          // récent dans le thread (évite spam).
          const recentHint = await AiMessage.findOne({
            threadId,
            'metadata.kind': 'system_hint',
            createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
          }).lean();
          if (!recentHint) {
            await AiMessage.create({
              threadId,
              role: 'system',
              content: `J'ai détecté ${pendingCount} info${pendingCount > 1 ? 's' : ''} potentielle${pendingCount > 1 ? 's' : ''} à ajouter à la mémoire projet. Va dans Paramètres → Connaissances projet pour valider.`,
              metadata: {
                kind: 'system_hint',
                extra: {
                  hintType: 'memory_pending',
                  pendingCount,
                  action: { type: 'open_settings', tab: 'knowledge', filter: 'pending' },
                },
              },
            });
            emitThreadEvent(String(threadId), { type: 'ai.message.created', kind: 'system_hint' });
          }
        }
      } catch (e) {
        console.error('[memory-extractor-hook] notify failed:', e?.message);
      }
    }
  });
  // Timeout safety : unsub après 3 min
  setTimeout(() => { if (!settled) { settled = true; off(); } }, 3 * 60 * 1000);
}

module.exports = { triggerMemoryExtractor };
