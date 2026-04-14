// Subagent runner — spawn nested AI jobs under a parent job.
//
// Each subagent runs as its own AiJob with type='subagent' and parentJobId set
// to the spawning job. We cap recursion depth via AI_MAX_SUBAGENT_DEPTH.

const AiJob = require('../../db/models/ai-job.model');
const SUBAGENT_TYPES = require('./types');

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
  } = opts;

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
  });
}

async function _loadParent(parentJobId) {
  if (!parentJobId) return null;
  try { return await AiJob.findOne({ id: parentJobId }).lean(); }
  catch { return null; }
}

async function _spawnOne(opts) {
  const {
    parentJobId, subagentType, prompt,
    toolsAllowed, maxLoops, contextSlice, depth,
  } = opts;

  const typeDef = SUBAGENT_TYPES[subagentType];
  if (!typeDef) {
    return { ok: false, error: `unknown_subagent_type:${subagentType}` };
  }

  const parent = await _loadParent(parentJobId);
  if (!parent) {
    return { ok: false, error: 'parent_job_not_found' };
  }

  const job = await AiJob.create({
    threadId: parent.threadId,
    workspaceId: parent.workspaceId,
    userId: parent.userId,
    companyId: parent.companyId,
    type: 'subagent',
    status: 'queued',
    mode: parent.mode,
    parentJobId,
    depth,
    agentId: parent.agentId,
    subagentType,
    subagentInstructions: prompt,
    maxLoops: maxLoops || 20,
  });

  // Launch async — runJob handles its own state transitions.
  // We lazy-require to avoid circular deps between job-runner and sub-runner.
  setImmediate(async () => {
    try {
      const { runJob } = require('../jobs/job-runner');
      await runJob(job.id, {
        subagentType,
        systemPromptOverride: typeDef.systemPrompt,
        toolsAllowed: toolsAllowed || typeDef.toolsAllowed,
        toolsDenied: typeDef.toolsDenied || null,
        forcedAutonomy: typeDef.forcedAutonomy || null,
        prompt,
        contextSlice,
      });
    } catch (e) {
      await AiJob.updateOne({ id: job.id }, {
        $set: {
          status: 'error',
          error: e?.message || String(e),
          finishedAt: new Date(),
        },
      }).catch(() => {});
    }
  });

  return {
    ok: true,
    jobId: job.id,
    subagentType,
    depth,
    status: 'queued',
  };
}

module.exports = { spawnSubagent, SUBAGENT_TYPES, DEFAULT_MAX_DEPTH };
