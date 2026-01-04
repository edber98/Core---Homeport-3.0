// Build simulated msg inputs using output handle schemas along upstream paths
// Returns scenarios representing different branch choices upstream.

function buildGraph(flow) {
  const nodes = Array.isArray(flow?.nodes) ? flow.nodes : [];
  const edges = Array.isArray(flow?.edges) ? flow.edges : [];
  const nodesById = new Map(nodes.map(n => [String(n.id), { ...n, model: n?.data?.model || n?.model || n?.data || {} }]));
  const outEdges = new Map();
  const inEdges = new Map();
  for (const id of nodesById.keys()) { outEdges.set(id, []); inEdges.set(id, []); }
  for (const e of edges) {
    const s = String(e.source), t = String(e.target);
    if (!nodesById.has(s) || !nodesById.has(t)) continue;
    const obj = { source: s, target: t, sourceHandle: e.sourceHandle || '', targetHandle: e.targetHandle || '' };
    outEdges.get(s).push(obj); inEdges.get(t).push(obj);
  }
  return { nodesById, outEdges, inEdges };
}

function getHandleSchema(nodeModel, handleId) {
  try {
    const tpl = (nodeModel?.templateObj || nodeModel) || {};
    const outs = Array.isArray(tpl.outputHandles) ? tpl.outputHandles : [];
    const h = outs.find(o => String(o?.id) === String(handleId));
    return (h && h.schema) ? h.schema : {};
  } catch { return {}; }
}

// Build a minimal sample object from a Dynamic Form-like schema (fields/steps)
function buildSampleFromSchema(schema, opts = {}) {
  const { arraysOneItem = true } = opts;
  const sch = schema || {};
  const fields = Array.isArray(sch.fields) ? sch.fields : null;
  const steps = Array.isArray(sch.steps) ? sch.steps : null;
  const out = {};

  const optionFirstValue = (f) => {
    try {
      const arr = Array.isArray(f.options) ? f.options : [];
      if (arr.length === 0) return undefined;
      const first = arr[0];
      if (first && typeof first === 'object' && ('value' in first)) return first.value;
      return first;
    } catch { return undefined; }
  };

  const valFor = (f) => {
    if (f == null || typeof f !== 'object') return null;
    if (f.default !== undefined) return f.default;
    const t = String(f.type || '').toLowerCase();
    if (t === 'text' || t === 'textarea' || t === 'json' || t === 'code') return 'sample';
    if (t === 'select' || t === 'combobox' || t === 'radio') return optionFirstValue(f) ?? '';
    if (t === 'number' || t === 'slider') return 1;
    if (t === 'checkbox' || t === 'switch') return true;
    if (t === 'date' || t === 'datetime' || t === 'time') return new Date().toISOString();
    if (t === 'tags' || t === 'chips') return ['sample'];
    if (t === 'table') return [ {} ];
    if (t === 'array') {
      const item = f.item || f.items || null;
      if (!arraysOneItem) return [];
      if (!item || typeof item !== 'object') return [];
      // Scalar item
      if (item.type && typeof item.type === 'string') return [valFor(item)];
      // Section-like item with fields
      if (Array.isArray(item.fields)) {
        const o = {}; visit(item.fields, o); return [o];
      }
      return [];
    }
    if (t === 'section' || t === 'object') return {};
    if (t === 'section_array') return arraysOneItem ? [{}] : [];
    return null;
  };

  const visit = (arr, target) => {
    for (const f of (arr || [])){
      if (!f || typeof f !== 'object') continue;
      if (f.type === 'section' || f.type === 'section_array'){
        const key = f.key || null; if (!key) { visit(f.fields || [], target); continue; }
        const isArrayMode = (String(f.type).toLowerCase() === 'section_array') || (String(f.mode || '').toLowerCase() === 'array');
        if (!isArrayMode) {
          target[key] = {};
          visit(f.fields || [], target[key]);
        } else {
          // Section en mode array → tableau d'objets avec 1 élément d'exemple
          if (arraysOneItem) { const obj = {}; visit(f.fields || [], obj); target[key] = [obj]; }
          else target[key] = [];
        }
      } else {
        const key = f.key || null; if (!key) continue;
        target[key] = valFor(f);
      }
    }
  };
  if (steps) { steps.forEach(st => visit(st?.fields || [], out)); }
  else if (fields) { visit(fields, out); }
  return out;
}

