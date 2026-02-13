const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Flow = require('../../db/models/flow.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const Run = require('../../db/models/run.model');
const Attempt = require('../../db/models/attempt.model');
const AttemptCounter = require('../../db/models/attempt-counter.model');
const RunEvent = require('../../db/models/run-event.model');
const { runFlow } = require('../../engine');
const { broadcast, cleanup: wsCleanup } = require('../../realtime/ws');
const { broadcastRun } = require('../../realtime/socketio');
const { createFilesHelper } = require('../../services/file-storage');
const { waitForOneEvent } = require('../../services/triggers/wait-for-one-event');

function isResultError(result){
  return !!(result && typeof result === 'object' && (result.ok === false || result.error != null));
}

// ── Truncate deeply nested objects to prevent oversized RunEvents ──
const MAX_STR = 8000;       // max chars per string value
const MAX_ARR = 50;          // max items per array
const MAX_DEPTH = 8;         // max nesting depth
function truncateDeep(val, depth) {
  if (depth === undefined) depth = 0;
  if (val == null) return val;
  if (depth > MAX_DEPTH) return '[…depth]';
  if (typeof val === 'string') return val.length > MAX_STR ? val.slice(0, MAX_STR) + '…[tronqué]' : val;
  if (Array.isArray(val)) {
    const sliced = val.length > MAX_ARR ? val.slice(0, MAX_ARR) : val;
    const out = sliced.map(function(v) { return truncateDeep(v, depth + 1); });
    if (val.length > MAX_ARR) out.push('…[' + (val.length - MAX_ARR) + ' de plus]');
    return out;
  }
  if (typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val)) { out[k] = truncateDeep(val[k], depth + 1); }
    return out;
  }
  return val;
}

