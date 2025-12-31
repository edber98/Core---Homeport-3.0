// Engine minimal adapted from provided example; emits events to a callback
const { evaluateTemplateDetailed, evaluateExpression } = require('./expression-sandbox');
const { registry } = require('../plugins/registry');

function log(step, data) { const payload = data === undefined ? '' : (typeof data === 'string' ? data : JSON.stringify(data)); console.log(`[engine] ${step} ${payload}`); }

function normalizeNodeKind(nameOrType=''){ const s = String(nameOrType||'').trim().toLowerCase(); if (s==='start' || s==='start_form') return 'start'; if (s==='condition') return 'condition'; if (s==='function') return 'function'; if (s==='loop') return 'loop'; return ''; }
function normalizeTemplateKey(k){ if (!k) return ''; let s = String(k).trim().toLowerCase(); s = s.replace(/^tmpl_/,'').replace(/^template_/,'').replace(/^fn_/,'').replace(/^node_/,''); s = s.replace(/[^a-z0-9_]/g,'_'); return s; }

function unwrapIsland(expr){ if (typeof expr !== 'string') return expr; const m = expr.match(/^\s*\{\{\s*([\s\S]*?)\s*\}\}\s*$/); return m ? m[1] : expr; }
function isTemplateLike(s){ return typeof s === 'string' && /\{\{[\s\S]*?\}\}/.test(s); }
function isTruthyText(s){ if (s == null) return false; const t = String(s).trim(); if (t === '') return false; const low = t.toLowerCase(); if (low==='false'||low==='0'||low==='null'||low==='undefined'||low==='nan') return false; return true; }
function buildEvalContext(initialContext, msg){
  return { ...initialContext, msg, payload: msg.payload, _nodes: msg._nodes };
}
function renderTemplate(value, evalCtx){ if (typeof value !== 'string') return value; return evaluateTemplateDetailed(value, evalCtx).text; }
function deepRender(obj, evalCtx){
  if (obj == null) return obj;
  if (typeof obj === 'string') return renderTemplate(obj, evalCtx);
  if (Array.isArray(obj)) return obj.map(v=>deepRender(v, evalCtx));
  if (typeof obj === 'object'){
    // {$expr:"..."}
    if (Object.keys(obj).length === 1 && typeof obj.$expr === 'string'){
      try { return evaluateExpression(obj.$expr, evalCtx); } catch { return obj; }
    }
    const out={};
    for (const [k,v] of Object.entries(obj)){
      if (v && typeof v === 'object' && !Array.isArray(v)){
        const keys = Object.keys(v);
        if (keys.length === 1 && typeof v.$expr === 'string'){
          try { out[k] = evaluateExpression(v.$expr, evalCtx); continue; } catch { /* fallthrough */ }
        }
      }
      out[k]=deepRender(v, evalCtx);
    }
    return out;
  }
  return obj;
}

