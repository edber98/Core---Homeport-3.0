const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Flow = require('../../db/models/flow.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const Run = require('../../db/models/run.model');
const { runFlow } = require('../../engine');
const { broadcast } = require('../../realtime/ws');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.post('/flows/:flowId/runs', async (req, res) => {
    const flow = await Flow.findById(req.params.flowId);
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = await Workspace.findById(flow.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');

    if (flow.enabled === false) return res.apiError(409, 'flow_disabled', 'Flow is disabled');
    const run = await Run.create({ flowId: flow._id, workspaceId: ws._id, companyId: ws.companyId, status: 'running', events: [], result: null });
    res.status(201).json({ success: true, data: { id: String(run._id), status: run.status }, requestId: req.requestId, ts: Date.now() });

    (async () => {
      try {
        const payload = req.body?.payload ?? null;
        const initialMsg = { payload };
        let finalMsg = null;
        await runFlow(flow.graph || flow, { now: new Date() }, initialMsg, async (ev) => {
          const doc = await Run.findById(run._id);
          doc.events.push({ ts: Date.now(), type: ev.type, data: ev });
          await doc.save();
          broadcast(String(run._id), ev);
          if (ev.type === 'run.completed') finalMsg = ev; // capture full payload
        });
        const doc = await Run.findById(run._id);
        doc.status = 'completed';
        doc.result = finalMsg?.payload ?? null;
        await doc.save();
      } catch (e) {
        const doc = await Run.findById(run._id);
        doc.status = 'failed';
        const ev = { ts: Date.now(), type: 'run.failed', error: e.message };
        doc.events.push(ev);
        await doc.save();
        broadcast(String(run._id), ev);
      }
    })();
  });

  r.get('/runs/:runId', async (req, res) => {
    const run = await Run.findById(req.params.runId);
    if (!run) return res.apiError(404, 'run_not_found', 'Run not found');
    const ws = await Workspace.findById(run.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'run_not_found', 'Run not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    if (req.query.populate === '1'){
      const rp = await Run.findById(run._id).populate('flowId').populate('workspaceId');
      return res.apiOk(rp);
    }
    res.apiOk({ id: String(run._id), flowId: String(run.flowId), workspaceId: String(run.workspaceId), companyId: String(run.companyId), status: run.status, events: run.events, result: run.result });
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

    const sendEvent = (ev) => { res.write(`event: ${ev.type}\n`); res.write(`data: ${JSON.stringify(ev)}\n\n`); };
    // replay
    for (const ev of run.events){ sendEvent(ev); }

    let lastCount = run.events.length;
    const interval = setInterval(async () => {
      const doc = await Run.findById(run._id).lean();
      if (!doc) { clearInterval(interval); try{ res.end(); }catch{} return; }
      if (doc.events.length > lastCount){
        for (let i=lastCount;i<doc.events.length;i++) sendEvent(doc.events[i]);
        lastCount = doc.events.length;
      }
      res.write(`event: heartbeat\n`);
      res.write(`data: ${JSON.stringify({ ts: Date.now(), status: doc.status })}\n\n`);
      if (doc.status === 'completed' || doc.status === 'failed'){
        res.write(`event: run.${doc.status}\n`);
        res.write(`data: ${JSON.stringify({ ts: Date.now(), status: doc.status, result: doc.result })}\n\n`);
        clearInterval(interval);
        try{ res.end(); }catch{}
      }
    }, 600);

    req.on('close', () => { clearInterval(interval); });
  });

  return r;
}
