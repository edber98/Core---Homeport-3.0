const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../auth/jwt');
const { runFlow } = require('../engine');
const { randomUUID } = require('crypto');
const { broadcast } = require('../realtime/ws');
const { broadcastRun } = require('../realtime/socketio');

module.exports = function(store){
  const r = express.Router();
  r.use(authMiddleware(store));
  r.use(requireCompanyScope());

  r.post('/flows/:flowId/runs', async (req, res) => {
    const { flowId } = req.params; const flow = store.flows.get(flowId);
    if (!flow) { console.warn(`[runs][mem] start: flow not found flowId=${flowId} reqId=${req.requestId}`); return res.status(404).json({ error: 'flow not found' }); }
    const ws = store.workspaces.get(flow.workspaceId); if (!ws || ws.companyId !== req.user.companyId) return res.status(404).json({ error: 'flow not found' });
    if (flow.enabled === false) {
      console.warn(`[runs][mem] start: flow disabled flowId=${flowId} workspaceId=${ws.id} companyId=${ws.companyId} reqUser=${req.user?.id} reqId=${req.requestId}`);
      return res.apiError(409, 'flow_disabled', 'Flow is disabled', { flowId, workspaceId: ws.id, enabled: flow.enabled });
    }
    console.log(`[runs][mem] start: flowId=${flowId} enabled=${flow.enabled !== false} ws=${ws.id} user=${req.user?.id} reqId=${req.requestId}`);
    const runId = randomUUID();
    const now = new Date();
    const run = { id: runId, flowId, workspaceId: ws.id, companyId: ws.companyId, status: 'running', events: [], attempts: [], result: null, startedAt: now, finishedAt: null, durationMs: null };
    store.runs.set(runId, run);
    res.status(201).json({ success: true, data: { id: runId, status: run.status }, requestId: req.requestId, ts: Date.now() });
    console.log(`[runs][mem] created run: id=${runId} flowId=${flowId} status=${run.status} reqId=${req.requestId}`);

    // Async execute
    (async () => {
      try{
        const payload = req.body?.payload ?? null;
        const initialMsg = { payload };
        await runFlow(flow.graph || flow, { now: new Date() }, initialMsg, (ev) => {
          const evt = { ts: Date.now(), type: ev.type, data: ev };
          run.events.push(evt);
          // Maintain attempts in memory
          try {
            if (ev.type === 'node.started'){
              run.attempts.push({ runId, nodeId: String(ev.nodeId||''), attempt: 1, status: 'running', startedAt: ev.startedAt || new Date().toISOString(), argsPre: ev.argsPre, templateKey: ev.templateKey, kind: ev.kind });
            } else if (ev.type === 'node.done'){
              const nid = String(ev.nodeId || '');
              const last = run.attempts.slice().reverse().find(a => String(a.nodeId) === nid && !a.finishedAt);
              if (last){
                last.status = 'success'; last.finishedAt = ev.finishedAt || new Date().toISOString(); last.durationMs = ev.durationMs; last.argsPost = ev.argsPost; last.input = ev.input; last.result = ev.result;
              } else {
                run.attempts.push({ runId, nodeId: nid, attempt: 1, status: 'success', startedAt: ev.startedAt, finishedAt: ev.finishedAt, durationMs: ev.durationMs, argsPre: ev.argsPre, argsPost: ev.argsPost, input: ev.input, result: ev.result });
              }
            }
          } catch {}
          try { broadcast(String(runId), ev); } catch {}
          try { broadcastRun(String(runId), ev); } catch {}
          try { if (ev && ev.type) console.log(`[runs][mem] event: runId=${runId} type=${ev.type}`); } catch {}
        });
        run.status = 'success';
        run.result = run.events[run.events.length - 1]?.data?.payload ?? null;
        run.finishedAt = new Date();
        try { run.durationMs = run.startedAt ? (run.finishedAt.getTime() - new Date(run.startedAt).getTime()) : null; } catch {}
        console.log(`[runs][mem] completed: runId=${runId} status=${run.status}`);
      } catch (e) {
        run.status = 'error';
        const ev = { ts: Date.now(), type: 'run.failed', error: e.message };
        run.events.push(ev);
        try { broadcast(String(runId), ev); } catch {}
        try { broadcastRun(String(runId), ev); } catch {}
        run.finishedAt = new Date();
        try { run.durationMs = run.startedAt ? (run.finishedAt.getTime() - new Date(run.startedAt).getTime()) : null; } catch {}
        console.error(`[runs][mem] failed: runId=${runId} error=${e && e.message ? e.message : e}`);
      }
    })();
  });

  r.get('/runs/:runId', (req, res) => {
    const { runId } = req.params; const run = store.runs.get(runId);
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
    const ws = store.workspaces.get(run.workspaceId); if (!ws || ws.companyId !== req.user.companyId) return res.status(404).json({ error: 'run not found' });
    res.apiOk(run);
  });

  r.get('/runs/:runId/stream', (req, res) => {
    const { runId } = req.params; const run = store.runs.get(runId);
    if (!run) { console.warn(`[runs][mem] stream: run not found runId=${runId} reqId=${req.requestId}`); return res.apiError(404, 'run_not_found', 'Run not found'); }
    const ws = store.workspaces.get(run.workspaceId); if (!ws || ws.companyId !== req.user.companyId) return res.status(404).json({ error: 'run not found' });
    console.log(`[runs][mem] stream open: runId=${runId} events=${(run.events||[]).length} reqId=${req.requestId}`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    const sendEvent = (ev) => { res.write(`event: ${ev.type}\n`); res.write(`data: ${JSON.stringify(ev)}\n\n`); };
    // Replay existing
    for (const ev of run.events){ sendEvent(ev); }

    let lastCount = run.events.length;
    const interval = setInterval(() => {
      const r = store.runs.get(runId);
      if (!r) { clearInterval(interval); try{ res.end(); }catch{} return; }
      if ((r.events?.length || 0) > lastCount){
        for (let i = lastCount; i < r.events.length; i++) sendEvent(r.events[i]);
        lastCount = r.events.length;
      }
      // Send a heartbeat to keep connection
      res.write(`event: heartbeat\n`);
      res.write(`data: ${JSON.stringify({ ts: Date.now(), status: r.status })}\n\n`);
      if (r.status === 'success' || r.status === 'error'){
        // final event
        res.write(`event: run.${r.status}\n`);
        res.write(`data: ${JSON.stringify({ ts: Date.now(), status: r.status, result: r.result })}\n\n`);
        clearInterval(interval);
        try{ res.end(); }catch{}
      }
    }, 500);

    req.on('close', () => { clearInterval(interval); });
    req.on('close', () => { console.log(`[runs][mem] stream closed: runId=${runId} reqId=${req.requestId}`); });
  });

  // Cancel a run (best-effort): mark as cancelled
  r.post('/runs/:runId/cancel', (req, res) => {
    const { runId } = req.params; const run = store.runs.get(runId);
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
    const ws = store.workspaces.get(run.workspaceId); if (!ws || ws.companyId !== req.user.companyId) return res.status(404).json({ error: 'run not found' });
    run.status = 'cancelled';
    const ev = { ts: Date.now(), type: 'run.cancelled', reason: 'user_request' };
    run.events.push(ev);
    try { broadcast(String(runId), ev); } catch {}
    try { broadcastRun(String(runId), ev); } catch {}
    console.warn(`[runs][mem] cancelled: runId=${runId} by user=${req.user?.id} reqId=${req.requestId}`);
    res.apiOk({ id: run.id, status: run.status });
  });

  // List runs by workspace
  r.get('/workspaces/:wsId/runs', (req, res) => {
    const { wsId } = req.params;
    const ws = store.workspaces.get(wsId);
    if (!ws || ws.companyId !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const { flowId, status } = req.query || {};
    let list = [...store.runs.values()].filter(r => r.workspaceId === wsId);
    if (flowId) list = list.filter(r => String(r.flowId) === String(flowId));
    if (status) list = list.filter(r => String(r.status) === String(status));
    // sort and paginate
    let sort = String(req.query?.sort || 'startedAt:desc');
    try {
      const [field, dir] = String(sort).split(':');
      const mul = dir === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        const va = (a as any)[field] || 0; const vb = (b as any)[field] || 0;
        const ta = typeof va === 'string' ? Date.parse(va) || va : va;
        const tb = typeof vb === 'string' ? Date.parse(vb) || vb : vb;
        return (ta > tb ? 1 : (ta < tb ? -1 : 0)) * mul;
      });
    } catch {}
    let limit = Math.max(1, Math.min(100, Number(req.query?.limit) || 20));
    let offset = Math.max(0, Number(req.query?.offset) || 0);
    const paged = list.slice(offset, offset + limit);
    res.apiOk(paged.map(r => ({
      id: r.id, flowId: r.flowId, workspaceId: r.workspaceId, status: r.status,
      startedAt: r.startedAt, finishedAt: r.finishedAt, durationMs: r.durationMs,
      nodesExecuted: Array.isArray(r.events) ? r.events.filter(ev => ev && ev.type === 'node.done').length : 0,
      eventsCount: Array.isArray(r.events) ? r.events.length : 0,
      finalPayload: r.result,
    })));
  });

  // List runs by flow
  r.get('/flows/:flowId/runs', (req, res) => {
    const { flowId } = req.params;
    const flow = store.flows.get(flowId);
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = store.workspaces.get(flow.workspaceId); if (!ws || ws.companyId !== req.user.companyId) return res.status(404).json({ error: 'flow not found' });
    const { status } = req.query || {};
    let list = [...store.runs.values()].filter(r => r.flowId === flowId);
    if (status) list = list.filter(r => String(r.status) === String(status));
    // sort and paginate
    let sort = String(req.query?.sort || 'startedAt:desc');
    try {
      const [field, dir] = String(sort).split(':');
      const mul = dir === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        const va = (a as any)[field] || 0; const vb = (b as any)[field] || 0;
        const ta = typeof va === 'string' ? Date.parse(va) || va : va;
        const tb = typeof vb === 'string' ? Date.parse(vb) || vb : vb;
        return (ta > tb ? 1 : (ta < tb ? -1 : 0)) * mul;
      });
    } catch {}
    let limit = Math.max(1, Math.min(100, Number(req.query?.limit) || 20));
    let offset = Math.max(0, Number(req.query?.offset) || 0);
    const paged = list.slice(offset, offset + limit);
    res.apiOk(paged.map(r => ({
      id: r.id, flowId: r.flowId, workspaceId: r.workspaceId, status: r.status,
      startedAt: r.startedAt, finishedAt: r.finishedAt, durationMs: r.durationMs,
      nodesExecuted: Array.isArray(r.events) ? r.events.filter(ev => ev && ev.type === 'node.done').length : 0,
      eventsCount: Array.isArray(r.events) ? r.events.length : 0,
      finalPayload: r.result,
    })));
  });

  return r;
}
