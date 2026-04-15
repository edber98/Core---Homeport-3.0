// Subagent runner — spawn nested AI jobs under a parent job.
//
// Each subagent runs as its own AiJob with type='subagent' and parentJobId set
// to the spawning job. We cap recursion depth via AI_MAX_SUBAGENT_DEPTH.

const AiJob = require('../../db/models/ai-job.model');
const SUBAGENT_TYPES = require('./types');
const { emitThreadEvent } = require('../jobs/job-events');
const AiCanvasState = require('../../db/models/ai-canvas-state.model');

const DEFAULT_MAX_DEPTH = Number(process.env.AI_MAX_SUBAGENT_DEPTH || 3);

/**
 * Spawn a subagent. If `parallel` is an array, spawn N in parallel.
 *
 * @param {object} opts
 * @param {string} opts.parentJobId
 * @param {string} opts.subagentType - research | file_analyzer | doc_writer | general
 * @param {string} opts.prompt
 * @param {string[]} [opts.toolsAllowed]
 * @param {number} [opts.maxLoops]
 * @param {object} [opts.contextSlice]
 * @param {Array}  [opts.parallel] - if provided, array of { subagentType, prompt, ... } specs
 * @returns {Promise<object|object[]>} job summary (or array if parallel)
 */
async function spawnSubagent(opts) {
  const {
    parentJobId, subagentType, prompt,
    toolsAllowed, maxLoops, contextSlice,
    parallel, depth,
    depends_on, input_from,
    parentBroadcast,
  } = opts;
  // Feature flag rollback : force mode sync si variable env activée.
  const asyncMode = process.env.AI_DISABLE_SUBAGENT_ASYNC === '1' ? false : (opts.async === true);

  if (Array.isArray(parallel) && parallel.length) {
    const parent = await _loadParent(parentJobId);
    const baseDepth = (parent?.depth ?? depth ?? 0) + 1;
    if (baseDepth > DEFAULT_MAX_DEPTH) {
      return parallel.map(() => ({
        ok: false,
        error: `subagent_depth_exceeded (${DEFAULT_MAX_DEPTH})`,
      }));
    }
    const results = await Promise.all(parallel.map(p => _spawnOne({
      parentJobId,
      subagentType: p.subagentType || subagentType,
      prompt: p.prompt,
      toolsAllowed: p.toolsAllowed || toolsAllowed,
      maxLoops: p.maxLoops || maxLoops,
      contextSlice: p.contextSlice || contextSlice,
      depth: baseDepth,
      async: p.async === true || asyncMode === true,
      depends_on: p.depends_on || depends_on,
      input_from: p.input_from || input_from,
      parentBroadcast,
    })));
    return results;
  }

  const parent = await _loadParent(parentJobId);
  const effectiveDepth = (parent?.depth ?? depth ?? 0) + 1;
  if (effectiveDepth > DEFAULT_MAX_DEPTH) {
    return { ok: false, error: `subagent_depth_exceeded (${DEFAULT_MAX_DEPTH})` };
  }

  return _spawnOne({
    parentJobId, subagentType, prompt, toolsAllowed, maxLoops, contextSlice,
    depth: effectiveDepth,
    async: asyncMode === true,
    depends_on, input_from,
    parentBroadcast,
  });
}

async function _loadParent(parentJobId) {
  if (!parentJobId) return null;
  const { Types } = require('mongoose');
  try {
    // Accepte _id (ObjectId string) OU id (short ID)
    if (Types.ObjectId.isValid(parentJobId)) {
      const byId = await AiJob.findById(parentJobId).lean();
      if (byId) return byId;
    }
    return await AiJob.findOne({ id: parentJobId }).lean();
  } catch { return null; }
}

