const { registry } = require('../plugins/registry');
const { buildSampleFromSchema, getStartFormSchema } = require('./flow-simulate');

function pickOutputHandle(tpl){
  try {
    const outs = Array.isArray(tpl?.outputHandles) ? tpl.outputHandles : [];
    if (!outs.length) return null;
    const ok = outs.find(h => String(h?.id) === 'ok');
    return ok || outs[0];
  } catch { return null; }
}

// Helpers are imported directly above

async function simulateViaEngine(flow, targetNodeId){
  const { runFlow } = require('../engine');
  // Build simple graph helpers
  const nodes = Array.isArray(flow?.nodes) ? flow.nodes : [];
  const edges = Array.isArray(flow?.edges) ? flow.edges : [];
  const nodeById = new Map(nodes.map(n => [String(n.id), n]));
  const outEdges = new Map(); const inEdges = new Map();
  for (const n of nodes){ outEdges.set(String(n.id), []); inEdges.set(String(n.id), []); }
  for (const e of edges){ const s=String(e.source), t=String(e.target); if (nodeById.has(s)&&nodeById.has(t)){ outEdges.get(s).push(e); inEdges.get(t).push(e); } }
  const computeAncestors = (tid) => { const target = String(tid); const seen = new Set([target]); const anc = new Set(); const stack=[target]; while(stack.length){ const cur=stack.pop(); for (const ie of inEdges.get(cur)||[]){ const u=String(ie.source); if (!seen.has(u)){ seen.add(u); anc.add(u); stack.push(u);} } } return anc; };
  const ancestors = computeAncestors(targetNodeId);
  const startNode = (() => {
    for (const n of nodes){
      const t = String(n?.data?.model?.templateObj?.type || n?.data?.model?.nodeKind || '').toLowerCase();
      if (t === 'start' || t === 'start_form') return n;
    }
    return nodes.find(n => String(n?.id||'').toLowerCase().includes('start')) || nodes[0] || null;
  })();
  // Initial payload from Start Form args
  const startSchema = getStartFormSchema(startNode?.data?.model || {});
  const payloadSample = buildSampleFromSchema(startSchema || {}, { arraysOneItem: true });
  try { console.log('[simulate:engine] init payload from start', { startId: startNode?.id, hasSchema: !!(startSchema && (startSchema.fields||startSchema.steps)), keys: Object.keys(payloadSample||{}) }); } catch {}

  // Prepare mock registry
  const origResolve = registry.resolve.bind(registry);
  registry.resolve = (key) => async ({ id, model }, msg, inputs) => {
    try {
      const tpl = (model?.templateObj || model) || {};
      const handle = pickOutputHandle(tpl);
      const schema = handle && handle.schema ? handle.schema : {};
      const sample = buildSampleFromSchema(schema || {}, { arraysOneItem: true });
      try { console.log('[simulate:engine] fn-mock', { nodeId: id, template: tpl?.id || tpl?.name || model?.template, pickedHandle: handle?.id || null }); } catch {}
      return sample;
    } catch { return {}; }
  };

  let captured = null;
  let stop = false;
  // Build edge index for logging
  const edgeBySrcTgt = new Map(edges.map(e => [`${e.source}|${e.target}`, e]));

  // Force branches toward the target for condition nodes
  const forceBranches = {};
  for (const nid of ancestors){
    try {
      const n = nodeById.get(String(nid));
      const kind = String(n?.data?.model?.templateObj?.type || n?.data?.model?.nodeKind || '').toLowerCase();
      if (kind !== 'condition') continue;
      const outs = outEdges.get(String(nid)) || [];
      const viable = outs.filter(e => ancestors.has(String(e.target)) || String(e.target) === String(targetNodeId));
      if (viable.length){ const h = String(viable[0].sourceHandle || ''); forceBranches[String(nid)] = h; }
    } catch {}
  }
  try { if (Object.keys(forceBranches).length) console.log('[simulate:engine] forceBranches', forceBranches); } catch {}

  try {
    await runFlow(flow, { now: new Date() }, { payload: payloadSample }, async (ev) => {
      if (ev?.type === 'node.started') {
        try {
          const n = nodeById.get(String(ev.nodeId||''));
          const kind = String(n?.data?.model?.templateObj?.type || n?.data?.model?.nodeKind || '').toLowerCase();
          console.log('[simulate:engine] node.started', { nodeId: ev.nodeId, kind, branchId: ev.branchId });
        } catch {}
      } else if (ev?.type === 'edge.taken') {
        try {
          const key = `${ev.sourceId}|${ev.targetId}`;
          const ed = edgeBySrcTgt.get(key);
          const h = ed?.sourceHandle || null;
          console.log('[simulate:engine] edge.taken', { sourceId: ev.sourceId, targetId: ev.targetId, sourceHandle: h });
        } catch {}
      }
      if (!captured && ev && ev.type === 'node.started' && String(ev.nodeId || '') === String(targetNodeId)) {
        captured = { msgIn: ev.msgIn || null };
        try { console.log('[simulate:engine] captured target node.msgIn', { nodeId: ev.nodeId, payloadType: typeof (ev.msgIn?.payload), keys: ev.msgIn ? Object.keys(ev.msgIn||{}) : [] }); } catch {}
        stop = true;
      }
    }, { shouldCancel: () => stop, forceBranches });
  } catch (e) {
    // ignore cancellation
  } finally {
    // restore registry
    try { registry.resolve = origResolve; } catch {}
  }

  if (!captured) captured = { msgIn: null };
  // Also compile target node args with the simulated msg (to mirror frontend expectations)
  let argsPre = null, argsPost = null;
  try {
    const { evaluateTemplateDetailed, evaluateExpression } = require('../engine/expression-sandbox');
    const node = (Array.isArray(flow?.nodes) ? flow.nodes : []).find(n => String(n.id) === String(targetNodeId));
    const model = node?.data?.model || {};
    argsPre = model?.context || null;
    const buildEvalContext = (initialContext, msg) => ({ ...initialContext, msg, payload: msg?.payload, _nodes: msg?._nodes });
    const deepRender = (obj, evalCtx) => {
      if (obj == null) return obj;
      if (typeof obj === 'string') { try { return evaluateTemplateDetailed(obj, evalCtx).text; } catch { return obj; } }
      if (Array.isArray(obj)) return obj.map(v => deepRender(v, evalCtx));
      if (typeof obj === 'object'){
        if (Object.keys(obj).length === 1 && typeof obj.$expr === 'string') { try { return evaluateExpression(obj.$expr, evalCtx); } catch { return obj; } }
        const out = {}; for (const [k,v] of Object.entries(obj)) out[k] = deepRender(v, evalCtx); return out;
      }
      return obj;
    };
    if (argsPre) argsPost = deepRender(argsPre, buildEvalContext({ now: new Date() }, captured.msgIn || {}));
  } catch {}
  return { scenarios: [ { id: 'engine', index: 0, label: 'Simulation (engine)', msgIn: captured.msgIn, argsPre, argsPost } ] };
}

module.exports = { simulateViaEngine };
