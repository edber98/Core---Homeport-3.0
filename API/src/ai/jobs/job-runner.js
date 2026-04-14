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
    maxLoops: maxLoops || 40,
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
    const enriched = {
      ...event,
      _jobId: jobId,
      _subagentType: job.subagentType || null,
      _agentLabel: job.subagentType ? `Sous-agent ${job.subagentType}` : 'Agent principal',
    };
    if (!enriched.type.startsWith('heartbeat')) {
      AiJob.updateOne(
        { id: jobId },
        { $push: { sideEvents: { $each: [enriched], $slice: -200 } } },
      ).catch(() => {});
    }
    emitJobEvent(jobId, enriched);
    // Forward vers le thread bus pour que les SSE actifs du thread reçoivent
    // les events des subagents (canvas.*, ai.permission.*, etc.)
    if (job.threadId) {
      emitThreadEvent(String(job.threadId), enriched);
    }
    // Persist canvas.* events dans AiCanvasState pour l'UI après reload
    if (enriched.type.startsWith('canvas.')) {
      persistCanvasEvent(enriched).catch(() => {});
    }
  }

  async function persistCanvasEvent(event) {
    const AiCanvasState = require('../../db/models/ai-canvas-state.model');
    const threadId = job.threadId;
    if (!threadId) return;
    const update = { $set: {}, $setOnInsert: { threadId } };
    if (event.type === 'canvas.research.step') {
      await AiCanvasState.updateOne(
        { threadId },
        { $push: { 'research.steps': { $each: [{
          id: event.id || `${jobId}_${Date.now()}`,
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
    } else if (event.type === 'canvas.task.create' || event.type === 'canvas.task.update') {
      // géré côté SSE handler si besoin
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
      threadId: String(job.threadId),
    };

    // Build messages: resume from transcript or build from prompt
    let messages;
    if (job.transcript?.length) {
      messages = job.transcript;
    } else if (opts.prompt) {
      messages = [{ role: 'user', content: opts.prompt }];
    } else {
      // Default: load thread history
      const history = await AiMessage.find({ threadId: job.threadId })
        .sort({ createdAt: 1 }).limit(60).lean();
      messages = history.map(m => ({ role: m.role, content: m.content || '' }));
    }

    const mode = job.mode || thread.mode || 'chat';
    const agentOverrides = {
      blockedTools: opts.toolsDenied || null,
      maxToolLoops: job.maxLoops || 40,
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
    await AiJob.updateOne({ id: jobId }, {
      $set: {
        status: 'completed',
        finishedAt: new Date(),
        usage: totalUsage,
        result: {
          summary: finalText.slice(0, 4000),
          artifacts: toolCalls.slice(-20),
        },
      },
    });

    // If subagent, write a summary message to thread for visibility
    if (job.type === 'subagent') {
      try {
        await AiMessage.create({
          threadId: job.threadId,
          role: 'system',
          content: `[Subagent ${job.subagentType || ''} terminé]\n${finalText.slice(0, 1500)}`,
          metadata: { kind: 'system_note', extra: { jobId, subagent: true } },
        });
      } catch { /* non-fatal */ }
    }

    emitJobEvent(jobId, { type: 'job.status', status: 'completed', usage: totalUsage });
    return { ok: true, jobId, usage: totalUsage, summary: finalText };
  } catch (e) {
    await AiJob.updateOne({ id: jobId }, {
      $set: {
        status: 'error',
        finishedAt: new Date(),
        error: e?.message || String(e),
      },
    });
    emitJobEvent(jobId, { type: 'job.status', status: 'error', error: e?.message });
    throw e;
  } finally {
    clearInterval(heartbeatTimer);
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

  return runJob(jobId);
}

async function pauseJob(jobId) {
  await AiJob.updateOne({ id: jobId }, { $set: { status: 'paused' } });
  emitJobEvent(jobId, { type: 'job.status', status: 'paused' });
}

async function cancelJob(jobId) {
  await AiJob.updateOne({ id: jobId }, {
    $set: { status: 'cancelled', finishedAt: new Date() },
  });
  emitJobEvent(jobId, { type: 'job.status', status: 'cancelled' });
}

module.exports = {
  createJob,
  runJob,
  resumeJob,
  pauseJob,
  cancelJob,
  onJobEvent,
};
