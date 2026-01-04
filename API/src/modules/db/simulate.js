const express = require('express');

module.exports = function() {
  const r = express.Router();
  const { simulateScenarios } = require('../../utils/flow-simulate');
  const { simulateViaEngine } = require('../../utils/flow-simulate-engine');

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
      const mode = String(req.body?.mode || 'engine');
      if (!targetNodeId) return res.apiError(400, 'bad_request', 'Missing targetNodeId');
      const graph = flow.graph || flow;
      console.log('[simulate:db] request', { flowId: fid, targetNodeId, mode, user: req.user?.id });
      let data;
      if (mode === 'engine_split') {
        const { simulateViaEngineSplit } = require('../../utils/flow-simulate-engine');
        data = await simulateViaEngineSplit(graph, targetNodeId);
      } else if (mode === 'engine') {
        data = await simulateViaEngine(graph, targetNodeId);
      } else {
        data = simulateScenarios(graph, targetNodeId, mode);
      }
      const scenarios = Array.isArray(data?.scenarios) ? data.scenarios : [];
      const usable = (sc) => sc && sc.msgIn && typeof sc.msgIn === 'object' && Object.keys(sc.msgIn).length > 0;
      if (!scenarios.length || !usable(scenarios[0])) {
        console.warn('[simulate:db] engine no usable scenario; trying static fallback');
        const fb = simulateScenarios(graph, targetNodeId, 'all');
        const fbSc = Array.isArray(fb?.scenarios) ? fb.scenarios : [];
        if (fbSc.length && usable(fbSc[0])) {
          console.log('[simulate:db] fallback static used');
          return res.apiOk(fb);
        }
        console.error('[simulate:db] unreachable: no path produced a usable msgIn');
        return res.apiError(422, 'simulation_unreachable', 'Impossible de simuler un msg jusqu’au nœud cible. Vérifiez les conditions/loops et les connexions.');
      }
      console.log('[simulate:db] response', { scenarios: scenarios.length });
      return res.apiOk(data);
    } catch (e) {
      return res.apiError(500, 'simulate_failed', e && e.message ? e.message : 'Simulation failed');
    }
  });

  return r;
};
