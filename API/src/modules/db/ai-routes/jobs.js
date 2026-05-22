// Routes /ai/jobs/* — gestion des AiJobs (agent runs, subagents, research, etc.).
//
//   POST   /ai/jobs                    créer un job + fire-and-forget runJob
//   GET    /ai/jobs/:jobId              état d'un job
//   GET    /ai/jobs/:jobId/stream       SSE des events live du job
//   POST   /ai/jobs/:jobId/pause        mettre en pause
//   POST   /ai/jobs/:jobId/resume       reprendre
//   POST   /ai/jobs/:jobId/cancel       annuler
//   POST   /ai/jobs/:jobId/permissions  résoudre une demande de permission pending
//
// La route /permissions est la plus subtile : elle normalise les décisions courtes
// du frontend (always / once / session / deny → allow_always / allow_once / etc.),
// persiste les grants pour les décisions élargies, notifie le job en cours via
// pub/sub, ET propage la décision aux autres cards permission_request en attente
// pour le MÊME tool dans le même thread (anti-spam de prompts).

const Workspace = require('../../../db/models/workspace.model');
const AiJob = require('../../../db/models/ai-job.model');
const AiMessage = require('../../../db/models/ai-message.model');
const { createJob, runJob, resumeJob, pauseJob, cancelJob, onJobEvent } = require('../../../ai/jobs/job-runner');
const { emitJobEvent, emitThreadEvent } = require('../../../ai/jobs/job-events');
const { resolvePendingDecision } = require('../../../ai/permissions');
const { findThread } = require('./_shared');

const SHORT_DECISION_MAP = {
  always: 'allow_always',
  once: 'allow_once',
  session: 'allow_session',
  deny: 'deny_always',
};

