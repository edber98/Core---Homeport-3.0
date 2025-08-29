const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../auth/jwt');
const { randomUUID } = require('crypto');

module.exports = function(store){
  const r = express.Router();
  // Public minimal endpoint for Start Form
  r.get('/public/flows/:flowId/public-form', (req, res) => {
    const { flowId } = req.params; const flow = store.flows.get(flowId);
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    try {
      const graph = flow.graph || {};
      const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
      // Prefer the dedicated Start Form template if present, else fallback to first start node
      const startFormByType = nodes.find(n => String(n?.data?.model?.templateObj?.type || '').toLowerCase() === 'start_form');
      const startFormById = nodes.find(n => String(n?.data?.model?.templateObj?.id || n?.data?.model?.template || '').toLowerCase() === 'start_form');
      const start = startFormByType || startFormById || nodes.find(n => String(n?.data?.model?.templateObj?.type || '').toLowerCase() === 'start');
      if (!start) return res.apiError(404, 'start_not_found', 'Start node not found');
      const m = start?.data?.model || {};
      const isPublic = !!m.startFormPublic;
      if (!isPublic) return res.apiError(403, 'form_not_public', 'Start form is not public');
      let schema = null;
      try {
        if (m && m.context && (Array.isArray(m.context.fields) || Array.isArray(m.context.steps))) schema = m.context;
        else schema = m.startFormSchema || null;
      } catch { schema = m.startFormSchema || null; }
      return res.apiOk({ flowId, name: flow.name, nodeId: String(start.id || ''), nodeTitle: (m.templateObj && (m.templateObj.title || m.name)) || m.name || 'Start', schema });
    } catch (e) { return res.apiError(500, 'internal_error', 'Failed to read start form'); }
  });
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
    const { name, description = '', status = 'draft', enabled = true, graph = { nodes: [], edges: [] } } = req.body || {};
    if (!name || String(name).trim() === '') return res.status(400).json({ error: 'name required' });
    const flow = store.add(store.flows, { name: String(name), description: String(description || ''), workspaceId: wsId, status, enabled, graph });
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
