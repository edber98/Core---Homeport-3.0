const express = require('express');
const { randomUUID } = require('crypto');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const { runFlow } = require('../../engine');

// Ephemeral in-memory store for ad-hoc test runs (not persisted)
const testRuns = new Map();

function hasStartNode(graph){
  try{
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    for (const n of nodes){
      const m = (n?.data?.model) || n?.model || {};
      const t = (m?.templateObj || {}).type || (m?.type) || '';
      const name = (m?.templateObj || {}).name || '';
      const idStr = String(n?.id || '').toLowerCase();
      const norm = String((t || name || '')).trim().toLowerCase();
      if (norm === 'start' || norm === 'start_form') return true;
      if (idStr.includes('start')) return true;
    }
  } catch {}
  return false;
}

module.exports = function() {
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  // Start an ad-hoc run with a graph provided in the request body.
  // Body: { graph: {...}, payload?: any }
  r.post('/test/runs', async (req, res) => {
    const graph = req.body?.graph;
    if (!graph || typeof graph !== 'object') return res.apiError(400, 'invalid_graph', 'Missing or invalid graph');
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    if (!nodes.length) return res.apiError(400, 'invalid_graph', 'Graph has no nodes');
    if (nodes.length > 500) return res.apiError(400, 'graph_too_large', 'Graph too large (max 500 nodes)');
    if (!hasStartNode(graph)) return res.apiError(400, 'no_start_node', 'Start node not found');

    // Basic edge validation: ensure edge endpoints exist
    try {
      const ids = new Set(nodes.map(n => String(n.id)));
      const edges = Array.isArray(graph.edges) ? graph.edges : [];
      for (const e of edges) {
        if (!ids.has(String(e?.source)) || !ids.has(String(e?.target))) {
          return res.apiError(400, 'invalid_edge', 'Edge references unknown node');
        }
      }
    } catch {}

    const runId = randomUUID();
    const run = { id: runId, status: 'running', events: [], result: null, startedAt: new Date(), finishedAt: null, durationMs: null };
    testRuns.set(runId, run);
    res.status(201).json({ success: true, data: { id: runId, status: run.status }, requestId: req.requestId, ts: Date.now() });

    // Execute asynchronously using the same engine as normal runs
    (async () => {
      try{
        const initialMsg = { payload: req.body?.payload ?? null };
        await runFlow(graph, { now: new Date() }, initialMsg, (ev) => {
          const evt = { ts: Date.now(), type: ev.type, data: ev };
          run.events.push(evt);
        });
        run.status = 'success';
        run.result = run.events[run.events.length - 1]?.data?.payload ?? null;
        run.finishedAt = new Date();
        try { run.durationMs = run.startedAt ? (run.finishedAt.getTime() - new Date(run.startedAt).getTime()) : null; } catch {}
      } catch (e) {
        run.status = 'error';
        const ev = { ts: Date.now(), type: 'run.failed', error: e?.message || String(e) };
        run.events.push(ev);
        run.finishedAt = new Date();
        try { run.durationMs = run.startedAt ? (run.finishedAt.getTime() - new Date(run.startedAt).getTime()) : null; } catch {}
      }
    })();
  });

  // Snapshot of an ad-hoc run
  r.get('/test/runs/:runId', (req, res) => {
    const { runId } = req.params;
    const run = testRuns.get(runId);
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
    return res.apiOk({ id: runId, status: run.status, startedAt: run.startedAt, finishedAt: run.finishedAt, durationMs: run.durationMs, finalPayload: run.result });
  });

  // SSE stream for an ad-hoc run
  r.get('/test/runs/:runId/stream', (req, res) => {
    const { runId } = req.params;
    const run = testRuns.get(runId);
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    const send = (ev) => { res.write(`event: ${ev.type}\n`); res.write(`data: ${JSON.stringify(ev)}\n\n`); };
    for (const ev of (run.events || [])) send(ev);
    let last = (run.events || []).length;
    const interval = setInterval(() => {
      const r = testRuns.get(runId);
      if (!r) { clearInterval(interval); try{ res.end(); }catch{} return; }
      if ((r.events?.length || 0) > last) {
        for (let i = last; i < r.events.length; i++) send(r.events[i]);
        last = r.events.length;
      }
      if (r.status === 'success' || r.status === 'error') { clearInterval(interval); try{ res.end(); }catch{} }
    }, 300);
    req.on('close', () => clearInterval(interval));
  });

  return r;
};
