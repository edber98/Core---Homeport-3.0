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
  const { getAgent } = require('./roster');
  const agentInfo = getAgent(subagentType);
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
      // Enrichissement roster (nom humain, emoji, couleur, figure historique)
      ...(agentInfo ? {
        agentName: agentInfo.name,
        agentEmoji: agentInfo.emoji,
        agentColor: agentInfo.color,
        agentTagline: agentInfo.tagline,
        agentFigure: agentInfo.figure,
      } : {}),
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
  let hasDeps = Array.isArray(depends_on) && depends_on.length > 0;

  // 0. Auto-détection : si aucun depends_on explicite mais des siblings sont
  // encore en cours (running/queued/waiting_dependency) à l'instant où CE
  // subagent démarre → le parent a probablement oublié `depends_on`.
  // On attend automatiquement les siblings actifs pour éviter qu'un
  // consolidateur parte avec un contexte vide et demande à l'user de coller
  // les résultats manuellement.
  if (!hasDeps && job.parentJobId) {
    try {
      const activeSiblings = await AiJob.find({
        parentJobId: job.parentJobId,
        _id: { $ne: job._id },
        createdAt: { $lt: job.createdAt }, // uniquement ceux créés AVANT
        status: { $in: ['running', 'queued', 'waiting_dependency', 'paused'] },
      }, 'id subagentType status').lean();

      if (activeSiblings.length > 0) {
        console.warn(`[sub-runner] ${subagentType} job=${job.id} : auto-wait ${activeSiblings.length} sibling(s) actif(s) (depends_on oublié par le parent) : ${activeSiblings.map(s => `${s.subagentType}:${s.id}`).join(', ')}`);
        depends_on = activeSiblings.map(s => s.id);
        hasDeps = true;
        // Persiste dependsOn sur le job pour cohérence UI + auto-injection input_from
        await AiJob.updateOne({ id: job.id }, {
          $set: {
            dependsOn: depends_on,
            status: 'waiting_dependency',
            autoWaitReason: 'sibling_jobs_active',
          },
        }).catch(() => {});
        emitUpdate('waiting_dependency', {
          reason: 'auto_wait_siblings',
          dependsOn: depends_on,
        });
      }
    } catch (e) {
      console.warn('[sub-runner] auto-wait siblings check failed:', e?.message);
    }
  }

  // 1. Attente des dépendances (si présentes)
  if (hasDeps) {
    try {
      const { waitForJobCompletion } = require('../jobs/job-runner');
      // Timeout 60 min par dep : un research profond + multiples web_fetch +
      // research_deep peut prendre 15-20 min. Pour 4 axes en // qui finissent
      // tous, la dernière dep peut être à 25-30 min. 60 min = marge confortable.
      // Override via env SUBAGENT_DEPS_TIMEOUT_MS (en millisecondes).
      const depTimeout = parseInt(process.env.SUBAGENT_DEPS_TIMEOUT_MS || String(60 * 60_000), 10);
      console.log(`[sub-runner] ${subagentType} job=${job.id} attend ${depends_on.length} dep(s) avec timeout=${depTimeout}ms`);
      const deps = await Promise.all(
        depends_on.map(id => waitForJobCompletion(id, depTimeout))
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
  // Fallback : si depends_on présent mais input_from oublié → on injecte
  // automatiquement les summaries des dépendances (le LLM oublie souvent).
  let effectiveInputFrom = input_from;
  if (!effectiveInputFrom && hasDeps) {
    effectiveInputFrom = depends_on;
    console.log(`[sub-runner] auto-injection input_from depuis depends_on (${depends_on.length} jobs) pour ${subagentType}`);
  }
  let enrichedPrompt = prompt;
  if (effectiveInputFrom) {
    try {
      let sourceIds = [];
      if (effectiveInputFrom === 'all_siblings' || effectiveInputFrom === 'all_above') {
        const siblingQuery = { parentJobId: job.parentJobId };
        if (effectiveInputFrom === 'all_above') {
          siblingQuery.createdAt = { $lt: job.createdAt };
        } else {
          siblingQuery._id = { $ne: job._id };
        }
        const siblings = await AiJob.find(siblingQuery, 'id').sort({ createdAt: 1 }).lean();
        sourceIds = siblings.map(s => s.id);
      } else if (Array.isArray(effectiveInputFrom)) {
        sourceIds = effectiveInputFrom.filter(Boolean);
      } else if (typeof effectiveInputFrom === 'string') {
        sourceIds = [effectiveInputFrom];
      }

      // Fallback : si l'une des formes sémantiques ('all_above'/'all_siblings')
      // retourne vide (ex: spawn depuis un chat sans jobContext → chaque appel
      // crée un ephemeralParent différent, donc pas de siblings communs), on
      // bascule sur depends_on explicite comme source. Ça sauve les cas où le
      // LLM a bien fait les deps mais choisi 'all_above' pour plus de souplesse.
      if (sourceIds.length === 0 && hasDeps) {
        console.warn(`[sub-runner] ${subagentType} job=${job.id} : '${effectiveInputFrom}' a retourné 0 siblings (parentJobId différent entre spawns ?). Fallback → depends_on=[${depends_on.join(',')}]`);
        sourceIds = depends_on.slice();
      }
      // Dédup : si hasDeps + input_from='all_above' pointent vers des jobs
      // qui se chevauchent (ex: auto-wait sibling ajoute D alors que deps=[A,B,C]
      // et D est aussi dans all_above), on évite d'inclure 2 fois la même source.
      sourceIds = Array.from(new Set(sourceIds.filter(Boolean)));

      console.log(`[sub-runner] enrich for ${subagentType} job=${job.id} : sourceIds=[${sourceIds.join(',')}]`);
      if (sourceIds.length) {
        const sources = await AiJob.find(
          { id: { $in: sourceIds } },
          'id subagentType result status error'
        ).lean();
        console.log(`[sub-runner] found ${sources.length}/${sourceIds.length} sources, summaries lengths: [${sources.map(s => (s.result?.summary || '').length).join(',')}]`);
        // Budget par source : pour ne pas dépasser le contexte LLM, on tronque
        // chaque résumé selon le nombre de sources (plus de sources = moins de
        // place chacune). Cible globale ~20k tokens (~70k chars).
        const TOTAL_CHAR_BUDGET = 70_000;
        const perSource = Math.floor(TOTAL_CHAR_BUDGET / Math.max(1, sourceIds.length));
        let emptyCount = 0;
        const contextBlocks = sourceIds.map(sid => {
          const s = sources.find(x => x.id === sid);
          if (!s) { emptyCount++; return `=== Résultat ${sid} (introuvable) ===\n[vide]`; }
          let summary = s.status === 'error'
            ? `[erreur: ${s.error || 'unknown'}]`
            : (s.result?.summary || '[vide]');
          if (!summary || summary === '[vide]' || /^\[erreur/.test(summary)) emptyCount++;
          if (summary.length > perSource) {
            summary = summary.slice(0, perSource) + `\n…[tronqué, ${summary.length - perSource} chars omis]`;
          }
          return `=== Résultat ${s.subagentType || 'job'} (${s.id}) ===\n${summary}`;
        }).join('\n\n');

        // Si toutes les sources sont vides/en erreur, on AVORTE le subagent
        // au lieu de le laisser tourner sur du vide (gaspille tokens + produit
        // du garbage). Le parent verra l'erreur propagée et pourra réagir.
        const allEmpty = sourceIds.length > 0 && emptyCount === sourceIds.length;
        if (allEmpty) {
          const errMsg = `dependency_failed: all upstream sources empty/errored (${emptyCount}/${sourceIds.length})`;
          console.warn(`[sub-runner] ABORT ${subagentType} job=${job.id} : ${errMsg}`);
          await AiJob.updateOne({ id: job.id }, {
            $set: {
              status: 'error',
              error: errMsg,
              finishedAt: new Date(),
              result: { summary: `Consolidation impossible : toutes les sources upstream sont vides ou en erreur (${emptyCount}/${sourceIds.length}). Sources : ${sourceIds.join(', ')}.` },
            },
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
        const preamble = `⚠️ INSTRUCTION CRITIQUE : Les blocs CONTEXTE ci-dessus sont TES inputs réels — tu les as déjà reçus. NE DEMANDE PAS à l'utilisateur de coller quoi que ce soit. Si un bloc est incomplet, fais avec ce que tu as. Ta sortie doit consommer DIRECTEMENT le contenu des blocs CONTEXTE.`;
        enrichedPrompt = `CONTEXTE (résultats des étapes précédentes) :\n\n${contextBlocks}\n\n===\n\n${preamble}\n\n===\n\n${prompt}`;
      }
    } catch (e) {
      console.error('[sub-runner] input_from enrichment failed:', e?.message);
      // Non-fatal : on continue avec le prompt brut
    }
  }

  // 3. Transition → running + persiste l'enrichedPrompt pour que resumeJob()
  // puisse le réutiliser en cas de stall/retry (sinon le subagent relancé
  // perd les blocs CONTEXTE et tombe sur l'historique du thread parent).
  try {
    await AiJob.updateOne({ id: job.id }, {
      $set: {
        status: 'running',
        startedAt: new Date(),
        subagentInstructions: enrichedPrompt,
      },
    });
  } catch { /* non-fatal */ }
  emitUpdate('running');

  // 4. Exécute le job avec le prompt enrichi (+ optionnel timeout dur par type)
  let runError = null;
  const runtimeLimit = typeDef.maxRuntimeMs || null;
  const runAc = new AbortController();
  let hardTimer = null;
  if (runtimeLimit) {
    hardTimer = setTimeout(() => {
      console.warn(`[sub-runner] HARD TIMEOUT (${runtimeLimit}ms) for ${subagentType} job ${job.id} → abort`);
      try { runAc.abort(); } catch {}
    }, runtimeLimit);
  }
  // Tools de LIVRAISON (visuel + fichiers) toujours dispo aux subagents.
  // Sans ça, un subagent comme Florence (dataviz) qui produit un xlsx via
  // execute_code ne peut pas l'uploader sur Nextcloud ni le display. Le
  // parent doit alors redemander manuellement, ce qui est une perte d'UX.
  // todo_write RESTE RETIRÉ : seul le parent gère la checklist principale.
  const WIDGET_TOOLS_ALWAYS_ALLOWED = [
    // Widgets visuels
    'render_structured', 'generate_diagram', 'render_interactive_canvas',
    'display_image', 'display_file',
    // Communication
    'send_message_to_agent',
    // Production / upload de fichiers (pour xlsx/docx/pptx/pdf)
    'project_write_file', 'project_stage_for_sandbox', 'project_read_file',
    'generate_document',
  ];
  let effectiveToolsAllowed = toolsAllowed || typeDef.toolsAllowed;
  if (effectiveToolsAllowed && subagentType !== 'memory_extractor') {
    const merged = new Set(effectiveToolsAllowed);
    for (const t of WIDGET_TOOLS_ALWAYS_ALLOWED) merged.add(t);
    // Retire explicitement todo_write s'il était dans la liste (héritage)
    merged.delete('todo_write');
    effectiveToolsAllowed = Array.from(merged);
  }

  console.log(`[sub-runner] RUN START ${subagentType} job=${job.id} maxLoops=${job.maxLoops} timeout=${runtimeLimit || 'none'} tools=${effectiveToolsAllowed ? effectiveToolsAllowed.length : 'default'}`);
  try {
    const { runJob } = require('../jobs/job-runner');
    await runJob(job.id, {
      subagentType,
      systemPromptOverride: typeDef.systemPrompt,
      toolsAllowed: effectiveToolsAllowed,
      toolsDenied: typeDef.toolsDenied || null,
      forcedAutonomy: typeDef.forcedAutonomy || null,
      prompt: enrichedPrompt,
      contextSlice,
      signal: runAc.signal,
    });
    console.log(`[sub-runner] RUN END ${subagentType} job=${job.id} duration=${Date.now() - startedAt}ms aborted=${runAc.signal.aborted}`);
    if (runAc.signal.aborted) {
      runError = `subagent_runtime_exceeded (${runtimeLimit}ms)`;
    }
  } catch (e) {
    runError = runAc.signal.aborted
      ? `subagent_runtime_exceeded (${runtimeLimit}ms)`
      : (e?.message || String(e));
    console.error(`[sub-runner] RUN ERROR ${subagentType} job=${job.id}: ${runError}`);
    await AiJob.updateOne({ id: job.id }, {
      $set: { status: 'error', error: runError, finishedAt: new Date() },
    }).catch(() => {});
  } finally {
    if (hardTimer) clearTimeout(hardTimer);
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
            subagentType: task.subagentType || null,
            status: task.status || 'queued',
            parentTaskId: task.parentJobId,
            startedAt: task.startedAt ? new Date(task.startedAt) : new Date(),
            toolCalls: [],
            // Persiste les champs roster (agentName, emoji, color, ...) pour que
            // l'identité visuelle du subagent survive aux reloads / SSE reconnect.
            // Sans ça, au refresh, le canvas affiche une task anonyme.
            ...(task.agentName ? { agentName: task.agentName } : {}),
            ...(task.agentEmoji ? { agentEmoji: task.agentEmoji } : {}),
            ...(task.agentColor ? { agentColor: task.agentColor } : {}),
            ...(task.agentTagline ? { agentTagline: task.agentTagline } : {}),
            ...(task.agentFigure ? { agentFigure: task.agentFigure } : {}),
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