function nodeKind(nodeModel){
  try { const t = String((nodeModel?.templateObj?.nodeKind || nodeModel?.templateObj?.type || nodeModel?.nodeKind || nodeModel?.type || '')).toLowerCase(); return t; } catch { return ''; }
}

function getStartFormSchema(nodeModel){
  try {
    const m = nodeModel || {};
    // Prefer explicit context if schema-like
    if (m.context && (Array.isArray(m.context.fields) || Array.isArray(m.context.steps))) return m.context;
    if (m.startFormSchema && (Array.isArray(m.startFormSchema.fields) || Array.isArray(m.startFormSchema.steps))) return m.startFormSchema;
    const tpl = m.templateObj || {};
    if (tpl.args && (Array.isArray(tpl.args.fields) || Array.isArray(tpl.args.steps))) return tpl.args;
  } catch {}
  return {};
}

// Compute ancestors that can reach target (reverse reachability)
function computeAncestors(targetId, inEdges) {
  const seen = new Set([String(targetId)]);
  const anc = new Set();
  const stack = [String(targetId)];
  while (stack.length) {
    const cur = stack.pop();
    const arr = inEdges.get(cur) || [];
    for (const e of arr) {
      const u = String(e.source);
      if (!seen.has(u)) { seen.add(u); anc.add(u); stack.push(u); }
    }
  }
  return anc;
}

// For each ancestor with multiple outgoing handles that lead to target, list viable handle options
function collectChoicePoints(targetId, { nodesById, outEdges, inEdges }) {
  const target = String(targetId);
  const ancestors = computeAncestors(target, inEdges);
  const choices = new Map(); // nodeId -> Set(handleId)
  // A handle is viable if any of its edges leads to a node that is ancestor of target (i.e., on any path to target)
  const isAncestor = (id) => ancestors.has(String(id)) || String(id) === target;
  for (const nid of ancestors) {
    const outs = outEdges.get(nid) || [];
    const viable = new Set();
    for (const e of outs) {
      if (isAncestor(e.target)) viable.add(String(e.sourceHandle || ''));
    }
    if (viable.size > 1) choices.set(String(nid), viable);
  }
  return choices; // Map<string, Set<string>>
}

function cartesianChoices(choicesMap, cap = 16) {
  const entries = Array.from(choicesMap.entries()).map(([nid, set]) => ({ nid, options: Array.from(set.values()) }));
  if (entries.length === 0) return [{}];
  const out = [];
  const recur = (i, acc) => {
    if (out.length >= cap) return; // safety cap
    if (i >= entries.length) { out.push({ ...acc }); return; }
    const { nid, options } = entries[i];
    for (const h of options) { if (out.length >= cap) break; acc[nid] = h; recur(i + 1, acc); delete acc[nid]; }
  };
  recur(0, {});
  return out;
}

