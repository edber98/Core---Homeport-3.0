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

function _buildJobContext(job, ac, opts = {}) {
  const jobId = job.id;
  const streamingMessageId = opts.streamingMessageId || null;

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

  // Agrégation des text deltas : on flush en 1 seul sideEvent par "paragraphe"
  // (500ms d'inactivité). Évite 200+ DB writes concurrents par subagent qui
  // saturent le pool MongoDB et bloquent tout le process Node.
  let _textBuffer = '';
  let _textBufferStart = null;
  let _textFlushTimer = null;
  const _flushTextBuffer = () => {
    if (!_textBuffer) return;
    const text = _textBuffer;
    const at = _textBufferStart;
    _textBuffer = '';
    _textBufferStart = null;
    if (_textFlushTimer) { clearTimeout(_textFlushTimer); _textFlushTimer = null; }
    const isSubagent = !!job.parentJobId;
    AiJob.updateOne(
      { id: jobId },
      { $push: { sideEvents: { $each: [{
        type: 'message',
        text,
        at,
        _jobId: jobId,
        _subagentType: job.subagentType || null,
        ...(isSubagent ? { _subagentEvent: true, _parentJobId: String(job.parentJobId) } : {}),
      }], $slice: -200 } } },
    ).catch(() => {});
  };

  // Events à NE PAS persister dans sideEvents : ce sont des deltas streaming
  // ultra-fréquents (chaque char, chaque patch) qui n'apportent rien à la
  // reconstruction d'historique. Ils restent émis en live via emitJobEvent
  // pour le stream UI temps réel — juste pas stockés.
  const SKIP_PERSIST_TYPES = new Set([
    'tool.input_delta',
    'ui.preview.delta',
    'ui.preview.start',
    'ui.preview.building_done',
    'ui.preview.update',
    'tool.meta',
  ]);

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
    // Text deltas (message.text) : agrégés + flush toutes les 500ms.
    // Deltas streaming (tool.input_delta, ui.preview.*) : PAS persistés.
    // Events significatifs (tool.start, tool.end, status, done) : persistés normalement.
    if (enriched.type === 'message' && typeof enriched.text === 'string') {
      if (!_textBuffer) _textBufferStart = new Date();
      _textBuffer += enriched.text;
      if (!_textFlushTimer) _textFlushTimer = setTimeout(_flushTextBuffer, 500);
    } else if (!enriched.type.startsWith('heartbeat') && !SKIP_PERSIST_TYPES.has(enriched.type)) {
      if (_textBuffer) _flushTextBuffer();
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
      // Forward des events tool/message pour les agent_run NON-subagent. Deux cas :
      //   (a) jobs avec streamingMessageId → forward TOUS les deltas (text, input_delta)
      //       pour updater le placeholder en live côté frontend.
      //   (b) jobs sans streaming → forward juste les snapshots tool.start/tool.end.
      let isParentResumeStream = false;
      if (!isSubagent && job.type === 'agent_run') {
        if (streamingMessageId) {
          // Mode streaming complet : tout sauf les events très verbeux internes harness
          isParentResumeStream = (
            t === 'message' ||
            t === 'tool.start' || t === 'tool.end' || t === 'tool.input_delta' ||
            t === 'tool.meta' || t === 'done'
          );
        } else {
          isParentResumeStream = (
            t === 'tool.start' || t === 'tool.end' || t === 'tool.meta' || t === 'done'
          );
        }
      }
      if (isUIEvent || isParentResumeStream) {
        // Pour les events de streaming placeholder, on tag avec messageId
        // pour que le frontend sache sur quel message append.
        const payload = streamingMessageId && isParentResumeStream
          ? { ...enriched, _streamingMessageId: streamingMessageId }
          : enriched;
        emitThreadEvent(String(job.threadId), payload);
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
    subagentType: job.subagentType || null,
    jobType: job.type || null,
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
  const jobContext = _buildJobContext(job, ac, {
    streamingMessageId: opts._streamingMessageId || null,
  });

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
    } else if (job.type === 'subagent' && job.subagentInstructions) {
      // Subagent resumé (resumeJob sans opts) : utilise l'enrichedPrompt
      // persisté par sub-runner (contient les blocs CONTEXTE des deps).
      // Sinon on tombait sur l'historique du thread parent et le subagent
      // disait "je n'ai pas les résultats upstream".
      messages = [{ role: 'user', content: job.subagentInstructions }];
    } else if (opts.prompt && opts._skipThreadHistory) {
      messages = [{ role: 'user', content: opts.prompt }];
    } else if (opts.prompt) {
      // Resume parent (ou nouveau agent_run avec prompt) : on charge l'historique
      // du thread (jusqu'à 60 msgs) + on append le nouveau prompt. Sinon le LLM
      // perd tout contexte de ce que le parent a déjà fait dans la conversation.
      // IMPORTANT : on filtre les messages à content VIDE (widgets sans texte,
      // system_notes, etc.). Anthropic rejette "text content blocks must be non-empty".
      const history = await AiMessage.find({ threadId: job.threadId })
        .sort({ createdAt: 1 }).limit(60).lean();
      messages = history
        .filter(m => (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim().length > 0)
        .map(m => ({ role: m.role, content: String(m.content).trim() }));
      messages.push({ role: 'user', content: opts.prompt });
    } else {
      // Default: load thread history — même filtre anti-empty.
      const history = await AiMessage.find({ threadId: job.threadId })
        .sort({ createdAt: 1 }).limit(60).lean();
      messages = history
        .filter(m => String(m.content || '').trim().length > 0)
        .map(m => ({ role: m.role, content: String(m.content).trim() }));
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

    // Collecte les widgets produits PAR CE JOB (via metadata.subagentJobId)
    // pour que le parent puisse les référencer via [[WIDGET:id]] dans sa synthèse.
    let producedWidgets = [];
    try {
      const widgetDocs = await AiMessage.find({
        threadId: job.threadId,
        'metadata.subagentJobId': String(jobId),
        'metadata.widgetId': { $exists: true, $ne: null },
      }, { 'metadata.widgetId': 1, 'metadata.kind': 1, content: 1, createdAt: 1 }).sort({ createdAt: 1 }).lean();
      producedWidgets = widgetDocs.map(d => ({
        widgetId: d.metadata?.widgetId,
        kind: d.metadata?.kind,
        title: (d.content || '').slice(0, 120),
      })).filter(w => w.widgetId);
    } catch (e) {
      console.warn('[job-runner] widget collection failed:', e?.message);
    }

    await AiJob.updateOne({ id: jobId }, {
      $set: {
        status: 'completed',
        finishedAt,
        usage: totalUsage,
        result: {
          summary: finalText.slice(0, 20_000),
          artifacts: toolCalls.slice(-20),
          widgets: producedWidgets,
        },
      },
    });

    // NB : l'ancien message role='system' "[Subagent ... terminé]" a été retiré
    // (doublon avec _maybeCreateAgentReport qui crée une vraie card agent_report
    // avec rendu markdown + artefacts + bouton). Supprimer le legacy évite le
    // "Contexte transféré" moche + bouton Voir à côté de la card.

    emitJobEvent(jobId, { type: 'job.status', status: 'completed', usage: totalUsage });

    // Sauvegarde le texte final comme AiMessage. Deux cas :
    //  (a) streamingMessageId fourni : on UPDATE le placeholder créé au début
    //      (plus de streaming → marque-le comme non-streaming, injecte le texte final).
    //  (b) pas de placeholder : on CREATE un nouvel AiMessage (comportement legacy).
    if (finalText.trim() && job.type === 'agent_run' && !opts._fromPostMessages) {
      try {
        const finalToolCalls = toolCalls.length ? toolCalls.map(tc => ({
          id: tc.id, name: tc.name, args: tc.args,
          result: tc.result, duration: tc.duration, status: tc.status,
          displayTitle: tc.displayTitle,
        })) : undefined;
        if (opts._streamingMessageId) {
          await AiMessage.updateOne(
            { _id: opts._streamingMessageId, threadId: job.threadId },
            {
              $set: {
                content: finalText.trim(),
                ...(finalToolCalls ? { toolCalls: finalToolCalls } : {}),
                'metadata.streaming': false,
                'metadata.finalizedAt': new Date(),
              },
            }
          );
          emitThreadEvent(String(job.threadId), {
            type: 'ai.message.updated',
            kind: null,
            messageId: String(opts._streamingMessageId),
          });
        } else {
          await AiMessage.create({
            threadId: job.threadId,
            role: 'assistant',
            content: finalText.trim(),
            toolCalls: finalToolCalls,
          });
          emitThreadEvent(String(job.threadId), { type: 'ai.message.created', kind: 'resume_final' });
        }
      } catch (e) {
        console.warn('[job-runner] resume final message persist failed:', e?.message);
      }
    }

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
  // Politique : TOUT subagent produit un rapport dans le chat, quelle que soit
  // la durée. L'utilisateur doit voir "Tim terminé / Marie terminée" dans la
  // conversation, pas seulement dans le panneau canvas à droite.
  // Les long_task aussi (agent_run étendu) génèrent un rapport.
  if (job.type !== 'subagent' && job.type !== 'long_task') return;
  const startedAt = job.startedAt || finishedAt;
  const duration = (finishedAt?.getTime() || Date.now()) - (startedAt?.getTime() || Date.now());
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

  // Enrichit le rapport avec le roster (Tim/Ada/Denis/...) pour que la card
  // affiche le nom et l'avatar au lieu de "research".
  let agentFields = {};
  try {
    const { getAgent } = require('../subagent/roster');
    const info = getAgent(job.subagentType);
    if (info) {
      agentFields = {
        agentName: info.name,
        agentEmoji: info.emoji,
        agentColor: info.color,
        agentTagline: info.tagline,
        agentFigure: info.figure,
      };
    }
  } catch { /* roster optionnel */ }

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
          ...agentFields,
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
  // On EXCLUT memory_extractor + project_doc_writer : ce sont des hooks
  // background silencieux qui tournent après chaque complétion de subagent.
  // Sans cette exclusion, ils bloqueraient le resume éternellement car chaque
  // complétion spawn un nouvel extracteur → le compteur ne descend jamais à 0.
  // Heartbeat timeout : au-delà de X ms sans heartbeat, un subagent "running"
  // est considéré mort. Override via env AI_SUBAGENT_HEARTBEAT_TIMEOUT_MS.
  // 3 min par défaut (2 min était trop agressif sur gros LLM calls Opus).
  const STALE_HB_MS = parseInt(process.env.AI_SUBAGENT_HEARTBEAT_TIMEOUT_MS || '180000', 10);
  const staleThreshold = new Date(Date.now() - STALE_HB_MS);
  const BACKGROUND_TYPES = ['memory_extractor', 'project_doc_writer'];

  // D2 : détecte et marque les subagents stalled (running sans heartbeat > 2min).
  // Avant de compter les actifs, on flip ces fantômes en status=stalled pour
  // qu'ils apparaissent comme tels dans l'UI et ne bloquent pas le resume.
  try {
    const stalled = await AiJob.updateMany(
      {
        threadId,
        type: 'subagent',
        _id: { $ne: job._id },
        subagentType: { $nin: BACKGROUND_TYPES },
        status: 'running',
        heartbeatAt: { $lt: staleThreshold },
      },
      { $set: { status: 'stalled', error: `heartbeat_timeout (>${STALE_HB_MS/1000}s)`, finishedAt: new Date() } }
    );
    if (stalled.modifiedCount > 0) {
      console.warn(`[resume-parent] marked ${stalled.modifiedCount} stalled subagent(s) on thread=${threadId}`);
    }
  } catch (e) {
    console.warn('[resume-parent] stalled detection failed:', e?.message);
  }

  const reallyActive = await AiJob.countDocuments({
    threadId,
    subagentType: { $nin: BACKGROUND_TYPES },
    type: 'subagent',
    _id: { $ne: job._id },
    status: { $in: ['queued', 'running', 'waiting_dependency', 'waiting_permission', 'paused'] },
    $or: [
      { status: { $in: ['queued', 'waiting_dependency', 'waiting_permission', 'paused'] } },
      { status: 'running', heartbeatAt: { $gte: staleThreshold } },
    ],
  });
  if (reallyActive > 0) {
    console.log(`[resume-parent] skip job=${job.id} : ${reallyActive} subagents encore actifs`);
    return;
  }

  // 2-4. On ne filtre PLUS par "significant message" ni par "hasSpawnedSubagents".
  // Avec le flow actuel (widget inline, agent_report, todo, permission_requests),
  // le dernier message parent "texte pur" peut être bien plus ancien que les 8
  // derniers messages. Skip trop fréquent → pas de resume quand des subagents
  // ont fini (ex: Tim timeout → user ne voit aucune synthèse finale).
  // La présence de recentJobs > 0 (étape 5) suffit comme trigger.

  // 5. Récupérer les résumés des jobs récents de la cascade.
  // Stratégie robuste : on prend TOUT ce qui est dans la fenêtre 60min
  // (threadId + type='subagent' + status completed/error/stalled).
  // Le filtrage par parentJobId était trop strict (format ObjectId vs string
  // custom → risque de rater des siblings si parentJobId mismatch).
  const parentKey = job.parentJobId ? String(job.parentJobId) : null;
  const recentJobs = await AiJob.find({
    threadId,
    type: 'subagent',
    status: { $in: ['completed', 'error', 'stalled'] },
    finishedAt: { $gte: new Date(Date.now() - 60 * 60_000) },
  }).sort({ finishedAt: -1 }).limit(10).lean();

  if (!recentJobs.length) {
    console.log(`[resume-parent] skip thread=${threadId} : aucun subagent récent trouvé (parentKey=${parentKey || 'n/a'})`);
    return;
  }
  console.log(`[resume-parent] thread=${threadId} found ${recentJobs.length} recent subagents: [${recentJobs.map(j => `${j.subagentType}:${j.status}`).join(', ')}]`);

  const summaries = recentJobs.reverse().map((j, i) => {
    const subj = j.subagentInstructions ? j.subagentInstructions.slice(0, 120) : '(sans description)';
    const status = j.status === 'error' ? `❌ ${j.error || 'error'}` : '✅ terminé';
    const summary = (j.result?.summary || '').slice(0, 4000);
    const widgets = Array.isArray(j.result?.widgets) ? j.result.widgets : [];
    const widgetBlock = widgets.length
      ? `\n**Widgets inline produits (référence-les avec [[WIDGET:id]]) :**\n${widgets.map(w => `- [[WIDGET:${w.widgetId}]] — ${w.kind} : ${w.title || '(sans titre)'}`).join('\n')}`
      : '';
    // Artefacts : fichiers produits (fileId/name/path), images, exports
    const artifacts = Array.isArray(j.result?.artifacts) ? j.result.artifacts : [];
    const fileArtifacts = [];
    for (const a of artifacts) {
      if (!a) continue;
      const tcResult = a.result;
      if (tcResult && typeof tcResult === 'object') {
        const produced = tcResult.producedFiles || tcResult._files || [];
        for (const f of produced) {
          if (f?.fileId || f?.path) {
            fileArtifacts.push({
              fileId: f.fileId || null,
              name: f.name || f.path || 'fichier',
              path: f.path || null,
              mimeType: f.mimeType || null,
            });
          }
        }
      }
    }
    const artifactBlock = fileArtifacts.length
      ? `\n**Fichiers/artefacts produits (display_file avec fileId pour afficher) :**\n${fileArtifacts.slice(0, 10).map(f => `- ${f.name}${f.fileId ? ` (fileId=${f.fileId})` : ''}${f.mimeType ? ` · ${f.mimeType}` : ''}`).join('\n')}`
      : '';
    return `### Job ${i + 1} — ${j.subagentType || 'subagent'} (${status})\n**Tâche :** ${subj}\n**Résultat complet du subagent :**\n${summary || '(vide)'}${widgetBlock}${artifactBlock}`;
  }).join('\n\n---\n\n');

  // Agrège tous les widgetIds produits par l'ensemble des subagents (pour
  // l'instruction finale au parent).
  const allWidgetIds = recentJobs.flatMap(j => (j.result?.widgets || []).map(w => w.widgetId)).filter(Boolean);

  // Détection "subagents research seulement" : aucun widget ni fichier produit.
  // Dans ce cas, le parent DOIT pouvoir générer le livrable (xlsx/pdf/diagram/etc.)
  // au lieu d'être bloqué en mode synthèse-texte. Sans ça, OpenAI notamment
  // abandonne en disant "tour verrouillé" et l'user n'a rien.
  const hasArtifactFiles = recentJobs.some(j => {
    const artifacts = Array.isArray(j.result?.artifacts) ? j.result.artifacts : [];
    return artifacts.some(a => {
      const tcResult = a?.result;
      if (!tcResult || typeof tcResult !== 'object') return false;
      const produced = tcResult.producedFiles || tcResult._files || [];
      return Array.isArray(produced) && produced.length > 0;
    });
  });
  const researchOnly = allWidgetIds.length === 0 && !hasArtifactFiles;

  // Anti-boucle : compter par parentJobId (= cascade isolée) au lieu du thread
  // entier. Sinon 4+ cascades parallèles indépendantes bloquent les autres
  // silencieusement quand le compteur thread-wide atteint 3.
  const antiLoopQuery = {
    threadId,
    role: 'system',
    'metadata.extra.kind': 'pipeline_resume',
    createdAt: { $gte: new Date(Date.now() - 5 * 60_000) },
    ...(parentKey ? { 'metadata.extra.parentJobId': parentKey } : {}),
  };
  const recentResumes = await AiMessage.countDocuments(antiLoopQuery);
  console.log(`[resume-parent] thread=${threadId} recentResumes=${recentResumes}/3 recentJobs=${recentJobs.length} parentKey=${parentKey || 'n/a'}`);
  if (recentResumes >= 3) {
    console.warn(`[resume-parent] HIT ANTI-LOOP thread=${threadId} parentKey=${parentKey} : ${recentResumes} resumes en 5min — cascade bloquée`);
    return;
  }

  console.log(`[resume-parent] thread=${threadId} : ${recentJobs.length} subagents terminés, déclenchement du resume`);

  // Récupère le dernier message user pour rappeler la demande originale
  let userRequest = '';
  try {
    const lastUser = await AiMessage.findOne({ threadId, role: 'user' }).sort({ createdAt: -1 }).lean();
    if (lastUser?.content) userRequest = String(lastUser.content).slice(0, 1000);
  } catch {}

  // Deux modes :
  //  (a) researchOnly=false : comportement HISTORIQUE. Subagents ont déjà produit
  //      des widgets/fichiers → synthèse stricte (todo_write + texte + [[WIDGET:id]]).
  //      C'est le golden path Claude, inchangé.
  //  (b) researchOnly=true : NOUVEAU. Aucun livrable concret produit (que de la
  //      recherche). Le parent doit pouvoir finir le job lui-même ou relancer un
  //      subagent pour la consolidation/génération manquante. Règle l'issue OpenAI
  //      qui dit "tour verrouillé" et abandonne.
  const resumePrompt = researchOnly
    ? `Tous les sous-agents de recherche sont terminés. **IMPORTANT : aucun livrable concret n'a encore été produit** (pas de widgets, pas de fichiers). Tu as les résultats de recherche, tu dois maintenant produire le livrable final demandé.

DEMANDE ORIGINALE :
${userRequest || '(non récupérée)'}

RÉSULTATS DES SOUS-AGENTS (à utiliser pour produire le livrable) :

${summaries}

TA MISSION :

1. Relis la checklist (\`todo_write\`). Marque \`completed\` ce qui est VRAIMENT fait. Marque \`cancelled\` avec \`errorReason\` ce qui a échoué (subagent en error, résultat vide). Ne masque JAMAIS un step non fait en le passant silencieusement à \`completed\`.

2. Pour chaque step qui reste nécessaire à la demande user :
   - Tâche de génération finale (xlsx / pdf / diagram / rapport structuré) → produis-la toi-même MAINTENANT : \`activate_capsule\` puis \`execute_code\` / \`render_structured\` / \`generate_document\` / \`display_file\`.
   - Recherche ou tâche spécialisée longue → \`spawn_subagent(async:true)\` avec les bons \`toolsAllowed\`. Le système te réveillera quand il aura fini.
   - Vraiment impossible → dis-le explicitement à l'user et marque le todo \`cancelled\` avec la raison.

3. Une fois le livrable produit, écris UN message final court (3-8 lignes) qui répond à la demande user, avec les widgets référencés via \`[[WIDGET:id]]\` inline.

⚠️ NE PAS abandonner en disant "tour verrouillé" — tu as tous les outils nécessaires.`
    : `Tous les sous-agents sont terminés. Tu es en MODE SYNTHÈSE VERROUILLÉ : tu peux UNIQUEMENT appeler \`todo_write\` et écrire du texte. Rien d'autre.

DEMANDE ORIGINALE :
${userRequest || '(non récupérée)'}

RÉSULTATS DES SOUS-AGENTS (tu as tout ce qu'il faut) :

${summaries}

${allWidgetIds.length ? `WIDGETS DÉJÀ PRODUITS (référence-les via [[WIDGET:id]] dans ton texte, NE LES RECRÉE PAS) :\n${allWidgetIds.map(w => `  [[WIDGET:${w}]]`).join('\n')}\n\n` : ''}TA MISSION (exactement 2 étapes) :

1. Appelle \`todo_write\` UNE fois : marque \`completed\` les steps VRAIMENT faits et \`cancelled\` avec \`errorReason\` les steps qui ont échoué. Ne masque JAMAIS un step non fait en le passant silencieusement à \`completed\`.

2. Écris UN message final à l'utilisateur, naturel et utile :
   - Place les \`[[WIDGET:id]]\` inline aux endroits pertinents (pas tous groupés à la fin).
   - Si beaucoup de widgets (10+), sélectionne les plus importants et dis "les autres sont dans les rapports Tim/Marie/Denis ci-dessus".
   - Réponds directement à la demande user avec les points-clés (pas une paraphrase des summaries).
   - Court et clair. 3-8 lignes suffisent sauf demande complexe.

Tu N'AS PAS accès à : spawn_subagent, render_structured, canvas_html, generate_diagram, display_file, display_image, execute_code, install_package, web_*, propose_plan, ask_user.
Si tu essaies d'en appeler un, il sera bloqué.`;

  try {
    // Crée un message system de tracking (anti-boucle + traçabilité)
    await AiMessage.create({
      threadId,
      role: 'system',
      content: '[Pipeline complete] resume auto déclenché',
      metadata: { kind: 'system_note', extra: { kind: 'pipeline_resume', parentJobId: parentKey || null, jobIds: recentJobs.map(j => j.id) } },
    });

    // Crée un nouveau job agent_run qui reprend le thread avec le prompt resume
    const { newId } = require('../../utils/ids');
    // maxLoops adaptatif :
    //  - researchOnly=false (synthèse texte) : 3 loops (todo_write + texte + marge).
    //  - researchOnly=true (finalisation) : 15 loops pour permettre
    //    activate_capsule + execute_code + display_file + spawn_subagent + retries.
    const resumeJob = await AiJob.create({
      id: newId('aij_'),
      threadId,
      workspaceId: job.workspaceId,
      userId: job.userId,
      companyId: job.companyId,
      type: 'agent_run',
      status: 'queued',
      mode: job.mode || 'project',
      maxLoops: researchOnly ? 15 : 3,
    });

    // PLACEHOLDER : message assistant vide créé à l'avance. PAS de metadata.kind
    // (sinon ai-message.component.ts le route vers un rendu spécial). Juste les
    // flags metadata.streaming + jobId pour tracer. Le frontend affiche la bulle
    // comme un message normal et y accumule les deltas live.
    const placeholder = await AiMessage.create({
      threadId,
      role: 'assistant',
      content: '',
      metadata: { streaming: true, resumeJobId: resumeJob.id },
    });

    emitThreadEvent(String(threadId), {
      type: 'ai.resume.started',
      jobId: resumeJob.id,
      reason: 'pipeline_complete',
      childCount: recentJobs.length,
      placeholderId: String(placeholder._id),
    });
    emitThreadEvent(String(threadId), {
      type: 'ai.message.created',
      kind: null,
      messageId: String(placeholder._id),
    });

    // toolsAllowed adaptatif :
    //  - researchOnly=false (HISTORIQUE, golden path Claude) → whitelist stricte :
    //    seul todo_write + send_message_to_agent. Zéro risque de doublon.
    //  - researchOnly=true (NOUVEAU, cas OpenAI "tour verrouillé") → set élargi :
    //    le parent peut spawn un subagent pour consolidation OU produire le
    //    livrable lui-même. Le prompt l'instruit de ne pas boucler.
    const resumeToolsAllowed = researchOnly
      ? [
          'todo_write', 'send_message_to_agent',
          'spawn_subagent',
          'activate_capsule',
          'render_structured', 'render_interactive_canvas',
          'generate_diagram', 'generate_document',
          'display_file', 'display_image',
          'execute_code', 'install_package', 'prepare_code_environment',
          'project_write_file', 'project_read_file', 'project_stage_for_sandbox',
        ]
      : ['todo_write', 'send_message_to_agent'];
    setImmediate(() => {
      const { runJob } = module.exports;
      runJob(resumeJob.id, {
        prompt: resumePrompt,
        toolsAllowed: resumeToolsAllowed,
        _streamingMessageId: String(placeholder._id),
        _resumeMode: true,
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
