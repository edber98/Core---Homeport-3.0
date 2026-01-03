const { layoutGraphApplyToNodes } = require('../../../utils/elk-layout');

module.exports = function(ctx){
  return {
    async auto_layout({ orientation } = {}){
      try {
        const Flow = require('../../../db/models/flow.model');
        const fid = ctx.flowId ? String(ctx.flowId) : null;
        let settingsOrient = 'vertical';
        try {
          if (fid) {
            const f = await Flow.findOne({ $or: [{ _id: fid }, { id: fid }] }).lean();
            settingsOrient = String(f?.graph?.settings?.ui?.portOrientation || 'vertical').toLowerCase();
          }
        } catch {}
        const g = (ctx._graph && typeof ctx._graph === 'object') ? ctx._graph : { nodes: [], edges: [] };
        const nodeW = Number(process.env.AI_FLOW_NODE_WIDTH || 250);
        const nodeH = Number(process.env.AI_FLOW_NODE_HEIGHT || 100);
        let orient = String(orientation || settingsOrient || process.env.AI_FLOW_LAYOUT_ORIENTATION || 'vertical').toLowerCase();
        if (orient !== 'horizontal') orient = 'vertical';
        const laid = await layoutGraphApplyToNodes({ nodes: g.nodes, edges: g.edges }, { orientation: orient, nodeWidth: nodeW, nodeHeight: nodeH, gapX: 260, gapY: 160, normalizeLevels: true });
        if (laid && Array.isArray(laid.nodes)) {
          // Appliquer aussi en mémoire pour cohérence des tools suivants
          try { for (const p of (laid.nodes || [])) { const n = (g.nodes||[]).find(nn => nn.id === p.id); if (n) n.point = { x: p.x, y: p.y }; } } catch {}
          ctx.send({ type:'patch', ops: laid.ops || [] });
        }
        return { success:true };
      } catch (e){ return { success:false, error:'layout_failed', message: String(e?.message || e) }; }
    }
  };
}
