// Job runner — long-running AI job lifecycle over the existing agent-harness.
//
// Jobs are durable: transcript + iteration checkpointed to AiJob so a worker
// crash → the resume-worker can pick the job up from the last checkpoint.

const AiJob = require('../../db/models/ai-job.model');
const AiThread = require('../../db/models/ai-thread.model');
const AiMessage = require('../../db/models/ai-message.model');
const { buildContext } = require('../context/context-builder');
const { runHarness } = require('../agent-harness');
const { emitJobEvent, onJobEvent, emitThreadEvent, waitForPermission, waitForPlanApproval } = require('./job-events');

const HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * Create an AiJob record. Does NOT start execution (call runJob afterwards).
 */
async function createJob(opts) {
  const {
    threadId, type, mode,
    subagentType, subagentInstructions,
    initiatorMessageId,
    parentJobId, depth,
    maxLoops, agentId,
    metadata,
  } = opts;

  // Support ObjectId ou short ID (ait_xxx)
  const { Types } = require('mongoose');
  let thread = null;
  if (threadId) {
    if (Types.ObjectId.isValid(threadId)) {
      thread = await AiThread.findById(threadId).lean();
    }
    if (!thread) thread = await AiThread.findOne({ id: String(threadId) }).lean();
  }
  if (!thread) throw new Error(`createJob: thread not found (id=${threadId})`);

  const job = await AiJob.create({
    threadId: thread._id,
    workspaceId: thread.workspaceId,
    userId: thread.userId,
    companyId: thread.companyId,
    type: type || 'agent_run',
    status: 'queued',
    mode: mode || thread.mode || 'chat',
    subagentType: subagentType || undefined,
    subagentInstructions: subagentInstructions || undefined,
    initiatorMessageId: initiatorMessageId || undefined,
    parentJobId: parentJobId || undefined,
    depth: depth || 0,
    maxLoops: maxLoops || 100,
    agentId: agentId || thread.agentId || undefined,
    ...(metadata ? { metadata } : {}),
  });
  return job;
}

