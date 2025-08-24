const Ajv = require('ajv');
const addFormats = require('ajv-formats');

function normalizeNodeKind(nameOrType=''){ const s = String(nameOrType||'').trim().toLowerCase(); if (s==='start') return 'start'; if (s==='condition') return 'condition'; if (s==='function') return 'function'; if (s==='end') return 'end'; if (s==='loop') return 'loop'; if (s==='flow') return 'flow'; return ''; }
function normalizeTemplateKey(k){ if (!k) return ''; let s = String(k).trim().toLowerCase(); s = s.replace(/^tmpl_/,'').replace(/^template_/,'').replace(/^fn_/,'').replace(/^node_/,''); s = s.replace(/[^a-z0-9_]/g,'_'); return s; }

function collectGraph(flow){
  const nodes = flow.nodes || flow.graph?.nodes || [];
  const edges = flow.edges || flow.graph?.edges || [];
  const nodesById = new Map();
  for (const n of nodes){ const model = n.data?.model || n.model || n.data || {}; nodesById.set(n.id, { ...n, model }); }
  return { nodes, edges, nodesById };
}

function newAjv(){ const ajv = new Ajv({ allErrors: true, strict: false }); try { addFormats(ajv); } catch {} return ajv; }

async function validateFlowGraph(flowGraph, { strict=false, loaders } = {}){
  const errors = [];
  const warnings = [];
  const { nodes, edges, nodesById } = collectGraph(flowGraph);

  // 1) Start nodes
  const kinds = nodes.map(n => ({ id: n.id, kind: normalizeNodeKind(n.model?.templateObj?.name) || normalizeNodeKind(n.model?.type) || normalizeNodeKind(n.type) }));
  const starts = kinds.filter(k => k.kind === 'start');
  if (starts.length === 0) errors.push({ code: 'no_start', message: 'No start node found' });
  if (starts.length > 1) errors.push({ code: 'multiple_starts', message: 'Multiple start nodes' });

  // 2) Edges reference
  for (const e of edges){ if (!nodesById.has(e.source) || !nodesById.has(e.target)) errors.push({ code: 'edge_invalid', message: 'Edge references unknown node', details: { edge: e.id } }); }

  // 3) Templates + args validation
  const ajv = newAjv();
  const getTemplateByKey = loaders?.getTemplateByKey;
  for (const n of nodes){
    const kind = normalizeNodeKind(n.model?.templateObj?.name) || normalizeNodeKind(n.model?.type) || normalizeNodeKind(n.type);
    if (kind === 'function'){
      const rawKey = n.model?.template || n.model?.templateObj?.template?.id || n.model?.templateObj?.id || n.model?.name || '';
      const key = normalizeTemplateKey(rawKey);
      if (getTemplateByKey){
        const tpl = await getTemplateByKey(key);
        if (!tpl){
          (strict ? errors : warnings).push({ code: 'template_unknown', message: `Unknown template '${key}'`, details: { nodeId: n.id } });
        } else if (tpl.argsSchema){
          try {
            const validate = ajv.compile(tpl.argsSchema);
            const ok = validate(n.model?.context || {});
            if (!ok) errors.push({ code: 'args_invalid', message: `Args invalid for '${key}'`, details: { nodeId: n.id, errors: validate.errors } });
          } catch (e) {
            warnings.push({ code: 'schema_compile_error', message: `Schema compile error for '${key}'`, details: { error: e.message } });
          }
        }
      }
    }
  }

  // 4) Allowed templates (workspace policy)
  if (loaders?.isTemplateAllowed) {
    for (const n of nodes){
      const kind = normalizeNodeKind(n.model?.templateObj?.name) || normalizeNodeKind(n.model?.type) || normalizeNodeKind(n.type);
      if (kind === 'function'){
        const rawKey = n.model?.template || n.model?.templateObj?.template?.id || n.model?.templateObj?.id || n.model?.name || '';
        const key = normalizeTemplateKey(rawKey);
        const allowed = await loaders.isTemplateAllowed(key);
        if (!allowed) errors.push({ code: 'template_not_allowed', message: `Template not allowed in workspace: '${key}'`, details: { nodeId: n.id, key } });
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

module.exports = { validateFlowGraph, normalizeTemplateKey };

