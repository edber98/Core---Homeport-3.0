// Engine minimal adapted from provided example; emits events to a callback
const { evaluateTemplateDetailed, evaluateExpression } = require('./expression-sandbox');
const { registry } = require('../plugins/registry');

function log(step, data) { const payload = data === undefined ? '' : (typeof data === 'string' ? data : JSON.stringify(data)); console.log(`[engine] ${step} ${payload}`); }

function normalizeNodeKind(nameOrType=''){ const s = String(nameOrType||'').trim().toLowerCase(); if (s==='start') return 'start'; if (s==='condition') return 'condition'; if (s==='function') return 'function'; return ''; }
function normalizeTemplateKey(k){ if (!k) return ''; let s = String(k).trim().toLowerCase(); s = s.replace(/^tmpl_/,'').replace(/^template_/,'').replace(/^fn_/,'').replace(/^node_/,''); s = s.replace(/[^a-z0-9_]/g,'_'); return s; }

function unwrapIsland(expr){ if (typeof expr !== 'string') return expr; const m = expr.match(/^\s*\{\{\s*([\s\S]*?)\s*\}\}\s*$/); return m ? m[1] : expr; }
function isTemplateLike(s){ return typeof s === 'string' && /\{\{[\s\S]*?\}\}/.test(s); }
function isTruthyText(s){ if (s == null) return false; const t = String(s).trim(); if (t === '') return false; const low = t.toLowerCase(); if (low==='false'||low==='0'||low==='null'||low==='undefined'||low==='nan') return false; return true; }
function buildEvalContext(initialContext, msg){ return { ...initialContext, msg, payload: msg.payload }; }
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

const builtinRegistry = {
  action: async (node, msg, inputs) => ({ ok: true, echo: inputs }),
  sendmail: async (node, msg, inputs) => ({ deliveredTo: inputs.to || null, subject: inputs.subject || null }),
  pdf: async (node, msg, inputs) => ({ pdfGenerated: true, meta: { nodeId: node.id } }),
};

function buildGraph(flow){ const nodesById = new Map(); const outEdges = new Map(); for (const n of (flow.nodes||[])){ n.model = n.data?.model || n.model || n.data || {}; nodesById.set(n.id, n); outEdges.set(n.id, []); } for (const e of (flow.edges||[])){ const src = e.source, tgt = e.target; if (!nodesById.has(src) || !nodesById.has(tgt)) continue; const labelText = e.edgeLabels?.center?.data?.text ?? e.label ?? ''; outEdges.get(src).push({ target: tgt, labelText: String(labelText).trim(), sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }); } return { nodesById, outEdges }; }
function findStartNode(nodesById){ for (const n of nodesById.values()){ const tObj = n.model?.templateObj || {}; const kindFromName = normalizeNodeKind(tObj.name); const nType = kindFromName || normalizeNodeKind(tObj.type) || normalizeNodeKind(n.model?.type) || normalizeNodeKind(n.type); if (nType === 'start') return n; } for (const n of nodesById.values()){ if (String(n.id).toLowerCase().includes('start')) return n; } return [...nodesById.values()][0] || null; }

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