function _buildJobContext(job, ac) {
  const jobId = job.id;

  async function persistCheckpoint(iteration, conversation) {
    try {
      // Cap transcript size at 400 entries — older entries dropped
      const trimmed = (conversation || []).slice(-400);
      await AiJob.updateOne(
        { id: jobId },
        { $set: { iteration, transcript: trimmed, heartbeatAt: new Date() } },
      );
    } catch (e) {
      console.error('[job-runner] checkpoint failed:', e?.message);
    }
  }

  async function heartbeat() {
    try {
      await AiJob.updateOne({ id: jobId }, { $set: { heartbeatAt: new Date() } });
    } catch { /* non-fatal */ }
  }

  function broadcast(event) {
    if (!event?.type) return;
    // Enrichit avec identifiants pour UI (tag subagent / job)
    const isSubagent = !!job.parentJobId;
    const enriched = {
      ...event,
      _jobId: jobId,
      _subagentType: job.subagentType || null,
      _agentLabel: job.subagentType ? `Sous-agent ${job.subagentType}` : 'Agent principal',
      ...(isSubagent ? { _subagentEvent: true, _parentJobId: String(job.parentJobId) } : {}),
    };
    if (!enriched.type.startsWith('heartbeat')) {
      AiJob.updateOne(
        { id: jobId },
        { $push: { sideEvents: { $each: [enriched], $slice: -200 } } },
      ).catch(() => {});
    }
    emitJobEvent(jobId, enriched);
    // Forward vers le thread bus UNIQUEMENT les events UI-only (canvas,
    // permissions, job.status, thread.*). NE PAS forwarder les events bruts
    // du LLM (message, tool.end, tool.meta, done) d'un subagent vers le
    // thread stream : sinon le frontend les append au message STREAMING du
    // parent et on voit des tool calls du subagent polluer la bulle du parent.
    // Les events LLM du subagent sont accessibles via emitJobEvent (canvas
    // Agents s'abonne par jobId).
    if (job.threadId) {
      const t = enriched.type || '';
      const isUIEvent = t.startsWith('canvas.')
        || t.startsWith('ai.')
        || t.startsWith('subagent.')
        || t.startsWith('thread.')
        || t === 'job.status'
        || t === 'plan.resolved'
        || t === 'memory.pending.update';
      if (isUIEvent) {
        emitThreadEvent(String(job.threadId), enriched);
      }
    }
    // Persist canvas.* events dans AiCanvasState pour l'UI après reload
    if (enriched.type.startsWith('canvas.')) {
      persistCanvasEvent(enriched).catch(() => {});
    }
    // Si c'est un subagent et un tool.end survient, émet un event canvas.task.toolcall
    // pour le canvas « Agents » (visibilité live des appels d'outils du sous-agent).
    if (isSubagent && event.type === 'tool.end') {
      try {
        const argsSummary = _safeSummary(event.args);
        const resultSummary = _safeSummary(event.result);
        const toolcallEvent = {
          type: 'canvas.task.toolcall',
          taskId: jobId,
          toolName: event.name,
          status: event.status || 'success',
          duration: event.duration,
          argsSummary,
          resultSummary,
          at: new Date().toISOString(),
          _jobId: jobId,
          _parentJobId: String(job.parentJobId),
          _subagentEvent: true,
        };
        emitJobEvent(jobId, toolcallEvent);
        if (job.threadId) {
          emitThreadEvent(String(job.threadId), toolcallEvent);
        }
        persistCanvasEvent(toolcallEvent).catch(() => {});
      } catch { /* non-fatal */ }
    }
  }

  function _safeSummary(v) {
    try {
      if (v == null) return '';
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      return s.length > 200 ? s.slice(0, 200) + '…' : s;
    } catch { return ''; }
  }

  async function persistCanvasEvent(event) {
    const AiCanvasState = require('../../db/models/ai-canvas-state.model');
    const threadId = job.threadId;
    if (!threadId) return;
    if (event.type === 'canvas.research.step') {
      const stepId = event.id || `${jobId}_${Date.now()}`;
      // Upsert-style : si la step existe déjà (mêmes id), $set le patch ;
      // sinon $push une nouvelle entry. Évite les doublons running/done.
      const existing = await AiCanvasState.findOne(
        { threadId, 'research.steps.id': stepId },
        { _id: 1 }
      ).lean();
      if (existing) {
        const set = {};
        if (event.status) set['research.steps.$.status'] = event.status;
        if (event.title) set['research.steps.$.title'] = event.title;
        if (event.url) set['research.steps.$.url'] = event.url;
        if (event.snippet || event.resultPreview) {
          set['research.steps.$.snippet'] = event.snippet || event.resultPreview;
        }
        if (event.resultPreview) set['research.steps.$.resultPreview'] = event.resultPreview;
        if (event.status === 'done' || event.status === 'error') {
          set['research.steps.$.finishedAt'] = new Date();
        }
        if (Object.keys(set).length) {
          await AiCanvasState.updateOne(
            { threadId, 'research.steps.id': stepId },
            { $set: set }
          );
        }
      } else {
        await AiCanvasState.updateOne(
          { threadId },
          { $push: { 'research.steps': { $each: [{
            id: stepId,
            type: event.stepType || event.kind || 'step',
            status: event.status || 'running',
            title: event.title || '',
            url: event.url || null,
            snippet: event.snippet || event.resultPreview || null,
            resultPreview: event.resultPreview || null,
            startedAt: new Date(),
            _jobId: event._jobId,
            _agentLabel: event._agentLabel,
          }], $slice: -200 } } },
          { upsert: true }
        );
      }
    } else if (event.type === 'canvas.task.create' && event.task) {
      const taskId = event.task.id;
      if (!taskId) return;
      // Pull any existing entry with same id, then push new
      await AiCanvasState.updateOne(
        { threadId },
        { $pull: { tasks: { id: taskId } }, $setOnInsert: { threadId } },
        { upsert: true }
      );
      await AiCanvasState.updateOne(
        { threadId },
        {
          $push: {
            tasks: {
              $each: [{
                id: taskId,
                jobId: event.task.jobId || taskId,
                subject: event.task.subject || '',
                description: event.task.description || '',
                status: event.task.status || 'queued',
                parentTaskId: event.task.parentJobId || event.task.parentTaskId,
                startedAt: event.task.startedAt ? new Date(event.task.startedAt) : new Date(),
                toolCalls: [],
              }],
              $slice: -200,
            },
          },
        }
      );
    } else if (event.type === 'canvas.task.update') {
      const taskId = event.taskId;
      if (!taskId) return;
      const set = {};
      if (event.status) set['tasks.$.status'] = event.status;
      if (event.duration != null) set['tasks.$.duration'] = event.duration;
      if (event.error) set['tasks.$.error'] = event.error;
      if (event.status === 'completed' || event.status === 'error') {
        set['tasks.$.finishedAt'] = new Date();
      }
      if (Object.keys(set).length) {
        await AiCanvasState.updateOne(
          { threadId, 'tasks.id': taskId },
          { $set: set }
        );
      }
    } else if (event.type === 'canvas.task.toolcall') {
      const taskId = event.taskId;
      if (!taskId) return;
      const entry = {
        id: `${taskId}_${Date.now()}`,
        name: event.toolName || 'tool',
        status: event.status || 'success',
        duration: event.duration,
        argsSummary: event.argsSummary,
        resultSummary: event.resultSummary,
        at: event.at ? new Date(event.at) : new Date(),
      };
      await AiCanvasState.updateOne(
        { threadId, 'tasks.id': taskId },
        { $push: { 'tasks.$.toolCalls': { $each: [entry], $slice: -100 } } }
      );
    }
  }

  function onAbort(cb) {
    if (!ac) return () => {};
    const handler = () => cb();
    ac.signal.addEventListener('abort', handler, { once: true });
    return () => ac.signal.removeEventListener('abort', handler);
  }

  return {
    jobId,
    threadId: job.threadId,
    workspaceId: job.workspaceId,
    userId: job.userId,
    companyId: job.companyId,
    parentJobId: job.parentJobId,
    depth: job.depth || 0,
    persistCheckpoint,
    heartbeat,
    broadcast,
    onAbort,
    waitForPermission: (requestId, timeoutMs) => waitForPermission(jobId, requestId, timeoutMs),
    waitForPlanApproval: (requestId, timeoutMs) => waitForPlanApproval(jobId, requestId, timeoutMs),
  };
}

