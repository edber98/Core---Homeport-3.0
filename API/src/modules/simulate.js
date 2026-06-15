const express = require('express');

module.exports = function(store) {
  const r = express.Router();
  const { authMiddleware, requireCompanyScope } = require('../auth/jwt');
  const { simulateScenarios } = require('../utils/flow-simulate');
  const { simulateViaEngine } = require('../utils/flow-simulate-engine');

  r.use(authMiddleware(store));
  r.use(requireCompanyScope());

  r.post('/flows/:flowId/simulate-msg', async (req, res) => {
    try {
      const { flowId } = req.params;
      const flow = store.flows.get(String(flowId));
      if (!flow) return res.apiError(404, 'flow_not_found', 'Flow not found');
      const ws = store.workspaces.get(flow.workspaceId);
      if (!ws || String(ws.companyId) !== req.user.companyId) return res.apiError(404, 'flow_not_found', 'Flow not found');
      const targetNodeId = String(req.body?.targetNodeId || '');
      const mode = String(req.body?.mode || 'engine');
      if (!targetNodeId) return res.apiError(400, 'bad_request', 'Missing targetNodeId');
      // Allow frontend to override with an unsaved graph (work on draft instead of memory store)
      const override = (req.body && typeof req.body.graph === 'object') ? req.body.graph : null;
      const graph = override || flow.graph || flow;
      if (override) {
        try { console.log('[simulate] using graph override from request body'); } catch {}
      }
      console.log('[simulate] request', { flowId, targetNodeId, mode, user: req.user?.id });
      let data;
      if (mode === 'engine_split') {
        const { simulateViaEngineSplit } = require('../utils/flow-simulate-engine');
        data = await simulateViaEngineSplit(graph, targetNodeId);
      } else if (mode === 'engine') {
        data = await simulateViaEngine(graph, targetNodeId);
      } else {
        data = simulateScenarios(graph, targetNodeId, mode);
      }
      const scenarios = Array.isArray(data?.scenarios) ? data.scenarios : [];
      const usable = (sc) => sc && sc.msgIn && typeof sc.msgIn === 'object' && Object.keys(sc.msgIn).length > 0;
      if (!scenarios.length || !usable(scenarios[0])) {
        console.warn('[simulate] engine no usable scenario; trying static fallback');
        const fb = simulateScenarios(graph, targetNodeId, 'all');
        const fbSc = Array.isArray(fb?.scenarios) ? fb.scenarios : [];
        if (fbSc.length && usable(fbSc[0])) {
          console.log('[simulate] fallback static used');
          return res.apiOk(fb);
        }
        console.error('[simulate] unreachable: no path produced a usable msgIn');
        return res.apiError(422, 'simulation_unreachable', 'Impossible de simuler un msg jusqu’au nœud cible. Vérifiez les conditions/loops et les connexions.');
      }
      console.log('[simulate] response', { scenarios: scenarios.length });
      return res.apiOk(data);
    } catch (e) { return res.apiError(500, 'simulate_failed', e && e.message ? e.message : 'Simulation failed'); }
  });

  return r;
};