// Minimal lodash.get equivalent for dotted/bracket paths (a.b[0].c)
function dotGet(obj, path, def){
  try {
    if (!path) return def;
    let p = String(path);
    // Convert bracket to dot notation: a[0].b -> a.0.b
    p = p.replace(/\[(\w+)\]/g, '.$1');
    p = p.replace(/\["([^\]]+)"\]/g, '.$1');
    p = p.replace(/\[\'([^\]]+)\'\]/g, '.$1');
    const parts = p.split('.').filter(Boolean);
    let cur = obj;
    for (const key of parts){ if (cur == null) return def; cur = cur[key]; }
    return (cur === undefined) ? def : cur;
  } catch { return def; }
}

const builtinRegistry = {
  action: async (node, msg, inputs) => ({ ok: true, echo: inputs }),
  sendmail: async (node, msg, inputs) => ({ deliveredTo: inputs.to || null, subject: inputs.subject || null }),
  pdf: async (node, msg, inputs) => ({ pdfGenerated: true, meta: { nodeId: node.id } }),
};

function buildGraph(flow){ const nodesById = new Map(); const outEdges = new Map(); const inEdges = new Map(); for (const n of (flow.nodes||[])){ n.model = n.data?.model || n.model || n.data || {}; nodesById.set(n.id, n); outEdges.set(n.id, []); inEdges.set(n.id, []); } for (const e of (flow.edges||[])){ const src = e.source, tgt = e.target; if (!nodesById.has(src) || !nodesById.has(tgt)) continue; const labelText = e.edgeLabels?.center?.data?.text ?? e.label ?? ''; const obj = { target: tgt, labelText: String(labelText).trim(), sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, source: src }; outEdges.get(src).push(obj); inEdges.get(tgt).push(obj); } return { nodesById, outEdges, inEdges }; }
function findStartNode(nodesById){ for (const n of nodesById.values()){ const tObj = n.model?.templateObj || {}; const kindFromName = normalizeNodeKind(tObj.nodeKind || tObj.name); const nType = kindFromName || normalizeNodeKind(tObj.type) || normalizeNodeKind(n.model?.nodeKind) || normalizeNodeKind(n.model?.type) || normalizeNodeKind(n.type); if (nType === 'start') return n; } for (const n of nodesById.values()){ if (String(n.id).toLowerCase().includes('start')) return n; } return [...nodesById.values()][0] || null; }

function evaluateCondition(node, initialContext, msg){
  const ctx = node.model?.context || {};
  const mode = String(ctx.mode || 'firstMatch');
  const items = Array.isArray(ctx.items) ? ctx.items : [];
  const matches = [];
  for (const it of items){
    const name = String(it._id ?? it.name ?? '');
    const raw = String(it.expression ?? it.condition ?? '');
    try{
      const unwrapped = unwrapIsland(raw);
      if (unwrapped !== raw){ const val = evaluateExpression(unwrapped, buildEvalContext(initialContext, msg)); if (val) { matches.push(name); if (mode==='firstMatch') break; } continue; }
      if (!isTemplateLike(raw)){
        const lit = raw.trim().toLowerCase();
        if (lit === 'true') { matches.push(name); if (mode==='firstMatch') break; continue; }
        if (lit === '' || lit === 'false' || lit === '0') { continue; }
        const val = evaluateExpression(raw, buildEvalContext(initialContext, msg)); if (val) { matches.push(name); if (mode==='firstMatch') break; }
        continue;
      }
      const rendered = evaluateTemplateDetailed(raw, buildEvalContext(initialContext, msg)).text;
      if (isTruthyText(rendered)) { matches.push(name); if (mode==='firstMatch') break; }
    } catch(e){ log('condition error', { node: node.id, item: name, error: e.message }); }
  }
  if (matches.length) return mode === 'firstMatch' ? matches[0] : matches;
  const el = (ctx && ctx.else && ctx.else._id) ? ctx.else._id : (ctx && ctx.elseId ? ctx.elseId : null);
  return el ? (mode === 'allMatches' ? [String(el)] : String(el)) : null;
}

// Optionally, initialContext may provide an async getCredentials(node) => { values: object } | object | null
// options: { shouldCancel?: () => boolean }
async function runFlow(flow, initialContext = {}, initialMsg = {}, emit, options = {}){
  const { nodesById, outEdges, inEdges } = buildGraph(flow);
  if (nodesById.size === 0) throw new Error('Flow vide');
  const start = findStartNode(nodesById); if (!start) throw new Error('Nœud start introuvable');

  const send = async (ev) => { try { if (emit) await emit(ev); } catch { /* noop */ } };
  await send({ type: 'run.started', startedAt: new Date().toISOString() });
  const shouldCancel = typeof options.shouldCancel === 'function' ? options.shouldCancel : () => false;
  if (shouldCancel()) { await send({ type: 'run.cancelled', reason: 'user_request' }); throw new Error('__CANCELLED__'); }

  const runBranch = async (curId, msg, seen, branchId) => {
    if (shouldCancel()) throw new Error('__CANCELLED__');
    const node = nodesById.get(curId); if (!node) return;
    if (seen.has(curId)) return; seen.add(curId);
    const tObj = node.model?.templateObj || {};
    const kindFromName = normalizeNodeKind(tObj.nodeKind || tObj.name);
    const nType = kindFromName || normalizeNodeKind(tObj.type) || normalizeNodeKind(node.model?.nodeKind) || normalizeNodeKind(node.model?.type) || normalizeNodeKind(node.type);
    let rawKey = '';
    if (nType === 'function'){
      rawKey = node.model?.template || tObj?.template?.id || tObj?.template?.name || (String(tObj.id||'').toLowerCase() !== 'function' ? tObj.id : '') || node.model?.kind || node.model?.name || '';
    }
    const tmplKey = normalizeTemplateKey(rawKey);
    // Ensure structured logs under msg._nodes while keeping msg[nodeId] for result
    if (!msg._nodes || typeof msg._nodes !== 'object') msg._nodes = {};
    msg._nodes[node.id] = msg._nodes[node.id] || {};
    const nodeLog = msg._nodes[node.id];

    if (nType === 'start'){
      const msgBefore = JSON.parse(JSON.stringify(msg));
      nodeLog.start = new Date().toISOString();
      await send({ type: 'node.started', nodeId: node.id, branchId, startedAt: nodeLog.start, argsPre: node.model?.context || null, msgIn: msgBefore });
      // Start-like node: take current msg.payload as the node result and keep it in payload
      nodeLog.args_pre_compilation = node.model?.context || null;
      nodeLog.args_post_compilation = null;
      nodeLog.result = (msg && typeof msg.payload !== 'undefined') ? JSON.parse(JSON.stringify(msg.payload)) : null;
      // Expose trigger output under node id like functions for template access
      try { msg[node.id] = nodeLog.result; } catch {}
      // Ensure payload is set to the result value (form or external payload)
      try { msg.payload = (msg && typeof msg.payload !== 'undefined') ? msg.payload : null; } catch {}
      const msgAfter = JSON.parse(JSON.stringify(msg));
      nodeLog.end = new Date().toISOString(); nodeLog.duration = Date.parse(nodeLog.end) - Date.parse(nodeLog.start);
      try { console.log('[engine] start', { node: node.id, argsPre: nodeLog.args_pre_compilation, argsPost: nodeLog.args_post_compilation }); } catch {}
      await send({ type: 'node.done', nodeId: node.id, branchId, input: null, argsPre: nodeLog.args_pre_compilation, argsPost: nodeLog.args_post_compilation, result: nodeLog.result, startedAt: nodeLog.start, finishedAt: nodeLog.end, durationMs: nodeLog.duration, msgIn: msgBefore, msgOut: msgAfter });
    } else if (nType === 'condition'){
      const msgBefore = JSON.parse(JSON.stringify(msg));
      nodeLog.start = new Date().toISOString(); nodeLog.args_pre_compilation = node.model?.context || null;
      await send({ type: 'node.started', nodeId: node.id, branchId, startedAt: nodeLog.start, argsPre: nodeLog.args_pre_compilation, msgIn: msgBefore });
      const chosen = evaluateCondition(node, initialContext, msg);
      nodeLog.result = { chosen };
      // Keep payload unchanged for condition; still expose chosen under msg[nodeId]
      msg[node.id] = nodeLog.result;
      const msgAfter = JSON.parse(JSON.stringify(msg));
      nodeLog.end = new Date().toISOString(); nodeLog.duration = Date.parse(nodeLog.end) - Date.parse(nodeLog.start);
      try { console.log('[engine] condition', { node: node.id, chosen }); } catch {}
      await send({ type: 'node.done', nodeId: node.id, branchId, input: msgBefore.payload ?? null, argsPre: nodeLog.args_pre_compilation, argsPost: nodeLog.args_pre_compilation, result: nodeLog.result, startedAt: nodeLog.start, finishedAt: nodeLog.end, durationMs: nodeLog.duration, msgIn: msgBefore, msgOut: msgAfter });
      const outs = outEdges.get(node.id) || [];
      if (chosen != null){
        const picks = Array.isArray(chosen) ? chosen : [chosen];
        // Prefer v2 routing by sourceHandle id; no legacy label routing
        const targets = picks.map((pick, idx) => ({ next: outs.find(o => String(o.sourceHandle || '').trim() === String(pick)), idx })).filter(x => !!x.next).map(x => ({ target: x.next.target, idx: x.idx }));
        // Emit edges taken for visualization
        for (const t of targets){ await send({ type: 'edge.taken', sourceId: node.id, targetId: t.target }); }
        if (targets.length === 1) {
          await runBranch(targets[0].target, msg, seen, `${branchId}:${targets[0].idx}`);
        } else if (targets.length > 1) {
          await Promise.all(targets.map(t => runBranch(t.target, JSON.parse(JSON.stringify(msg)), new Set(seen), `${branchId}:${t.idx}`)));
        }
      }
      return;
    } else if (nType === 'loop'){
      const msgBefore = JSON.parse(JSON.stringify(msg));
      nodeLog.start = new Date().toISOString();
      nodeLog.args_pre_compilation = node.model?.context || null;
      await send({ type: 'node.started', nodeId: node.id, branchId, startedAt: nodeLog.start, argsPre: nodeLog.args_pre_compilation, msgIn: msgBefore });
      // Compile args
      const evalCtx = buildEvalContext(initialContext, msg);
      const compiled = deepRender(node.model?.context || {}, evalCtx) || {};
      // Normalize source mode; accept legacy values ('items' -> 'handle') and infer when misused
      const sourceModeRaw = String(compiled.sourceMode || 'payload');
      let sourceMode = sourceModeRaw.trim().toLowerCase(); // 'handle' | 'expression' | 'payload' | 'path'
      if (sourceMode === 'items' || sourceMode === 'handle_items') sourceMode = 'handle';
      // If user mistakenly entered a path in sourceMode (e.g., 'payload.sazaza'), infer path mode
      const looksLikePath = /[.\[]/.test(sourceModeRaw) && !/^\s*(handle|expression|payload|path)\s*$/.test(sourceModeRaw);
      if (looksLikePath && (!compiled.itemsPath || !String(compiled.itemsPath).trim())){
        compiled.itemsPath = sourceModeRaw.trim();
        sourceMode = 'path';
        try { console.log('[engine] loop:inferred.path', { node: node.id, from: sourceModeRaw, itemsPath: compiled.itemsPath }); } catch {}
      }
      const itemVar = String(compiled.itemVar || 'item');
      const indexVar = String(compiled.indexVar || 'index');
      // Coerce perItemPayload to boolean with safe defaults
      const perItemPayload = (compiled.perItemPayload === undefined)
        ? true
        : (compiled.perItemPayload === true || compiled.perItemPayload === 'true' || compiled.perItemPayload === 1 || compiled.perItemPayload === '1');
      const resultMode = String(compiled.resultMode || (compiled.collectResults ? 'collect' : 'collect'));
      const collectResults = resultMode === 'collect';
      const maxIterations = Number.isFinite(Number(compiled.maxIterations)) ? Math.max(0, Number(compiled.maxIterations)) : 1000;
      const elementExpr = compiled.elementExpr; // optional mapping expression/template applied to each item
      // Detect explicit source to avoid unintended fallbacks (also consider itemsArg)
      const hasItemsExprStr = (typeof compiled.itemsExpr === 'string') && compiled.itemsExpr.trim().length > 0;
      const hasItemsPathStr = (typeof compiled.itemsPath === 'string') && compiled.itemsPath.trim().length > 0;
      const hasItemsArgVal = (compiled.itemsArg !== undefined) && (typeof compiled.itemsArg !== 'string' || String(compiled.itemsArg).trim().length > 0);
      const explicitSource = (sourceMode === 'path' && hasItemsPathStr) || (sourceMode === 'expression' && hasItemsExprStr) || (sourceMode === 'handle') || hasItemsArgVal;
      try {
        console.log('[engine] loop:compiled', {
          node: node.id,
          sourceMode,
          hasItemsExpr: typeof compiled.itemsExpr === 'string' ? compiled.itemsExpr.trim().slice(0, 120) : (compiled.itemsExpr != null),
          perItemPayload,
          resultMode,
          maxIterations,
          explicitSource
        });
      } catch {}

      // Gather incoming results by target handle (similar to function case)
      const incoming = { byHandle: {}, flat: [] };
      try {
        const arr = inEdges.get(node.id) || [];
        for (const ie of arr){
          const srcId = ie.source; const res = msg && msg[srcId] ? msg[srcId] : undefined;
          if (res !== undefined){
            incoming.flat.push({ sourceId: srcId, sourceHandle: ie.sourceHandle, targetHandle: ie.targetHandle, result: res });
            const th = String(ie.targetHandle || '');
            if (!incoming.byHandle[th]) incoming.byHandle[th] = [];
            incoming.byHandle[th].push(res);
          }
        }
        try {
          const inCounts = Object.fromEntries(Object.entries(incoming.byHandle).map(([k,v]) => [k, Array.isArray(v) ? v.length : 0]));
          console.log('[engine] loop:incoming', { node: node.id, handles: inCounts });
        } catch {}
      } catch {}

      // Resolve collection
      let items = [];
      let resolvedFrom = 'none';
      try {
        if (sourceMode === 'handle'){
          const vals = incoming.byHandle['items'] || [];
          // Prefer first non-null; if value itself is an array, use it; else, if multiple arrays, flatten
          if (vals.length === 1){
            const v = vals[0];
            if (Array.isArray(v)) { items = v; resolvedFrom = 'handle:items'; }
            else if (typeof v === 'number' && Number.isFinite(v)) { items = Array.from({ length: Math.max(0, Math.floor(v)) }, (_, i) => i); resolvedFrom = 'handle:number'; }
            else if (v != null) { items = [v]; resolvedFrom = 'handle:value'; }
          } else if (vals.length > 1){
            const arrs = vals.filter(v => Array.isArray(v));
            if (arrs.length) { items = arrs.flat(); resolvedFrom = 'handle:arrays'; }
            else { items = vals.filter(v => v != null); resolvedFrom = 'handle:values'; }
          }
          try { console.log('[engine] loop:resolve.handle', { node: node.id, arrays: (incoming.byHandle['items']||[]).filter(Array.isArray).length, values: (incoming.byHandle['items']||[]).length }); } catch {}
        } else if (sourceMode === 'expression'){
          let v = compiled.itemsExpr;
          if (typeof v === 'string') {
            const rendered = renderTemplate(v, evalCtx);
            try { console.log('[engine] loop:resolve.expr', { node: node.id, expr: String(v).trim().slice(0,200), rendered: String(rendered).slice(0,200) }); } catch {}
            // If rendered looks like a path (no JSON brackets), try dotGet first
            if (rendered && typeof rendered === 'string' && !/^\s*\[/.test(rendered) && !/^\s*\{/.test(rendered)){
              const got = dotGet({ msg, payload: msg?.payload }, rendered.trim(), undefined);
              if (Array.isArray(got)) { items = got; resolvedFrom = 'expr:path'; }
              else if (got && typeof got === 'object') { items = Object.values(got); resolvedFrom = 'expr:path.objectValues'; }
              else { v = rendered; }
            } else {
              v = rendered;
            }
          }
          if ((!Array.isArray(items) || items.length === 0)){
            if (Array.isArray(v)) { items = v; resolvedFrom = 'expr:array'; }
            else if (typeof v === 'number' && Number.isFinite(v)) { items = Array.from({ length: Math.max(0, Math.floor(v)) }, (_, i) => i); resolvedFrom = 'expr:number'; }
            else if (typeof v === 'string'){
              // Try to parse JSON array
              try { const parsed = JSON.parse(v); if (Array.isArray(parsed)) { items = parsed; resolvedFrom = 'expr:json'; try { console.log('[engine] loop:resolve.expr.json', { node: node.id, length: parsed.length }); } catch {} } } catch {}
            }
          }
          // Explicit itemsPath support as fallback within expression mode
          if ((!Array.isArray(items) || items.length === 0) && typeof compiled.itemsPath === 'string' && compiled.itemsPath.trim()){
            const got = dotGet({ msg, payload: msg?.payload }, compiled.itemsPath.trim(), undefined);
            if (Array.isArray(got)) { items = got; resolvedFrom = 'expr:itemsPath'; }
            else if (got && typeof got === 'object') { items = Object.values(got); resolvedFrom = 'expr:itemsPath.objectValues'; }
          }
        } else if (sourceMode === 'path'){
          const p = typeof compiled.itemsPath === 'string' ? compiled.itemsPath.trim() : '';
          const got = p ? dotGet({ msg, payload: msg?.payload }, p, undefined) : undefined;
          if (Array.isArray(got)) { items = got; resolvedFrom = 'path'; }
          else if (got && typeof got === 'object') { items = Object.values(got); resolvedFrom = 'path.objectValues'; }
        } else { // payload
          const v = msg && msg.payload;
          if (Array.isArray(v)) { items = v; resolvedFrom = 'payload'; }
          else if (typeof v === 'number' && Number.isFinite(v)) { items = Array.from({ length: Math.max(0, Math.floor(v)) }, (_, i) => i); resolvedFrom = 'payload:number'; }
          try { const t = v == null ? 'null' : (Array.isArray(v) ? 'array' : typeof v); console.log('[engine] loop:resolve.payload', { node: node.id, type: t, length: Array.isArray(v) ? v.length : undefined }); } catch {}
        }
        // New: if still unresolved, honor itemsArg as unified argument (array/object/number/path string/JSON string)
        if ((!Array.isArray(items) || items.length === 0) && hasItemsArgVal){
          try {
            let arg = compiled.itemsArg;
            if (typeof arg === 'string'){
              const rendered = renderTemplate(arg, evalCtx);
              const s = String(rendered || '').trim();
              try { console.log('[engine] loop:resolve.arg', { node: node.id, raw: String(arg).slice(0,200), rendered: s.slice(0,200) }); } catch {}
              if (/^\[|^\{/.test(s)){
                try { const parsed = JSON.parse(s); if (Array.isArray(parsed)) { items = parsed; resolvedFrom = 'arg:json'; } else if (parsed && typeof parsed === 'object') { items = Object.values(parsed); resolvedFrom = 'arg:json.objectValues'; } } catch {}
              }
              if ((!Array.isArray(items) || items.length === 0)){
                const got = dotGet({ msg, payload: msg?.payload }, s, undefined);
                if (Array.isArray(got)) { items = got; resolvedFrom = 'arg:path'; }
                else if (got && typeof got === 'object') { items = Object.values(got); resolvedFrom = 'arg:path.objectValues'; }
                else if (typeof got === 'number' && Number.isFinite(got)) { items = Array.from({ length: Math.max(0, Math.floor(got)) }, (_, i) => i); resolvedFrom = 'arg:number'; }
              }
            } else if (Array.isArray(arg)) { items = arg; resolvedFrom = 'arg:array'; }
            else if (arg && typeof arg === 'object') { items = Object.values(arg); resolvedFrom = 'arg:objectValues'; }
            else if (typeof arg === 'number' && Number.isFinite(arg)) { items = Array.from({ length: Math.max(0, Math.floor(arg)) }, (_, i) => i); resolvedFrom = 'arg:number'; }
          } catch {}
        }
      } catch {}
      // Fallback: only if no explicit source requested
      try {
        if ((!Array.isArray(items) || items.length === 0) && !explicitSource && msg && msg.payload && Array.isArray(msg.payload.items)){
          items = msg.payload.items;
          resolvedFrom = 'payload.items';
          try { console.log('[engine] loop:fallback.payload.items', { node: node.id, length: items.length }); } catch {}
        }
      } catch {}
      if (!Array.isArray(items)) items = [];
      if (Number.isFinite(maxIterations) && items.length > maxIterations) items = items.slice(0, maxIterations);
      try { console.log('[engine] loop:resolved', { node: node.id, from: resolvedFrom, length: items.length, sample: items.slice(0, Math.min(3, items.length)) }); } catch {}

      // Find outputs
      const outs = outEdges.get(node.id) || [];
      const outEach = outs.find(o => String(o.sourceHandle || '') === 'each') || outs[0] || null;
      const outAfter = outs.find(o => String(o.sourceHandle || '') === 'after') || (outs.length > 1 ? outs[1] : null);

      const results = [];
      let lastPayload = undefined;
      // Re-entry guard: prevent body sub-run from revisiting this loop node (cycles)
      const reentrySeen = new Set();
      try { reentrySeen.add(node.id); } catch {}
      let i = 0;
      for (const rawItem of items){
        if (shouldCancel()) throw new Error('__CANCELLED__');
        if (!outEach) break; // nothing to iterate into
        // Prepare iteration message
        const msgClone = JSON.parse(JSON.stringify(msg));
        const iter = { item: rawItem, index: i, length: items.length };
        try { msgClone.loop = iter; } catch {}
        // Optionally map element through elementExpr (only if non-empty string or {$expr})
        let mapped = rawItem;
        try {
          const hasStringExpr = (typeof elementExpr === 'string') && elementExpr.trim().length > 0;
          const hasExprObj = (elementExpr && typeof elementExpr === 'object' && typeof elementExpr.$expr === 'string');
          if (hasStringExpr || hasExprObj){
            const mappedCtx = buildEvalContext(initialContext, msgClone);
            if (hasStringExpr) mapped = renderTemplate(String(elementExpr), mappedCtx);
            else if (hasExprObj) mapped = evaluateExpression(elementExpr.$expr, mappedCtx);
            try { console.log('[engine] loop:map', { node: node.id, index: i, fromType: typeof rawItem, toType: typeof mapped }); } catch {}
          }
        } catch {}
        // Expose item/index under msg.loop and optionally payload
        try { msgClone.loop[itemVar] = mapped; } catch {}
        try { msgClone.loop[indexVar] = i; } catch {}
        if (perItemPayload) {
          try { msgClone.payload = (mapped && typeof mapped === 'object') ? JSON.parse(JSON.stringify(mapped)) : mapped; } catch { msgClone.payload = mapped; }
          try {
            const t = mapped == null ? 'null' : (Array.isArray(mapped) ? 'array' : typeof mapped);
            const keys = (mapped && typeof mapped === 'object' && !Array.isArray(mapped)) ? Object.keys(mapped).slice(0,5) : undefined;
            console.log('[engine] loop:iter.payload', { node: node.id, index: i, type: t, keys });
          } catch {}
        }
        try { if (i < 10) console.log('[engine] loop:iter.start', { node: node.id, index: i }); } catch {}
        await send({ type: 'edge.taken', sourceId: node.id, targetId: outEach.target });
        // Use a seen set that already contains the current loop node to prevent re-entry/cycles
        await runBranch(outEach.target, msgClone, new Set(reentrySeen), `${branchId}:each:${i}`);
        try { if (i < 10) console.log('[engine] loop:iter.done', { node: node.id, index: i }); } catch {}
        try { lastPayload = JSON.parse(JSON.stringify(msgClone.payload)); } catch { lastPayload = msgClone.payload; }
        if (collectResults) results.push(lastPayload);
        i++;
      }

      // Record node result and finalize payload
      nodeLog.result = { count: items.length, collected: collectResults ? results.length : undefined };
      if (collectResults) { try { msg.payload = results; } catch {} }
      else if (resultMode === 'last') { try { msg.payload = lastPayload; } catch {} }
      const msgAfter = JSON.parse(JSON.stringify(msg));
      nodeLog.end = new Date().toISOString(); nodeLog.duration = Date.parse(nodeLog.end) - Date.parse(nodeLog.start);
      try { console.log('[engine] loop:done', { node: node.id, count: items.length, resultMode, collected: collectResults ? results.length : undefined }); } catch {}
      await send({ type: 'node.done', nodeId: node.id, branchId, input: msgBefore.payload ?? null, argsPre: nodeLog.args_pre_compilation, argsPost: compiled, result: nodeLog.result, startedAt: nodeLog.start, finishedAt: nodeLog.end, durationMs: nodeLog.duration, msgIn: msgBefore, msgOut: msgAfter });

      // Route to 'after' once
      if (outAfter){
        await send({ type: 'edge.taken', sourceId: node.id, targetId: outAfter.target });
        await runBranch(outAfter.target, msg, seen, `${branchId}:after`);
      }
      return;
    } else if (nType === 'function' || nType === 'agent' || nType === 'tool' || nType === 'tool_ai' || nType === 'memory'){
      const msgBefore = JSON.parse(JSON.stringify(msg));
      nodeLog.start = new Date().toISOString(); nodeLog.args_pre_compilation = node.model?.context || null;
      const evalCtx = buildEvalContext(initialContext, msg);
      const compiled = deepRender(node.model?.context || {}, evalCtx);
      // Function inputs are derived strictly from compiled args (no implicit merge of msg.payload)
      let inputs = compiled;
      nodeLog.args_post_compilation = inputs;
      // Emit started with full computed input
      await send({ type: 'node.started', nodeId: node.id, branchId, startedAt: nodeLog.start, argsPre: nodeLog.args_pre_compilation, argsPost: nodeLog.args_post_compilation, input: inputs, templateKey: tmplKey, kind: 'function', msgIn: msgBefore });
      const fn = registry.resolve(tmplKey) || builtinRegistry[tmplKey]; let result = null;
      try { console.log('[engine] call', { node: node.id, template: tmplKey, inputs }); } catch {}
      if (!fn) { result = { error: `No handler for template '${tmplKey}'` }; }
      else {
        // Inject credentials if a resolver is provided via initialContext; never expose them in events/logs
        let inputsForFn = inputs;
        let metaForFn = undefined;
        try {
          const getter = initialContext && typeof initialContext.getCredentials === 'function' ? initialContext.getCredentials : null;
          if (getter){
            const creds = await getter(node);
            if (creds && typeof creds === 'object'){
              // Provide only decrypted values to the handler via opts (4th arg)
              const values = (creds && creds.values != null) ? creds.values : creds;
              metaForFn = { credentials: values };
            }
          }
        } catch {}
        // Gather incoming results by target handle id (v2 graph)
        try {
          const incoming = { byHandle: {}, flat: [] };
          const arr = inEdges.get(node.id) || [];
          for (const ie of arr){
            const srcId = ie.source; const res = msg && msg[srcId] ? msg[srcId] : undefined;
            if (res !== undefined){
              incoming.flat.push({ sourceId: srcId, sourceHandle: ie.sourceHandle, targetHandle: ie.targetHandle, result: res });
              const th = String(ie.targetHandle || '');
              if (!incoming.byHandle[th]) incoming.byHandle[th] = [];
              incoming.byHandle[th].push(res);
            }
          }
          metaForFn = { ...(metaForFn || {}), incoming };
        } catch {}
        try {
          try { console.log('[engine] fn opts', { node: node.id, hasCredentials: !!metaForFn }); } catch {}
          result = await fn({ id: node.id, model: node.model }, msg, inputsForFn, metaForFn);
        } catch (e) { result = { error: (e && e.message) ? e.message : String(e) }; }
      }
      // Store function result under msg[nodeId] and mirror to payload
      const isError = !!(result && typeof result === 'object' && (result.ok === false || result.error != null));
      nodeLog.error = isError ? (result && result.error ? String(result.error) : 'error') : undefined;
      nodeLog.result = result;
      msg[node.id] = result;
      msg.payload = result;
      const msgAfter = JSON.parse(JSON.stringify(msg));
      nodeLog.end = new Date().toISOString(); nodeLog.duration = Date.parse(nodeLog.end) - Date.parse(nodeLog.start);
      await send({ type: 'node.done', nodeId: node.id, branchId, input: msgBefore.payload ?? null, argsPre: nodeLog.args_pre_compilation, argsPost: nodeLog.args_post_compilation, result, startedAt: nodeLog.start, finishedAt: nodeLog.end, durationMs: nodeLog.duration, msgIn: msgBefore, msgOut: msgAfter });
    } else {
      await send({ type: 'node.skipped', nodeId: node.id, branchId });
    }
    if (shouldCancel()) throw new Error('__CANCELLED__');
    const outs = outEdges.get(curId) || [];
    let nextOuts = outs;
    const err = nodeLog && nodeLog.error ? String(nodeLog.error) : '';
    if (err) {
      if (node?.model?.skip_error) return;
      if (node?.model?.catch_error) {
        const errOuts = outs.filter(o => {
          const h = String(o.sourceHandle || '').toLowerCase();
          return h === 'err' || h === 'error';
        });
        if (errOuts.length) nextOuts = errOuts;
        else return;
      } else {
        throw new Error(err);
      }
    } else {
      const okOuts = outs.filter(o => {
        const h = String(o.sourceHandle || '').toLowerCase();
        return h !== 'err' && h !== 'error';
      });
      if (okOuts.length) nextOuts = okOuts;
    }
    if (nextOuts.length === 1){
      await send({ type: 'edge.taken', sourceId: node.id, targetId: nextOuts[0].target });
      await runBranch(nextOuts[0].target, msg, seen, `${branchId}:0`);
    } else if (nextOuts.length > 1){
      for (let i=0;i<nextOuts.length;i++){ const o = nextOuts[i]; await send({ type: 'edge.taken', sourceId: node.id, targetId: o.target }); }
      await Promise.all(nextOuts.map((o,i) => runBranch(o.target, JSON.parse(JSON.stringify(msg)), new Set(seen), `${branchId}:${i}`)));
    }
  };

  const rootMsg = { payload: null, ...initialMsg };
  await runBranch(start.id, rootMsg, new Set(), 'b0');
  await send({ type: 'run.completed', payload: rootMsg.payload });
  return rootMsg;
}

module.exports = { runFlow };
