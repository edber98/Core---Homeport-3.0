
function normalizeNodeKind(nameOrType=''){
  const s = String(nameOrType||'').trim().toLowerCase();
  if (s==='start' || s==='start_form') return 'start';
  if (s==='event') return 'event';
  if (s==='endpoint') return 'event'; // treat endpoint as event-like trigger
  if (s==='condition') return 'condition';
  if (s==='function') return 'function';
  if (s==='end') return 'end';
  if (s==='loop') return 'loop';
  if (s==='flow') return 'flow';
  return '';
}
function normalizeTemplateKey(k){ if (!k) return ''; let s = String(k).trim().toLowerCase(); s = s.replace(/^tmpl_/,'').replace(/^template_/,'').replace(/^fn_/,'').replace(/^node_/,''); s = s.replace(/[^a-z0-9_]/g,'_'); return s; }

function get(obj, path, def){
  try {
    if (!path) return def;
    const parts = String(path).split('.');
    let v = obj;
    for (const p of parts){ if (v == null) return def; v = v[p]; }
    return (v === undefined) ? def : v;
  } catch { return def; }
}

// Minimal JSON-Logic evaluator for visibleIf/requiredIf
function evalLogic(expr, data){
  try {
    if (expr == null) return false;
    if (typeof expr !== 'object') return expr;
    if (Array.isArray(expr)) return expr.map(e => evalLogic(e, data));
    const op = Object.keys(expr)[0];
    const arg = expr[op];
    switch (op) {
      case 'var': return get(data, arg, null);
      case '==': return (evalLogic(arg[0], data) ?? null) == (evalLogic(arg[1], data) ?? null);
      case '===': return (evalLogic(arg[0], data)) === (evalLogic(arg[1], data));
      case '!=': return (evalLogic(arg[0], data) ?? null) != (evalLogic(arg[1], data) ?? null);
      case '>': return Number(evalLogic(arg[0], data)) > Number(evalLogic(arg[1], data));
      case '>=': return Number(evalLogic(arg[0], data)) >= Number(evalLogic(arg[1], data));
      case '<': return Number(evalLogic(arg[0], data)) < Number(evalLogic(arg[1], data));
      case '<=': return Number(evalLogic(arg[0], data)) <= Number(evalLogic(arg[1], data));
      case '!': return !Boolean(evalLogic(arg, data));
      case 'and': return (arg || []).every((e) => Boolean(evalLogic(e, data)));
      case 'or': return (arg || []).some((e) => Boolean(evalLogic(e, data)));
      case 'in': {
        const v = evalLogic(arg[0], data);
        const arr = evalLogic(arg[1], data);
        if (typeof arr === 'string') return String(arr).includes(String(v));
        if (Array.isArray(arr)) return arr.includes(v);
        return false;
      }
      default: return false;
    }
  } catch { return false; }
}