async function _spawnOne(opts) {
  const {
    parentJobId, subagentType, prompt,
    toolsAllowed, maxLoops, contextSlice, depth,
    async: asyncMode,
    depends_on, input_from,
    parentBroadcast,
  } = opts;

  const typeDef = SUBAGENT_TYPES[subagentType];
  if (!typeDef) {
    return { ok: false, error: `unknown_subagent_type:${subagentType}` };
  }

  const parent = await _loadParent(parentJobId);
  if (!parent) {
    return { ok: false, error: 'parent_job_not_found' };
  }

  const hasDeps = Array.isArray(depends_on) && depends_on.length > 0;
  const initialStatus = hasDeps ? 'waiting_dependency' : 'queued';

  const job = await AiJob.create({
    threadId: parent.threadId,
    workspaceId: parent.workspaceId,
    userId: parent.userId,
    companyId: parent.companyId,
    type: 'subagent',
    status: initialStatus,
    mode: parent.mode,
    parentJobId,
    depth,
    agentId: parent.agentId,
    subagentType,
    subagentInstructions: prompt,
    maxLoops: maxLoops || 20,
    ...(hasDeps ? { dependsOn: depends_on } : {}),
  });

  // Broadcast canvas.task.create pour que le canvas « Agents » du parent affiche
  // immédiatement le nouveau sous-agent.
  const threadKey = parent.threadId ? String(parent.threadId) : null;
  const parentKey = parent.id || String(parent._id);
  const taskCreate = {
    type: 'canvas.task.create',
    task: {
      id: job.id,
      jobId: job.id,
      subject: (prompt || '').slice(0, 180),
      subagentType,
      status: initialStatus,
      parentJobId: parentKey,
      startedAt: new Date().toISOString(),
      prompt: (prompt || '').slice(0, 500),
      depth,
      ...(hasDeps ? { dependsOn: depends_on } : {}),
    },
    _jobId: job.id,
    _parentJobId: parentKey,
    _subagentEvent: true,
  };
  if (threadKey) emitThreadEvent(threadKey, taskCreate);
  try { await _persistTaskCreate(parent.threadId, taskCreate.task); } catch {}

  const emitUpdate = (status, extras = {}) => {
    const ev = {
      type: 'canvas.task.update',
      taskId: job.id,
      status,
      ...extras,
      _jobId: job.id,
      _parentJobId: parentKey,
      _subagentEvent: true,
    };
    if (threadKey) emitThreadEvent(threadKey, ev);
    _persistTaskUpdate(parent.threadId, job.id, status, extras).catch(() => {});
    // Remonte aussi au broadcast parent si fourni (visibilité UI)
    if (typeof parentBroadcast === 'function') {
      try { parentBroadcast(ev); } catch { /* non-fatal */ }
    }
  };

  // ── ASYNC MODE : lance en background, retourne immédiatement ─────
  if (asyncMode === true) {
    setImmediate(() => {
      _runSubagentJob({
        job, parent, typeDef, subagentType,
        toolsAllowed, contextSlice, prompt,
        depends_on, input_from,
        emitUpdate, parentBroadcast,
      }).catch((e) => {
        console.error('[sub-runner] async run failed:', e?.message);
      });
    });
    return {
      ok: true,
      async: true,
      jobId: job.id,
      subagentType,
      depth,
      status: initialStatus,
      ...(hasDeps ? { dependsOn: depends_on } : {}),
      summary: null,
      artifacts: [],
    };
  }

  // ── SYNC MODE : attend la complétion du subagent ─────────────────
  const final = await _runSubagentJob({
    job, parent, typeDef, subagentType,
    toolsAllowed, contextSlice, prompt,
    depends_on, input_from,
    emitUpdate, parentBroadcast,
  });
  return final;
}

/**
 * Coeur d'exécution d'un subagent : attente des dépendances, enrichissement
 * du prompt via input_from, puis runJob. Renvoie un summary standardisé.
 */
