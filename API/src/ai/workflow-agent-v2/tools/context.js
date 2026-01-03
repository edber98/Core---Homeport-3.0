const { simulateScenarios } = require('../../../utils/flow-simulate');
const { simulateViaEngine } = require('../../../utils/flow-simulate-engine');
const { Types } = require('mongoose');

module.exports = function(ctx){
  async function ensureGraph(){
    if (ctx._graph) return ctx._graph;
    const Flow = require('../../../db/models/flow.model');
    if (!ctx.flowId) { ctx._graph = { nodes: [], edges: [] }; return ctx._graph; }
    const fid = String(ctx.flowId);
    const f = Types.ObjectId.isValid(fid) ? await Flow.findById(fid) : await Flow.findOne({ id: fid });
    const base = f && f.graph ? f.graph : { nodes: [], edges: [] };
    ctx._graph = { nodes: Array.isArray(base.nodes) ? base.nodes.slice() : [], edges: Array.isArray(base.edges) ? base.edges.slice() : [] };
    return ctx._graph;
  }
  function gref(){ return ctx._graph || { nodes: [], edges: [] }; }
  function findNode(g, nodeId){ return (Array.isArray(g?.nodes) ? g.nodes : []).find(n => String(n.id) === String(nodeId)); }
  function findNodeIndex(g, nodeId){ return (Array.isArray(g?.nodes) ? g.nodes : []).findIndex(n => String(n.id) === String(nodeId)); }
  function deepKeys(obj, prefix=''){
    const out=[]; if (!obj || typeof obj!=='object') return out;
    for (const [k,v] of Object.entries(obj)){
      const p = prefix ? prefix + '.' + k : k; out.push(p);
      if (v && typeof v==='object' && !Array.isArray(v)) out.push(...deepKeys(v, p));
    } return out;
  }
  function guessMapping(argsSchema, msg){
    const mapping = {}; const msgKeys = deepKeys(msg);
    const take = (key, label) => {
      // prefer payload.key then any nodeId.key
      const candidates = [`payload.${key}`, ...msgKeys.filter(k => k.endsWith('.'+key))];
      const chosen = candidates.find(k => msgKeys.includes(k)) || null;
      if (chosen){ mapping[label] = `{{ ${chosen} }}`; }
    };
    const fields = Array.isArray(argsSchema?.fields) ? argsSchema.fields : [];
    for (const f of fields){ const key = f?.key || f?.name; if (!key) continue; take(String(key), String(key)); }
    for (const s of (argsSchema?.steps || [])){ for (const f of (s?.fields||[])){ const key = f?.key || f?.name; if (!key) continue; take(String(key), String(key)); } }
    return mapping;
  }

  return {
    async get_node_args_schema({ nodeId }){
      await ensureGraph(); const n = findNode(gref(), nodeId); if (!n) return { success:false, error: 'node_not_found' };
      const tpl = n?.data?.model?.templateObj || {};
      const args = tpl?.args || {};
      try { console.log('[ai-workflow-v2][context.get_node_args_schema]', { nodeId, hasArgs: !!args && Object.keys(args).length>0 }); } catch {}
      return { success:true, args };
    },

    async create_node_context({ nodeId, context }){
      await ensureGraph(); const g = gref();
      const idx = findNodeIndex(g, nodeId); if (idx < 0) return { success:false, error:'node_not_found' };
      try { g.nodes[idx].data = g.nodes[idx].data || {}; g.nodes[idx].data.model = g.nodes[idx].data.model || {}; g.nodes[idx].data.model.context = context; } catch {}
      try { ctx.send({ type: 'patch', ops: [{ op: 'replace', path: `/nodes/${idx}/data/model/context`, value: context }] }); } catch {}
      try { console.log('[ai-workflow-v2][context.create_node_context]', { nodeId, keys: Object.keys(context||{}) }); } catch {}
      return { success:true };
    },

    async validate_node_params({ nodeId }){
      await ensureGraph(); const n = findNode(gref(), nodeId); if (!n) return { success:false, error:'node_not_found' };
      const tpl = n?.data?.model?.templateObj || {};
      const args = tpl?.args || {};
      const missing = [];
      // Simple check: if args.fields exists and context missing corresponding keys
      const fields = Array.isArray(args?.fields) ? args.fields : [];
      const ctxv = n?.data?.model?.context || {};
      for (const f of fields){ const k = f?.key || f?.name; if (k && (ctxv[k] === undefined || ctxv[k] === null || ctxv[k] === '')) missing.push(String(k)); }
      try { console.log('[ai-workflow-v2][context.validate_node_params]', { nodeId, missing }); } catch {}
      return { success:true, missing };
    },

    async get_output_schema({ nodeId, handleId }){
      await ensureGraph(); const n = findNode(gref(), nodeId); if (!n) return { success:false, error:'node_not_found' };
      const tpl = n?.data?.model?.templateObj || {};
      const arr = Array.isArray(tpl.outputHandles) ? tpl.outputHandles : [];
      const h = arr.find(h => String(h.id) === String(handleId));
      const schema = h && h.schema ? h.schema : {};
      return { success:true, schema, handleId: String(handleId) };
    },

    async propose_context_mapping({ sourceId, handleId, targetId }){
      await ensureGraph(); const f = { graph: gref() };
      // Simulate towards target to build msg object and suggest mapping — multiple scenarios
      let sim = null;
      try { sim = await simulateViaEngine(f.graph, targetId); } catch {}
      if (!sim || !Array.isArray(sim.scenarios)) {
        try { sim = await simulateScenarios(f.graph, targetId); } catch {}
      }
      const scenarios = Array.isArray(sim?.scenarios) ? sim.scenarios : [];
      const target = findNode(f.graph, targetId);
      const tArgs = (target?.data?.model?.templateObj?.args) || {};
      const variants = scenarios.map(sc => ({ label: sc.label || `sc_${sc.index}`, mapping: guessMapping(tArgs, sc.msgIn || {}), previewMsg: sc.msgIn || {} }));
      const best = variants[0] || { mapping: {}, previewMsg: {} };
      return { success:true, variants, mapping: best.mapping, previewMsg: best.previewMsg };
    },
  };
}
