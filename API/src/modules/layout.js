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

      const { positions } = await layoutGraph(graph, { orientation, nodeWidth, nodeHeight, gapX, gapY, normalizeLevels: true });

      // Return minimal payload: positions keyed by node id
      return res.json({ success: true, data: { positions, orientation: direction } });
    } catch (e) {
      return res.status(500).json({ success: false, error: 'layout_failed', message: e?.message || 'Failed to layout graph' });
    }
  });

  return r;
}