/**
 * Run a job — loads thread+context, runs harness, writes final state.
 * @param {string} jobId
 * @param {object} [opts] - { signal?, subagentType?, systemPromptOverride?, toolsAllowed?, toolsDenied?, forcedAutonomy?, prompt?, contextSlice? }
 */
async function runJob(jobId, opts = {}) {
  const job = await AiJob.findOne({ id: jobId });
  if (!job) throw new Error(`runJob: job ${jobId} not found`);
  if (job.status === 'completed' || job.status === 'cancelled') return;

  // Transition to running
  job.status = 'running';
  job.startedAt = job.startedAt || new Date();
  job.heartbeatAt = new Date();
  await job.save();
  emitJobEvent(jobId, { type: 'job.status', status: 'running' });

  const ac = opts.signal ? { signal: opts.signal } : new AbortController();
  const jobContext = _buildJobContext(job, ac);

  const heartbeatTimer = setInterval(() => {
    jobContext.heartbeat().catch(() => {});
  }, HEARTBEAT_INTERVAL_MS);

  let totalUsage = { input: 0, output: 0 };
  let finalText = '';
  const toolCalls = [];

  try {
    // Load thread + context
    const { Types } = require('mongoose');
    let thread = null;
    if (job.threadId) {
      if (Types.ObjectId.isValid(job.threadId)) thread = await AiThread.findById(job.threadId).lean();
      if (!thread) thread = await AiThread.findOne({ id: String(job.threadId) }).lean();
    }
    if (!thread) throw new Error('runJob: thread not found');

    const context = await buildContext({
      companyId: job.companyId,
      workspaceId: job.workspaceId,
      userId: job.userId,
    });
    context._autonomyLevel = opts.forcedAutonomy
      || thread.metadata?.autonomyLevel
      || 'autonomous';
    context._jobContext = jobContext;
    context._metadata = {
      flowId: thread.flowId || undefined,
      formId: thread.metadata?.formId || undefined,
      workspaceId: String(job.workspaceId),
      companyId: String(job.companyId),
      userId: String(job.userId),
      threadId: String(job.threadId),
    };

    // Build messages: resume from transcript or build from prompt
    let messages;
    if (job.transcript?.length) {
      messages = job.transcript;
    } else if (opts.prompt) {
      messages = [{ role: 'user', content: opts.prompt }];
    } else if (job.type === 'subagent' && job.subagentInstructions) {
      // Subagent resumé (resumeJob sans opts) : utilise l'enrichedPrompt
      // persisté par sub-runner (contient les blocs CONTEXTE des deps).
      // Sinon on tombait sur l'historique du thread parent et le subagent
      // disait "je n'ai pas les résultats upstream".
      messages = [{ role: 'user', content: job.subagentInstructions }];
    } else {
      // Default: load thread history
      const history = await AiMessage.find({ threadId: job.threadId })
        .sort({ createdAt: 1 }).limit(60).lean();
      messages = history.map(m => ({ role: m.role, content: m.content || '' }));
    }

    const mode = job.mode || thread.mode || 'chat';
    const agentOverrides = {
      blockedTools: opts.toolsDenied || null,
      maxToolLoops: job.maxLoops || 100,
      systemPrompt: opts.systemPromptOverride || null,
      allowedTools: opts.toolsAllowed || null,
    };

    const generator = runHarness({
      mode,
      messages,
      context,
      metadata: context._metadata,
      agentOverrides,
      signal: ac.signal,
      jobContext,
    });

    for await (const event of generator) {
      if (event?.type === 'message') finalText += event.text || '';
      if (event?.type === 'tool.end') {
        toolCalls.push({
          id: event.id, name: event.name, args: event.args,
          result: event.result, status: event.status, duration: event.duration,
        });
      }
      if (event?.type === 'done' && event.usage) totalUsage = event.usage;
      // Forward to bus
      jobContext.broadcast(event);
    }

    // Final state
    const finishedAt = new Date();
    await AiJob.updateOne({ id: jobId }, {
      $set: {
        status: 'completed',
        finishedAt,
        usage: totalUsage,
        result: {
          summary: finalText.slice(0, 20_000),
          artifacts: toolCalls.slice(-20),
        },
      },
    });

    // NB : l'ancien message role='system' "[Subagent ... terminé]" a été retiré
    // (doublon avec _maybeCreateAgentReport qui crée une vraie card agent_report
    // avec rendu markdown + artefacts + bouton). Supprimer le legacy évite le
    // "Contexte transféré" moche + bouton Voir à côté de la card.

    emitJobEvent(jobId, { type: 'job.status', status: 'completed', usage: totalUsage });

    // Hook fin de job : crée un AiMessage agent_report si job async ou > 30s.
    try {
      await _maybeCreateAgentReport(job, { opts, toolCalls, finishedAt });
    } catch (e) {
      console.error('[job-runner] agent_report hook failed:', e?.message);
    }

    // Hook : si tous les subagents async d'une cascade sont terminés et que
    // l'agent principal a laissé une tâche inachevée → resume automatique.
    try {
      await _maybeResumeParent(job);
    } catch (e) {
      console.error('[job-runner] resume parent hook failed:', e?.message);
    }

    return { ok: true, jobId, usage: totalUsage, summary: finalText };
  } catch (e) {
    const finishedAt = new Date();
    await AiJob.updateOne({ id: jobId }, {
      $set: {
        status: 'error',
        finishedAt,
        error: e?.message || String(e),
      },
    });
    emitJobEvent(jobId, { type: 'job.status', status: 'error', error: e?.message });
    // Report d'erreur aussi (pour async jobs)
    try {
      await _maybeCreateAgentReport(job, {
        opts, toolCalls, finishedAt,
        errorMessage: e?.message || String(e),
      });
    } catch { /* non-fatal */ }
    throw e;
  } finally {
    clearInterval(heartbeatTimer);
  }
}

