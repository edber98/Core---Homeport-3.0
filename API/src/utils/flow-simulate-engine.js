const { registry } = require('../plugins/registry');
const { buildSampleFromSchema, getStartFormSchema } = require('./flow-simulate');

function pickOutputHandle(tpl){
  try {
    const outs = tpl?.outputHandles;
    if (Array.isArray(outs)){
      if (!outs.length) return null;
      const ok = outs.find(h => String(h?.id) === 'ok');
      return ok || outs[0];
    }
    if (outs && typeof outs === 'object'){
      return outs['ok'] || Object.values(outs)[0] || null;
    }
    return null;
  } catch { return null; }
}

// Helpers are imported directly above

async function simulateViaEngine(flow, targetNodeId, opts = {}){
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
  const startModel = startNode?.data?.model || {};
  const startSchema = getStartFormSchema(startModel || {});
  const payloadSample = buildSampleFromSchema(startSchema || {}, { arraysOneItem: true });
  try {
    const countFields = Array.isArray(startSchema?.fields) ? startSchema.fields.length : 0;
    const countSteps = Array.isArray(startSchema?.steps) ? startSchema.steps.length : 0;
    const countSections = Array.isArray(startSchema?.sections) ? startSchema.sections.length : 0;
    console.log('[simulate:engine] init payload from start', { startId: startNode?.id, hasSchema: !!(startSchema && (startSchema.fields||startSchema.steps||startSchema.sections)), fields: countFields, steps: countSteps, sections: countSections, keys: Object.keys(payloadSample||{}) });
  } catch {}

  // Prepare mock registry
  const origResolve = registry.resolve.bind(registry);
  registry.resolve = (key) => async ({ id, model }, msg, inputs) => {
    try {
      const tpl = (model?.templateObj || model) || {};
      const handle = pickOutputHandle(tpl);
      let schema = {};
      if (handle && handle.schema) schema = handle.schema;
      else if (tpl && tpl.output && tpl.output.schema) schema = tpl.output.schema;
      const sample = buildSampleFromSchema(schema || {}, { arraysOneItem: true });
      try { console.log('[simulate:engine] fn-mock', { nodeId: id, template: tpl?.id || tpl?.name || model?.template, pickedHandle: handle?.id || null }); } catch {}
      return sample;
    } catch { return {}; }
  };

  let captured = null;
  const takenEdges = [];
  let stop = false;
  const startedSeq = [];
  // Ordered execution trace: collect per-node timing, outputs and handles used
  const trace = [];
  const traceMap = new Map();
  const loopStack = [];
  // Build edge index for logging
  const edgeBySrcTgt = new Map(edges.map(e => [`${e.source}|${e.target}`, e]));

  // Force branches toward the target for condition nodes
  // Build default forced choices to ensure a deterministic path; allow overrides via opts.forceBranches
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
  try {
    const overrides = (opts && typeof opts.forceBranches === 'object') ? opts.forceBranches : null;
    if (overrides) { for (const [k,v] of Object.entries(overrides)) forceBranches[String(k)] = v; }
  } catch {}
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
          // Initialize trace entry for this node
          const entry = { nodeId: idStr, kind, startedAt: ev.startedAt || new Date().toISOString(), handlesUsed: [] };
          trace.push(entry); traceMap.set(idStr, entry);
        } catch {}
      } else if (ev?.type === 'edge.taken') {
        try {
          const key = `${ev.sourceId}|${ev.targetId}`;
          const ed = edgeBySrcTgt.get(key);
          const h = ed?.sourceHandle || null;
          console.log('[simulate:engine] edge.taken', { sourceId: ev.sourceId, targetId: ev.targetId, sourceHandle: h });
          try { takenEdges.push({ sourceId: String(ev.sourceId||''), targetId: String(ev.targetId||''), sourceHandle: String(h||'') }); } catch {}
          // Record handle used on the source node in the trace
          try { const te = traceMap.get(String(ev.sourceId||'')); if (te && te.handlesUsed) te.handlesUsed.push(String(h||'')); } catch {}
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
      } else if (ev?.type === 'node.done') {
        try {
          const idStr = String(ev.nodeId||'');
          const te = traceMap.get(idStr);
          if (te) {
            te.finishedAt = ev.finishedAt || new Date().toISOString();
            const { preview, count } = buildOneLevelPreview(ev.result);
            te.resultPreview = preview;
            te.outputsCount = count;
          }
        } catch {}
      }
      if (!captured && ev && ev.type === 'node.started' && String(ev.nodeId || '') === String(targetNodeId)) {
        // Capturer le msgIn fourni par le moteur
        let msgIn = ev.msgIn || null;
        try {
          // Si la dernière arête vers la cible provient d'une condition, refléter le 'chosen' dans payload (sans écraser)
          const incoming = takenEdges.filter(e => String(e.targetId) === String(targetNodeId));
          const last = incoming[incoming.length - 1] || null;
          if (last) {
            const src = nodeById.get(String(last.sourceId));
            const kind = String(src?.data?.model?.templateObj?.type || src?.data?.model?.nodeKind || '').toLowerCase();
            if (kind === 'condition') {
              const chosen = String(last.sourceHandle || '');
              try {
                if (!msgIn || typeof msgIn !== 'object') msgIn = {};
                msgIn.payload = { chosen };
                console.info('[simulate:engine] payload.replaced_from_condition', { sourceId: last.sourceId, chosen });
              } catch {}
            }
          }
          // Journaliser un snapshot du payload sans fusion (comportement demandé: pas de merge)
          try {
            const snap = (msgIn && typeof msgIn === 'object' && msgIn.payload && typeof msgIn.payload === 'object') ? msgIn.payload : {};
            const prev = JSON.stringify(snap);
            console.info('[simulate:engine] msgIn.payload.snapshot', prev.length > 800 ? prev.slice(0, 800) + '…' : prev);
          } catch {}
        } catch {}
        captured = { msgIn };
        try { console.log('[simulate:engine] captured target node.msgIn', { nodeId: ev.nodeId, payloadType: typeof (msgIn?.payload), keys: msgIn ? Object.keys(msgIn||{}) : [] }); } catch {}
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
  // In parallel merges, we may stop at target.started before all incoming edges into target were emitted.
  // Ensure all incoming edges into the target from nodes that actually started are present in path.
  try {
    const existed = new Set(takenEdges.map(e => `${e.sourceId}|${e.targetId}`));
    const incomingToTarget = inEdges.get(String(targetNodeId)) || [];
    for (const e of incomingToTarget) {
      const s = String(e.source), t = String(e.target);
      if (!existed.has(`${s}|${t}`)) {
        // Include only if source node actually started (was on the execution path)
        if (startedSeq.includes(s)) {
          const h = (edgeBySrcTgt.get(`${s}|${t}`) || {}).sourceHandle || e.sourceHandle || '';
          takenEdges.push({ sourceId: s, targetId: t, sourceHandle: String(h || '') });
        }
      }
    }
  } catch {}
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
  // Assemble ordered trace using startedSeq order
  const orderedTrace = (() => {
    try {
      const map = new Map(trace.map(e => [String(e.nodeId), e]));
      return startedSeq.map(id => map.get(String(id))).filter(Boolean);
    } catch { return trace; }
  })();
  return { scenarios: [ { id: 'engine', index: 0, label: 'Simulation (engine)', msgIn: captured.msgIn, argsPre, argsPost, path: { edges: takenEdges }, trace: orderedTrace } ] };
}

// Produce a 1-level preview of a node result for settings UI and count first-level outputs
function buildOneLevelPreview(result){
  try {
    const t = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
    const out = [];
    if (result == null) return { preview: out, count: 0 };
    if (typeof result === 'object' && !Array.isArray(result)) {
      for (const [k,v] of Object.entries(result)) out.push({ key: String(k), type: t(v) });
      return { preview: out, count: Object.keys(result).length };
    }
    if (Array.isArray(result)) { out.push({ key: '(array)', type: 'array' }); return { preview: out, count: result.length }; }
    out.push({ key: '(value)', type: t(result) }); return { preview: out, count: 1 };
  } catch { return { preview: [], count: 0 }; }
}

async function simulateViaEngineSplit(flow, targetNodeId){
  // Build graph helpers
  const nodes = Array.isArray(flow?.nodes) ? flow.nodes : [];
  const edges = Array.isArray(flow?.edges) ? flow.edges : [];
  const nodeById = new Map(nodes.map(n => [String(n.id), n]));
  const inEdges = new Map();
  for (const n of nodes) inEdges.set(String(n.id), []);
  for (const e of edges) {
    const s = String(e.source), t = String(e.target);
    if (nodeById.has(s) && nodeById.has(t)) inEdges.get(t).push(e);
  }
  const incoming = (inEdges.get(String(targetNodeId)) || []).map(e => ({ source: String(e.source), sourceHandle: String(e.sourceHandle || '') }));
  const uniq = [];
  const seen = new Set();
  for (const it of incoming) { const key = `${it.source}|${it.sourceHandle}`; if (!seen.has(key)) { seen.add(key); uniq.push(it); } }
  // Even if there is a single incoming edge to target, there can be nested branches upstream;
  // do not early-return — enumerate upstream choices below.
  // Enumerate nested choice points (conditions with multiple viable handles) upstream of target
  const outE = new Map(); const inE2 = new Map();
  for (const n of nodes) { outE.set(String(n.id), []); inE2.set(String(n.id), []); }
  for (const e of edges) { const s=String(e.source), t=String(e.target); if (nodeById.has(s) && nodeById.has(t)){ outE.get(s).push(e); inE2.get(t).push(e); } }
  const computeAnc = (tid) => { const target=String(tid); const seen=new Set([target]); const anc=new Set(); const st=[target]; while(st.length){ const cur=st.pop(); for (const ie of inE2.get(cur)||[]){ const u=String(ie.source); if (!seen.has(u)){ seen.add(u); anc.add(u); st.push(u);} } } return anc; };
  const ancAll = computeAnc(targetNodeId);
  const choicePoints = (() => {
    const map = new Map();
    const isAnc = (id) => ancAll.has(String(id)) || String(id)===String(targetNodeId);
    for (const nid of ancAll){
      try {
        const outs = outE.get(String(nid)) || [];
        // Collect distinct outgoing edges towards ancestors as atomic choices (not just by handle)
        const viable = outs.filter(e => isAnc(e.target)).map(e => ({ source: String(e.source), target: String(e.target), sourceHandle: String(e.sourceHandle||'') }));
        if (viable.length > 1) map.set(String(nid), viable);
      } catch {}
    }
    return map;
  })();
  const cartesian = (choices, cap=64) => { const entries=Array.from(choices.entries()).map(([nid,opts])=>({nid,opts})); if (!entries.length) return [{}]; const out=[]; const recur=(i,acc)=>{ if (out.length>=cap) return; if (i>=entries.length){ out.push({ ...acc }); return; } const { nid, opts }=entries[i]; for (const pick of opts){ if (out.length>=cap) break; acc[nid]=pick; recur(i+1,acc); delete acc[nid]; } }; recur(0,{}); return out; };
  const choiceCombos = cartesian(choicePoints, 64);

  // Helper to run engine on a filtered graph keeping only one incoming predecessor to the target
  const runForIncoming = async (inc, idx) => {
    const filteredEdges = edges.filter(e => {
      if (String(e.target) !== String(targetNodeId)) return true;
      return String(e.source) === String(inc.source) && String(e.sourceHandle || '') === String(inc.sourceHandle || '');
    });
    // Run for each nested branching combination (forced choices)
    const results = [];
    const combos = (choiceCombos && choiceCombos.length) ? choiceCombos : [{}];
    for (let ci=0; ci<combos.length; ci++){
      const forced = combos[ci] || {};
      // Filter outgoing edges for nodes with a forced edge selection (by target and handle)
      const edgesForced = filteredEdges.filter(e => {
        const pick = forced[String(e.source)];
        if (!pick) return true;
        return String(e.target) === String(pick.target) && String(e.sourceHandle||'') === String(pick.sourceHandle||'');
      });
      const flowV = { ...flow, nodes, edges: edgesForced };
      const one = await simulateViaEngine(flowV, targetNodeId);
      const sc = (Array.isArray(one?.scenarios) ? one.scenarios : [])[0] || { msgIn: null, argsPre: null, argsPost: null };
      if (!sc || !sc.msgIn) { continue; }
    // Filter path to keep only edges that lie on a path from selected incoming (source+handle) to target
    try {
      const all = Array.isArray(sc?.path?.edges) ? sc.path.edges : [];
      const succ = new Map();
      const pred = new Map();
      for (const e of all) {
        const s = String(e.sourceId), t = String(e.targetId);
        if (!succ.has(s)) succ.set(s, []); succ.get(s).push(e);
        if (!pred.has(t)) pred.set(t, []); pred.get(t).push(e);
      }
      const fwd = new Set([String(inc.source)]);
      const fq = [String(inc.source)];
      while (fq.length) {
        const n = fq.shift();
        const outs = succ.get(n) || [];
        for (const e of outs) { const t = String(e.targetId); if (!fwd.has(t)) { fwd.add(t); fq.push(t); } }
      }
      const back = new Set([String(targetNodeId)]);
      const bq = [String(targetNodeId)];
      while (bq.length) {
        const n = bq.shift();
        const ins = pred.get(n) || [];
        for (const e of ins) { const s = String(e.sourceId); if (!back.has(s)) { back.add(s); bq.push(s); } }
      }
      const filteredForward = all.filter(e => fwd.has(String(e.sourceId)) && back.has(String(e.targetId)));
      // Upstream to selected incoming: nodes that can reach inc.source through taken edges
      const up = new Set([String(inc.source)]);
      const uq = [String(inc.source)];
      while (uq.length) {
        const n = uq.shift();
        const ins = pred.get(n) || [];
        for (const e of ins) { const s = String(e.sourceId); if (!up.has(s)) { up.add(s); uq.push(s); } }
      }
      const filteredUp = all.filter(e => up.has(String(e.sourceId)) && up.has(String(e.targetId)));
      const filtered = [...filteredUp, ...filteredForward];
      sc.path = { edges: filtered };
      // Preserve full msgIn for richer ctx in editors (do not trim to path)
      // If a trimmed version is ever needed, expose it under a different key
    } catch {}
      const label = (() => {
        try {
          const n = nodeById.get(String(inc.source));
          const h = String(inc.sourceHandle || '');
          const hTxt = h ? ` (${h})` : '';
          const forcedStr = Object.keys(forced||{}).length ? ' — ' + Object.entries(forced).map(([nid,p])=>`${nid}:${p.target}${p.sourceHandle?`(${p.sourceHandle})`:''}`).join(', ') : '';
          return `Engine via ${n?.data?.model?.title || n?.data?.title || n?.title || inc.source}${hTxt}${forcedStr}`;
        } catch { return `Engine via ${inc.source}`; }
      })();
      results.push({ id: `engine_${idx+1}_${ci+1}`, index: -1, label, msgIn: sc.msgIn, argsPre: sc.argsPre, argsPost: sc.argsPost, sourceNodeId: String(inc.source), sourceHandle: String(inc.sourceHandle || ''), path: sc.path, trace: sc.trace });
    }
    return results;
  };
  const scenarios = [];
  for (let i = 0; i < uniq.length; i++) {
    try {
      const arr = await runForIncoming(uniq[i], i);
      if (Array.isArray(arr)) scenarios.push(...arr);
    } catch (e) { /* continue */ }
  }
  // Deduplicate scenarios that result in identical paths (same set of edges)
  if (scenarios.length > 1) {
    const keyOf = (sc) => {
      try {
        const arr = (sc && sc.path && Array.isArray(sc.path.edges)) ? sc.path.edges : [];
        const parts = arr.map(e => `${String(e.sourceId)}|${String(e.targetId)}|${String(e.sourceHandle||'')}`);
        parts.sort();
        return parts.join(';');
      } catch { return ''; }
    };
    const seen = new Set();
    const uniq = [];
    for (const sc of scenarios) {
      const k = keyOf(sc);
      if (!seen.has(k)) { seen.add(k); uniq.push(sc); }
    }
    scenarios.length = 0; scenarios.push(...uniq);
  }
  // Build a merged scenario strictly as the union of split scenarios paths (no extra edges)
  if (scenarios.length > 1) {
    const edgeKey = (e) => `${String(e.sourceId)}|${String(e.targetId)}|${String(e.sourceHandle||'')}`;
    const uniqEdges = new Map();
    const mergedMsg = {};
    let mergedArgsPre = null, mergedArgsPost = null;
    let gotPayload = false;
    // Collect union of per-node previews from traces to drive UI output handles in fusion
    const previewUnion = new Map(); // nodeId -> { kind, handlesUsed:Set<string>, keys: Map<key, type> }
    const addTraceToUnion = (traceArr) => {
      try {
        const arr = Array.isArray(traceArr) ? traceArr : [];
        for (const t of arr) {
          const nid = String(t?.nodeId || ''); if (!nid) continue;
          let slot = previewUnion.get(nid);
          if (!slot) { slot = { kind: t?.kind || undefined, handlesUsed: new Set(), keys: new Map() }; previewUnion.set(nid, slot); }
          // Union handles used
          try { for (const h of (Array.isArray(t?.handlesUsed) ? t.handlesUsed : [])) slot.handlesUsed.add(String(h||'')); } catch {}
          // Union preview keys; if same key has conflicting type, mark as 'mixed'
          try {
            const items = Array.isArray(t?.resultPreview) ? t.resultPreview : [];
            for (const it of items) {
              const k = String((it && (it.key ?? it.name)) || ''); if (!k) continue;
              const typ = String(it?.type || '');
              if (!slot.keys.has(k)) slot.keys.set(k, typ);
              else {
                const prev = slot.keys.get(k);
                if (prev !== typ) slot.keys.set(k, 'mixed');
              }
            }
          } catch {}
        }
      } catch {}
    };
    for (const sc of scenarios) {
      const list = (sc && sc.path && Array.isArray(sc.path.edges)) ? sc.path.edges : [];
      for (const e of list) { const k = edgeKey(e); if (!uniqEdges.has(k)) uniqEdges.set(k, { ...e }); }
      // Merge msgIn nodes along split paths
      const msg = sc && sc.msgIn ? sc.msgIn : {};
      if (!gotPayload && Object.prototype.hasOwnProperty.call(msg, 'payload')) { mergedMsg.payload = msg.payload; gotPayload = true; }
      for (const k of Object.keys(msg)) {
        if (k === 'payload' || k === '_nodes') continue;
        if (!Object.prototype.hasOwnProperty.call(mergedMsg, k)) mergedMsg[k] = msg[k];
      }
      if (msg && typeof msg._nodes === 'object') {
        if (!mergedMsg._nodes) mergedMsg._nodes = {};
        for (const nk of Object.keys(msg._nodes)) { if (!Object.prototype.hasOwnProperty.call(mergedMsg._nodes, nk)) mergedMsg._nodes[nk] = msg._nodes[nk]; }
      }
      // Union traces
      addTraceToUnion(sc && sc.trace);
      // Keep first argsPre/argsPost as reference
      if (mergedArgsPre == null && sc.argsPre != null) mergedArgsPre = sc.argsPre;
      if (mergedArgsPost == null && sc.argsPost != null) mergedArgsPost = sc.argsPost;
    }
    // Build a merged trace ordered topologically along merged path edges
    const nodesSet = new Set();
    Array.from(uniqEdges.values()).forEach((e) => { nodesSet.add(String(e.sourceId)); nodesSet.add(String(e.targetId)); });
    // Also include nodes from union previews (in case a node produced preview without explicit edge in union)
    for (const nid of previewUnion.keys()) nodesSet.add(String(nid));
    const indeg = new Map(); const succ = new Map();
    for (const nid of nodesSet) { indeg.set(nid, 0); succ.set(nid, []); }
    Array.from(uniqEdges.values()).forEach((e) => {
      const s = String(e.sourceId), t = String(e.targetId);
      succ.get(s).push(t);
      indeg.set(t, (indeg.get(t) || 0) + 1);
    });
    const q = [];
    for (const nid of nodesSet) { if ((indeg.get(nid) || 0) === 0) q.push(nid); }
    const ordered = [];
    const seenTopo = new Set();
    while (q.length) {
      const n = q.shift(); if (seenTopo.has(n)) continue; seenTopo.add(n); ordered.push(n);
      for (const t of (succ.get(n) || [])) { const v = (indeg.get(t) || 0) - 1; indeg.set(t, v); if (v === 0) q.push(t); }
    }
    // Append any remaining nodes (cycles or isolated)
    for (const nid of nodesSet) { if (!seenTopo.has(nid)) ordered.push(nid); }
    const mergedTrace = ordered.map((nid) => {
      const slot = previewUnion.get(String(nid));
      if (!slot) return { nodeId: String(nid), handlesUsed: [], resultPreview: [], outputsCount: 0 };
      const items = Array.from(slot.keys.entries()).map(([k, typ]) => ({ key: k, type: typ || '' }));
      // Stable order by key for deterministic UI
      items.sort((a,b) => a.key.localeCompare(b.key));
      return { nodeId: String(nid), kind: slot.kind, handlesUsed: Array.from(slot.handlesUsed.values()), resultPreview: items, outputsCount: items.length };
    });
    const mergedScenario = {
      id: 'engine_merged',
      index: scenarios.length,
      label: 'Simulation (fusion)',
      msgIn: mergedMsg,
      argsPre: mergedArgsPre,
      argsPost: mergedArgsPost,
      path: { edges: Array.from(uniqEdges.values()) },
      trace: mergedTrace
    };
    scenarios.push(mergedScenario);
  }
  return { targetNodeId: String(targetNodeId), scenarios };
}

module.exports = { simulateViaEngine, simulateViaEngineSplit };
