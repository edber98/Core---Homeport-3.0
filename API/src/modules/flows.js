const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../auth/jwt');
const { randomUUID } = require('crypto');
const { normalizeGraphFormSchemas } = require('../utils/form-schema');

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
    const { name, description = '', status = 'draft', enabled = true, graph = { nodes: [], edges: [] }, settings = {} } = req.body || {};
    if (!name || String(name).trim() === '') return res.status(400).json({ error: 'name required' });
    normalizeGraphFormSchemas(graph);
    const flow = store.add(store.flows, { name: String(name), description: String(description || ''), workspaceId: wsId, status, enabled, graph, settings: (typeof settings === 'object' && settings) ? settings : {} });
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
    if (patch.graph) normalizeGraphFormSchemas(patch.graph);
    // Guard: prevent enabling/activating invalid flows (typed handles v2)
    try {
      const activating = (patch.enabled === true) || (typeof patch.status === 'string' && String(patch.status).toLowerCase() === 'active');
      if (activating) {
        const graph = (patch.graph || f.graph || {});
        const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const edges = Array.isArray(graph.edges) ? graph.edges : [];
        const nodesMap = new Map(nodes.map(n => [String(n.id), n]));
        const getHandleType = (nodeId, handleId, dir) => {
          try {
            const n = nodesMap.get(String(nodeId));
            const tpl = (n && (n.data?.model?.templateObj || n.data?.model)) || {};
            const arr = dir === 'source' ? (tpl.outputHandles || []) : (tpl.inputHandles || []);
            const h = (arr || []).find(hh => String(hh?.id) === String(handleId));
            if (!h) {
              if (dir === 'source') return 'any';
              if (dir === 'target' && String(handleId) === 'in' && !(Array.isArray(tpl.inputHandles) && tpl.inputHandles.length)) return 'any';
            }
            return (h && (h.type || 'any')) || 'any';
          } catch { return 'any'; }
        };
        const getAcceptsForTarget = (nodeId, handleId) => {
          try {
            const n = nodesMap.get(String(nodeId));
            const tpl = (n && (n.data?.model?.templateObj || n.data?.model)) || {};
            const kind = String(tpl?.type || tpl?.nodeKind || '').toLowerCase();
            if (kind === 'start' || kind === 'start_form' || kind === 'event' || kind === 'endpoint') return { accepts: [], trigger: true, multiple: true };
            const ih = (tpl.inputHandles || []).find(hh => String(hh?.id) === String(handleId));
            if (ih && Array.isArray(ih.accepts)) return { accepts: ih.accepts, trigger: false, multiple: ih.multiple !== false };
            const links = Array.isArray(tpl.linkedHandles) ? tpl.linkedHandles : [];
            const lh = links.find(hh => String(hh?.id) === String(handleId));
            if (lh && Array.isArray(lh.accepts)) return { accepts: lh.accepts, trigger: false, multiple: lh.multiple !== false };
            if (String(handleId) === 'in' && !(Array.isArray(tpl.inputHandles) && tpl.inputHandles.length)) return { accepts: ['any'], trigger: false, multiple: true };
            return { accepts: [], trigger: false, multiple: true };
          } catch { return { accepts: [], trigger: false, multiple: true }; }
        };
        const issues = [];
        for (const e of edges) {
          const sid = String(e.source), tid = String(e.target);
          const sh = String(e.sourceHandle || ''), th = String(e.targetHandle || '');
          const sType = getHandleType(sid, sh, 'source') || 'any';
          const tgt = getAcceptsForTarget(tid, th);
          if (tgt.trigger) { issues.push({ edgeId: e.id, nodeId: tid, message: 'Trigger node does not accept inputs' }); continue; }
          const ok = (sType === 'any') || tgt.accepts.includes('any') || tgt.accepts.includes(sType);
          if (!ok) { issues.push({ edgeId: e.id, nodeId: tid, message: `Type mismatch: ${sType} → ${th || 'in'} (accepts: ${tgt.accepts.join(',') || 'any'})` }); continue; }
          // Multiplicity checks
          const outSame = edges.filter(x => String(x.source) === sid && String(x.sourceHandle || '') === sh);
          try {
            const sn = nodesMap.get(sid);
            const stpl = (sn && (sn.data?.model?.templateObj || sn.data?.model)) || {};
            const sdef = (stpl.outputHandles || []).find(hh => String(hh?.id) === sh);
            const sMultiple = !sdef || sdef.multiple !== false;
            if (!sMultiple && outSame.length > 1) issues.push({ edgeId: e.id, nodeId: sid, message: `Output handle ${sh} allows a single connection` });
          } catch {}
          const inSame = edges.filter(x => String(x.target) === tid && String(x.targetHandle || '') === th);
          if (!tgt.multiple && inSame.length > 1) issues.push({ edgeId: e.id, nodeId: tid, message: `Target handle ${th} allows a single connection` });
        }
        if (issues.length) return res.status(400).json({ error: 'flow_invalid', message: 'Flow has invalid connections', data: { issues } });
      }
    } catch {}
    const upd = { ...f, ...patch, id: f.id };
    store.flows.set(f.id, upd);
    res.apiOk(upd);
  });

  // Validate a flow graph by handle typing (v2)
  r.post('/flows/:flowId/validate', (req, res) => {
    const { flowId } = req.params;
    const flow = store.flows.get(flowId);
    if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = store.workspaces.get(flow.workspaceId);
    if (!ws || ws.companyId !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');

    const graph = flow.graph || {};
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];

    const nodesMap = new Map(nodes.map(n => [String(n.id), n]));

    const getHandleType = (nodeId, handleId, dir) => {
      try {
        const n = nodesMap.get(String(nodeId));
        const tpl = (n && (n.data?.model?.templateObj || n.data?.model)) || {};
        const arr = dir === 'source' ? (tpl.outputHandles || []) : (tpl.inputHandles || []);
        const h = (arr || []).find(hh => String(hh?.id) === String(handleId));
        if (!h) {
          if (dir === 'source') return 'any';
          if (dir === 'target' && String(handleId) === 'in' && !(Array.isArray(tpl.inputHandles) && tpl.inputHandles.length)) return 'any';
        }
        return (h && (h.type || 'any')) || 'any';
      } catch { return 'any'; }
    };

    const getAcceptsForTarget = (nodeId, handleId) => {
      try {
        const n = nodesMap.get(String(nodeId));
        const tpl = (n && (n.data?.model?.templateObj || n.data?.model)) || {};
        const kind = String(tpl?.type || tpl?.nodeKind || '').toLowerCase();
        if (kind === 'start' || kind === 'start_form' || kind === 'event' || kind === 'endpoint') return { accepts: [], trigger: true };
        const ih = (tpl.inputHandles || []).find(hh => String(hh?.id) === String(handleId));
        if (ih && Array.isArray(ih.accepts)) return { accepts: ih.accepts, trigger: false };
        const links = Array.isArray(tpl.linkedHandles) ? tpl.linkedHandles : [];
        const lh = links.find(hh => String(hh?.id) === String(handleId));
        if (lh && Array.isArray(lh.accepts)) return { accepts: lh.accepts, trigger: false };
        if (String(handleId) === 'in' && !(Array.isArray(tpl.inputHandles) && tpl.inputHandles.length)) return { accepts: ['any'], trigger: false };
        return { accepts: [], trigger: false };
      } catch { return { accepts: [], trigger: false }; }
    };

    const issues = [];
    for (const e of edges) {
      const sid = String(e.source), tid = String(e.target);
      const sh = String(e.sourceHandle || ''), th = String(e.targetHandle || '');
      const sType = getHandleType(sid, sh, 'source') || 'any';
      const { accepts, trigger } = getAcceptsForTarget(tid, th);
      if (trigger) {
        issues.push({ edgeId: e.id, nodeId: tid, message: 'Trigger node does not accept inputs' });
        continue;
      }
      const ok = (sType === 'any') || accepts.includes('any') || accepts.includes(sType);
      if (!ok) issues.push({ edgeId: e.id, nodeId: tid, message: `Type mismatch: ${sType} → ${th || 'in'} (accepts: ${accepts.join(',') || 'any'})` });
    }

    return res.apiOk({ ok: issues.length === 0, issues });
  });

  return r;
}
