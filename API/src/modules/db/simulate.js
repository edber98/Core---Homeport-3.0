const express = require('express');

module.exports = function() {
  const r = express.Router();
  const { simulateScenarios } = require('../../utils/flow-simulate');

  r.post('/flows/:flowId/simulate-msg', async (req, res) => {
    try {
      const { Types } = require('mongoose');
      const Flow = require('../../db/models/flow.model');
      const Workspace = require('../../db/models/workspace.model');
      const WorkspaceMembership = require('../../db/models/workspace-membership.model');
      const fid = String(req.params.flowId);
      let flow = null;
      if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid).lean();
      if (!flow) flow = await Flow.findOne({ id: fid }).lean();
      if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
      const ws = await Workspace.findById(flow.workspaceId).lean();
      if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
      const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id }).lean();
      if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
      const targetNodeId = String(req.body?.targetNodeId || '');
      const mode = String(req.body?.mode || 'all');
      if (!targetNodeId) return res.apiError(400, 'bad_request', 'Missing targetNodeId');
      const graph = flow.graph || flow;
      const data = simulateScenarios(graph, targetNodeId, mode);
      return res.apiOk(data);
    } catch (e) {
      return res.apiError(500, 'simulate_failed', e && e.message ? e.message : 'Simulation failed');
    }
  });

  return r;
};

