const { Types } = require('mongoose');

module.exports = function(ctx) {
  async function ensureGraph() {
    if (ctx._graph) return ctx._graph;
    const Flow = require('../../../db/models/flow.model');
    if (!ctx.flowId) { ctx._graph = { nodes: [], edges: [] }; return ctx._graph; }
    const fid = String(ctx.flowId);
    const f = Types.ObjectId.isValid(fid) ? await Flow.findById(fid) : await Flow.findOne({ id: fid });
    const base = f && f.graph ? f.graph : { nodes: [], edges: [] };
    ctx._graph = { nodes: Array.isArray(base.nodes) ? base.nodes.slice() : [], edges: Array.isArray(base.edges) ? base.edges.slice() : [] };
    return ctx._graph;
  }
  function graphRef(){ return ctx._graph || { nodes: [], edges: [] }; }
  function emitPatch(ops) { try { ctx.changed = true; ctx.send({ type: 'patch', ops }); } catch {} }
  function emitSnapshot(graph) { try { ctx.send({ type: 'snapshot', graph }); } catch {} }

  async function get_output_options({ nodeId }) {
    await ensureGraph(); const g = graphRef();
    const node = (g.nodes || []).find(n => String(n.id) === String(nodeId));
    if (!node) return { success:false, error:'node_not_found' };
    const tpl = node?.data?.model?.templateObj || {};
    const outs = Array.isArray(tpl.outputHandles) ? tpl.outputHandles : [];
    const outputs = outs.map(h => ({ name: h.name || h.id, handle: h.id, type: h.type || 'any' }));
    return { success: true, outputs };
  }

  async function ensure_start({ prefer }) {
    await ensureGraph(); const g = graphRef();
    const hasStart = (g.nodes||[]).some(n => ['start','start_form','event','endpoint'].includes(String(n?.data?.model?.templateObj?.type||'').toLowerCase()));
    if (hasStart) return { success:true, ensured:false };
    const key = String(prefer || 'start').toLowerCase();
    const id = `start_${Date.now().toString(36)}`;
    const node = { id, point: { x: 0, y: 0 }, type: 'html-template', data: { model: { id, name: key, template: key, templateObj: { id: key, name: key, type: key } } } };
    g.nodes.push(node);
    emitPatch([{ op: 'add', path: '/nodes/-', value: node }]);
    return { success:true, ensured:true, nodeId: id };
  }

  async function list_graph(){ await ensureGraph(); return { success: true, graph: graphRef() }; }

  async function add_node({ templateKey, title, subtitle, near }){
    try { console.log('[ai-workflow-v2][graph.add_node]', { templateKey, hasNear: !!near }); } catch {}
    await ensureGraph(); const g = graphRef();
    // Empêcher les doublons de start/start_form/event/endpoint/trigger et doublon "form" si start_form existe
    try {
      const NodeTemplate = require('../../../db/models/node-template.model');
      const t = await NodeTemplate.findOne({ key: templateKey }).lean();
      const tType = String(t?.type || '').toLowerCase();
      const keyLc = String(templateKey||'').toLowerCase();
      const isStartLike = ['start','start_form','event','endpoint','trigger'].includes(tType) || /start/.test(keyLc);
      if (isStartLike) {
        const has = (g.nodes||[]).find(n => ['start','start_form','event','endpoint','trigger'].includes(String(n?.data?.model?.templateObj?.type||'').toLowerCase()));
        if (has) { try { console.log('[ai-workflow-v2][graph.add_node][reuse_start]', { existingId: has.id }); } catch {} ; return { success: true, ensured: true, nodeId: has.id };
        }
      }
      // Pas de heuristique par mots-clés: l'IA décide via tools/instructions
    } catch {}
    const id = `node_${Date.now().toString(36)}`;
    const node = { id, point: near || { x: 0, y: 0 }, type: 'html-template', data: { model: { id, name: title || templateKey, template: templateKey, templateObj: { id: templateKey, name: templateKey, title, subtitle } } } };
    g.nodes.push(node);
    emitPatch([{ op: 'add', path: '/nodes/-', value: node }]);
    return { success: true, nodeId: id };
  }

  async function remove_node({ nodeId }){
    await ensureGraph(); const g = graphRef();
    const idx = (g.nodes||[]).findIndex(n => String(n.id) === String(nodeId));
    if (idx < 0) return { success: false, error: 'node_not_found' };
    g.nodes.splice(idx,1);
    emitPatch([{ op: 'remove', path: `/nodes/${idx}` }]);
    return { success: true };
  }

  async function replace_node({ nodeId, templateKey }){
    await ensureGraph(); const g = graphRef();
    const idx = (g.nodes||[]).findIndex(n => String(n.id) === String(nodeId));
    if (idx < 0) return { success: false, error: 'node_not_found' };
    const cur = g.nodes[idx];
    const next = { ...cur, data: { ...cur.data, model: { ...(cur.data?.model || {}), template: templateKey, templateObj: { ...(cur.data?.model?.templateObj || {}), id: templateKey, name: templateKey } } } };
    g.nodes[idx] = next;
    emitPatch([{ op: 'replace', path: `/nodes/${idx}`, value: next }]);
    return { success: true };
  }

  async function connect({ sourceId, targetId, sourceHandle, targetHandle }){
    await ensureGraph(); const g = graphRef();
    try {
      const nodes = g.nodes || [];
      const src = nodes.find(n => String(n.id) === String(sourceId));
      const dst = nodes.find(n => String(n.id) === String(targetId));
      const stpl = src?.data?.model?.templateObj || {};
      const dtpl = dst?.data?.model?.templateObj || {};
      const out = Array.isArray(stpl.outputHandles) ? stpl.outputHandles : [];
      const oh = out.find(h => String(h.id) === String(sourceHandle)) || null;
      const sType = (oh && (oh.type || 'any')) || 'any';
      const inArr = Array.isArray(dtpl.inputHandles) ? dtpl.inputHandles : [];
      const th = inArr.find(h => String(h.id) === String(targetHandle || 'in')) || null;
      const accepts = th && Array.isArray(th.accepts) ? th.accepts : ['any'];
      const ok = (sType === 'any') || accepts.includes('any') || accepts.includes(sType);
      if (!ok) return { success:false, error:'type_mismatch', data: { sType, accepts } };
    } catch {}
    const e = { id: `e_${Date.now().toString(36)}`, source: sourceId, target: targetId, sourceHandle: sourceHandle || '0', targetHandle: targetHandle || 'in' };
    g.edges.push(e);
    emitPatch([{ op: 'add', path: '/edges/-', value: e }]);
    return { success: true };
  }

  async function connect_by_output_name({ sourceId, targetId, outputName }){
    const opts = await get_output_options({ nodeId: sourceId });
    if (!opts || !opts.success) return { success: false, error: 'options_failed' };
    const name = String(outputName || '').trim();
    const opt = (opts.outputs || []).find(o => String(o.name).toLowerCase() === name.toLowerCase());
    const handle = opt ? String(opt.handle) : '0';
    return await connect({ sourceId, targetId, sourceHandle: handle, targetHandle: 'in' });
  }

  return {
    ensure_start,
    list_graph,
    add_node,
    remove_node,
    replace_node,
    connect,
    connect_by_output_name,
    get_output_options,
  };
};