function simulateMsgForScenario(targetId, choice, graph) {
  const { nodesById, inEdges } = graph;
  const msg = { _nodes: {} };
  const pathEdges = [];
  const target = String(targetId);
  const visited = new Set([target]);
  const stack = (inEdges.get(target) || []).map(e => ({ edge: e, from: String(e.source), to: target }));
  let payloadSet = false;
  while (stack.length) {
    const { edge, from, to } = stack.pop();
    // Enforce chosen handle when applicable
    const chosen = choice[String(from)];
    if (chosen != null && String(edge.sourceHandle || '') !== String(chosen)) continue;
    try { pathEdges.push({ sourceId: from, targetId: to, sourceHandle: String(edge.sourceHandle || '') }); } catch {}
    // Record node output schema for the handle used on this edge
    const node = nodesById.get(from);
    if (node) {
      const kind = nodeKind(node.model);
      let schema = null;
      let sample = null;
      if (kind === 'start' || kind === 'start_form'){
        schema = getStartFormSchema(node.model);
        sample = (schema && typeof schema === 'object' && (schema.fields || schema.steps)) ? buildSampleFromSchema(schema, { arraysOneItem: true }) : {};
        msg[from] = sample && typeof sample === 'object' ? sample : {};
        // Start-like defines payload
        if (!payloadSet) { msg.payload = msg[from]; payloadSet = true; }
        // Log _nodes entry
        try { msg._nodes[from] = { simulated: true, kind: 'start', outputHandle: String(edge.sourceHandle || ''), schema: schema || {}, result: msg[from], startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 0 }; } catch {}
      } else if (kind === 'condition') {
        const chosenHandle = String(edge.sourceHandle || chosen || '') || null;
        const resultObj = { chosen: chosenHandle || null };
        msg[from] = resultObj;
        try { msg._nodes[from] = { simulated: true, kind: 'condition', outputHandle: chosenHandle, schema: {}, result: resultObj, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 0 }; } catch {}
        // Do not change payload for conditions (engine keeps payload unchanged)
      } else if (kind === 'loop') {
        schema = getHandleSchema(node.model, edge.sourceHandle || '');
        sample = (schema && typeof schema === 'object' && (schema.fields || schema.steps)) ? buildSampleFromSchema(schema, { arraysOneItem: true }) : (schema || {});
        msg[from] = sample && typeof sample === 'object' ? sample : {};
        // For 'each', emulate msg.loop context
        const h = String(edge.sourceHandle || '');
        if (h === 'each') {
          try { msg.loop = { item: msg[from], index: 0, length: 1 }; } catch {}
          // In engine, perItemPayload par défaut=true → payload = item pour la branche each
          try { msg.payload = msg[from]; payloadSet = true; } catch {}
        } else if (h === 'after') {
          // Par défaut, resultMode='collect' → payload = tableau des résultats collectés
          try { msg.payload = [ msg[from] ]; payloadSet = true; } catch {}
        }
        try { msg._nodes[from] = { simulated: true, kind: 'loop', outputHandle: h, schema: schema || {}, result: { count: 1, collected: (h === 'after') ? 1 : undefined }, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 0 }; } catch {}
      } else {
        schema = getHandleSchema(node.model, edge.sourceHandle || '');
        sample = (schema && typeof schema === 'object' && (schema.fields || schema.steps)) ? buildSampleFromSchema(schema, { arraysOneItem: true }) : (schema || {});
        msg[from] = sample && typeof sample === 'object' ? sample : {};
        try { msg._nodes[from] = { simulated: true, kind: kind || 'function', outputHandle: String(edge.sourceHandle || ''), schema: schema || {}, result: msg[from], startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationMs: 0 }; } catch {}
        // Préférer payload issue des fonctions
        if (kind === 'function') { msg.payload = msg[from]; payloadSet = true; }
        else if (!payloadSet) { msg.payload = msg[from]; payloadSet = true; }
      }
    }
    if (!visited.has(from)) {
      visited.add(from);
      const inArr = inEdges.get(from) || [];
      for (const ie of inArr) stack.push({ edge: ie, from: String(ie.source), to: from });
    }
  }
  try { msg._path = { edges: pathEdges }; } catch {}
  return msg;
}

