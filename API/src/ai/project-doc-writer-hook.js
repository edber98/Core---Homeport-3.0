// project-doc-writer-hook — déclenche un subagent `project_doc_writer` async
// après certains tours assistant dans un thread mode='project' pour maintenir
// un PROJECT_OVERVIEW.md à jour dans la mémoire projet (entrée spéciale
// `doc.overview`).
//
// Responsabilités :
//  - Skip si mode !== 'project' (perf).
//  - Flag env AI_DISABLE_DOC_WRITER=1 pour désactivation.
//  - DEBOUNCE 5 min : on ne relance pas plus d'un fois par 5 min par thread,
//    car la génération markdown coûte 1-2 min et produit beaucoup de tokens.
//  - Skip si déjà un job actif (guard stale heartbeat > 2 min identique au
//    memory-extractor).
//  - Heuristique "significatif" : au moins un tool call parmi une whitelist
//    (project_write_file / project_read_batch / generate_document /
//    research_deep / spawn_subagent) dans les 3 derniers échanges — sinon on
//    ne rafraîchit pas la doc (pas assez de matière nouvelle).
//  - Crée un AiJob "parent" éphémère pour rattacher le subagent.

const AiJob = require('../db/models/ai-job.model');
const AiMessage = require('../db/models/ai-message.model');
const AiProjectKnowledge = require('../db/models/ai-project-knowledge.model');

// ── Config ──
const DEBOUNCE_MS = 5 * 60 * 1000; // 5 min entre deux runs doc_writer par thread
const STALE_HEARTBEAT_MS = 2 * 60 * 1000; // aligné avec memory-extractor-hook
const SIGNIFICANT_TOOLS = new Set([
  'project_write_file',
  'project_read_batch',
  'generate_document',
  'research_deep',
  'spawn_subagent',
]);

/**
 * Extrait récursivement les noms de tool_calls d'un message (toolCalls racine
 * + segments[*].toolCalls). Tolère l'absence de champs (messages legacy).
 */
function _collectToolNames(msg) {
  const names = [];
  const root = Array.isArray(msg?.toolCalls) ? msg.toolCalls : [];
  for (const tc of root) if (tc?.name) names.push(String(tc.name));
  const segs = Array.isArray(msg?.segments) ? msg.segments : [];
  for (const seg of segs) {
    const segTc = Array.isArray(seg?.toolCalls) ? seg.toolCalls : [];
    for (const tc of segTc) if (tc?.name) names.push(String(tc.name));
  }
  return names;
}

/**
 * Lance un project_doc_writer en arrière-plan (ne throw jamais).
 * @param {object} args
 * @param {object} args.thread - AiThread doc (mongoose ou lean)
 * @param {object} args.user   - req.user
 * @param {string} [args.lastAssistantMessageId] - _id du dernier message assistant créé
 */
