const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../auth/jwt');
const { runFlow } = require('../engine');
const { randomUUID } = require('crypto');

module.exports = function(store){
  const r = express.Router();
  r.use(authMiddleware(store));
  r.use(requireCompanyScope());

  r.post('/flows/:flowId/runs', async (req, res) => {
    const { flowId } = req.params; const flow = store.flows.get(flowId);
    if (!flow) return res.status(404).json({ error: 'flow not found' });
    const ws = store.workspaces.get(flow.workspaceId); if (!ws || ws.companyId !== req.user.companyId) return res.status(404).json({ error: 'flow not found' });
    if (flow.enabled === false) return res.apiError(409, 'flow_disabled', 'Flow is disabled');
    const runId = randomUUID();
    const run = { id: runId, flowId, workspaceId: ws.id, companyId: ws.companyId, status: 'running', events: [], result: null };
    store.runs.set(runId, run);
    res.status(201).json({ success: true, data: { id: runId, status: run.status }, requestId: req.requestId, ts: Date.now() });

    // Async execute
    (async () => {
      try{
        const payload = req.body?.payload ?? null;
        const initialMsg = { payload };
        await runFlow(flow.graph || flow, { now: new Date() }, initialMsg, (ev) => {
          run.events.push({ ts: Date.now(), ...ev });
        });
        run.status = 'completed';
        run.result = run.events[run.events.length - 1]?.payload ?? null;
      } catch (e) {
        run.status = 'failed';
        run.events.push({ ts: Date.now(), type: 'run.failed', error: e.message });
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
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
    const ws = store.workspaces.get(run.workspaceId); if (!ws || ws.companyId !== req.user.companyId) return res.status(404).json({ error: 'run not found' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    // Replay existing
    for (const ev of run.events){ res.write(`event: ${ev.type}\n`); res.write(`data: ${JSON.stringify(ev)}\n\n`); }

    const interval = setInterval(() => {
      const r = store.runs.get(runId);
      const last = r && r.events && r.events[r.events.length - 1];
      if (!r) { clearInterval(interval); try{ res.end(); }catch{} return; }
      // Send a heartbeat to keep connection
      res.write(`event: heartbeat\n`);
      res.write(`data: ${JSON.stringify({ ts: Date.now(), status: r.status })}\n\n`);
      if (r.status === 'completed' || r.status === 'failed'){
        // final event
        res.write(`event: run.${r.status}\n`);
        res.write(`data: ${JSON.stringify({ ts: Date.now(), status: r.status, result: r.result })}\n\n`);
        clearInterval(interval);
        try{ res.end(); }catch{}
      }
    }, 500);

    req.on('close', () => { clearInterval(interval); });
  });

  return r;
}
