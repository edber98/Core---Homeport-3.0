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
  const startedSeq = [];
  const loopStack = [];
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
          // record path order
          const idStr = String(ev.nodeId||'');
          if (idStr && !startedSeq.includes(idStr)) startedSeq.push(idStr);
        } catch {}
      } else if (ev?.type === 'edge.taken') {
        try {
          const key = `${ev.sourceId}|${ev.targetId}`;
          const ed = edgeBySrcTgt.get(key);
          const h = ed?.sourceHandle || null;
          console.log('[simulate:engine] edge.taken', { sourceId: ev.sourceId, targetId: ev.targetId, sourceHandle: h });
          // Track loop entry/exit for correct loop placement
          try {
            const srcNode = nodeById.get(String(ev.sourceId||''));
            const isLoop = String(srcNode?.data?.model?.templateObj?.type || srcNode?.data?.model?.nodeKind || '').toLowerCase() === 'loop';
            if (isLoop && String(h) === 'each') loopStack.push(String(ev.sourceId));
            if (isLoop && String(h) === 'after') {
              if (loopStack.length && loopStack[loopStack.length-1] === String(ev.sourceId)) loopStack.pop();
            }
          } catch {}
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
  try {
    if (captured.msgIn && captured.msgIn._nodes) {
      captured.msgIn._nodes.__path = startedSeq.slice();
      captured.msgIn._nodes.__loopOwner = loopStack.length ? loopStack[loopStack.length-1] : null;
    }
  } catch {}
  // Also compile target node args with the simulated msg (to mirror frontend expectations)
  // Reorder msg keys by execution order using _nodes.start/startedAt timestamps
  const reorderMsgByExecution = (msg) => {
    try {
      if (!msg || typeof msg !== 'object') return msg;
      const nodesMeta = (msg._nodes && typeof msg._nodes === 'object') ? msg._nodes : {};
      const ids = Object.keys(msg).filter(k => k !== '_nodes' && k !== 'payload');
      // Prefer explicit path order if provided by simulation
      const path = Array.isArray(nodesMeta?.__path) ? nodesMeta.__path.map(String) : null;
      let orderedKeys;
      if (path && path.length) {
        const set = new Set(ids);
        orderedKeys = path.filter(k => set.has(k));
        const remaining = ids.filter(k => !orderedKeys.includes(k));
        orderedKeys = [...orderedKeys, ...remaining];
      } else {
        const decorated = ids.map(k => ({ k, t: Date.parse(nodesMeta?.[k]?.start || nodesMeta?.[k]?.startedAt || 0) || 0 }));
        // Ascendant: Start → … → target
        decorated.sort((a,b) => a.t - b.t);
        orderedKeys = decorated.map(d => d.k);
      }
      // Positionner 'loop' juste après son owner si présent
      let keysToEmit = orderedKeys.slice();
      if ('loop' in msg) {
        keysToEmit = keysToEmit.filter(k => k !== 'loop');
        const owner = nodesMeta?.__loopOwner ? String(nodesMeta.__loopOwner) : null;
        if (owner) {
          const idx = keysToEmit.indexOf(owner);
          if (idx >= 0) keysToEmit.splice(idx + 1, 0, 'loop');
          else keysToEmit.unshift('loop');
        } else {
          keysToEmit.unshift('loop');
        }
      }
      const out = {};
      // payload toujours en premier s'il existe
      if ('payload' in msg) out.payload = msg.payload;
      for (const k of keysToEmit) out[k] = msg[k];
      // _nodes en dernier
      if (msg._nodes) out._nodes = msg._nodes;
      return out;
    } catch { return msg; }
  };
  try { captured.msgIn = reorderMsgByExecution(captured.msgIn); } catch {}

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