async function runFlow(flow, initialContext = {}, initialMsg = {}, emit){
  const { nodesById, outEdges } = buildGraph(flow);
  if (nodesById.size === 0) throw new Error('Flow vide');
  const start = findStartNode(nodesById); if (!start) throw new Error('Nœud start introuvable');

  const send = async (ev) => { try { if (emit) await emit(ev); } catch { /* noop */ } };
  await send({ type: 'run.started', startedAt: new Date().toISOString() });

  const runBranch = async (curId, msg, seen, branchId) => {
    const node = nodesById.get(curId); if (!node) return;
    if (seen.has(curId)) return; seen.add(curId);
    const tObj = node.model?.templateObj || {};
    const kindFromName = normalizeNodeKind(tObj.name);
    const nType = kindFromName || normalizeNodeKind(tObj.type) || normalizeNodeKind(node.model?.type) || normalizeNodeKind(node.type);
    let rawKey = '';
    if (nType === 'function'){
      rawKey = node.model?.template || tObj?.template?.id || tObj?.template?.name || (String(tObj.id||'').toLowerCase() !== 'function' ? tObj.id : '') || node.model?.kind || node.model?.name || '';
    }
    const tmplKey = normalizeTemplateKey(rawKey);
    msg[node.id] = msg[node.id] || {}; const nodeLog = msg[node.id];

    if (nType === 'start'){
      nodeLog.start = new Date().toISOString();
      await send({ type: 'node.started', nodeId: node.id, branchId, startedAt: nodeLog.start, argsPre: node.model?.context || null });
      const evalCtx = buildEvalContext(initialContext, msg);
      nodeLog.args_pre_compilation = node.model?.context || null;
      nodeLog.args_post_compilation = deepRender(node.model?.context || {}, evalCtx) || null;
      nodeLog.result = { started: true };
      nodeLog.end = new Date().toISOString(); nodeLog.duration = Date.parse(nodeLog.end) - Date.parse(nodeLog.start);
      try { console.log('[engine] start', { node: node.id, argsPre: nodeLog.args_pre_compilation, argsPost: nodeLog.args_post_compilation }); } catch {}
      await send({ type: 'node.done', nodeId: node.id, branchId, input: msg.payload ?? null, argsPre: nodeLog.args_pre_compilation, argsPost: nodeLog.args_post_compilation, result: nodeLog.result, startedAt: nodeLog.start, finishedAt: nodeLog.end, durationMs: nodeLog.duration });
    } else if (nType === 'condition'){
      nodeLog.start = new Date().toISOString(); nodeLog.args_pre_compilation = node.model?.context || null;
      await send({ type: 'node.started', nodeId: node.id, branchId, startedAt: nodeLog.start, argsPre: nodeLog.args_pre_compilation });
      const chosen = evaluateCondition(node, initialContext, msg);
      nodeLog.result = { chosen }; nodeLog.end = new Date().toISOString(); nodeLog.duration = Date.parse(nodeLog.end) - Date.parse(nodeLog.start);
      try { console.log('[engine] condition', { node: node.id, chosen }); } catch {}
      await send({ type: 'node.done', nodeId: node.id, branchId, input: msg.payload ?? null, argsPre: nodeLog.args_pre_compilation, argsPost: nodeLog.args_pre_compilation, result: nodeLog.result, startedAt: nodeLog.start, finishedAt: nodeLog.end, durationMs: nodeLog.duration });
      const outs = outEdges.get(node.id) || [];
      if (chosen != null){
        const picks = Array.isArray(chosen) ? chosen : [chosen];
        const targets = picks.map((pick, idx) => ({ next: outs.find(o => o.labelText === String(pick)), idx })).filter(x => !!x.next).map(x => ({ target: x.next.target, idx: x.idx }));
        // Emit edges taken for visualization
        for (const t of targets){ await send({ type: 'edge.taken', sourceId: node.id, targetId: t.target }); }
        if (targets.length === 1) {
          await runBranch(targets[0].target, msg, seen, `${branchId}:${targets[0].idx}`);
        } else if (targets.length > 1) {
          await Promise.all(targets.map(t => runBranch(t.target, JSON.parse(JSON.stringify(msg)), new Set(seen), `${branchId}:${t.idx}`)));
        }
      }
      return;
    } else if (nType === 'function'){
      nodeLog.start = new Date().toISOString(); nodeLog.args_pre_compilation = node.model?.context || null;
      await send({ type: 'node.started', nodeId: node.id, branchId, startedAt: nodeLog.start, argsPre: nodeLog.args_pre_compilation, templateKey: tmplKey, kind: 'function' });
      const evalCtx = buildEvalContext(initialContext, msg);
      const compiled = deepRender(node.model?.context || {}, evalCtx);
      let inputs = compiled;
      try {
        if (compiled && typeof compiled === 'object' && !Array.isArray(compiled) && msg && typeof msg.payload === 'object' && !Array.isArray(msg.payload)){
          inputs = { ...(msg.payload || {}), ...(compiled || {}) };
        }
      } catch {}
      nodeLog.args_post_compilation = inputs;
      const fn = registry.resolve(tmplKey) || builtinRegistry[tmplKey]; let result = null;
      try { console.log('[engine] call', { node: node.id, template: tmplKey, inputs }); } catch {}
      if (!fn) { result = { error: `No handler for template '${tmplKey}'` }; }
      else { try { result = await fn({ id: node.id, model: node.model }, msg, inputs); } catch (e) { result = { error: (e && e.message) ? e.message : String(e) }; } }
      nodeLog.result = result; msg.payload = result; nodeLog.end = new Date().toISOString(); nodeLog.duration = Date.parse(nodeLog.end) - Date.parse(nodeLog.start);
      await send({ type: 'node.done', nodeId: node.id, branchId, input: msg.payload ?? null, argsPre: nodeLog.args_pre_compilation, argsPost: nodeLog.args_post_compilation, result, startedAt: nodeLog.start, finishedAt: nodeLog.end, durationMs: nodeLog.duration });
    } else {
      await send({ type: 'node.skipped', nodeId: node.id, branchId });
    }
    const outs = outEdges.get(curId) || [];
    if (outs.length === 1){
      await send({ type: 'edge.taken', sourceId: node.id, targetId: outs[0].target });
      await runBranch(outs[0].target, msg, seen, `${branchId}:0`);
    } else if (outs.length > 1){
      for (let i=0;i<outs.length;i++){ const o = outs[i]; await send({ type: 'edge.taken', sourceId: node.id, targetId: o.target }); }
      await Promise.all(outs.map((o,i) => runBranch(o.target, JSON.parse(JSON.stringify(msg)), new Set(seen), `${branchId}:${i}`)));
    }
  };

  const rootMsg = { payload: null, ...initialMsg };
  await runBranch(start.id, rootMsg, new Set(), 'b0');
  await send({ type: 'run.completed', payload: rootMsg.payload });
  return rootMsg;
}

module.exports = { runFlow };
