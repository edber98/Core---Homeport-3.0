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
    const { Types } = require('mongoose');
    const wsId = String(req.params.wsId);
    const ws = Types.ObjectId.isValid(wsId) ? await Workspace.findById(wsId) : await Workspace.findOne({ id: wsId });
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    let { limit = 100, page = 1, q, sort } = req.query;
    limit = Math.max(1, Math.min(200, Number(limit) || 100));
    page = Math.max(1, Number(page) || 1);
    const query = { workspaceId: ws._id };
    if (q) query['name'] = { $regex: String(q), $options: 'i' };
    let sortObj = { createdAt: -1 };
    if (typeof sort === 'string') { const [f,d] = String(sort).split(':'); if (f) sortObj = { [f]: (d === 'asc' ? 1 : -1) }; }
    const list = await Flow.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.apiOk(list);
  });

  r.post('/workspaces/:wsId/flows', async (req, res) => {
    const { Types } = require('mongoose');
    const wsId = String(req.params.wsId);
    const ws = Types.ObjectId.isValid(wsId) ? await Workspace.findById(wsId) : await Workspace.findOne({ id: wsId });
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    const { name, description = '', status = 'draft', enabled = true, graph = { nodes: [], edges: [] } } = req.body || {};
    if (!name || String(name).trim() === '') return res.apiError(400, 'name_required', 'Flow name is required');
    const Provider = require('../../db/models/provider.model');
    const Credential = require('../../db/models/credential.model');
    const loaders = {
      getTemplateByKey: async (key) => NodeTemplate.findOne({ key }).lean(),
      isTemplateAllowed: async (key) => (ws.templatesAllowed || []).length === 0 || ws.templatesAllowed.includes(key),
      getProviderByKey: async (key) => Provider.findOne({ key }).lean(),
      hasCredential: async (providerKey) => !!(await Credential.exists({ providerKey, workspaceId: ws._id })),
    };
    const v = await validateFlowGraph(graph, { strict: true, loaders });
    // Allow empty graphs to be created (disabled) without forcing
    const isEmptyGraph = !graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0;
    const onlyNoStart = (v.errors || []).length === 1 && v.errors[0]?.code === 'no_start';
    const force = (String(req.query.force || '').toLowerCase() === '1' || String(req.query.force || '').toLowerCase() === 'true' || !!(req.body && req.body.force));
    if (!v.ok && !force && !(isEmptyGraph && onlyNoStart)){
      return res.apiError(400, 'flow_invalid', 'Flow validation failed', { errors: v.errors, warnings: v.warnings });
    }
    const flow = await Flow.create({
      name: String(name),
      description: String(description || ''),
      workspaceId: ws._id,
      status,
      enabled: v.ok ? enabled : false,
      graph,
      invalid: !v.ok,
      validationErrors: v.errors || [],
      validationWarnings: v.warnings || [],
    });
    if (!v.ok){
      // Create one precise notification per error with deep link to node when available
      const baseLink = `/flow-builder/editor?flow=${encodeURIComponent(String(flow._id))}`;
      const errs = Array.isArray(v.errors) ? v.errors : [];
      if (errs.length === 0) {
        await Notification.create({ companyId: ws.companyId, workspaceId: ws._id, entityType: 'flow', entityId: String(flow._id), severity: 'critical', code: 'flow_invalid', message: 'Flow created with invalid graph (disabled)', details: {}, link: baseLink });
      } else {
        for (const e of errs){
          const nodeId = e?.details?.nodeId ? String(e.details.nodeId) : null;
          const link = nodeId ? `${baseLink}&node=${encodeURIComponent(nodeId)}` : baseLink;
          const msg = `[${e?.code || 'error'}] ${e?.message || 'Erreur de validation'}`;
          await Notification.create({ companyId: ws.companyId, workspaceId: ws._id, entityType: 'flow', entityId: String(flow._id), severity: 'critical', code: 'flow_invalid', message: msg, details: e, link });
        }
      }
    }
    res.status(201).json({ success: true, data: { ...flow.toObject(), validation: v }, requestId: req.requestId, ts: Date.now() });
  });

  r.get('/flows/:flowId', async (req, res) => {
    const { Types } = require('mongoose');
    const fid = String(req.params.flowId);
    let f = null;
    if (Types.ObjectId.isValid(fid)) f = await Flow.findById(fid);
    if (!f) f = await Flow.findOne({ id: fid });
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
    const { Types } = require('mongoose');
    const fid = String(req.params.flowId);
    let f = null;
    if (Types.ObjectId.isValid(fid)) f = await Flow.findById(fid);
    if (!f) f = await Flow.findOne({ id: fid });
    if (!f) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const ws = await Workspace.findById(f.workspaceId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    const patch = req.body || {};
    const force = (String(req.query.force || '').toLowerCase() === '1' || String(req.query.force || '').toLowerCase() === 'true' || !!patch.force);
    if (patch.graph){
      const Provider = require('../../db/models/provider.model');
      const Credential = require('../../db/models/credential.model');
      const loaders = {
        getTemplateByKey: async (key) => NodeTemplate.findOne({ key }).lean(),
        isTemplateAllowed: async (key) => (ws.templatesAllowed || []).length === 0 || ws.templatesAllowed.includes(key),
        getProviderByKey: async (key) => Provider.findOne({ key }).lean(),
        hasCredential: async (providerKey) => !!(await Credential.exists({ providerKey, workspaceId: ws._id })),
      };
      const v = await validateFlowGraph(patch.graph, { strict: true, loaders });
      if (!v.ok && !force){
        return res.apiError(400, 'flow_invalid', 'Flow validation failed', { errors: v.errors, warnings: v.warnings });
      }
      // If invalid but force: disable flow and notify
      if (!v.ok && force){
        f.enabled = false;
        f.invalid = true;
        f.validationErrors = v.errors || [];
        f.validationWarnings = v.warnings || [];
        // Create precise notifications with deep links to problematic node when available
        const baseLink = `/flow-builder/editor?flow=${encodeURIComponent(String(f._id))}`;
        const errs = Array.isArray(v.errors) ? v.errors : [];
        if (errs.length === 0){
          await Notification.create({ companyId: ws.companyId, workspaceId: ws._id, entityType: 'flow', entityId: String(f._id), severity: 'critical', code: 'flow_invalid', message: 'Flow updated with invalid graph; disabled', details: {}, link: baseLink });
        } else {
          for (const e of errs){
            const nodeId = e?.details?.nodeId ? String(e.details.nodeId) : null;
            const link = nodeId ? `${baseLink}&node=${encodeURIComponent(nodeId)}` : baseLink;
            const msg = `[${e?.code || 'error'}] ${e?.message || 'Erreur de validation'}`;
            await Notification.create({ companyId: ws.companyId, workspaceId: ws._id, entityType: 'flow', entityId: String(f._id), severity: 'critical', code: 'flow_invalid', message: msg, details: e, link });
          }
        }
      } else if (v.ok){
        // Clear previous validation issues on success
        f.invalid = false;
        f.validationErrors = [];
        f.validationWarnings = [];
      }
      // Apply graph patch (whether valid or forced)
      f.graph = patch.graph;
    }
    // Workspace transfer: allow changing workspace if user is member of destination too
    if (patch.workspaceId) {
      const { Types } = require('mongoose');
      const wsId = String(patch.workspaceId);
      const dest = Types.ObjectId.isValid(wsId) ? await Workspace.findById(wsId) : await Workspace.findOne({ id: wsId });
      if (!dest || String(dest.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Destination workspace not found');
      const destMember = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: dest._id });
      if (!destMember) return res.apiError(403, 'not_a_member', 'User not a destination workspace member');
      f.workspaceId = dest._id;
    }
    // Patch other fields
    Object.assign(f, { name: patch.name ?? f.name, description: (patch.description != null ? String(patch.description) : f.description), status: patch.status ?? f.status, enabled: (patch.enabled != null ? patch.enabled : f.enabled) });
    await f.save();
    res.apiOk(f);
  });

  return r;
}
