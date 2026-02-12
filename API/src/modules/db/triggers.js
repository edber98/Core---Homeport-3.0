const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Flow = require('../../db/models/flow.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const { Types } = require('mongoose');
const { triggerManager } = require('../../services/trigger-manager');

module.exports = function () {
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  // POST /api/flows/:flowId/deploy — deploy a flow to production
  r.post('/flows/:flowId/deploy', async (req, res) => {
    try {
      const fid = String(req.params.flowId);
      let flow = null;
      if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid);
      if (!flow) flow = await Flow.findOne({ id: fid });
      if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');

      const ws = await Workspace.findById(flow.workspaceId);
      if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
      const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
      if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');

      if (flow.enabled === false) return res.apiError(409, 'flow_disabled', 'Flow must be enabled to deploy');

      const status = await triggerManager.deployFlow(flow._id);
      res.apiOk({ triggerType: status.triggerType, webhookUrl: status.webhookUrl || null, status: 'deployed' });
    } catch (e) {
      const msg = e?.message || String(e);
      if (msg.includes('already deployed')) return res.apiError(409, 'already_deployed', msg);
      if (msg.includes('No event trigger')) return res.apiError(400, 'no_event_node', msg);
      if (msg.includes('No trigger adapter')) return res.apiError(400, 'no_adapter', msg);
      console.error(`[triggers] deploy failed: ${msg}`);
      return res.apiError(500, 'deploy_failed', msg);
    }
  });

  // POST /api/flows/:flowId/undeploy — stop production
  r.post('/flows/:flowId/undeploy', async (req, res) => {
    try {
      const fid = String(req.params.flowId);
      let flow = null;
      if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid);
      if (!flow) flow = await Flow.findOne({ id: fid });
      if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');

      const ws = await Workspace.findById(flow.workspaceId);
      if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
      const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
      if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');

      await triggerManager.undeployFlow(flow._id);
      res.apiOk({ status: 'undeployed' });
    } catch (e) {
      return res.apiError(500, 'undeploy_failed', e?.message || String(e));
    }
  });

  // GET /api/flows/:flowId/trigger-status — get trigger status
  r.get('/flows/:flowId/trigger-status', async (req, res) => {
    try {
      const fid = String(req.params.flowId);
      let flow = null;
      if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid);
      if (!flow) flow = await Flow.findOne({ id: fid });
      if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');

      const ws = await Workspace.findById(flow.workspaceId);
      if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');

      const status = triggerManager.getStatus(flow._id);
      res.apiOk({
        ...status,
        deployedAt: flow.deployedAt || null,
        triggerType: flow.triggerType || status.triggerType || null,
        triggerNodeId: flow.triggerNodeId || null,
        webhookToken: flow.webhookToken || null,
      });
    } catch (e) {
      return res.apiError(500, 'status_failed', e?.message || String(e));
    }
  });

  // GET /api/workspaces/:wsId/triggers — list active triggers
  r.get('/workspaces/:wsId/triggers', async (req, res) => {
    try {
      const wsId = String(req.params.wsId);
      const ws = Types.ObjectId.isValid(wsId) ? await Workspace.findById(wsId) : await Workspace.findOne({ id: wsId });
      if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
      const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
      if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');

      const list = triggerManager.listActiveByWorkspace(ws._id);
      res.apiOk(list);
    } catch (e) {
      return res.apiError(500, 'list_failed', e?.message || String(e));
    }
  });

  return r;
};
