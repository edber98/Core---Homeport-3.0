const express = require('express');

module.exports = function(){
  const r = express.Router();
  const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
  const { layoutGraph } = require('../../utils/elk-layout');

  r.use(authMiddleware());
  r.use(requireCompanyScope());

  // Compute a layout for a provided graph using ELK
  // Body: { graph: { nodes, edges }, orientation?: 'vertical'|'horizontal', nodeWidth?: number, nodeHeight?: number }
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
      return res.json({ success: true, data: { positions, orientation: direction } });
    } catch (e) {
      return res.status(500).json({ success: false, error: 'layout_failed', message: e?.message || 'Failed to layout graph' });
    }
  });

  return r;
}