module.exports = function registerJobRoutes(r) {
  // ── Create job (fire-and-forget) ───────────────────────────────────
  r.post('/ai/jobs', async (req, res) => {
    const { threadId, type, mode, subagentType, subagentInstructions, maxLoops, agentId, initiatorMessageId } = req.body || {};
    if (!threadId) return res.apiError(400, 'missing_thread', 'threadId required');
    const thread = await findThread(threadId);
    if (!thread) return res.apiError(404, 'thread_not_found', 'Thread not found');
    const ws = await Workspace.findById(thread.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'thread_not_found', 'Thread not found');
    try {
      const job = await createJob({
        threadId: thread._id,
        type: type || 'agent_run',
        mode, subagentType, subagentInstructions,
        maxLoops, agentId, initiatorMessageId,
      });
      setImmediate(() => { runJob(job.id).catch(e => console.error(`[ai/jobs] run error ${job.id}:`, e?.message)); });
      res.status(201).json({ success: true, data: job, requestId: req.requestId, ts: Date.now() });
    } catch (e) {
      res.apiError(500, 'job_create_error', e?.message || 'Failed to create job');
    }
  });

  // ── Get job ────────────────────────────────────────────────────────
  r.get('/ai/jobs/:jobId', async (req, res) => {
    const job = await AiJob.findOne({ id: req.params.jobId }).lean();
    if (!job) return res.apiError(404, 'job_not_found', 'Job not found');
    const ws = await Workspace.findById(job.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'job_not_found', 'Job not found');
    res.apiOk(job);
  });

  // ── Stream SSE des events live d'un job ───────────────────────────
  r.get('/ai/jobs/:jobId/stream', async (req, res) => {
    const job = await AiJob.findOne({ id: req.params.jobId }).lean();
    if (!job) return res.apiError(404, 'job_not_found', 'Job not found');
    const ws = await Workspace.findById(job.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'job_not_found', 'Job not found');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (res.socket) res.socket.setNoDelay(true);
    res.flushHeaders();

    const send = (obj) => {
      try { res.write(`data: ${JSON.stringify(obj)}\n\n`); if (res.flush) res.flush(); } catch {}
    };
    // Replay last 50 sideEvents
    if (Array.isArray(job.sideEvents)) {
      for (const ev of job.sideEvents.slice(-50)) send(ev);
    }
    send({ type: 'job.status', status: job.status, iteration: job.iteration });

    const off = onJobEvent(job.id, (ev) => send(ev));
    const heartbeat = setInterval(() => { try { res.write(':keepalive\n\n'); } catch {} }, 15000);
    const cleanup = () => {
      clearInterval(heartbeat);
      try { off(); } catch {}
      try { res.end(); } catch {}
    };
    req.on('close', cleanup);
    res.on('close', cleanup);
  });

  // ── Pause / Resume / Cancel ────────────────────────────────────────
  r.post('/ai/jobs/:jobId/pause', async (req, res) => {
    const job = await AiJob.findOne({ id: req.params.jobId }).lean();
    if (!job) return res.apiError(404, 'job_not_found', 'Job not found');
    const ws = await Workspace.findById(job.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'job_not_found', 'Job not found');
    await pauseJob(job.id);
    res.apiOk({ paused: true });
  });

  r.post('/ai/jobs/:jobId/resume', async (req, res) => {
    const job = await AiJob.findOne({ id: req.params.jobId }).lean();
    if (!job) return res.apiError(404, 'job_not_found', 'Job not found');
    const ws = await Workspace.findById(job.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'job_not_found', 'Job not found');
    setImmediate(() => { resumeJob(job.id).catch(e => console.error('[ai/jobs] resume:', e?.message)); });
    res.apiOk({ resumed: true });
  });

  r.post('/ai/jobs/:jobId/cancel', async (req, res) => {
    const job = await AiJob.findOne({ id: req.params.jobId }).lean();
    if (!job) return res.apiError(404, 'job_not_found', 'Job not found');
    const ws = await Workspace.findById(job.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'job_not_found', 'Job not found');
    await cancelJob(job.id);
    res.apiOk({ cancelled: true });
  });

  // ── Resolve permission pending (avec propagation) ─────────────────
  r.post('/ai/jobs/:jobId/permissions', async (req, res) => {
    const job = await AiJob.findOne({ id: req.params.jobId });
    if (!job) return res.apiError(404, 'job_not_found', 'Job not found');
    const ws = await Workspace.findById(job.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'job_not_found', 'Job not found');
    const { requestId, decision, pathPattern, scope, toolName, risk, ttlMs } = req.body || {};
    if (!requestId || !decision) return res.apiError(400, 'missing_fields', 'requestId + decision required');

    // Normalise les décisions courtes du frontend (always → allow_always, etc.).
    // Sans ça, le grant était stocké avec "always" mais checkPermission attend
    // "allow_always" → permission redemandée à chaque appel.
    const rawDecision = String(decision);
    const normalizedDecision = SHORT_DECISION_MAP[rawDecision] || rawDecision;

    // Persist grant pour les décisions non-once
    if (toolName && normalizedDecision !== 'allow_once' && normalizedDecision !== 'deny_once') {
      try {
        await resolvePendingDecision({
          threadId: job.threadId,
          workspaceId: job.workspaceId,
          toolName, decision: normalizedDecision, pathPattern, scope, risk, ttlMs,
          userId: req.user.id,
          jobId: job.id,
        });
      } catch (e) {
        console.error('[permissions] persist error:', e?.message);
      }
    }

    // Notify le job en cours via pub/sub
    const normalized = normalizedDecision.startsWith('allow') ? 'allow' : 'deny';
    console.log(`[perm-resolve] job=${job.id} requestId=${requestId} decision=${decision} (normalized=${normalized})`);
    emitJobEvent(job.id, { type: 'permission.resolved', requestId, decision: normalized });
    // Notifie AUSSI le parent (subagent.permission.granted) pour débloquer
    // waitForPermissionFromParent côté subagent harness.
    if (job.parentJobId) {
      console.log(`[perm-resolve] also emit subagent.permission.granted on parent=${job.parentJobId}`);
      emitJobEvent(String(job.parentJobId), {
        type: 'subagent.permission.granted',
        requestId,
        childJobId: job.id,
        decision: normalized,
      });
    }

    // Persiste la réponse sur l'AiMessage (card permission_request)
    try {
      await AiMessage.updateOne(
        { threadId: job.threadId, 'metadata.permissionRequest.requestId': requestId },
        {
          $set: {
            'metadata.permissionRequest.answer': decision,
            'metadata.permissionRequest.answeredAt': new Date(),
            'metadata.permissionRequest.answeredBy': req.user.id || req.user._id,
          },
        }
      );
    } catch (e) {
      console.error('[permissions] persist message answer failed:', e?.message);
    }

    // PROPAGATION : si décision élargie (allow_always/allow_session/deny_always),
    // résout AUSSI toutes les autres cards permission_request en attente pour le
    // MÊME tool dans le thread. Détachée du HTTP response pour ne pas bloquer.
    const isBroadDecision = !['allow_once', 'deny_once'].includes(rawDecision);
    if (isBroadDecision && toolName) {
      setImmediate(async () => {
        try {
          const pendingCards = await AiMessage.find({
            threadId: job.threadId,
            'metadata.kind': 'permission_request',
            'metadata.permissionRequest.toolName': toolName,
            'metadata.permissionRequest.requestId': { $ne: requestId },
            $or: [
              { 'metadata.permissionRequest.answer': { $exists: false } },
              { 'metadata.permissionRequest.answer': null },
            ],
          }).lean();

          // Batch en parallèle (avant : for-loop avec await qui sérialisait → 500ms+).
          const results = await Promise.all(pendingCards.map(async (card) => {
            const pendingRequestId = card?.metadata?.permissionRequest?.requestId;
            const pendingJobId = card?.metadata?.permissionRequest?.jobId;
            if (!pendingRequestId) return false;

            let targetJob = null;
            if (pendingJobId) {
              targetJob = await AiJob.findOne({ id: pendingJobId }, 'id parentJobId').lean();
            }
            if (!targetJob) {
              targetJob = await AiJob.findOne(
                { threadId: job.threadId, status: 'waiting_permission' },
                'id parentJobId'
              ).lean();
            }
            if (!targetJob) return false;

            emitJobEvent(targetJob.id, { type: 'permission.resolved', requestId: pendingRequestId, decision: normalized });
            if (targetJob.parentJobId) {
              emitJobEvent(String(targetJob.parentJobId), {
                type: 'subagent.permission.granted',
                requestId: pendingRequestId,
                childJobId: targetJob.id,
                decision: normalized,
              });
            }
            await AiMessage.updateOne(
              { _id: card._id },
              {
                $set: {
                  'metadata.permissionRequest.answer': decision,
                  'metadata.permissionRequest.answeredAt': new Date(),
                  'metadata.permissionRequest.answeredBy': req.user.id || req.user._id,
                  'metadata.permissionRequest.propagatedFrom': requestId,
                },
              }
            );
            // ai.message.updated pour rafraîchir la card côté frontend sans refresh manuel
            emitThreadEvent(String(job.threadId), {
              type: 'ai.message.updated',
              kind: 'permission_request',
              messageId: String(card._id),
            });
            return true;
          }));
          const propagated = results.filter(Boolean).length;
          if (propagated > 0) {
            console.log(`[perm-resolve] propagated "${decision}" to ${propagated} other pending ${toolName} requests in thread ${job.threadId}`);
          }
        } catch (e) {
          console.error('[permissions] propagation failed:', e?.message);
        }
      });
    }

    res.apiOk({ ok: true });
  });
};