module.exports = function(){
  // Cooperative cancellation registry for DB-backed runs
  const cancelled = new Set();
  const r = express.Router();
  // Public: start a run if the Start node exposes a public form
  r.post('/public/flows/:flowId/runs', async (req, res) => {
    try { console.log('[api][public-run][db] start', req.params.flowId, 'payload:', JSON.stringify(req.body?.payload)); } catch {}
    const { Types } = require('mongoose');
    const fid = String(req.params.flowId);
    let flow = null;
    if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid);
    if (!flow) flow = await Flow.findOne({ id: fid });
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    try {
      const ws = await Workspace.findById(flow.workspaceId);
      if (!ws) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
      // Check Start node public flag
      const graph = flow.graph || {};
      const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
      const startFormByType = nodes.find(n => String(n?.data?.model?.templateObj?.type || '').toLowerCase() === 'start_form');
      const startFormById = nodes.find(n => String(n?.data?.model?.templateObj?.id || n?.data?.model?.template || '').toLowerCase() === 'start_form');
      const start = startFormByType || startFormById || nodes.find(n => String(n?.data?.model?.templateObj?.type || '').toLowerCase() === 'start');
      const m = start?.data?.model || {};
      if (!m || !m.startFormPublic) return res.apiError(403, 'form_not_public', 'Start form is not public');
      if (flow.enabled === false) return res.apiError(409, 'flow_disabled', 'Flow is disabled');
      try {
        const { validateFlowTemplates } = require('../../utils/validate');
        const tv = await validateFlowTemplates(flow.graph || flow);
        if (!tv.ok) {
          console.warn(`[runs][db] pre-exec validation failed flowId=${String(flow._id)} errors:`, JSON.stringify(tv.errors));
          try {
            const Notification = require('../../db/models/notification.model');
            await Notification.create({
              companyId: ws.companyId, workspaceId: ws._id,
              entityType: 'flow', entityId: String(flow._id),
              severity: 'critical', code: 'flow_template_invalid',
              message: `Exécution bloquée: ${tv.errors.length} problème(s) de template`,
              details: { errors: tv.errors },
              link: `/flows/${String(flow._id)}/editor`
            });
          } catch {}
          return res.apiError(409, 'flow_template_invalid',
            'Flow uses deleted or outdated templates', { errors: tv.errors });
        }
      } catch (e) {
        console.error('[runs] pre-exec validation error:', e?.message || e);
      }
      const now = new Date();
      // Snapshot graph and settings (meta) at execution time
      let graphSnapshot = {};
      try { graphSnapshot = JSON.parse(JSON.stringify(flow.graph || flow)); } catch { graphSnapshot = flow.graph || {}; }
      const metaSnapshot = flow.settings || {};
      const run = await Run.create({ flowId: flow._id, workspaceId: ws._id, companyId: ws.companyId, status: 'running', events: [], result: null, finalPayload: null, startedAt: now, graph: graphSnapshot, meta: metaSnapshot });
      res.status(201).json({ success: true, data: { id: String(run._id), status: run.status }, requestId: req.requestId, ts: Date.now() });
      (async () => {
        try {
          const payload = req.body?.payload ?? null;
          const initialMsg = { payload };
          // Prepare credentials resolver for this workspace
          const Credential = require('../../db/models/credential.model');
          const { Types } = require('mongoose');
          const { decrypt } = require('../../utils/enc');
          const getCredentials = async (node) => {
            try {
              const credId = String(node?.data?.model?.credentialId || node?.model?.credentialId || '');
              if (!credId) return null;
              let cred = null;
              if (Types.ObjectId.isValid(credId)) cred = await Credential.findById(credId).lean();
              if (!cred) cred = await Credential.findOne({ id: credId }).lean();
              if (!cred) return null;
              if (String(cred.workspaceId) !== String(ws._id)) return null;
              const values = decrypt(cred.secret);
              return { id: String(cred._id), providerKey: cred.providerKey, values };
            } catch { return null; }
          };
          const filesHelperPublic = createFilesHelper({ workspaceId: ws._id, companyId: ws.companyId, runId: run._id });
          await runFlow(flow.graph || flow, { now: new Date(), getCredentials, files: filesHelperPublic }, initialMsg, async (ev) => {
            const ts = new Date();
            let seq = 0;
            if (ev.type === 'run.started'){
              await Run.updateOne({ _id: run._id }, { $set: { status: 'running' } });
              await RunEvent.create({ runId: run._id, type: 'run.status', seq: ++seq, data: { status: 'running', startedAt: ev.startedAt || ts.toISOString() }, ts });
            }
            if (ev.type === 'node.started'){
              const nodeId = String(ev.nodeId || '');
              const branchId = String(ev.branchId || '');
              const startedAt = ev.startedAt ? new Date(ev.startedAt) : ts;
              let att = await Attempt.findOne({ runId: run._id, nodeId, branchId, finishedAt: { $exists: false } }).sort({ attempt: -1 });
              let usedAttempt = att?.attempt;
              if (!att) {
                const ctr = await AttemptCounter.findOneAndUpdate({ runId: run._id, nodeId }, { $inc: { seq: 1 } }, { upsert: true, new: true });
                usedAttempt = Math.max(1, Number(ctr?.seq || 1));
                att = await Attempt.findOneAndUpdate({ runId: run._id, nodeId, attempt: usedAttempt }, { $setOnInsert: { status: 'running', kind: ev.kind || undefined, templateKey: ev.templateKey || undefined, startedAt, argsPre: ev.argsPre, argsPost: ev.argsPost, input: truncateDeep(ev.input), branchId, msgIn: truncateDeep(ev.msgIn) } }, { upsert: true, new: true });
              }
              await RunEvent.create({ runId: run._id, type: 'node.status', nodeId, attemptId: att._id, exec: usedAttempt, branchId, seq: ++seq, data: { status: 'running', startedAt, msgIn: truncateDeep(ev.msgIn), input: truncateDeep(ev.input), argsPre: ev.argsPre, argsPost: ev.argsPost }, ts });
          }
          if (ev.type === 'node.done'){
            const nodeId = String(ev.nodeId || '');
            const branchId = String(ev.branchId || '');
            let att = await Attempt.findOne({ runId: run._id, nodeId, branchId, finishedAt: { $exists: false } }).sort({ attempt: -1 });
            const finishedAt = ev.finishedAt ? new Date(ev.finishedAt) : ts;
            const status = isResultError(ev.result) ? 'error' : 'success';
            const errMsg = isResultError(ev.result) ? (ev.result && ev.result.error ? String(ev.result.error) : 'error') : undefined;
            if (att){
              att.status = status; att.finishedAt = finishedAt; att.durationMs = typeof ev.durationMs === 'number' ? ev.durationMs : (att.startedAt ? (finishedAt.getTime() - new Date(att.startedAt).getTime()) : undefined);
              att.argsPost = ev.argsPost; att.input = truncateDeep(ev.input); att.msgIn = truncateDeep(ev.msgIn); att.msgOut = truncateDeep(ev.msgOut); att.result = truncateDeep(ev.result); await att.save();
              await RunEvent.create({ runId: run._id, type: 'node.result', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { input: truncateDeep(ev.input), argsPre: ev.argsPre, result: truncateDeep(ev.result), argsPost: ev.argsPost, msgIn: truncateDeep(ev.msgIn), msgOut: truncateDeep(ev.msgOut), durationMs: att.durationMs, finishedAt }, ts });
              await RunEvent.create({ runId: run._id, type: 'node.status', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { status, finishedAt, durationMs: att.durationMs, error: errMsg }, ts });
            }
          }
          if (ev.type === 'edge.taken'){
            await RunEvent.create({ runId: run._id, type: 'edge.taken', seq: ++seq, data: { sourceId: ev.sourceId, targetId: ev.targetId }, ts });
          }
          // No broadcast to private channels for public route
          });
          await Run.updateOne({ _id: run._id }, { $set: { status: 'success', finishedAt: new Date() } });
        } catch (e) {
          await Run.updateOne({ _id: run._id }, { $set: { status: 'error', finishedAt: new Date() } });
        }
      })();
    } catch (e){ return res.apiError(500, 'internal_error', 'Failed to start run', { message: e?.message }); }
  });
  // Public: SSE stream for a run (DB mode)
  r.get('/public/runs/:runId/stream', async (req, res) => {
    const { Types } = require('mongoose');
    const Run = require('../../db/models/run.model');
    const RunEvent = require('../../db/models/run-event.model');
    const rid = String(req.params.runId);
    let run = null;
    if (Types.ObjectId.isValid(rid)) run = await Run.findById(rid);
    if (!run) run = await Run.findOne({ id: rid });
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();
    const send = (ev) => { res.write(`event: live\n`); res.write(`data: ${JSON.stringify(ev)}\n\n`); };
    let lastSeq = 0;
    const history = await RunEvent.find({ runId: run._id }).sort({ seq: 1 }).lean();
    for (const ev of history){ send(ev); lastSeq = Math.max(lastSeq, ev.seq || 0); }
    const interval = setInterval(async () => {
      const doc = await Run.findById(run._id).lean();
      if (!doc) { clearInterval(interval); try{ res.end(); }catch{} return; }
      const news = await RunEvent.find({ runId: run._id, seq: { $gt: lastSeq } }).sort({ seq: 1 }).lean();
      for (const ev of news){ send(ev); lastSeq = Math.max(lastSeq, ev.seq || 0); }
      send({ type: 'run.status', runId: String(run._id), run: { status: doc.status } });
      if (doc.status === 'success' || doc.status === 'error') { clearInterval(interval); try{ res.end(); }catch{} }
    }, 300);
    req.on('close', () => clearInterval(interval));
  });
  // Public: get run status snapshot (no auth)
  r.get('/public/runs/:runId', async (req, res) => {
    const { Types } = require('mongoose');
    const rid = String(req.params.runId);
    const Run = require('../../db/models/run.model');
    let run = null;
    if (Types.ObjectId.isValid(rid)) run = await Run.findById(rid).lean();
    if (!run) run = await Run.findOne({ id: rid }).lean();
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
    try {
      const data = { id: String(run._id || run.id), status: run.status, startedAt: run.startedAt, finishedAt: run.finishedAt, durationMs: run.durationMs };
      return res.apiOk(data);
    } catch (e) { return res.apiError(500, 'internal_error', 'Failed to read run'); }
  });
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.post('/flows/:flowId/runs', async (req, res) => {
    const { Types } = require('mongoose');
    const fid = String(req.params.flowId);
    let flow = null;
    if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid);
    if (!flow) flow = await Flow.findOne({ id: fid });
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = await Workspace.findById(flow.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');

    if (flow.enabled === false) {
      console.warn(`[runs][db] start: flow disabled flowId=${fid} enabled=${flow.enabled} ws=${flow.workspaceId} user=${req.user?.id} reqId=${req.requestId}`);
      return res.apiError(409, 'flow_disabled', 'Flow is disabled', { flowId: String(flow._id), workspaceId: String(ws._id), enabled: flow.enabled });
    }
    try {
      const { validateFlowTemplates } = require('../../utils/validate');
      const tv = await validateFlowTemplates(flow.graph || flow);
      if (!tv.ok) {
        console.warn(`[runs][db] pre-exec validation failed flowId=${fid} errors:`, JSON.stringify(tv.errors));
        try {
          const Notification = require('../../db/models/notification.model');
          await Notification.create({
            companyId: ws.companyId, workspaceId: ws._id,
            entityType: 'flow', entityId: String(flow._id),
            severity: 'critical', code: 'flow_template_invalid',
            message: `Exécution bloquée: ${tv.errors.length} problème(s) de template`,
            details: { errors: tv.errors },
            link: `/flows/${String(flow._id)}/editor`
          });
        } catch {}
        return res.apiError(409, 'flow_template_invalid',
          'Flow uses deleted or outdated templates', { errors: tv.errors });
      }
    } catch (e) {
      console.error('[runs] pre-exec validation error:', e?.message || e);
    }
    console.log(`[runs][db] start: flowId=${fid} ws=${flow.workspaceId} user=${req.user?.id} reqId=${req.requestId}`);
    const now = new Date();
    // Persist an exact snapshot of the flow graph used for execution
    let graphSnapshot = {};
    try { graphSnapshot = JSON.parse(JSON.stringify(flow.graph || flow)); } catch { graphSnapshot = flow.graph || {}; }
    const metaSnapshot = flow.settings || {};
    const run = await Run.create({ flowId: flow._id, workspaceId: ws._id, companyId: ws.companyId, status: 'running', events: [], result: null, finalPayload: null, startedAt: now, graph: graphSnapshot, meta: metaSnapshot });
    res.status(201).json({ success: true, data: { id: String(run._id), status: run.status }, requestId: req.requestId, ts: Date.now() });
    console.log(`[runs][db] created run: id=${String(run._id)} flowId=${String(flow._id)} status=${run.status} reqId=${req.requestId}`);

    (async () => {
      try {
        const payload = req.body?.payload ?? null;
        const initialMsg = { payload };
        let finalMsg = null;
        let seq = 0; // live event sequence
        const Credential = require('../../db/models/credential.model');
        const { Types } = require('mongoose');
        const { decrypt } = require('../../utils/enc');
        const getCredentials = async (node) => {
          try {
            const credId = String(node?.data?.model?.credentialId || node?.model?.credentialId || '');
            if (!credId) return null;
            let cred = null;
            if (Types.ObjectId.isValid(credId)) cred = await Credential.findById(credId).lean();
            if (!cred) cred = await Credential.findOne({ id: credId }).lean();
            if (!cred) return null;
            if (String(cred.workspaceId) !== String(ws._id)) return null;
            const values = decrypt(cred.secret);
            return { id: String(cred._id), providerKey: cred.providerKey, values };
          } catch { return null; }
        };
        const filesHelper = createFilesHelper({ workspaceId: ws._id, companyId: ws.companyId, runId: run._id, uploadedBy: req.user?.id || '' });
        // waitForEvent: for test/dev runs, start a temporary trigger and wait for 1 real event
        const waitForEvent = async (eventNode) => {
          // Resolve credentials for the event node
          const creds = await getCredentials(eventNode);
          const credValues = (creds && creds.values != null) ? creds.values : (creds || {});
          // Broadcast a waiting status so the frontend knows we're listening
          const waitPkt = { type: 'node.status', nodeId: eventNode.id || eventNode.data?.id, data: { status: 'waiting', message: 'En attente d\'un événement...' } };
          broadcast(String(run._id), waitPkt);
          broadcastRun(String(run._id), waitPkt);
          return waitForOneEvent(eventNode, credValues, { timeoutMs: 120000, flow });
        };
        await runFlow(flow.graph || flow, { now: new Date(), getCredentials, files: filesHelper, waitForEvent }, initialMsg, async (ev) => {
          const ts = new Date();
          // Translate engine ev -> LiveEvents and persist
          if (ev.type === 'run.started'){
            await Run.updateOne({ _id: run._id }, { $set: { status: 'running' }, $push: { /* keep legacy empty */ } });
            await RunEvent.create({ runId: run._id, type: 'run.status', seq: ++seq, data: { status: 'running', startedAt: ev.startedAt || ts.toISOString() }, ts });
          }
          if (ev.type === 'node.started'){
            const nodeId = String(ev.nodeId || '');
            const branchId = String(ev.branchId || '');
            const startedAt = ev.startedAt ? new Date(ev.startedAt) : ts;
            // Reuse open attempt for this branch if any; otherwise allocate a new exec
            let att = await Attempt.findOne({ runId: run._id, nodeId, branchId, finishedAt: { $exists: false } }).sort({ attempt: -1 });
            let usedAttempt = att?.attempt;
            if (!att) {
              const ctr = await AttemptCounter.findOneAndUpdate(
                { runId: run._id, nodeId },
                { $inc: { seq: 1 } },
                { upsert: true, new: true }
              );
              usedAttempt = Math.max(1, Number(ctr?.seq || 1));
              att = await Attempt.findOneAndUpdate(
                { runId: run._id, nodeId, attempt: usedAttempt },
                { $setOnInsert: { status: 'running', kind: ev.kind || undefined, templateKey: ev.templateKey || undefined, startedAt, argsPre: ev.argsPre, argsPost: ev.argsPost, input: truncateDeep(ev.input), branchId, msgIn: truncateDeep(ev.msgIn) } },
                { upsert: true, new: true }
              );
            } else {
              const set = {};
              if (ev.msgIn && (att.msgIn == null)) set.msgIn = truncateDeep(ev.msgIn);
              if (ev.input != null && (att.input == null)) set.input = truncateDeep(ev.input);
              if (ev.argsPost != null && (att.argsPost == null)) set.argsPost = ev.argsPost;
              if (Object.keys(set).length) { try { await Attempt.updateOne({ _id: att._id }, { $set: set }); } catch {} }
            }
            await RunEvent.create({ runId: run._id, type: 'node.status', nodeId, attemptId: att._id, exec: usedAttempt, branchId, seq: ++seq, data: { status: 'running', startedAt, msgIn: truncateDeep(ev.msgIn), input: truncateDeep(ev.input), argsPre: ev.argsPre, argsPost: ev.argsPost }, ts });
          }
          if (ev.type === 'node.done'){
            const nodeId = String(ev.nodeId || '');
            const branchId = String(ev.branchId || '');
            let att = await Attempt.findOne({ runId: run._id, nodeId, branchId, finishedAt: { $exists: false } }).sort({ attempt: -1 });
            const finishedAt = ev.finishedAt ? new Date(ev.finishedAt) : ts;
            const status = isResultError(ev.result) ? 'error' : 'success';
            const errMsg = isResultError(ev.result) ? (ev.result && ev.result.error ? String(ev.result.error) : 'error') : undefined;
            if (att){
              att.status = status; att.finishedAt = finishedAt; att.durationMs = typeof ev.durationMs === 'number' ? ev.durationMs : (att.startedAt ? (finishedAt.getTime() - new Date(att.startedAt).getTime()) : undefined);
              att.argsPost = ev.argsPost; att.input = truncateDeep(ev.input); att.msgIn = truncateDeep(ev.msgIn); att.msgOut = truncateDeep(ev.msgOut); att.result = truncateDeep(ev.result); await att.save();
              await RunEvent.create({ runId: run._id, type: 'node.result', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { input: truncateDeep(ev.input), argsPre: ev.argsPre, result: truncateDeep(ev.result), argsPost: ev.argsPost, msgIn: truncateDeep(ev.msgIn), msgOut: truncateDeep(ev.msgOut), durationMs: att.durationMs, finishedAt }, ts });
              await RunEvent.create({ runId: run._id, type: 'node.status', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { status, finishedAt, durationMs: att.durationMs, error: errMsg }, ts });
            } else {
              // fallback: create completed attempt
              const ctr = await AttemptCounter.findOneAndUpdate(
                { runId: run._id, nodeId },
                { $inc: { seq: 1 } },
                { upsert: true, new: true }
              );
              const nextAttempt = Math.max(1, Number(ctr?.seq || 1));
              att = await Attempt.findOneAndUpdate(
                { runId: run._id, nodeId, attempt: nextAttempt },
                { $setOnInsert: { status, branchId, startedAt: ev.startedAt ? new Date(ev.startedAt) : undefined, finishedAt, durationMs: ev.durationMs, argsPre: ev.argsPre, argsPost: ev.argsPost, input: truncateDeep(ev.input), msgIn: truncateDeep(ev.msgIn), msgOut: truncateDeep(ev.msgOut), result: truncateDeep(ev.result) } },
                { upsert: true, new: true }
              );
              await RunEvent.create({ runId: run._id, type: 'node.result', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { input: truncateDeep(ev.input), argsPre: ev.argsPre, result: truncateDeep(ev.result), argsPost: ev.argsPost, msgIn: truncateDeep(ev.msgIn), msgOut: truncateDeep(ev.msgOut), durationMs: att.durationMs, finishedAt }, ts });
              await RunEvent.create({ runId: run._id, type: 'node.status', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { status, finishedAt, durationMs: att.durationMs, error: errMsg }, ts });
            }
          }
          if (ev.type === 'node.skipped'){
            const nodeId = String(ev.nodeId || '');
            const branchId = String(ev.branchId || '');
            const ctr = await AttemptCounter.findOneAndUpdate(
              { runId: run._id, nodeId },
              { $inc: { seq: 1 } },
              { upsert: true, new: true }
            );
            const nextAttempt = Math.max(1, Number(ctr?.seq || 1));
            const att = await Attempt.findOneAndUpdate(
              { runId: run._id, nodeId, attempt: nextAttempt },
              { $setOnInsert: { status: 'skipped', branchId } },
              { upsert: true, new: true }
            );
            await RunEvent.create({ runId: run._id, type: 'node.status', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { status: 'skipped' }, ts });
          }
          if (ev.type === 'edge.taken'){
            await RunEvent.create({ runId: run._id, type: 'edge.taken', seq: ++seq, data: { sourceId: ev.sourceId, targetId: ev.targetId }, ts });
          }
          if (ev.type === 'node.log'){
            await RunEvent.create({ runId: run._id, type: 'node.log', nodeId: String(ev.nodeId || ''), branchId: String(ev.branchId || ''), seq: ++seq, data: { text: ev.text || '' }, ts });
          }
          // broadcast Live-like messages for frontend
          const livePackets = [];
          if (ev.type === 'run.started') livePackets.push({ type: 'run.status', run: { status: 'running' } });
          if (ev.type === 'node.started'){
            try {
              const nodeId = String(ev.nodeId || ''); const branchId = String(ev.branchId || '');
              const att = await Attempt.findOne({ runId: run._id, nodeId, branchId, finishedAt: { $exists: false } }).sort({ attempt: -1 }).lean();
              livePackets.push({ type: 'node.status', nodeId, exec: att?.attempt, data: { status: 'running' } });
            } catch { livePackets.push({ type: 'node.status', nodeId: ev.nodeId, data: { status: 'running' } }); }
          }
          if (ev.type === 'node.done'){
            // Try to fetch last open attempt for exec to include in WS broadcast
            try {
              const nodeId = String(ev.nodeId || '');
              const att = await Attempt.findOne({ runId: run._id, nodeId }).sort({ attempt: -1 }).lean();
              const status = isResultError(ev.result) ? 'error' : 'success';
              const errMsg = isResultError(ev.result) ? (ev.result && ev.result.error ? String(ev.result.error) : 'error') : undefined;
              livePackets.push({ type: 'node.result', nodeId, exec: att?.attempt, data: { input: truncateDeep(ev.input), argsPre: ev.argsPre, argsPost: ev.argsPost, result: truncateDeep(ev.result), msgIn: truncateDeep(ev.msgIn), msgOut: truncateDeep(ev.msgOut), durationMs: ev.durationMs, startedAt: ev.startedAt, finishedAt: ev.finishedAt } });
              livePackets.push({ type: 'node.status', nodeId, exec: att?.attempt, data: { status, finishedAt: ev.finishedAt, durationMs: ev.durationMs, error: errMsg } });
            } catch {
              livePackets.push({ type: 'node.result', nodeId: ev.nodeId, data: { input: truncateDeep(ev.input), argsPre: ev.argsPre, argsPost: ev.argsPost, result: truncateDeep(ev.result), msgIn: truncateDeep(ev.msgIn), msgOut: truncateDeep(ev.msgOut), durationMs: ev.durationMs, startedAt: ev.startedAt, finishedAt: ev.finishedAt } });
            }
          }
          if (ev.type === 'edge.taken') livePackets.push({ type: 'edge.taken', data: { sourceId: ev.sourceId, targetId: ev.targetId } });
          if (ev.type === 'node.log') livePackets.push({ type: 'node.log', nodeId: String(ev.nodeId || ''), data: { text: ev.text || '' } });
          if (ev.type === 'run.completed') livePackets.push({ type: 'run.status', run: { status: 'success', result: ev.payload } });
          for (const pkt of livePackets){ broadcast(String(run._id), pkt); broadcastRun(String(run._id), pkt); }
          try { if (ev && ev.type) console.log(`[runs][db] event: runId=${String(run._id)} type=${ev.type}`); } catch {}
          if (ev.type === 'run.completed') finalMsg = ev; // capture full payload
        }, { shouldCancel: () => cancelled.has(String(run._id)) });
        const doc = await Run.findById(run._id);
        doc.status = 'success';
        doc.result = finalMsg?.payload ?? null;
        doc.finalPayload = doc.result;
        doc.finishedAt = new Date();
        doc.durationMs = doc.startedAt ? (doc.finishedAt.getTime() - doc.startedAt.getTime()) : undefined;
        doc.msg = truncateDeep(finalMsg) || null;
        await doc.save();
        try { await RunEvent.create({ runId: run._id, type: 'run.status', seq: ++seq, data: { status: 'success', result: doc.result }, ts: new Date() }); } catch {}
        console.log(`[runs][db] completed: runId=${String(run._id)} status=${doc.status}`);
        // Cleanup: free WS listeners and cancelled flag for this run
        cancelled.delete(String(run._id));
        setTimeout(() => wsCleanup(String(run._id)), 5000);
      } catch (e) {
        if (String(e && e.message) === '__CANCELLED__') {
          // Mark last open attempt as cancelled for better node badge
          try {
            const lastOpen = await Attempt.findOne({ runId: run._id, finishedAt: { $exists: false } }).sort({ startedAt: -1 });
            if (lastOpen) {
              const now = new Date();
              lastOpen.status = 'cancelled'; lastOpen.finishedAt = now; lastOpen.durationMs = lastOpen.startedAt ? (now.getTime() - new Date(lastOpen.startedAt).getTime()) : undefined; await lastOpen.save();
              // Ensure a node.status cancelled event exists
              let lastEvt = await RunEvent.findOne({ runId: run._id }).sort({ seq: -1 }).lean();
              const seqC = (lastEvt && typeof lastEvt.seq === 'number' ? lastEvt.seq : 0) + 1;
              await RunEvent.create({ runId: run._id, type: 'node.status', nodeId: lastOpen.nodeId, attemptId: lastOpen._id, exec: lastOpen.attempt, branchId: lastOpen.branchId, seq: seqC, data: { status: 'cancelled', finishedAt: now, durationMs: lastOpen.durationMs }, ts: now });
            }
          } catch {}
          const doc = await Run.findById(run._id);
          doc.status = 'cancelled';
          doc.finishedAt = new Date();
          doc.durationMs = doc.startedAt ? (doc.finishedAt.getTime() - doc.startedAt.getTime()) : undefined;
          await doc.save();
          let last = await RunEvent.findOne({ runId: run._id }).sort({ seq: -1 }).lean();
          const nextSeq = (last && typeof last.seq === 'number' ? last.seq : 0) + 1;
          await RunEvent.create({ runId: run._id, type: 'run.status', seq: nextSeq, data: { status: 'cancelled' }, ts: new Date() });
          const pkt = { type: 'run.status', run: { status: 'cancelled' } };
          broadcast(String(run._id), pkt);
          broadcastRun(String(run._id), pkt);
          console.warn(`[runs][db] cancelled during run: runId=${String(run._id)}`);
          cancelled.delete(String(run._id));
          setTimeout(() => wsCleanup(String(run._id)), 5000);
        } else {
          const doc = await Run.findById(run._id);
          doc.status = 'error';
          doc.finishedAt = new Date();
          doc.durationMs = doc.startedAt ? (doc.finishedAt.getTime() - doc.startedAt.getTime()) : undefined;
          await doc.save();
          // Allocate next sequence safely to avoid duplicate key on (runId, seq)
          let last = await RunEvent.findOne({ runId: run._id }).sort({ seq: -1 }).lean();
          const nextSeq = (last && typeof last.seq === 'number' ? last.seq : 0) + 1;
          await RunEvent.create({ runId: run._id, type: 'run.status', seq: nextSeq, data: { status: 'error', error: e && e.message ? e.message : String(e) }, ts: new Date() });
          const pkt = { type: 'run.status', run: { status: 'error', error: e && e.message ? e.message : String(e) } };
          broadcast(String(run._id), pkt);
          broadcastRun(String(run._id), pkt);
          console.error(`[runs][db] failed: runId=${String(run._id)} error=${e && e.message ? e.message : e}`);
          cancelled.delete(String(run._id));
          setTimeout(() => wsCleanup(String(run._id)), 5000);
        }
      }
      })();
  });

  // Preview: execute predecessors only and return msgIn for a target node (no persistence)
  r.post('/flows/:flowId/preview', async (req, res) => {
    const { Types } = require('mongoose');
    const fid = String(req.params.flowId);
    let flow = null;
    if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid);
    if (!flow) flow = await Flow.findOne({ id: fid });
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = await Workspace.findById(flow.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    const targetNodeId = String(req.body?.targetNodeId || '');
    const payload = req.body?.payload ?? null;
    if (!targetNodeId) return res.apiError(400, 'bad_request', 'Missing targetNodeId');
    let captured = null;
    try {
      await require('../../engine').runFlow(flow.graph || flow, { now: new Date() }, { payload }, async (ev) => {
        if (!captured && ev && ev.type === 'node.started' && String(ev.nodeId || '') === targetNodeId) {
          captured = ev.msgIn || null;
        }
      });
    } catch (e) {
      // ignore engine errors for preview; return what we may have captured
    }
    return res.apiOk({ nodeId: targetNodeId, msgIn: captured, payload: captured && captured.payload });
  });

  // Test a single node with provided msg (server-side execution of the function only)
  r.post('/flows/:flowId/test-node', async (req, res) => {
    const { Types } = require('mongoose');
    const { registry } = require('../../plugins/registry');
    const { evaluateTemplateDetailed, evaluateExpression } = require('../../engine/expression-sandbox');
    const fid = String(req.params.flowId);
    let flow = null;
    if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid);
    if (!flow) flow = await Flow.findOne({ id: fid });
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = await Workspace.findById(flow.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    const nodeId = String(req.body?.nodeId || '');
    const msg = (req.body && req.body.msg && typeof req.body.msg === 'object') ? req.body.msg : {};
    if (!nodeId) return res.apiError(400, 'bad_request', 'Missing nodeId');
    try {
      const nodes = (flow.graph || flow).nodes || [];
      const node = nodes.find((n) => String(n.id) === nodeId);
      if (!node) return res.apiError(404, 'node_not_found', 'Node not found');
      const tObj = (node.data && node.data.model && node.data.model.templateObj) || node.model?.templateObj || {};
      const tmplKey = String(node.data?.model?.template || tObj?.template?.id || tObj?.template?.name || tObj?.id || '').replace(/^tmpl_/,'');
      const buildEvalContext = (initialContext, msgObj) => ({ ...initialContext, msg: msgObj, payload: msgObj.payload, _nodes: msgObj._nodes });
      const deepRender = (obj, evalCtx) => {
        if (obj == null) return obj;
        if (typeof obj === 'string') return evaluateTemplateDetailed(obj, evalCtx).text;
        if (Array.isArray(obj)) return obj.map(v => deepRender(v, evalCtx));
        if (typeof obj === 'object'){
          if (Object.keys(obj).length === 1 && typeof obj.$expr === 'string') { try { return evaluateExpression(obj.$expr, evalCtx); } catch { return obj; } }
          const out = {}; for (const [k,v] of Object.entries(obj)) { out[k] = deepRender(v, evalCtx); } return out;
        }
        return obj;
      };
      const evalCtx = buildEvalContext({ now: new Date() }, msg);
      const argsPre = (node.data && node.data.model && node.data.model.context) || node.model?.context || {};
      const compiled = deepRender(argsPre, evalCtx);
      const inputs = compiled; // do not merge with msg.payload
      const fn = registry.resolve(tmplKey);
      const t0 = Date.now();
      let result = null;
      // Attach credentials to opts (4th arg) only, not into inputs
      let optsForFn = undefined;
      try {
        const credId = String(node?.data?.model?.credentialId || node?.model?.credentialId || '');
        if (credId){
          const Credential = require('../../db/models/credential.model');
          const { Types } = require('mongoose');
          const { decrypt } = require('../../utils/enc');
          let cred = null;
          if (Types.ObjectId.isValid(credId)) cred = await Credential.findById(credId).lean();
          if (!cred) cred = await Credential.findOne({ id: credId }).lean();
          if (cred && String(cred.workspaceId) === String(ws._id)){
            const values = decrypt(cred.secret);
            optsForFn = { credentials: values };
          }
        }
      } catch {}
      // Attach file storage helper for test-node too
      try {
        const testFilesHelper = createFilesHelper({ workspaceId: ws._id, companyId: ws.companyId });
        optsForFn = { ...(optsForFn || {}), files: testFilesHelper };
      } catch {}
      if (!fn) result = { error: `No handler for template '${tmplKey}'` };
      else { try { result = await fn({ id: nodeId, model: node.data?.model || node.model }, msg, inputs, optsForFn); } catch (e) { result = { error: e && e.message ? e.message : String(e) }; } }
      const msgOut = JSON.parse(JSON.stringify(msg || {}));
      try { msgOut[nodeId] = result; msgOut.payload = result; } catch {}
      // Do not echo credentials; return compiled args as input/argsPost
      return res.apiOk({ nodeId, msgIn: msg, input: inputs, argsPre, argsPost: inputs, result, msgOut, startedAt: new Date(t0).toISOString(), finishedAt: new Date().toISOString(), durationMs: Date.now() - t0 });
    } catch (e) {
      return res.apiError(500, 'test_failed', e && e.message ? e.message : 'Test failed');
    }
  });

  r.get('/runs/:runId', async (req, res) => {
    const rid = String(req.params.runId);
    let run = await Run.findById(rid);
    if (!run) run = await Run.findOne({ id: rid });
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
    const ws = await Workspace.findById(run.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'run_not_found', 'Run not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    const include = String(req.query.include || '').split(',').map(s=>s.trim()).filter(Boolean);
    if (req.query.populate === '1'){
      const rp = await Run.findById(run._id).populate('flowId').populate('workspaceId').lean();
      if (include.length){
        const out = { ...rp };
        if (include.includes('attempts')) out.attempts = await Attempt.find({ runId: run._id }).sort({ startedAt: 1 }).lean();
        if (include.includes('events')) out.events = await RunEvent.find({ runId: run._id }).sort({ seq: 1 }).lean();
        try { return res.apiOk(out); } catch (e) {
          if (e instanceof RangeError) { delete out.graph; delete out.events; out._truncated = true; return res.apiOk(out); }
          throw e;
        }
      }
      try { return res.apiOk(rp); } catch (e) {
        if (e instanceof RangeError) { delete rp.graph; rp._truncated = true; return res.apiOk(rp); }
        throw e;
      }
    }
    const base = { id: String(run._id), flowId: String(run.flowId), workspaceId: String(run.workspaceId), companyId: String(run.companyId), status: run.status, result: run.result, finalPayload: run.finalPayload, startedAt: run.startedAt, finishedAt: run.finishedAt, durationMs: run.durationMs };
    if (include.length){
      if (include.includes('graph')) base.graph = run.graph;
      if (include.includes('attempts')) base.attempts = await Attempt.find({ runId: run._id }).sort({ startedAt: 1 }).lean();
      if (include.includes('events')) base.events = await RunEvent.find({ runId: run._id }).sort({ seq: 1 }).lean();
      if (include.includes('meta')) base.meta = run.meta || undefined;
      if (include.includes('settings')) base.settings = run.settings || undefined;
    }
    try {
      res.apiOk(base);
    } catch (e) {
      if (e instanceof RangeError) {
        // Response too large — retry without graph
        delete base.graph;
        delete base.events;
        base._truncated = true;
        res.apiOk(base);
      } else {
        throw e;
      }
    }
  });

  // KPIs for a flow: counts per status and average duration
  r.get('/flows/:flowId/runs/stats', async (req, res) => {
    const { Types } = require('mongoose');
    const fid = String(req.params.flowId);
    let flow = null;
    if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid);
    if (!flow) flow = await Flow.findOne({ id: fid });
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = await Workspace.findById(flow.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const docs = await Run.find({ flowId: flow._id }).lean();
    const stats = { total: 0, running: 0, success: 0, error: 0, cancelled: 0, timed_out: 0, avgDurationMs: null };
    let durSum = 0, durCount = 0;
    for (const r of docs){
      stats.total++;
      const st = String(r.status || '').toLowerCase();
      if (stats.hasOwnProperty(st)) stats[st]++;
      const d = Number(r.durationMs || 0);
      if (d > 0) { durSum += d; durCount++; }
    }
    stats.avgDurationMs = durCount ? Math.round(durSum / durCount) : null;
    return res.apiOk(stats);
  });

  r.get('/runs/:runId/stream', async (req, res) => {
    const run = await Run.findById(req.params.runId);
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
    const ws = await Workspace.findById(run.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'run_not_found', 'Run not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();
    console.log(`[runs][db] stream open: runId=${String(run._id)} events=${(run.events||[]).length} reqId=${req.requestId}`);

    const sendLive = (ev) => { res.write(`event: live\n`); res.write(`data: ${JSON.stringify(ev)}\n\n`); };
    // Replay persisted live events
    let lastSeq = 0;
    const history = await RunEvent.find({ runId: run._id }).sort({ seq: 1 }).lean();
    for (const ev of history){ sendLive(ev); lastSeq = Math.max(lastSeq, ev.seq || 0); }
    // Immediately send current status to keep the connection warm
    try {
      const doc0 = await Run.findById(run._id).lean();
      if (doc0) sendLive({ type: 'run.status', runId: String(run._id), seq: lastSeq, run: { status: doc0.status, startedAt: doc0.startedAt, finishedAt: doc0.finishedAt, durationMs: doc0.durationMs } });
    } catch {}

    const streamStart = Date.now();
    const MAX_STREAM_MS = 10 * 60 * 1000; // 10 min max to prevent infinite polling
    const interval = setInterval(async () => {
      // Safety: close stream if it's been open too long
      if (Date.now() - streamStart > MAX_STREAM_MS) {
        clearInterval(interval);
        try { sendLive({ type: 'run.status', runId: String(run._id), run: { status: 'timed_out' } }); } catch {}
        try { res.end(); } catch {}
        return;
      }
      const doc = await Run.findById(run._id).lean();
      if (!doc) { clearInterval(interval); try{ res.end(); }catch{} return; }
      const news = await RunEvent.find({ runId: run._id, seq: { $gt: lastSeq } }).sort({ seq: 1 }).lean();
      for (const ev of news){ sendLive(ev); lastSeq = Math.max(lastSeq, ev.seq || 0); }
      // heartbeat with current status and timings
      sendLive({ type: 'run.status', runId: String(run._id), seq: lastSeq, run: { status: doc.status, startedAt: doc.startedAt, finishedAt: doc.finishedAt, durationMs: doc.durationMs } });
      if (doc.status === 'success' || doc.status === 'error' || doc.status === 'cancelled' || doc.status === 'timed_out'){
        clearInterval(interval);
        try{ res.end(); }catch{}
      }
    }, 200);

    req.on('close', () => { clearInterval(interval); console.log(`[runs][db] stream closed: runId=${String(run._id)} reqId=${req.requestId}`); });
  });

  // List runs by workspace with filters and pagination
  r.get('/workspaces/:wsId/runs', async (req, res) => {
    const { Types } = require('mongoose');
    const wsId = String(req.params.wsId);
    const ws = Types.ObjectId.isValid(wsId) ? await Workspace.findById(wsId) : await Workspace.findOne({ id: wsId });
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    const { flowId, status, q } = req.query;
    let { limit = 20, offset = 0, sort } = req.query;
    limit = Math.max(1, Math.min(100, Number(limit) || 20));
    offset = Math.max(0, Number(offset) || 0);
    const findQ = { workspaceId: ws._id };
    if (flowId) findQ.flowId = flowId;
    if (status) findQ.status = status;
    if (q) {
      const flows = await Flow.find({ workspaceId: ws._id, name: { $regex: String(q), $options: 'i' } }, { _id: 1 });
      if (flows.length) findQ.flowId = { $in: flows.map(f => f._id) };
    }
    let sortObj = { createdAt: -1 };
    if (sort) { const [f,d] = String(sort).split(':'); if (f) sortObj = { [f]: (d==='asc'?1:-1) }; }
    const list = await Run.find(findQ).sort(sortObj).skip(offset).limit(limit).lean();
    const runIds = list.map(r => r._id);
    const aggAttempts = await Attempt.aggregate([
      { $match: { runId: { $in: runIds } } },
      { $group: { _id: '$runId', count: { $sum: 1 } } }
    ]);
    const aggEvents = await RunEvent.aggregate([
      { $match: { runId: { $in: runIds } } },
      { $group: { _id: '$runId', count: { $sum: 1 } } }
    ]);
    const mapAttempts = new Map(aggAttempts.map(d => [String(d._id), d.count]));
    const mapEvents = new Map(aggEvents.map(d => [String(d._id), d.count]));
    res.apiOk(list.map(r => ({
      id: String(r._id), flowId: String(r.flowId), workspaceId: String(r.workspaceId), status: r.status,
      startedAt: r.startedAt, finishedAt: r.finishedAt, durationMs: r.durationMs, finalPayload: r.finalPayload,
      nodesExecuted: mapAttempts.get(String(r._id)) || 0,
      eventsCount: mapEvents.get(String(r._id)) || 0,
    })));
  });

  // List runs by flow
  r.get('/flows/:flowId/runs', async (req, res) => {
    const { Types } = require('mongoose');
    const fid = String(req.params.flowId);
    let flow = null;
    if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid);
    if (!flow) flow = await Flow.findOne({ id: fid });
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = await Workspace.findById(flow.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    let { status, limit = 20, offset = 0, sort } = req.query;
    limit = Math.max(1, Math.min(100, Number(limit) || 20));
    offset = Math.max(0, Number(offset) || 0);
    const findQ = { flowId: flow._id };
    if (status) findQ.status = status;
    let sortObj = { createdAt: -1 };
    if (sort) { const [f,d] = String(sort).split(':'); if (f) sortObj = { [f]: (d==='asc'?1:-1) }; }
    const list = await Run.find(findQ).sort(sortObj).skip(offset).limit(limit).lean();
    const runIds = list.map(r => r._id);
    const aggAttempts = await Attempt.aggregate([
      { $match: { runId: { $in: runIds } } },
      { $group: { _id: '$runId', count: { $sum: 1 } } }
    ]);
    const aggEvents = await RunEvent.aggregate([
      { $match: { runId: { $in: runIds } } },
      { $group: { _id: '$runId', count: { $sum: 1 } } }
    ]);
    const mapAttempts = new Map(aggAttempts.map(d => [String(d._id), d.count]));
    const mapEvents = new Map(aggEvents.map(d => [String(d._id), d.count]));
    res.apiOk(list.map(r => ({
      id: String(r._id), flowId: String(r.flowId), workspaceId: String(r.workspaceId), status: r.status,
      startedAt: r.startedAt, finishedAt: r.finishedAt, durationMs: r.durationMs, finalPayload: r.finalPayload,
      nodesExecuted: mapAttempts.get(String(r._id)) || 0,
      eventsCount: mapEvents.get(String(r._id)) || 0,
    })));
  });

  // Get latest run (optionally by flowId) for a workspace
  r.get('/workspaces/:wsId/runs/latest', async (req, res) => {
    const { Types } = require('mongoose');
    const wsId = String(req.params.wsId);
    const ws = Types.ObjectId.isValid(wsId) ? await Workspace.findById(wsId) : await Workspace.findOne({ id: wsId });
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const { flowId } = req.query;
    const q = { workspaceId: ws._id };
    if (flowId) q.flowId = flowId;
    const last = await Run.findOne(q).sort({ createdAt: -1 }).select('-graph -msg -events -attempts').lean();
    res.apiOk(last || null);
  });

  // Cancel a run
  r.post('/runs/:runId/cancel', async (req, res) => {
    const rid = String(req.params.runId);
    let run = await Run.findById(rid);
    if (!run) run = await Run.findOne({ id: rid });
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
    const ws = await Workspace.findById(run.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'run_not_found', 'Run not found');
    if (['success','error','cancelled','timed_out'].includes(run.status)) return res.apiOk(run);
    cancelled.add(String(run._id));
    run.status = 'cancelled';
    run.finishedAt = new Date();
    run.durationMs = run.startedAt ? (run.finishedAt.getTime() - run.startedAt.getTime()) : undefined;
    run.events.push({ ts: Date.now(), type: 'run.cancelled' });
    await run.save();
    broadcast(String(run._id), { type: 'run.cancelled', ts: Date.now() });
    broadcastRun(String(run._id), { type: 'run.cancelled', ts: Date.now() });
    res.apiOk(run);
  });

  return r;
}
