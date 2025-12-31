const express = require('express');

module.exports = function(store) {
  const r = express.Router();
  const { authMiddleware, requireCompanyScope } = require('../auth/jwt');
  const { simulateScenarios } = require('../utils/flow-simulate');

  r.use(authMiddleware(store));
  r.use(requireCompanyScope());

  r.post('/flows/:flowId/simulate-msg', (req, res) => {
    try {
      const { flowId } = req.params;
      const flow = store.flows.get(String(flowId));
      if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
      const ws = store.workspaces.get(flow.workspaceId);
      if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
      const targetNodeId = String(req.body?.targetNodeId || '');
      const mode = String(req.body?.mode || 'all');
      if (!targetNodeId) return res.apiError(400, 'bad_request', 'Missing targetNodeId');
      const data = simulateScenarios(flow.graph || flow, targetNodeId, mode);
      return res.apiOk(data);
    } catch (e) { return res.apiError(500, 'simulate_failed', e && e.message ? e.message : 'Simulation failed'); }
  });

  return r;
};

