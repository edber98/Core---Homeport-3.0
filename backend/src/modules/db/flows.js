const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const Flow = require('../../db/models/flow.model');
const NodeTemplate = require('../../db/models/node-template.model');
const Notification = require('../../db/models/notification.model');
const { validateFlowGraph, normalizeTemplateKey } = require('../../utils/validate');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/workspaces/:wsId/flows', async (req, res) => {
    const ws = await Workspace.findById(req.params.wsId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    const list = await Flow.find({ workspaceId: ws._id }).lean();
    res.apiOk(list);
  });

  r.post('/workspaces/:wsId/flows', async (req, res) => {
    const ws = await Workspace.findById(req.params.wsId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    const { name, status = 'draft', enabled = true, graph = { nodes: [], edges: [] }, force = false } = req.body || {};
    if (!name || String(name).trim() === '') return res.apiError(400, 'name_required', 'Flow name is required');
    const loaders = {
      getTemplateByKey: async (key) => NodeTemplate.findOne({ key }).lean(),
      isTemplateAllowed: async (key) => (ws.templatesAllowed || []).length === 0 || ws.templatesAllowed.includes(key),
    };
    const v = await validateFlowGraph(graph, { strict: true, loaders });
    if (!v.ok && !force){
      return res.apiError(400, 'flow_invalid', 'Flow validation failed', { errors: v.errors, warnings: v.warnings });
    }
    const flow = await Flow.create({ name: String(name), workspaceId: ws._id, status, enabled: v.ok ? enabled : false, graph });
    if (!v.ok){
      await Notification.create({ companyId: ws.companyId, workspaceId: ws._id, entityType: 'flow', entityId: String(flow._id), severity: 'critical', code: 'flow_invalid', message: 'Flow created with invalid graph (disabled)', details: { errors: v.errors }, link: `/flows/${flow._id}/editor` });
    }
    res.status(201).json({ success: true, data: { ...flow.toObject(), validation: v }, requestId: req.requestId, ts: Date.now() });
  });

  r.get('/flows/:flowId', async (req, res) => {
    const f = await Flow.findById(req.params.flowId);
    if (!f) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = await Workspace.findById(f.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    if (req.query.populate === '1'){
      const wf = await Flow.findById(f._id).populate('workspaceId');
      return res.apiOk(wf);
    }
    res.apiOk(f);
  });

  r.put('/flows/:flowId', async (req, res) => {
    const f = await Flow.findById(req.params.flowId);
    if (!f) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = await Workspace.findById(f.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    const patch = req.body || {};
    const force = !!patch.force;
    if (patch.graph){
      const loaders = {
        getTemplateByKey: async (key) => NodeTemplate.findOne({ key }).lean(),
        isTemplateAllowed: async (key) => (ws.templatesAllowed || []).length === 0 || ws.templatesAllowed.includes(key),
      };
      const v = await validateFlowGraph(patch.graph, { strict: true, loaders });
      if (!v.ok && !force){
        return res.apiError(400, 'flow_invalid', 'Flow validation failed', { errors: v.errors, warnings: v.warnings });
      }
      // If invalid but force: disable flow and notify
      if (!v.ok && force){
        f.enabled = false;
        await Notification.create({ companyId: ws.companyId, workspaceId: ws._id, entityType: 'flow', entityId: String(f._id), severity: 'critical', code: 'flow_invalid', message: 'Flow updated with invalid graph; disabled', details: { errors: v.errors }, link: `/flows/${f._id}/editor` });
      }
    }
    Object.assign(f, patch);
    await f.save();
    res.apiOk(f);
  });

  return r;
}