async function triggerProjectDocWriter({ thread, user, lastAssistantMessageId }) {
  const _t0 = Date.now();
  try {
    if (process.env.AI_DISABLE_DOC_WRITER === '1') {
      console.log('[doc-writer] disabled via AI_DISABLE_DOC_WRITER');
      return;
    }
    if (!thread || thread.mode !== 'project') {
      console.log('[doc-writer] skip: not project mode (mode=' + thread?.mode + ')');
      return;
    }
    console.log('[doc-writer] trigger START thread=' + thread._id);

    const threadId = thread._id;

    // ── Debounce par job actif (1 doc_writer max par thread) ──
    const existing = await AiJob.findOne({
      threadId,
      subagentType: 'project_doc_writer',
      status: { $in: ['queued', 'running', 'waiting_dependency', 'waiting_permission'] },
    }).lean();
    if (existing) {
      const hb = existing.heartbeatAt ? new Date(existing.heartbeatAt).getTime() : 0;
      const stale = hb && (Date.now() - hb) > STALE_HEARTBEAT_MS;
      if (!stale) {
        console.log('[doc-writer] skip: active job already running (id=' + existing.id + ')');
        return;
      }
      try { await AiJob.updateOne({ id: existing.id }, { $set: { status: 'error', error: 'stale_timeout' } }); } catch {}
    }

    // ── Debounce temporel (5 min) : cherche dernier run terminé ──
    const since = new Date(Date.now() - DEBOUNCE_MS);
    const recentRun = await AiJob.findOne({
      threadId,
      subagentType: 'project_doc_writer',
      finishedAt: { $gte: since },
    }).sort({ finishedAt: -1 }).lean();
    if (recentRun) {
      const ageMs = Date.now() - new Date(recentRun.finishedAt).getTime();
      console.log('[doc-writer] skip: last run too recent (' + Math.round(ageMs / 1000) + 's ago, debounce=' + Math.round(DEBOUNCE_MS / 1000) + 's)');
      return;
    }

    // ── Charge 5 derniers messages ──
    const recent = await AiMessage.find({ threadId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    recent.reverse();

    if (!recent.length || !recent.some(m => m.role === 'assistant')) {
      console.log('[doc-writer] skip: no assistant message yet');
      return;
    }

    // ── Heuristique "significatif" : inspecte les 3 derniers échanges ──
    // (= 3 derniers messages assistant, qui portent les tool_calls)
    const lastAssistants = recent.filter(m => m.role === 'assistant').slice(-3);
    const toolNames = new Set();
    for (const m of lastAssistants) for (const n of _collectToolNames(m)) toolNames.add(n);
    const hasSignificant = [...toolNames].some(n => SIGNIFICANT_TOOLS.has(n));
    if (!hasSignificant) {
      console.log('[doc-writer] skip: no significant tool calls in last 3 assistant turns (tools=' + [...toolNames].join(',') + ')');
      return;
    }

    // ── Liste des fichiers récemment touchés (issus des tool_calls) ──
    const touchedFiles = [];
    const seenFiles = new Set();
    for (const m of lastAssistants) {
      const allTc = [];
      if (Array.isArray(m.toolCalls)) allTc.push(...m.toolCalls);
      if (Array.isArray(m.segments)) {
        for (const seg of m.segments) {
          if (Array.isArray(seg.toolCalls)) allTc.push(...seg.toolCalls);
        }
      }
      for (const tc of allTc) {
        if (!tc?.name) continue;
        if (!/^project_(write_file|read_batch|read_file|move|delete)$/.test(tc.name)) continue;
        const p = tc.args?.path || tc.args?.from || tc.args?.to;
        if (typeof p === 'string' && !seenFiles.has(p)) {
          seenFiles.add(p);
          touchedFiles.push(`${tc.name}: ${p}`);
          if (touchedFiles.length >= 30) break;
        }
        // project_read_batch : args.paths (array)
        if (tc.name === 'project_read_batch' && Array.isArray(tc.args?.paths)) {
          for (const p2 of tc.args.paths) {
            if (typeof p2 === 'string' && !seenFiles.has(p2)) {
              seenFiles.add(p2);
              touchedFiles.push(`project_read_batch: ${p2}`);
              if (touchedFiles.length >= 30) break;
            }
          }
        }
      }
      if (touchedFiles.length >= 30) break;
    }
    const touchedFilesSnippet = touchedFiles.length ? touchedFiles.slice(0, 30).join('\n') : '(aucun)';

    // ── Entries mémoire existantes (approved uniquement, doc.overview exclus) ──
    const existingDoc = await AiProjectKnowledge.findOne({ threadId }).lean();
    const existingEntries = (existingDoc?.entries || []).filter(e => e.status !== 'rejected' && e.key !== 'doc.overview');
    const existingSnippet = existingEntries.length
      ? existingEntries
          .map(e => `- ${e.key} = ${JSON.stringify(e.value)}${e.status === 'pending' ? ' [PENDING]' : ''}`)
          .slice(0, 60)
          .join('\n')
      : '(aucune)';

    // ── Overview actuel (pour idempotence : le LLM l'écrase intelligemment) ──
    const currentOverview = (existingDoc?.entries || []).find(e => e.key === 'doc.overview');
    const currentOverviewSnippet = currentOverview?.value
      ? String(currentOverview.value).slice(0, 4000)
      : '(aucun — première génération)';

    const messagesSnippet = recent.map(m => {
      const role = m.role === 'assistant' ? 'assistant' : (m.role === 'user' ? 'user' : m.role);
      const text = (m.content || '').slice(0, 1500);
      return `${role}: ${text}`;
    }).join('\n---\n');

    const prompt = `Produis/mets à jour le PROJECT_OVERVIEW.md du projet à partir du contexte ci-dessous. Appelle set_project_knowledge UNE SEULE FOIS avec le markdown complet puis STOP.

=== Messages récents (5 derniers) ===
${messagesSnippet}

=== Fichiers récemment touchés ===
${touchedFilesSnippet}

=== Entries mémoire projet ===
${existingSnippet}

=== Overview actuel (à remplacer) ===
${currentOverviewSnippet}`;

    // ── Crée un AiJob parent éphémère (required par sub-runner) ──
    const parentJob = await AiJob.create({
      threadId,
      workspaceId: thread.workspaceId,
      userId: user?._id || user?.id,
      companyId: user?.companyId,
      type: 'long_task',
      status: 'completed',
      mode: thread.mode || 'project',
      startedAt: new Date(),
      finishedAt: new Date(),
      result: { summary: 'Parent éphémère pour project_doc_writer', artifacts: [] },
    });

    // Spawn async. maxLoops=1 : UN SEUL tour LLM (qui appelle set_project_knowledge),
    // pas de tour supplémentaire parasite.
    console.log('[doc-writer] spawning subagent (parentJob=' + parentJob.id + ')');
    const { spawnSubagent } = require('./subagent/sub-runner');
    const res = await spawnSubagent({
      parentJobId: parentJob.id,
      subagentType: 'project_doc_writer',
      async: true,
      prompt,
      maxLoops: 1,
    });
    console.log('[doc-writer] spawned jobId=' + res?.jobId + ' (elapsed=' + (Date.now() - _t0) + 'ms)');
  } catch (e) {
    console.error('[doc-writer] FAILED after ' + (Date.now() - _t0) + 'ms:', e?.message, e?.stack);
  }
}

module.exports = { triggerProjectDocWriter };
