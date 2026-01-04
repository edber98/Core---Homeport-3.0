const express = require('express');

module.exports = function(store){
  const r = express.Router();

  // Use shared ELK utility so algorithm is centralized
  const { layoutGraph } = require('../utils/elk-layout');

  // Requires auth middleware at app level when mounted (same as other modules)
  r.post('/layout/graph', async (req, res) => {
    try {
      const body = req.body || {};
      const graph = body.graph || { nodes: [], edges: [] };
      const orientation = String(body.orientation || 'vertical').toLowerCase();
      const direction = orientation === 'horizontal' ? 'RIGHT' : 'DOWN';
      const nodeWidth = Number(body.nodeWidth) || 250;
      const nodeHeight = Number(body.nodeHeight) || 110;
      const gapX = Number(body.gapX) || 260;
      const gapY = Number(body.gapY) || 160;
      const borderGapX = Math.max(0, gapX - nodeWidth);
      const borderGapY = Math.max(0, gapY - nodeHeight);

      const adjustByOutputs = !!body.adjustByOutputs;
      const perOutputYOffset = Number.isFinite(Number(body.perOutputYOffset)) ? Number(body.perOutputYOffset) : 5;
      const outputsCount = (body.outputsCount && typeof body.outputsCount === 'object') ? body.outputsCount : undefined;
      const outputsOnlyForIds = Array.isArray(body.outputsOnlyForIds) ? body.outputsOnlyForIds : undefined;
      const perOutputXOffset = Number.isFinite(Number(body.perOutputXOffset)) ? Number(body.perOutputXOffset) : 5;
      const outputsMode = (typeof body.outputsMode === 'string') ? String(body.outputsMode) : undefined;
      // Debug logs of inputs
      try {
        const countKeys = outputsCount ? Object.keys(outputsCount) : [];
        const positive = countKeys.filter(k => Number(outputsCount[k]) > 0);
        const maxK = positive.reduce((acc, k) => (Number(outputsCount[k]) > (acc.v||0) ? { k, v: Number(outputsCount[k]) } : acc), { k: null, v: 0 });
        console.log('[layout:mem] request', {
          orientation, nodeWidth, nodeHeight, gapX, gapY,
          adjustByOutputs, perOutputYOffset, perOutputXOffset,
          outputsCount_nodes: countKeys.length,
          outputsCount_positive: positive.length,
          outputsOnlyForIds_len: Array.isArray(outputsOnlyForIds) ? outputsOnlyForIds.length : 0,
          maxOutputs: maxK
        });
      } catch {}
      const { positions } = await layoutGraph(graph, { orientation, nodeWidth, nodeHeight, gapX, gapY, normalizeLevels: true, adjustByOutputs, perOutputYOffset, perOutputXOffset, outputsCount, outputsOnlyForIds, outputsMode });
      try {
        const ids = Object.keys(positions || {});
        const sample = ids.slice(0, 5).reduce((acc, id) => { acc[id] = positions[id]; return acc; }, {});
        console.log('[layout:mem] response', { nodes: ids.length, sample });
      } catch {}

      // Return minimal payload: positions keyed by node id
      return res.json({ success: true, data: { positions, orientation: direction } });
    } catch (e) {
      return res.status(500).json({ success: false, error: 'layout_failed', message: e?.message || 'Failed to layout graph' });
    }
  });

  return r;
}