async function _runSubagentJob({
  job, parent, typeDef, subagentType,
  toolsAllowed, contextSlice, prompt,
  depends_on, input_from,
  emitUpdate, parentBroadcast,
}) {
  const startedAt = Date.now();
  const hasDeps = Array.isArray(depends_on) && depends_on.length > 0;

  // 1. Attente des dépendances (si présentes)
  if (hasDeps) {
    try {
      const { waitForJobCompletion } = require('../jobs/job-runner');
      const deps = await Promise.all(
        depends_on.map(id => waitForJobCompletion(id, 600_000))
      );
      const failed = deps.find(d => d.status === 'error' || d.status === 'cancelled');
      if (failed) {
        const errMsg = `dependency_failed:${failed.id}:${failed.error || failed.status}`;
        await AiJob.updateOne({ id: job.id }, {
          $set: { status: 'error', error: errMsg, finishedAt: new Date() },
        }).catch(() => {});
        emitUpdate('error', { error: errMsg, duration: Date.now() - startedAt });
        return {
          ok: false,
          jobId: job.id,
          subagentType,
          depth: job.depth,
          status: 'error',
          error: errMsg,
          summary: null,
          artifacts: [],
        };
      }
    } catch (e) {
      const errMsg = `dependency_wait_failed:${e?.message || e}`;
      await AiJob.updateOne({ id: job.id }, {
        $set: { status: 'error', error: errMsg, finishedAt: new Date() },
      }).catch(() => {});
      emitUpdate('error', { error: errMsg, duration: Date.now() - startedAt });
      return { ok: false, jobId: job.id, status: 'error', error: errMsg, summary: null, artifacts: [] };
    }
  }

  // 2. Construit le prompt enrichi à partir de input_from
  let enrichedPrompt = prompt;
  if (input_from) {
    try {
      let sourceIds = [];
      if (input_from === 'all_siblings' || input_from === 'all_above') {
        const siblingQuery = { parentJobId: job.parentJobId };
        if (input_from === 'all_above') {
          siblingQuery.createdAt = { $lt: job.createdAt };
        } else {
          siblingQuery._id = { $ne: job._id };
        }
        const siblings = await AiJob.find(siblingQuery, 'id').sort({ createdAt: 1 }).lean();
        sourceIds = siblings.map(s => s.id);
      } else if (Array.isArray(input_from)) {
        sourceIds = input_from.filter(Boolean);
      } else if (typeof input_from === 'string') {
        sourceIds = [input_from];
      }
      if (sourceIds.length) {
        const sources = await AiJob.find(
          { id: { $in: sourceIds } },
          'id subagentType result status error'
        ).lean();
        const contextBlocks = sourceIds.map(sid => {
          const s = sources.find(x => x.id === sid);
          if (!s) return `=== Résultat ${sid} (introuvable) ===\n[vide]`;
          const summary = s.status === 'error'
            ? `[erreur: ${s.error || 'unknown'}]`
            : (s.result?.summary || '[vide]');
          return `=== Résultat ${s.subagentType || 'job'} (${s.id}) ===\n${summary}`;
        }).join('\n\n');
        enrichedPrompt = `CONTEXTE (résultats des étapes précédentes) :\n\n${contextBlocks}\n\n===\n\n${prompt}`;
      }
    } catch (e) {
      console.error('[sub-runner] input_from enrichment failed:', e?.message);
      // Non-fatal : on continue avec le prompt brut
    }
  }

  // 3. Transition → running
  try {
    await AiJob.updateOne({ id: job.id }, {
      $set: { status: 'running', startedAt: new Date() },
    });
  } catch { /* non-fatal */ }
  emitUpdate('running');

  // 4. Exécute le job avec le prompt enrichi
  let runError = null;
  try {
    const { runJob } = require('../jobs/job-runner');
    await runJob(job.id, {
      subagentType,
      systemPromptOverride: typeDef.systemPrompt,
      toolsAllowed: toolsAllowed || typeDef.toolsAllowed,
      toolsDenied: typeDef.toolsDenied || null,
      forcedAutonomy: typeDef.forcedAutonomy || null,
      prompt: enrichedPrompt,
      contextSlice,
    });
  } catch (e) {
    runError = e?.message || String(e);
    await AiJob.updateOne({ id: job.id }, {
      $set: { status: 'error', error: runError, finishedAt: new Date() },
    }).catch(() => {});
  }

  const duration = Date.now() - startedAt;
  emitUpdate(runError ? 'error' : 'completed', {
    duration,
    ...(runError ? { error: runError } : {}),
  });

  // 5. Relit le job final pour récupérer summary + artifacts
  const finalJob = await AiJob.findOne({ id: job.id }).lean();
  return {
    ok: !runError,
    jobId: job.id,
    subagentType,
    depth: job.depth,
    status: finalJob?.status || 'error',
    summary: finalJob?.result?.summary || null,
    artifacts: finalJob?.result?.artifacts || [],
    error: runError,
  };
}

async function _persistTaskCreate(threadId, task) {
  if (!threadId || !task?.id) return;
  await AiCanvasState.updateOne(
    { threadId },
    { $pull: { tasks: { id: task.id } }, $setOnInsert: { threadId } },
    { upsert: true }
  );
  await AiCanvasState.updateOne(
    { threadId },
    {
      $push: {
        tasks: {
          $each: [{
            id: task.id,
            jobId: task.jobId || task.id,
            subject: task.subject || '',
            description: task.prompt || '',
            status: task.status || 'queued',
            parentTaskId: task.parentJobId,
            startedAt: task.startedAt ? new Date(task.startedAt) : new Date(),
            toolCalls: [],
          }],
          $slice: -200,
        },
      },
    }
  );
}

async function _persistTaskUpdate(threadId, taskId, status, extras = {}) {
  if (!threadId || !taskId) return;
  const set = {};
  if (status) set['tasks.$.status'] = status;
  if (extras.duration != null) set['tasks.$.duration'] = extras.duration;
  if (extras.error) set['tasks.$.error'] = extras.error;
  if (status === 'completed' || status === 'error') {
    set['tasks.$.finishedAt'] = new Date();
  }
  if (Object.keys(set).length) {
    await AiCanvasState.updateOne(
      { threadId, 'tasks.id': taskId },
      { $set: set }
    );
  }
}

module.exports = { spawnSubagent, SUBAGENT_TYPES, DEFAULT_MAX_DEPTH };