/**
 * Si ce job tournait en async OU a duré plus de 30s, crée un AiMessage
 * kind='agent_report' dans le thread pour que l'utilisateur voie le rapport
 * apparaître dans le chat. Applique uniquement aux subagents (les jobs racine
 * agent_run ont déjà leur message assistant envoyé via le stream SSE).
 */
async function _maybeCreateAgentReport(job, { opts, toolCalls, finishedAt, errorMessage }) {
  if (!job || !job.threadId) return;
  const wasAsync = opts?.async === true || job.type === 'long_task';
  const startedAt = job.startedAt || finishedAt;
  const duration = (finishedAt?.getTime() || Date.now()) - (startedAt?.getTime() || Date.now());
  const longEnough = duration > 30_000;
  if (!wasAsync && !longEnough) return;
  if (job.type !== 'subagent' && job.type !== 'long_task') return;
  // Memory_extractor : tâche background silencieuse → pas de card agent_report
  // dans le chat. L'utilisateur voit les entries pending via le badge bulb.
  if (job.subagentType === 'memory_extractor') return;
  // Project_doc_writer : même logique silencieuse — l'utilisateur voit la doc
  // actualisée dans l'onglet Connaissances projet via la card `doc.overview`.
  if (job.subagentType === 'project_doc_writer') return;

  // Relit le job final pour résultat frais
  const fresh = await AiJob.findOne({ id: job.id }).lean();
  if (!fresh) return;

  const status = errorMessage ? 'error' : (fresh.status === 'cancelled' ? 'cancelled' : 'completed');
  const summary = (fresh.result?.summary || '').slice(0, 20_000);
  const rawArtifacts = Array.isArray(fresh.result?.artifacts) ? fresh.result.artifacts : [];

  const artifacts = [];
  for (const a of rawArtifacts) {
    if (!a) continue;
    if (typeof a === 'string') { artifacts.push({ label: a.slice(0, 120) }); continue; }
    if (a.fileId) artifacts.push({ fileId: a.fileId, label: a.label || a.name || a.fileId });
    else if (a.url) artifacts.push({ url: a.url, label: a.label || a.url });
    else if (a.name) artifacts.push({ label: a.name });
    if (artifacts.length >= 10) break;
  }

  const content = errorMessage
    ? `Tâche échouée : ${String(errorMessage).slice(0, 240)}`
    : `Tâche terminée : ${summary.slice(0, 200)}`;

  try {
    await AiMessage.create({
      threadId: job.threadId,
      role: 'assistant',
      content,
      metadata: {
        kind: 'agent_report',
        agentReport: {
          jobId: job.id,
          subagentType: job.subagentType || null,
          parentJobId: job.parentJobId || null,
          startedAt: startedAt || null,
          finishedAt: finishedAt || null,
          duration,
          summary,
          artifacts,
          status,
          toolCount: Array.isArray(fresh.transcript)
            ? fresh.transcript.filter(e => Array.isArray(e?.tool_calls) && e.tool_calls.length).length
            : (Array.isArray(toolCalls) ? toolCalls.length : 0),
          ...(errorMessage ? { error: String(errorMessage).slice(0, 400) } : {}),
        },
      },
    });
  } catch (e) {
    console.error('[job-runner] AiMessage.create(agent_report) failed:', e?.message);
    return;
  }

  try {
    emitThreadEvent(String(job.threadId), {
      type: 'ai.message.created',
      kind: 'agent_report',
      jobId: job.id,
      status,
    });
  } catch { /* non-fatal */ }
}

