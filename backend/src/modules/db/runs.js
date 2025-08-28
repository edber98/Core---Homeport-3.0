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
const { broadcast } = require('../../realtime/ws');
const { broadcastRun } = require('../../realtime/socketio');

module.exports = function(){
  const r = express.Router();
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
    console.log(`[runs][db] start: flowId=${fid} ws=${flow.workspaceId} user=${req.user?.id} reqId=${req.requestId}`);
    const now = new Date();
    const run = await Run.create({ flowId: flow._id, workspaceId: ws._id, companyId: ws.companyId, status: 'running', events: [], result: null, finalPayload: null, startedAt: now });
    res.status(201).json({ success: true, data: { id: String(run._id), status: run.status }, requestId: req.requestId, ts: Date.now() });
    console.log(`[runs][db] created run: id=${String(run._id)} flowId=${String(flow._id)} status=${run.status} reqId=${req.requestId}`);

    (async () => {
      try {
        const payload = req.body?.payload ?? null;
        const initialMsg = { payload };
        let finalMsg = null;
        let seq = 0; // live event sequence
        await runFlow(flow.graph || flow, { now: new Date() }, initialMsg, async (ev) => {
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
                { $setOnInsert: { status: 'running', kind: ev.kind || undefined, templateKey: ev.templateKey || undefined, startedAt, argsPre: ev.argsPre, branchId } },
                { upsert: true, new: true }
              );
            }
            await RunEvent.create({ runId: run._id, type: 'node.status', nodeId, attemptId: att._id, exec: usedAttempt, branchId, seq: ++seq, data: { status: 'running', startedAt }, ts });
          }
          if (ev.type === 'node.done'){
            const nodeId = String(ev.nodeId || '');
            const branchId = String(ev.branchId || '');
            let att = await Attempt.findOne({ runId: run._id, nodeId, branchId, finishedAt: { $exists: false } }).sort({ attempt: -1 });
            const finishedAt = ev.finishedAt ? new Date(ev.finishedAt) : ts;
            if (att){
              att.status = 'success'; att.finishedAt = finishedAt; att.durationMs = typeof ev.durationMs === 'number' ? ev.durationMs : (att.startedAt ? (finishedAt.getTime() - new Date(att.startedAt).getTime()) : undefined);
              att.argsPost = ev.argsPost; att.input = ev.input; att.result = ev.result; await att.save();
              await RunEvent.create({ runId: run._id, type: 'node.result', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { input: ev.input, argsPre: ev.argsPre, result: ev.result, argsPost: ev.argsPost, durationMs: att.durationMs, finishedAt }, ts });
              await RunEvent.create({ runId: run._id, type: 'node.status', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { status: 'success', finishedAt, durationMs: att.durationMs }, ts });
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
                { $setOnInsert: { status: 'success', branchId, startedAt: ev.startedAt ? new Date(ev.startedAt) : undefined, finishedAt, durationMs: ev.durationMs, argsPre: ev.argsPre, argsPost: ev.argsPost, input: ev.input, result: ev.result } },
                { upsert: true, new: true }
              );
              await RunEvent.create({ runId: run._id, type: 'node.result', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { input: ev.input, argsPre: ev.argsPre, result: ev.result, argsPost: ev.argsPost, durationMs: att.durationMs, finishedAt }, ts });
              await RunEvent.create({ runId: run._id, type: 'node.status', nodeId, attemptId: att._id, exec: att.attempt, branchId, seq: ++seq, data: { status: 'success', finishedAt, durationMs: att.durationMs }, ts });
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
              livePackets.push({ type: 'node.result', nodeId, exec: att?.attempt, data: { input: ev.input, argsPre: ev.argsPre, argsPost: ev.argsPost, result: ev.result, durationMs: ev.durationMs, startedAt: ev.startedAt, finishedAt: ev.finishedAt } });
              livePackets.push({ type: 'node.status', nodeId, exec: att?.attempt, data: { status: 'success', finishedAt: ev.finishedAt, durationMs: ev.durationMs } });
            } catch {
              livePackets.push({ type: 'node.result', nodeId: ev.nodeId, data: { input: ev.input, argsPre: ev.argsPre, argsPost: ev.argsPost, result: ev.result, durationMs: ev.durationMs, startedAt: ev.startedAt, finishedAt: ev.finishedAt } });
            }
          }
          if (ev.type === 'edge.taken') livePackets.push({ type: 'edge.taken', data: { sourceId: ev.sourceId, targetId: ev.targetId } });
          if (ev.type === 'run.completed') livePackets.push({ type: 'run.status', run: { status: 'success', result: ev.payload } });
          for (const pkt of livePackets){ broadcast(String(run._id), pkt); broadcastRun(String(run._id), pkt); }
          try { if (ev && ev.type) console.log(`[runs][db] event: runId=${String(run._id)} type=${ev.type}`); } catch {}
          if (ev.type === 'run.completed') finalMsg = ev; // capture full payload
        });
        const doc = await Run.findById(run._id);
        doc.status = 'success';
        doc.result = finalMsg?.payload ?? null;
        doc.finalPayload = doc.result;
        doc.finishedAt = new Date();
        doc.durationMs = doc.startedAt ? (doc.finishedAt.getTime() - doc.startedAt.getTime()) : undefined;
        doc.msg = finalMsg || null;
        await doc.save();
        try { await RunEvent.create({ runId: run._id, type: 'run.status', seq: ++seq, data: { status: 'success', result: doc.result }, ts: new Date() }); } catch {}
        console.log(`[runs][db] completed: runId=${String(run._id)} status=${doc.status}`);
      } catch (e) {
        const doc = await Run.findById(run._id);
        doc.status = 'error';
        doc.finishedAt = new Date();
        doc.durationMs = doc.startedAt ? (doc.finishedAt.getTime() - doc.startedAt.getTime()) : undefined;
        await doc.save();
        await RunEvent.create({ runId: run._id, type: 'run.status', seq: 1, data: { status: 'error', error: e && e.message ? e.message : String(e) }, ts: new Date() });
        const pkt = { type: 'run.status', run: { status: 'error', error: e && e.message ? e.message : String(e) } };
        broadcast(String(run._id), pkt);
        broadcastRun(String(run._id), pkt);
        console.error(`[runs][db] failed: runId=${String(run._id)} error=${e && e.message ? e.message : e}`);
      }
    })();
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
        return res.apiOk(out);
      }
      return res.apiOk(rp);
    }
    const base = { id: String(run._id), flowId: String(run.flowId), workspaceId: String(run.workspaceId), companyId: String(run.companyId), status: run.status, result: run.result, finalPayload: run.finalPayload, startedAt: run.startedAt, finishedAt: run.finishedAt, durationMs: run.durationMs };
    if (include.length){
      if (include.includes('attempts')) base.attempts = await Attempt.find({ runId: run._id }).sort({ startedAt: 1 }).lean();
      if (include.includes('events')) base.events = await RunEvent.find({ runId: run._id }).sort({ seq: 1 }).lean();
    }
    res.apiOk(base);
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
      if (doc0) sendLive({ type: 'run.status', runId: String(run._id), seq: lastSeq, run: { status: doc0.status } });
    } catch {}

    const interval = setInterval(async () => {
      const doc = await Run.findById(run._id).lean();
      if (!doc) { clearInterval(interval); try{ res.end(); }catch{} return; }
      const news = await RunEvent.find({ runId: run._id, seq: { $gt: lastSeq } }).sort({ seq: 1 }).lean();
      for (const ev of news){ sendLive(ev); lastSeq = Math.max(lastSeq, ev.seq || 0); }
      // heartbeat with current status
      sendLive({ type: 'run.status', runId: String(run._id), seq: lastSeq, run: { status: doc.status } });
      if (doc.status === 'success' || doc.status === 'error'){
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
    res.apiOk(list.map(r => ({
      id: String(r._id), flowId: String(r.flowId), workspaceId: String(r.workspaceId), status: r.status,
      startedAt: r.startedAt, finishedAt: r.finishedAt, durationMs: r.durationMs, finalPayload: r.finalPayload,
      eventsCount: Array.isArray(r.events) ? r.events.length : 0,
      nodesExecuted: Array.isArray(r.events) ? r.events.filter(ev => ev && ev.type === 'node.done').length : 0,
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
    res.apiOk(list.map(r => ({
      id: String(r._id), flowId: String(r.flowId), workspaceId: String(r.workspaceId), status: r.status,
      startedAt: r.startedAt, finishedAt: r.finishedAt, durationMs: r.durationMs, finalPayload: r.finalPayload,
      eventsCount: Array.isArray(r.events) ? r.events.length : 0,
      nodesExecuted: Array.isArray(r.events) ? r.events.filter(ev => ev && ev.type === 'node.done').length : 0,
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
    const last = await Run.findOne(q).sort({ createdAt: -1 }).lean();
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
