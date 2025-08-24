const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../auth/jwt');
const { randomUUID } = require('crypto');

module.exports = function(store){
  const r = express.Router();
  r.use(authMiddleware(store));
  r.use(requireCompanyScope());

  r.get('/workspaces/:wsId/flows', (req, res) => {
    const { wsId } = req.params;
    const ws = store.workspaces.get(wsId);
    if (!ws || ws.companyId !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const list = [...store.flows.values()].filter(f => f.workspaceId === wsId);
    res.apiOk(list);
  });

  r.post('/workspaces/:wsId/flows', (req, res) => {
    const { wsId } = req.params;
    const ws = store.workspaces.get(wsId);
    if (!ws || ws.companyId !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const { name, status = 'draft', enabled = true, graph = { nodes: [], edges: [] } } = req.body || {};
    if (!name || String(name).trim() === '') return res.status(400).json({ error: 'name required' });
    const flow = store.add(store.flows, { name: String(name), workspaceId: wsId, status, enabled, graph });
    res.status(201).json({ success: true, data: flow, requestId: req.requestId, ts: Date.now() });
  });

  r.get('/flows/:flowId', (req, res) => {
    const { flowId } = req.params;
    const flow = store.flows.get(flowId);
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = store.workspaces.get(flow.workspaceId);
    if (!ws || ws.companyId !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    res.apiOk(flow);
  });

  r.put('/flows/:flowId', (req, res) => {
    const { flowId } = req.params; const patch = req.body || {};
    const f = store.flows.get(flowId); if (!f) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = store.workspaces.get(f.workspaceId); if (!ws || ws.companyId !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const upd = { ...f, ...patch, id: f.id };
    store.flows.set(f.id, upd);
    res.apiOk(upd);
  });

  return r;
}