function simulateScenarios(flow, targetNodeId, mode = 'all') {
  const graph = buildGraph(flow);
  const choices = collectChoicePoints(targetNodeId, graph);
  // Special mode: one scenario per direct incoming predecessor of target (non-merged branches)
  const incoming = (graph.inEdges.get(String(targetNodeId)) || []).map(e => ({ source: String(e.source), sourceHandle: String(e.sourceHandle || '') }));
  const uniq = []; const seen = new Set();
  for (const it of incoming) { const key = `${it.source}|${it.sourceHandle}`; if (!seen.has(key)) { seen.add(key); uniq.push(it); } }
  const combos = mode === 'all' ? cartesianChoices(choices, 24)
    : (mode === 'branches' && uniq.length > 1 ? uniq.map(p => ({ __branchSource: p.source, __branchHandle: p.sourceHandle })) : [{}]);
  // Prepare deepRender for compiling args (expressions/templates) on target node
  let evaluateTemplateDetailed = null, evaluateExpression = null;
  try { ({ evaluateTemplateDetailed, evaluateExpression } = require('../engine/expression-sandbox')); } catch {}
  const buildEvalContext = (initialContext, msg) => ({ ...initialContext, msg, payload: msg?.payload, _nodes: msg?._nodes });
  const deepRender = (obj, evalCtx) => {
    if (obj == null) return obj;
    if (typeof obj === 'string') { try { return evaluateTemplateDetailed ? evaluateTemplateDetailed(obj, evalCtx).text : obj; } catch { return obj; } }
    if (Array.isArray(obj)) return obj.map(v => deepRender(v, evalCtx));
    if (typeof obj === 'object'){
      if (Object.keys(obj).length === 1 && typeof obj.$expr === 'string') { try { return evaluateExpression ? evaluateExpression(obj.$expr, evalCtx) : obj; } catch { return obj; } }
      const out = {}; for (const [k,v] of Object.entries(obj)) out[k] = deepRender(v, evalCtx); return out;
    }
    return obj;
  };
  const reorderMsgByExecution = (msg) => {
    try {
      if (!msg || typeof msg !== 'object') return msg;
      const nodesMeta = (msg._nodes && typeof msg._nodes === 'object') ? msg._nodes : {};
      const ids = Object.keys(msg).filter(k => k !== '_nodes' && k !== 'payload' && k !== 'loop');
      const path = Array.isArray(nodesMeta?.__path) ? nodesMeta.__path.map(String) : null;
      let orderedKeys;
      if (path && path.length) {
        const set = new Set(ids);
        orderedKeys = path.filter(k => set.has(k));
        const remaining = ids.filter(k => !orderedKeys.includes(k));
        orderedKeys = [...orderedKeys, ...remaining];
      } else {
        const decorated = ids.map(k => ({ k, t: Date.parse(nodesMeta?.[k]?.start || nodesMeta?.[k]?.startedAt || 0) || 0 }));
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
      if ('payload' in msg) out.payload = msg.payload;
      for (const k of keysToEmit) out[k] = msg[k];
      if (msg._nodes) out._nodes = msg._nodes;
      return out;
    } catch { return msg; }
  };

  const scenarios = combos.map((choice, idx) => {
    // If branches mode, restrict traversal to the selected direct predecessor
    let msgIn;
    if (choice && choice.__branchSource){
      const target = String(targetNodeId);
      const allowedSrc = String(choice.__branchSource);
      const allowedHandle = String(choice.__branchHandle || '');
      // Build a filtered graph view where only edges into target from allowedSrc are considered
      const g2 = { ...graph, inEdges: new Map(graph.inEdges) };
      const arr = (graph.inEdges.get(target) || []).filter(e => String(e.source) === allowedSrc && String(e.sourceHandle || '') === allowedHandle);
      g2.inEdges.set(target, arr);
      msgIn = simulateMsgForScenario(targetNodeId, {}, g2);
    } else {
      msgIn = simulateMsgForScenario(targetNodeId, choice, graph);
    }
    let ordered = msgIn; try { ordered = reorderMsgByExecution(msgIn); } catch {}
    let argsPre = null, argsPost = null;
    try {
      const node = graph.nodesById.get(String(targetNodeId));
      const model = node?.model || {};
      argsPre = model?.context || null;
      if (argsPre && (evaluateTemplateDetailed || evaluateExpression)) argsPost = deepRender(argsPre, buildEvalContext({ now: new Date() }, ordered));
    } catch {}
    let label;
    if (choice && choice.__branchSource){
      const n = graph.nodesById.get(String(choice.__branchSource));
      const name = (n && (n.model?.title || n.title)) || String(choice.__branchSource);
      const h = String(choice.__branchHandle || '');
      label = `Branche via ${name}${h ? ` (${h})` : ''}`;
    } else {
      label = Object.keys(choice).length ?
        Object.entries(choice).map(([nid, h]) => `${nid}:${h}`).join(', ') : 'Chemin par défaut';
    }
    const path = (() => { try { const e = (msgIn && (msgIn._path && msgIn._path.edges)) ? msgIn._path.edges : []; return { edges: e }; } catch { return undefined; } })();
    // Static simulate: provide basic pseudo-trace using node order inferred from path
    const trace = (() => {
      try {
        const arr = Array.isArray(path?.edges) ? path.edges : [];
        const order = [];
        const seen = new Set();
        for (const e of arr){ if (!seen.has(e.sourceId)) { seen.add(e.sourceId); order.push({ nodeId: e.sourceId, kind: undefined, handlesUsed: [String(e.sourceHandle||'')], resultPreview: [] }); } }
        const last = arr.length ? arr[arr.length-1] : null; if (last && !seen.has(last.targetId)) order.push({ nodeId: last.targetId, kind: undefined, handlesUsed: [], resultPreview: [] });
        return order;
      } catch { return []; }
    })();
    return { id: `sc_${idx+1}`, index: idx, label, msgIn: ordered, argsPre, argsPost, choice, path, trace };
  });
  // Ensure at least one scenario exists, even if empty
  if (scenarios.length === 0) scenarios.push({ id: 'sc_1', index: 0, label: 'Chemin par défaut', msgIn: {}, choice: {} });
  return { targetNodeId: String(targetNodeId), scenarios };
}

module.exports = { simulateScenarios };

// Also export helpers for engine-based simulation
module.exports.buildSampleFromSchema = buildSampleFromSchema;
module.exports.getStartFormSchema = getStartFormSchema;
