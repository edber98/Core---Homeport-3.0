const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Workspace = require('../../db/models/workspace.model');
const Flow = require('../../db/models/flow.model');
const Notification = require('../../db/models/notification.model');
const { validateFlowGraph } = require('../../utils/validate');
const NodeTemplate = require('../../db/models/node-template.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.put('/workspaces/:wsId', async (req, res) => {
    const { Types } = require('mongoose');
    const wsId = String(req.params.wsId || '');
    if (!Types.ObjectId.isValid(wsId)) return res.apiError(400, 'invalid_id', 'Invalid workspace id');
    const ws = await Workspace.findById(wsId);
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const patch = req.body || {}; const force = !!patch.force;

    // If templatesAllowed changes, detect impacted flows
    const updatingAllowed = Array.isArray(patch.templatesAllowed);
    let impacted = [];
    if (updatingAllowed){
      const newAllowed = patch.templatesAllowed;
      const flows = await Flow.find({ workspaceId: ws._id });
      const loaders = {
        getTemplateByKey: async (key) => NodeTemplate.findOne({ key }).lean(),
        isTemplateAllowed: async (key) => newAllowed.length === 0 || newAllowed.includes(key),
      };
      for (const f of flows){
        const v = await validateFlowGraph(f.graph || f, { strict: true, loaders });
        if (!v.ok) impacted.push({ flowId: String(f._id), errors: v.errors, name: f.name });
      }
      if (impacted.length && !force){
        return res.apiError(400, 'workspace_policy_violation', 'Some flows would become invalid', { impacted });
      }
      if (impacted.length && force){
        for (const it of impacted){
          const f = await Flow.findById(it.flowId);
          f.enabled = false; await f.save();
          await Notification.create({ companyId: ws.companyId, workspaceId: ws._id, entityType: 'flow', entityId: it.flowId, severity: 'critical', code: 'template_not_allowed', message: `Flow disabled due to workspace template policy`, details: { errors: it.errors }, link: `/flows/${it.flowId}/editor` });
        }
      }
    }
    Object.assign(ws, patch); await ws.save();
    res.apiOk({ workspace: ws, impacted });
  });

  // Aggregate: list workspace elements (flows, credentials, forms, websites)
  r.get('/workspaces/:wsId/elements', async (req, res) => {
    const { Types } = require('mongoose');
    const Flow = require('../../db/models/flow.model');
    const Credential = require('../../db/models/credential.model');
    const WorkspaceMembership = require('../../db/models/workspace-membership.model');
    const wsId = String(req.params.wsId || '');
    const ws = Types.ObjectId.isValid(wsId) ? await Workspace.findById(wsId) : await Workspace.findOne({ id: wsId });
    if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    // Fetch flows and credentials in parallel
    const [flows, creds] = await Promise.all([
      Flow.find({ workspaceId: ws._id }).sort({ createdAt: -1 }).limit(500).lean(),
      Credential.find({ workspaceId: ws._id }).sort({ createdAt: -1 }).limit(500).select('-secret').lean(),
    ]);
    res.apiOk({
      flows: (flows || []).map(f => ({ id: String(f._id), name: f.name })),
      credentials: (creds || []).map(c => ({ id: String(c._id), name: c.name, providerKey: c.providerKey })),
      // Forms and websites are not yet backed by DB in this project; return empty arrays for consistency
      forms: [],
      websites: [],
    });
  });

  return r;
}