/**
 * Auto-resume parent : quand TOUS les subagents async d'une cascade sont terminés,
 * et que l'agent principal a laissé une tâche inachevée (le dernier message du
 * thread est assistant avec spawn_subagent dans ses tool_calls, et aucun livrable
 * final type canvas/document n'a été produit depuis), on relance automatiquement
 * l'agent principal avec un message système qui résume les résultats.
 *
 * Style Claude Code : si le pipeline est complet, l'agent termine. Sinon il continue.
 */
async function _maybeResumeParent(job) {
  if (!job?.threadId) return;
  // Skip si pas un subagent (les agent_run principaux ne triggent pas)
  if (job.type !== 'subagent') return;
  // Skip subagents background silencieux
  if (['memory_extractor', 'project_doc_writer'].includes(job.subagentType)) return;

  const threadId = job.threadId;

  // 1. Vérifier qu'aucun autre job VRAIMENT actif sur ce thread.
  // Un job en 'running' SANS heartbeat récent (>2 min) est considéré stalled
  // donc ignoré pour ne pas bloquer le resume éternellement.
  const STALE_HB_MS = 2 * 60_000;
  const staleThreshold = new Date(Date.now() - STALE_HB_MS);
  const reallyActive = await AiJob.countDocuments({
    threadId,
    status: { $in: ['queued', 'running', 'waiting_dependency', 'waiting_permission', 'paused'] },
    $or: [
      { status: { $in: ['queued', 'waiting_dependency', 'waiting_permission', 'paused'] } },
      { status: 'running', heartbeatAt: { $gte: staleThreshold } },
    ],
  });
  if (reallyActive > 0) {
    console.log(`[resume-parent] skip job=${job.id} : ${reallyActive} jobs encore actifs`);
    return;
  }

  // 2. Récupérer les derniers messages pour vérifier le state
  const lastMessages = await AiMessage.find({ threadId })
    .sort({ createdAt: -1 }).limit(8).lean();
  if (!lastMessages.length) return;

  // 3. Le dernier message significatif (non agent_report) doit être assistant
  //    avec des spawn_subagent dans ses tool_calls.
  const significant = lastMessages.find(m => m.metadata?.kind !== 'agent_report' && m.role === 'assistant');
  if (!significant) return;
  const hasSpawnedSubagents = Array.isArray(significant.toolCalls) &&
    significant.toolCalls.some(tc => tc.name === 'spawn_subagent');
  if (!hasSpawnedSubagents) return;

  // 4. Si un livrable final a déjà été produit APRÈS le spawn, skip (pipeline ok)
  const idxSig = lastMessages.findIndex(m => m._id?.toString() === significant._id?.toString());
  const FINAL_KINDS = new Set(['canvas_html', 'structured', 'diagram', 'image_inline', 'plan_proposal']);
  const sinceSpawn = lastMessages.slice(0, idxSig);
  if (sinceSpawn.some(m => FINAL_KINDS.has(m.metadata?.kind))) {
    console.log(`[resume-parent] skip thread=${threadId} : livrable final déjà présent`);
    return;
  }

  // 5. Récupérer les résumés des jobs récents de la cascade (max 6)
  const recentJobs = await AiJob.find({
    threadId,
    type: 'subagent',
    status: { $in: ['completed', 'error'] },
    finishedAt: { $gte: new Date(Date.now() - 30 * 60_000) },
  }).sort({ finishedAt: -1 }).limit(6).lean();

  if (!recentJobs.length) return;

  const summaries = recentJobs.reverse().map((j, i) => {
    const subj = j.subagentInstructions ? j.subagentInstructions.slice(0, 120) : '(sans description)';
    const status = j.status === 'error' ? `❌ ${j.error || 'error'}` : '✅ terminé';
    const summary = (j.result?.summary || '').slice(0, 1500);
    return `### Job ${i + 1} — ${j.subagentType || 'subagent'} (${status})\n**Tâche :** ${subj}\n**Résultat :**\n${summary || '(vide)'}`;
  }).join('\n\n---\n\n');

  // Anti-boucle : ne pas resume plus de 2 fois sur un même thread dans la fenêtre
  const recentResumes = await AiMessage.countDocuments({
    threadId,
    role: 'system',
    'metadata.extra.kind': 'pipeline_resume',
    createdAt: { $gte: new Date(Date.now() - 5 * 60_000) },
  });
  if (recentResumes >= 2) {
    console.log(`[resume-parent] skip thread=${threadId} : trop de resumes récents (${recentResumes})`);
    return;
  }

  console.log(`[resume-parent] thread=${threadId} : ${recentJobs.length} subagents terminés, déclenchement du resume`);

  const resumePrompt = `Tous les sous-agents lancés sont terminés. Voici leurs résultats consolidés :

${summaries}

🎯 TÂCHE : finalise la livraison. INTERDICTIONS strictes :
- ❌ NE FAIS PAS de propose_plan (la planification est déjà passée, on est en finalisation)
- ❌ NE RELANCE PAS de spawn_subagent (les résultats sont déjà là)
- ❌ NE PARAPHRASE PAS les résumés ci-dessus

✅ Action attendue : APPELLE DIRECTEMENT le ou les tools de production qui livrent le résultat final. Choisis selon la demande initiale de l'utilisateur :
- Tableau comparatif → render_structured(layout='comparison_table', data={columns:[...], rows:[...]})
- Document Excel/PDF → generate_document puis project_write_file
- Visualisation 3D/dashboard → render_interactive_canvas
- Diagramme → generate_diagram
- Conclusion simple → écris 2-3 phrases en texte brut, c'est tout

Si tout est déjà livré (tu vois un widget canvas/structured/diagram dans le thread récent), conclus en 1-2 phrases. Sinon, produis le livrable IMMÉDIATEMENT à partir des données des résumés ci-dessus.`;

  try {
    // Crée un message system de tracking (anti-boucle + traçabilité)
    await AiMessage.create({
      threadId,
      role: 'system',
      content: '[Pipeline complete] resume auto déclenché',
      metadata: { kind: 'system_note', extra: { kind: 'pipeline_resume', jobIds: recentJobs.map(j => j.id) } },
    });

    // Crée un nouveau job agent_run qui reprend le thread avec le prompt resume
    const { newId } = require('../../utils/ids');
    const resumeJob = await AiJob.create({
      id: newId('aij_'),
      threadId,
      workspaceId: job.workspaceId,
      userId: job.userId,
      companyId: job.companyId,
      type: 'agent_run',
      status: 'queued',
      mode: job.mode || 'project',
      maxLoops: 20,
    });

    emitThreadEvent(String(threadId), {
      type: 'ai.resume.started',
      jobId: resumeJob.id,
      reason: 'pipeline_complete',
      childCount: recentJobs.length,
    });

    // Lance asynchrone (setImmediate) — pas await pour ne pas bloquer ce hook
    setImmediate(() => {
      const { runJob } = module.exports;
      runJob(resumeJob.id, {
        prompt: resumePrompt,
        // Bloque les tools de planification/spawn : on est en mode finalisation,
        // pas en mode "réfléchir et lancer encore plus de sous-tâches".
        toolsDenied: ['propose_plan', 'spawn_subagent', 'compact_and_transfer', 'research_deep'],
      }).catch(e => console.error(`[resume-parent] runJob failed:`, e?.message));
    });
  } catch (e) {
    console.error('[resume-parent] failed:', e?.message);
  }
}