function isEmptyValue(v){
  if (v == null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function collectGraph(flow){
  const nodes = flow.nodes || flow.graph?.nodes || [];
  const edges = flow.edges || flow.graph?.edges || [];
  const nodesById = new Map();
  for (const n of nodes){ const model = n.data?.model || n.model || n.data || {}; nodesById.set(n.id, { ...n, model }); }
  return { nodes, edges, nodesById };
}

async function validateFlowGraph(flowGraph, { strict=false, loaders } = {}){
  const errors = [];
  const warnings = [];
  const { nodes, edges, nodesById } = collectGraph(flowGraph);
  // Normalize nodes so downstream logic can consistently read n.model.*
  const nNodes = (nodes || []).map(n => ({ ...n, model: (n && (n.data && n.data.model)) ? n.data.model : (n.model || n.data || {}) }));

  // 1) Start nodes
  const kinds = nNodes.map(n => ({ id: n.id, kind: normalizeNodeKind(n.model?.templateObj?.type) || normalizeNodeKind(n.model?.type) || normalizeNodeKind(n.type) || normalizeNodeKind(n.model?.templateObj?.name) }));
  // Accept both 'start' and 'event' nodes as valid triggers
  const starts = kinds.filter(k => k.kind === 'start' || k.kind === 'event');
  if (starts.length === 0) errors.push({ code: 'no_start', message: 'No start node found' });
  if (starts.length > 1) errors.push({ code: 'multiple_starts', message: 'Multiple start nodes' });

  // 2) Edges reference
  for (const e of edges){ if (!nodesById.has(e.source) || !nodesById.has(e.target)) errors.push({ code: 'edge_invalid', message: 'Edge references unknown node', details: { edge: e.id } }); }

  // 3) Templates exist; (args validation by JSON Schema removed — args are form schemas)
  const getTemplateByKey = loaders?.getTemplateByKey;
  const getProviderByKey = loaders?.getProviderByKey;
  const hasCredential = loaders?.hasCredential;
  for (const n of nNodes){
    const kind = normalizeNodeKind(n.model?.templateObj?.type) || normalizeNodeKind(n.model?.type) || normalizeNodeKind(n.type) || normalizeNodeKind(n.model?.templateObj?.name);
    // Start nodes are core triggers; do not require a registered template, no args/credentials validation
    if (kind === 'start') continue;
    if (kind === 'function' || kind === 'event' || kind === 'flow' || kind === 'condition' || kind === 'loop'){
      const rawKey = n.model?.template || n.model?.templateObj?.template?.id || n.model?.templateObj?.id || n.model?.name || '';
      const key = normalizeTemplateKey(rawKey);
      if (getTemplateByKey){
        const tpl = await getTemplateByKey(key);
        if (!tpl){
          (strict ? errors : warnings).push({ code: 'template_unknown', message: `Unknown template '${key}'`, details: { nodeId: n.id } });
        }
      }
      // Validate node args against template schema (required/visible)
      try {
        const schema = n.model?.templateObj?.args || null;
        const fields = Array.isArray(schema?.fields) ? schema.fields : [];
        const ctx = n.model?.context || {};
        for (const f of fields){
          const visible = f?.visibleIf ? !!evalLogic(f.visibleIf, ctx) : true;
          if (!visible) continue;
          const reqByValidator = Array.isArray(f?.validators) ? f.validators.some(v => (v && (v.type === 'required' || v.name === 'required'))) : false;
          const reqByFlag = !!f?.required;
          const reqByCond = f?.requiredIf ? !!evalLogic(f.requiredIf, ctx) : false;
          const required = reqByValidator || reqByFlag || reqByCond;
          if (required){
            const val = ctx?.[f.key];
            if (isEmptyValue(val)) errors.push({ code: 'field_required', message: `Required field missing: ${f.key}`, details: { nodeId: n.id, field: f.key } });
          }
        }
      } catch {}
      // Credentials requirement
      try {
        const tpl = n.model?.templateObj || {};
        const providerKey = tpl.providerKey || null;
        const allowWithout = !!tpl.allowWithoutCredentials;
        if (providerKey && hasCredential && getProviderByKey){
          const provider = await getProviderByKey(providerKey);
          const needsCreds = !!(provider && provider.hasCredentials);
          if (needsCreds && !allowWithout){
            const ok = await hasCredential(providerKey);
            if (!ok) errors.push({ code: 'credential_missing', message: `Missing credentials for provider '${providerKey}'`, details: { nodeId: n.id, providerKey } });
          }
        }
      } catch {}
    }
  }

  // 4) Allowed templates (workspace policy)
  if (loaders?.isTemplateAllowed) {
    for (const n of nNodes){
      const kind = normalizeNodeKind(n.model?.templateObj?.type) || normalizeNodeKind(n.model?.type) || normalizeNodeKind(n.type) || normalizeNodeKind(n.model?.templateObj?.name);
      if (kind === 'function'){
        const rawKey = n.model?.template || n.model?.templateObj?.template?.id || n.model?.templateObj?.id || n.model?.name || '';
        const key = normalizeTemplateKey(rawKey);
        const allowed = await loaders.isTemplateAllowed(key);
        if (!allowed) errors.push({ code: 'template_not_allowed', message: `Template not allowed in workspace: '${key}'`, details: { nodeId: n.id, key } });
      }
    }
  }

  // 5) Connectivity checks
  try {
    const inDeg = new Map();
    const outDeg = new Map();
    nNodes.forEach(n => { inDeg.set(n.id, 0); outDeg.set(n.id, 0); });
    edges.forEach(e => { if (inDeg.has(e.target)) inDeg.set(e.target, (inDeg.get(e.target) || 0)+1); if (outDeg.has(e.source)) outDeg.set(e.source, (outDeg.get(e.source) || 0)+1); });
    for (const n of nNodes){
      const deg = (inDeg.get(n.id) || 0) + (outDeg.get(n.id) || 0);
      if (deg === 0) errors.push({ code: 'node_disconnected', message: 'Node is not connected', details: { nodeId: n.id } });
    }
    // Reachability: from starts/events, traverse outgoing edges
    const startIds = nNodes.filter(n => {
      const k = normalizeNodeKind(n.model?.templateObj?.type) || normalizeNodeKind(n.model?.type) || normalizeNodeKind(n.type) || normalizeNodeKind(n.model?.templateObj?.name);
      return k === 'start' || k === 'event';
    }).map(n => n.id);
    if (startIds.length){
      const adj = new Map();
      nNodes.forEach(n => adj.set(n.id, []));
      edges.forEach(e => { if (adj.has(e.source)) adj.get(e.source).push(e.target); });
      const vis = new Set(startIds);
      const q = [...startIds];
      while (q.length){
        const u = q.shift();
        for (const v of (adj.get(u) || [])) if (!vis.has(v)) { vis.add(v); q.push(v); }
      }
      for (const n of nNodes){
        const k = normalizeNodeKind(n.model?.templateObj?.type) || normalizeNodeKind(n.model?.type) || normalizeNodeKind(n.type) || normalizeNodeKind(n.model?.templateObj?.name);
        if (k !== 'start' && !vis.has(n.id)) errors.push({ code: 'node_unreachable', message: 'Node is not reachable from start', details: { nodeId: n.id } });
      }
    }
  } catch {}

  return { ok: errors.length === 0, errors, warnings };
}

module.exports = { validateFlowGraph, normalizeTemplateKey };
