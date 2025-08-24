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
function deepRender(obj, evalCtx){ if (obj == null) return obj; if (typeof obj === 'string') return renderTemplate(obj, evalCtx); if (Array.isArray(obj)) return obj.map(v=>deepRender(v, evalCtx)); if (typeof obj === 'object'){ const out={}; for (const [k,v] of Object.entries(obj)) out[k]=deepRender(v, evalCtx); return out; } return obj; }

const builtinRegistry = {
  action: async (node, msg, inputs) => ({ ok: true, echo: inputs }),
  sendmail: async (node, msg, inputs) => ({ deliveredTo: inputs.to || null, subject: inputs.subject || null }),
  pdf: async (node, msg, inputs) => ({ pdfGenerated: true, meta: { nodeId: node.id } }),
};

function buildGraph(flow){ const nodesById = new Map(); const outEdges = new Map(); for (const n of (flow.nodes||[])){ n.model = n.data?.model || n.model || n.data || {}; nodesById.set(n.id, n); outEdges.set(n.id, []); } for (const e of (flow.edges||[])){ const src = e.source, tgt = e.target; if (!nodesById.has(src) || !nodesById.has(tgt)) continue; const labelText = e.edgeLabels?.center?.data?.text ?? e.label ?? ''; outEdges.get(src).push({ target: tgt, labelText: String(labelText).trim(), sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }); } return { nodesById, outEdges }; }
function findStartNode(nodesById){ for (const n of nodesById.values()){ const tObj = n.model?.templateObj || {}; const kindFromName = normalizeNodeKind(tObj.name); const nType = kindFromName || normalizeNodeKind(tObj.type) || normalizeNodeKind(n.model?.type) || normalizeNodeKind(n.type); if (nType === 'start') return n; } for (const n of nodesById.values()){ if (String(n.id).toLowerCase().includes('start')) return n; } return [...nodesById.values()][0] || null; }

function evaluateCondition(node, initialContext, msg){ const items = node.model?.context?.items || []; for (const it of items){ const name = String(it.name ?? ''); const raw = String(it.condition ?? ''); try{ const unwrapped = unwrapIsland(raw); if (unwrapped !== raw){ const val = evaluateExpression(unwrapped, buildEvalContext(initialContext, msg)); if (val) return name; continue; } if (!isTemplateLike(raw)){ const lit = raw.trim().toLowerCase(); if (lit === 'true') return name; if (lit === '' || lit === 'false' || lit === '0'){} else { const val = evaluateExpression(raw, buildEvalContext(initialContext, msg)); if (val) return name; } continue; } const rendered = evaluateTemplateDetailed(raw, buildEvalContext(initialContext, msg)).text; if (isTruthyText(rendered)) return name; } catch(e){ log('condition error', { node: node.id, item: name, error: e.message }); } } return null; }

async function runFlow(flow, initialContext = {}, initialMsg = {}, emit){
  const { nodesById, outEdges } = buildGraph(flow);
  if (nodesById.size === 0) throw new Error('Flow vide');
  const msg = { payload: null, ...initialMsg };
  const start = findStartNode(nodesById); if (!start) throw new Error('Nœud start introuvable');
  const queue = [start.id]; const visited = new Set();

  const send = (ev) => { try { emit && emit(ev); } catch { /* noop */ } };
  send({ type: 'run.started' });

  while (queue.length){
    const curId = queue.shift(); const node = nodesById.get(curId); if (!node) continue;
    if (visited.has(curId)) continue; visited.add(curId);
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
      const evalCtx = buildEvalContext(initialContext, msg);
      nodeLog.args_pre_compilation = node.model?.context || null;
      nodeLog.args_post_compilation = deepRender(node.model?.context || {}, evalCtx) || null;
      nodeLog.result = { started: true };
      nodeLog.end = new Date().toISOString(); nodeLog.duration = Date.parse(nodeLog.end) - Date.parse(nodeLog.start);
      send({ type: 'node.done', nodeId: node.id, result: nodeLog.result });
    } else if (nType === 'condition'){
      nodeLog.start = new Date().toISOString(); nodeLog.args_pre_compilation = node.model?.context || null;
      const chosen = evaluateCondition(node, initialContext, msg);
      nodeLog.result = { chosen }; nodeLog.end = new Date().toISOString(); nodeLog.duration = Date.parse(nodeLog.end) - Date.parse(nodeLog.start);
      send({ type: 'node.done', nodeId: node.id, result: nodeLog.result });
      const outs = outEdges.get(node.id) || []; if (chosen != null){ const next = outs.find(o => o.labelText === String(chosen)); if (next) queue.push(next.target); }
      continue;
    } else if (nType === 'function'){
      nodeLog.start = new Date().toISOString(); nodeLog.args_pre_compilation = node.model?.context || null;
      const evalCtx = buildEvalContext(initialContext, msg); const inputs = deepRender(node.model?.context || {}, evalCtx); nodeLog.args_post_compilation = inputs;
      const fn = registry.resolve(tmplKey) || builtinRegistry[tmplKey]; let result = null;
      if (!fn) { result = { error: `No handler for template '${tmplKey}'` }; }
      else { try { result = await fn({ id: node.id, model: node.model }, msg, inputs); } catch (e) { result = { error: (e && e.message) ? e.message : String(e) }; } }
      nodeLog.result = result; msg.payload = result; nodeLog.end = new Date().toISOString(); nodeLog.duration = Date.parse(nodeLog.end) - Date.parse(nodeLog.start);
      send({ type: 'node.done', nodeId: node.id, result });
    } else {
      send({ type: 'node.skipped', nodeId: node.id });
    }
    const outs = outEdges.get(curId) || []; for (const o of outs) queue.push(o.target);
  }
  send({ type: 'run.completed', payload: msg.payload });
  return msg;
}

module.exports = { runFlow };