/**
 * Resume a stalled job. Rebuilds conversation from job.transcript and calls
 * runJob — which will pick up with the remaining loops.
 */
async function resumeJob(jobId) {
  const job = await AiJob.findOne({ id: jobId });
  if (!job) throw new Error(`resumeJob: job ${jobId} not found`);
  if (job.status === 'completed' || job.status === 'cancelled') return;

  // Flip to queued → runJob will re-transition
  job.status = 'queued';
  await job.save();
  emitJobEvent(jobId, { type: 'job.status', status: 'queued', reason: 'resumed' });

  // Pour un subagent, on rebuild les opts (tools/autonomy/systemPrompt) depuis
  // sa définition typeDef — sinon le subagent relancé perd ses tools et tombe
  // sur un set par défaut incompatible avec son rôle.
  let opts = {};
  if (job.type === 'subagent' && job.subagentType) {
    try {
      const { getSubagentType } = require('../subagent/types');
      const typeDef = getSubagentType(job.subagentType);
      if (typeDef) {
        opts = {
          subagentType: job.subagentType,
          systemPromptOverride: typeDef.systemPrompt,
          toolsAllowed: typeDef.toolsAllowed,
          toolsDenied: typeDef.toolsDenied || null,
          forcedAutonomy: typeDef.forcedAutonomy || null,
          // prompt omis volontairement : runJob utilisera job.subagentInstructions
          // (contient l'enrichedPrompt avec blocs CONTEXTE si persisté).
        };
      }
    } catch (e) {
      console.warn(`[job-runner] resumeJob: typeDef rebuild failed for ${job.subagentType}:`, e?.message);
    }
  }

  return runJob(jobId, opts);
}

async function pauseJob(jobId) {
  await AiJob.updateOne({ id: jobId }, { $set: { status: 'paused' } });
  emitJobEvent(jobId, { type: 'job.status', status: 'paused' });
}

async function cancelJob(jobId) {
  const visited = new Set();
  const queue = [jobId];
  const cancelled = [];
  const NON_TERMINAL = new Set(['queued', 'running', 'waiting_dependency', 'waiting_permission', 'paused']);

  while (queue.length) {
    const id = queue.shift();
    if (!id || visited.has(id)) continue;
    visited.add(id);

    const job = await AiJob.findOne({ id }, 'id status threadId').lean();
    if (!job) continue;
    if (!NON_TERMINAL.has(job.status)) continue;

    await AiJob.updateOne(
      { id },
      { $set: { status: 'cancelled', finishedAt: new Date(), error: 'cancelled_by_user' } }
    );
    cancelled.push({ id, threadId: job.threadId });
    emitJobEvent(id, { type: 'job.status', status: 'cancelled' });

    // Cascade : tous les jobs children (parentJobId) OU qui dépendent de celui-ci
    const children = await AiJob.find({
      $or: [
        { parentJobId: id },
        { dependsOn: id },
      ],
      status: { $in: ['queued', 'running', 'waiting_dependency', 'waiting_permission', 'paused'] },
    }, 'id').lean();
    for (const c of children) queue.push(c.id);
  }

  // Met à jour les tasks du canvas pour chaque job annulé
  try {
    const AiCanvasState = require('../../db/models/ai-canvas-state.model');
    for (const { id, threadId } of cancelled) {
      if (!threadId) continue;
      await AiCanvasState.updateOne(
        { threadId, 'tasks.jobId': id },
        { $set: { 'tasks.$.status': 'cancelled', 'tasks.$.finishedAt': new Date() } }
      );
      await AiCanvasState.updateOne(
        { threadId, 'tasks.id': id },
        { $set: { 'tasks.$.status': 'cancelled', 'tasks.$.finishedAt': new Date() } }
      );
      // Emet event live pour que le canvas UI actualise
      emitThreadEvent(String(threadId), {
        type: 'canvas.task.update',
        taskId: id,
        status: 'cancelled',
        finishedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error('[job-runner] cancelJob canvas update failed:', e?.message);
  }

  return { cancelledCount: cancelled.length, cancelledIds: cancelled.map(c => c.id) };
}

/**
 * Poll a job until it reaches a terminal state (completed/error/cancelled).
 * Used by subagent dependency orchestration. Debounced at 1Hz to avoid DB
 * hammering; timeout defaults to 10 min.
 *
 * @param {string} jobId - AiJob.id (short ID)
 * @param {number} [timeoutMs=600000]
 * @returns {Promise<{id:string, status:string, result?:any, error?:string}>}
 */
async function waitForJobCompletion(jobId, timeoutMs = 60 * 60_000) {
  console.log(`[wait-job] start job=${jobId} timeout=${timeoutMs}ms`);
  if (!jobId) return { id: jobId, status: 'error', error: 'missing_jobId' };
  const TERMINAL = new Set(['completed', 'error', 'cancelled']);
  const deadline = Date.now() + Math.max(1000, timeoutMs);
  while (Date.now() < deadline) {
    try {
      const job = await AiJob.findOne({ id: jobId }, 'id status result error').lean();
      if (!job) return { id: jobId, status: 'error', error: 'not_found' };
      if (TERMINAL.has(job.status)) {
        return { id: jobId, status: job.status, result: job.result || null, error: job.error || null };
      }
    } catch (e) {
      console.error('[job-runner] waitForJobCompletion lookup error:', e?.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.warn(`[wait-job] TIMEOUT job=${jobId} après ${timeoutMs}ms`);
  return { id: jobId, status: 'error', error: 'timeout' };
}

module.exports = {
  createJob,
  runJob,
  resumeJob,
  pauseJob,
  cancelJob,
  waitForJobCompletion,
  onJobEvent,
};
