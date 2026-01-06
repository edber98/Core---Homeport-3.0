// Create-Node Agent — plans one node to add after a source handle using seedGraph only (no DB writes)
// It may call the Args agent logic to propose args and a short description.
// NOTE: zod removed — using permissive schemas for tool I/O

async function importLC() {
  const coreTools = await import('@langchain/core/tools');
  const agents = await import('langchain/agents');
  const prompts = await import('@langchain/core/prompts');
  const openai = await import('@langchain/openai');
  return {
    DynamicStructuredTool: coreTools.DynamicStructuredTool,
    createOpenAIToolsAgent: agents.createOpenAIToolsAgent,
    AgentExecutor: agents.AgentExecutor,
    ChatPromptTemplate: prompts.ChatPromptTemplate,
    ChatOpenAI: openai.ChatOpenAI,
  };
}

function escapeLC(text){ return String(text||'').replace(/\{/g,'{{').replace(/\}/g,'}}'); }

// Checksum helpers aligned with frontend (FlowBuilderUtilsService)
function stableStringify(obj){
  const seen = new WeakSet();
  const sort = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if (seen.has(x)) return undefined;
    seen.add(x);
    if (Array.isArray(x)) return x.map(sort);
    const out = {};
    Object.keys(x).sort().forEach(k => { out[k] = sort(x[k]); });
    return out;
  };
  try { return JSON.stringify(sort(obj||{})); } catch { return JSON.stringify(obj||{}); }
}
function argsChecksum(args){
  const str = stableStringify(args||{});
  let h = 5381 >>> 0; // DJB2 32-bit
  for (let i = 0; i < str.length; i++) { h = (((h << 5) + h) + str.charCodeAt(i)) >>> 0; }
  return ('00000000' + h.toString(16)).slice(-8);
}
function featureChecksum(tpl){
  try { const a = !!(tpl && tpl.authorize_catch_error); const s = !!(tpl && tpl.authorize_skip_error); return (a ? '1' : '0') + (s ? '1' : '0'); } catch { return '00'; }
}

// Extract required keys from a DynamicForm-like schema
function collectRequiredKeys(schema){
  const out = new Set();
  try {
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      const fields = Array.isArray(node.fields) ? node.fields : [];
      for (const f of fields){
        const type = String(f?.type || '').toLowerCase();
        if (type === 'section' && (f.mode === 'array' || f.array)) {
          // recurse into array section items
          visit({ fields: Array.isArray(f.fields) ? f.fields : [] });
        } else if (type === 'section') {
          visit({ fields: Array.isArray(f.fields) ? f.fields : [] });
        } else {
          const key = String(f?.key || '').trim();
          if (!key) continue;
          const validators = Array.isArray(f?.validators) ? f.validators : [];
          const isReq = validators.some(v => String(v?.type || '') === 'required');
          if (isReq) out.add(key);
        }
      }
    };
    visit(schema || {});
  } catch {}
  return Array.from(out);
}

function systemPrompt(){
  const raw = [
    'Tu es un assistant de CRÉATION DE NŒUDS pour Homeport.',
    "But: à partir d'un prompt et d'un graphe (seedGraph), PROPOSER UN SEUL nouveau nœud à relier depuis la sortie indiquée (sourceId/sourceHandle).",
    "Étapes: 1) lister les templates compatibles, 2) choisir le meilleur template et expliquer brièvement, 3) utiliser get_template_schema(templateKey) pour voir les champs requis (et list_seed_predecessors pour comprendre le contexte), 4) si nécessaire, APPELER args_fill_via_node_assistant avec un objet { templateKey, prompt } où 'prompt' résume le sujet et explique quoi extraire depuis le msgIn (tu peux citer quelques clés utiles obtenues via get_scenarios/get_msgin_preview), 5) appeler set_node_args avec un JSON complet couvrant AU MOINS les champs requis et set_node_description (une phrase courte), 6) APPELER EXACTEMENT UNE FOIS le tool emit_graph pour émettre le graphe final (seed + 1 nœud + 1 arête), puis TERMINER.",
    "Contraintes: n'appelle JAMAIS emit_graph plus d'une fois. Utilise UNIQUEMENT les tools fournis.",
    "Dans tes messages à l’utilisateur: ne mentionne pas les outils; résume en 1–2 phrases l’objectif et ce que tu as fait/vas faire. Après un emit_graph réussi, résume ce qui a été construit (nœud, rôle, principaux champs, lien depuis la source) de façon concise.",
  ].join('\n');
  return escapeLC(raw);
}

function listOutputHandlesFromTemplate(tpl){
  try {
    const arr = Array.isArray(tpl?.outputHandles) ? tpl.outputHandles : [];
    return arr.map(h => ({ id: String(h?.id||'ok'), name: String(h?.name||h?.id||'ok'), type: String(h?.type||'any') }));
  } catch { return []; }
}

async function runCreateNodeAgent({ prompt, seedGraph, sourceId, sourceHandle = null, flowId = null, history = [], send, done }){
  try {
    const { createDispatcher } = require('../realtime/agent-events');
    const dispatcher = createDispatcher(send);
    send = (obj) => { try { dispatcher.emit(obj); } catch {} };
    try {
      console.info('[ai-create-node][agent] start', {
        sourceId,
        sourceHandle,
        hasPrompt: !!prompt,
        promptLen: String(prompt||'').length,
        seedNodes: Array.isArray(seedGraph?.nodes)?seedGraph.nodes.length:0,
        seedEdges: Array.isArray(seedGraph?.edges)?seedGraph.edges.length:0,
        histLen: Array.isArray(history)?history.length:0
      });
    } catch {}

    const { DynamicStructuredTool, ChatOpenAI, createOpenAIToolsAgent, AgentExecutor, ChatPromptTemplate } = await importLC();
    const { runArgsAgentWithTools } = require('./args-agent');
    const NodeTemplate = require('../db/models/node-template.model');
    const { normalizeTemplateKey } = require('../utils/validate');

    // Base graph for initial tools (source info): keep seed as-is for now
    const graph = seedGraph && typeof seedGraph === 'object' ? JSON.parse(JSON.stringify(seedGraph)) : { nodes: [], edges: [] };
    const nodeById = new Map((graph.nodes||[]).map(n => [String(n.id), n]));
    const source = nodeById.get(String(sourceId));
    const sourceModel = source?.data?.model || {};
    let sourceTpl = sourceModel?.templateObj || {};
    try {
      if (!sourceTpl || Object.keys(sourceTpl).length === 0) {
        const tplId = sourceModel?.template || null;
        if (tplId) {
          const found = await NodeTemplate.findById(tplId).lean();
          if (found) sourceTpl = found;
        }
      }
    } catch {}

    const tools = [];
    // Feature flag: auto-attach first available credential for provider (default ON)
    const AUTO_ATTACH_CREDENTIALS = String(process.env.AI_CREATE_NODE_AUTO_ATTACH_CRED || '1') !== '0';
    try { console.info('[ai-create-node][cred][auto_flag]', { enabled: AUTO_ATTACH_CREDENTIALS, env: String(process.env.AI_CREATE_NODE_AUTO_ATTACH_CRED || '') }); } catch {}
    const firstCredentialIdForFlow = async (providerKey) => {
      try {
        if (!AUTO_ATTACH_CREDENTIALS) { try { console.info('[ai-create-node][cred][auto_debug]', { step: 'disabled_by_flag' }); } catch {} return null; }
        if (!providerKey) { try { console.info('[ai-create-node][cred][auto_debug]', { step: 'missing_providerKey' }); } catch {} return null; }
        const Flow = require('../db/models/flow.model');
        const Credential = require('../db/models/credential.model');
        const { Types } = require('mongoose');
        const fid = String(flowId || ''); if (!fid) { try { console.info('[ai-create-node][cred][auto_debug]', { step: 'missing_flowId' }); } catch {} return null; }
        let flow = null;
        if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid).lean();
        if (!flow) flow = await Flow.findOne({ id: fid }).lean();
        if (!flow || !flow.workspaceId) { try { console.info('[ai-create-node][cred][auto_debug]', { step: 'flow_or_ws_not_found', flowFound: !!flow, ws: flow?.workspaceId || null }); } catch {} return null; }
        const query = { workspaceId: flow.workspaceId, providerKey: String(providerKey) };
        try { console.info('[ai-create-node][cred][auto_debug]', { step: 'query', query }); } catch {}
        let cred = await Credential.findOne(query).lean();
        if (!cred) {
          // Fallbacks: case-insensitive match, prefix match, any credential in workspace
          try { console.info('[ai-create-node][cred][auto_debug]', { step: 'no_credential_found_primary', providerKey }); } catch {}
          cred = await Credential.findOne({ workspaceId: flow.workspaceId, providerKey: new RegExp(`^${String(providerKey).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}$`, 'i') }).lean();
          if (!cred) cred = await Credential.findOne({ workspaceId: flow.workspaceId, providerKey: new RegExp(`^${String(providerKey).slice(0, 4)}`, 'i') }).lean();
          if (!cred) cred = await Credential.findOne({ workspaceId: flow.workspaceId }).lean();
          if (!cred) { try { console.info('[ai-create-node][cred][auto_debug]', { step: 'no_credential_found_all' }); } catch {} return null; }
          else { try { console.info('[ai-create-node][cred][auto_debug]', { step: 'fallback_used', providerKeyTried: providerKey, chosen: { id: cred.id || String(cred._id), providerKey: cred.providerKey, name: cred.name } }); } catch {} }
        }
        const out = cred.id || String(cred._id);
        try { console.info('[ai-create-node][cred][auto_debug]', { step: 'found', credentialId: out }); } catch {}
        return out;
      } catch { return null; }
    };
    let emittedFinal = false;
    let awaitUserInput = false;
    let pendingArgs = null;
    let pendingDesc = '';
    let argsLocked = false;
    let descLocked = false;
    tools.push(new DynamicStructuredTool({
      name: 'list_templates',
      description: 'Liste les templates de nœuds disponibles (id, name, title, category, outputHandles).',
      schema: {},
      func: async () => {
        const list = await NodeTemplate.find({ enabled: true }).lean();
        try { console.info('[ai-create-node][list_templates]', { count: (list||[]).length }); } catch {}
        const arr = (list||[]).map(t => ({ id: t.id || t._id, key: t.key, name: t.name, title: t.title, category: t.category, type: t.type, outputHandles: listOutputHandlesFromTemplate(t) }));
        return JSON.stringify(arr);
      }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'get_template_schema',
      description: 'Retourne le schema des arguments pour un template. input: { templateKey }',
      schema: {},
      func: async (input) => {
        try {
          const { Types } = require('mongoose');
          const { normalizeTemplateKey } = require('../utils/validate');
          const raw = String(input?.templateKey || input?.template || '').trim();
          if (!raw) return 'missing_template';
          const nk = normalizeTemplateKey(raw);
          let tried = { byKeyNorm: false, byKeyRaw: false, byId: false, byName: false };
          let tpl = null;
          // Try by normalized key first
          tried.byKeyNorm = true;
          tpl = await NodeTemplate.findOne({ key: nk }).lean();
          // Fallback to raw key
          if (!tpl) { tried.byKeyRaw = true; tpl = await NodeTemplate.findOne({ key: raw }).lean(); }
          // Fallback to ObjectId
          if (!tpl && Types.ObjectId.isValid(raw)) { tried.byId = true; tpl = await NodeTemplate.findById(raw).lean(); }
          // Fallback by name/title (case-insensitive)
          if (!tpl) { tried.byName = true; tpl = await NodeTemplate.findOne({ $or: [ { name: new RegExp(`^${raw}$`, 'i') }, { title: new RegExp(`^${raw}$`, 'i') } ] }).lean(); }
          const meta = { raw, normalized: nk, found: !!tpl, id: tpl?.key, tries: tried };
          try { console.info('[ai-create-node][get_template_schema][lookup]', meta); } catch {}
          if (!tpl) { try { send({ type:'error', code:'template_not_found', message:`Template not found: ${raw} (normalized: ${nk})` }); } catch {} return 'template_not_found'; }
          const out = { key: tpl.key, name: tpl.name, title: tpl.title, type: tpl.type, argsSchema: tpl.args || null };
          const required = collectRequiredKeys(out.argsSchema || {});
          const fieldsCount = Array.isArray(out.argsSchema?.fields) ? out.argsSchema.fields.length : 0;
          try {
            send({ type:'message', role:'assistant', text:`[tool] get_template_schema key=${raw} normalized=${nk} found=true fields=${fieldsCount} required=${required.length}` });
          } catch {}
          return JSON.stringify(out);
        } catch (e) {
          try { console.error('[ai-create-node][get_template_schema][error]', e?.message || e); } catch {}
          return 'error';
        }
      }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'list_seed_predecessors',
      description: 'Liste les prédécesseurs directs de la source dans seedGraph. Retourne [{ id, templateKey, context, sourceHandle }] pour aider à proposer les args.',
      schema: {},
      func: async () => {
        try {
          const edges = Array.isArray(graph?.edges) ? graph.edges : [];
          const nodes = new Map((Array.isArray(graph?.nodes)?graph.nodes:[]).map(n => [String(n.id), n]));
          const preds = edges.filter(e => String(e?.target) === String(sourceId)).map(e => ({ id: String(e.source), sourceHandle: String((e).sourceHandle||''), node: nodes.get(String(e.source)) }));
          const out = preds.map(p => {
            const m = (p.node && (p.node.data && p.node.data.model)) ? p.node.data.model : (p.node?.data || {});
            const key = String(m?.template || m?.templateObj?.id || '');
            return { id: p.id, templateKey: key, context: (m?.context || {}), sourceHandle: p.sourceHandle };
          });
          try { console.info('[ai-create-node][seed_predecessors]', { count: out.length }); } catch {}
          return JSON.stringify(out);
        } catch (e) { try { console.warn('[ai-create-node][seed_predecessors][error]', e?.message||e); } catch {} return 'error'; }
      }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'get_source_info',
      description: "Retourne les infos de la source (id, template type, handle choisi).",
      schema: {},
      func: async () => {
        const handle = String(sourceHandle || 'ok');
        const out = { id: String(sourceId), templateType: String(sourceTpl?.type||sourceTpl?.id||''), handle };
        try { console.info('[ai-create-node][source]', out); } catch {}
        return JSON.stringify(out);
      }
    }));

    // Tool refine_args_seed supprimé: on utilise exclusivement args_fill_via_node_assistant

    tools.push(new DynamicStructuredTool({
      name: 'args_fill_via_node_assistant',
      description: "Appelle l'agent ARGS (node assistant) avec un nœud temporaire (seed-only) pour proposer context/description. input: { templateKey, prompt? } — Fournis 'prompt' pour résumer le sujet et guider l'extraction depuis msgIn.",
      schema: {},
      func: async (input) => {
        try {
          const tplKey = String(input?.templateKey || input?.template || '');
          if (!tplKey) return 'missing_template';
          const nk = normalizeTemplateKey(tplKey);
          const NodeTemplate = require('../db/models/node-template.model');
          const tpl = await NodeTemplate.findOne({ $or: [ { key: nk }, { key: tplKey } ] }).lean();
          if (!tpl) { try { send({ type:'error', code:'template_not_found', message:`Template not found: ${tplKey}` }); } catch {} return 'template_not_found'; }
          // Construire un graph temporaire = seed + nouveau nœud minimal pour l'agent ARGS
          const tempId = 'tmp_' + Math.random().toString(36).slice(2,9);
          // Build a merged graph for the args sub-agent: DB flow (full schemas) + seed overlay + tmp node
          let graph = { nodes: [], edges: [] };
          try {
            const { Types } = require('mongoose');
            const Flow = require('../db/models/flow.model');
            let full = null; const fid = String(flowId||'');
            if (fid) {
              if (Types.ObjectId.isValid(fid)) full = await Flow.findById(fid).lean();
              if (!full) full = await Flow.findOne({ id: fid }).lean();
            }
            const base = (full && (full.graph || full)) || {};
            const baseNodes = Array.isArray(base.nodes) ? base.nodes : [];
            const baseEdges = Array.isArray(base.edges) ? base.edges : [];
            const seed = seedGraph && typeof seedGraph === 'object' ? seedGraph : { nodes: [], edges: [] };
            const seedNodes = Array.isArray(seed.nodes) ? seed.nodes : [];
            const seedEdges = Array.isArray(seed.edges) ? seed.edges : [];
            const byId = new Map(baseNodes.map(n => [String(n.id), JSON.parse(JSON.stringify(n))]));
            // Overlay seed only for visual/position, keep DB model (schema) when node exists
            for (const n of seedNodes) {
              const id = String(n.id);
              if (byId.has(id)) {
                try { const baseN = byId.get(id); if (n.point) baseN.point = JSON.parse(JSON.stringify(n.point)); } catch {}
              } else {
                byId.set(id, JSON.parse(JSON.stringify(n)));
              }
            }
            const nodesMerged = Array.from(byId.values());
            const edgesMerged = [];
            const seenEdge = new Set();
            for (const e of [...baseEdges, ...seedEdges]) {
              const id = String(e.id || `${e.source}->${e.target}:${e.sourceHandle}:${e.targetHandle}`);
              if (seenEdge.has(id)) continue; seenEdge.add(id);
              edgesMerged.push(JSON.parse(JSON.stringify(e)));
            }
            graph = { nodes: nodesMerged, edges: edgesMerged };
            try { console.info('[ai-create-node][args_assistant][graph_merge]', { baseNodes: baseNodes.length, baseEdges: baseEdges.length, seedNodes: seedNodes.length, seedEdges: seedEdges.length, mergedNodes: nodesMerged.length, mergedEdges: edgesMerged.length }); } catch {}
          } catch (e) {
            graph = seedGraph && typeof seedGraph === 'object' ? JSON.parse(JSON.stringify(seedGraph)) : { nodes: [], edges: [] };
            try { console.warn('[ai-create-node][args_assistant][graph_merge_failed]', e?.message||e); } catch {}
          }
          // Si le seed est minifié, réinjecter le schéma Start Form depuis la DB si possible
          try {
            if (flowId) {
              const Flow = require('../db/models/flow.model');
              const { Types } = require('mongoose');
              let flowFull = null; const fid = String(flowId);
              if (Types.ObjectId.isValid(fid)) flowFull = await Flow.findById(fid).lean();
              if (!flowFull) flowFull = await Flow.findOne({ id: fid }).lean();
              const nodesSeed = Array.isArray(graph.nodes) ? graph.nodes : [];
              const nodesFull = Array.isArray(flowFull?.graph?.nodes) ? flowFull.graph.nodes : (Array.isArray(flowFull?.nodes) ? flowFull.nodes : []);
              const byIdFull = new Map(nodesFull.map(n => [String(n.id), n]));
              for (const n of nodesSeed){
                try {
                  const modelN = (n?.data && n.data.model) ? n.data.model : (n?.data || {});
                  const type = String(modelN?.templateObj?.type || modelN?.nodeKind || '').toLowerCase();
                  if (type === 'start' || type === 'start_form'){
                    const full = byIdFull.get(String(n.id));
                    const fullModel = (full && (full.data && full.data.model)) ? full.data.model : (full?.data || {});
                    const hasNonEmpty = (obj) => {
                      try {
                        if (!obj || typeof obj !== 'object') return false;
                        const f = Array.isArray(obj.fields) ? obj.fields : [];
                        const s = Array.isArray(obj.steps) ? obj.steps : [];
                        return f.length > 0 || s.length > 0;
                      } catch { return false; }
                    };
                    const hasSchema = hasNonEmpty(modelN?.context) || hasNonEmpty(modelN?.startFormSchema) || hasNonEmpty(modelN?.templateObj?.args);
                    if (!hasSchema){
                      // 1) Tenter via le flow complet
                      if (fullModel){
                        const ctx = hasNonEmpty(fullModel.context) ? fullModel.context : null;
                        const sfs = (!ctx && hasNonEmpty(fullModel.startFormSchema)) ? fullModel.startFormSchema : null;
                        const args = (!ctx && !sfs && hasNonEmpty(fullModel.templateObj?.args)) ? fullModel.templateObj.args : null;
                        const applyInto = (obj) => {
                          if (!obj) return;
                          if (n?.data?.model){
                            if (ctx) n.data.model.context = ctx;
                            else if (sfs) n.data.model.startFormSchema = sfs;
                            if (args){ n.data.model.templateObj = n.data.model.templateObj || {}; n.data.model.templateObj.args = args; }
                          } else if (n?.data){
                            if (ctx) n.data.context = ctx;
                            else if (sfs) n.data.startFormSchema = sfs;
                            if (args){ n.data.templateObj = n.data.templateObj || {}; n.data.templateObj.args = args; }
                          }
                        };
                        if (hasNonEmpty(ctx) || hasNonEmpty(sfs) || hasNonEmpty(args)) applyInto(fullModel);
                      }
                      // 2) Si toujours vide, tenter via NodeTemplate (clé business)
                      const rawKey = modelN?.template || modelN?.templateObj?.id || modelN?.templateObj?.key || modelN?.name || '';
                      if (rawKey){
                        try {
                          const nkNode = normalizeTemplateKey(rawKey);
                          const tplNode = await NodeTemplate.findOne({ $or: [ { key: nkNode }, { key: rawKey } ] }).lean();
                          const tArgs = (tplNode && tplNode.args) || null;
                          if (tArgs && (Array.isArray(tArgs.fields) || Array.isArray(tArgs.steps))){
                            if (n?.data?.model){ n.data.model.templateObj = n.data.model.templateObj || {}; n.data.model.templateObj.args = tArgs; }
                            else if (n?.data){ n.data.templateObj = n.data.templateObj || {}; n.data.templateObj.args = tArgs; }
                          }
                        } catch {}
                      }
                      // 3) Pas d'autres fallbacks magiques: on s'appuie sur le graphe DB fusionné
                    }
                  }
                } catch {}
              }
            }
          } catch {}
          // Enrichir les nœuds existants avec le template complet (args + outputHandles) pour la simulation seed-only
          try {
            const cache = new Map();
            const ensureTplForKey = async (raw) => {
              try {
                const keyRaw = String(raw || '').trim(); if (!keyRaw) return null;
                const nk2 = normalizeTemplateKey(keyRaw);
                const cacheKey = nk2 || keyRaw;
                if (cache.has(cacheKey)) return cache.get(cacheKey);
                const t = await NodeTemplate.findOne({ $or: [ { key: nk2 }, { key: keyRaw } ] }).lean();
                cache.set(cacheKey, t || null);
                return t || null;
              } catch { return null; }
            };
            for (const n of Array.isArray(graph.nodes) ? graph.nodes : []){
              try {
                const modelN = (n && (n.data && n.data.model)) ? n.data.model : (n?.data || {});
                const tObj = modelN?.templateObj || {};
                const hasOut = Array.isArray(tObj?.outputHandles) && tObj.outputHandles.length > 0;
                const hasArgs = !!tObj?.args;
                // Enrichir uniquement les nœuds de type fonction/condition/flow si incomplet
                if (hasOut && hasArgs) continue;
                const raw = modelN?.template || tObj?.id || tObj?.key || modelN?.name || '';
                const found = await ensureTplForKey(raw);
                if (!found) continue;
                const templateObjN = {
                  id: found.key,
                  name: found.name,
                  title: found.title,
                  type: found.type,
                  category: found.category,
                  providerKey: found.providerKey,
                  appId: found.providerKey,
                  args: found.args,
                  output: found.output,
                  outputHandles: Array.isArray(found.outputHandles) ? found.outputHandles : [],
                  authorize_catch_error: found.authorize_catch_error,
                  authorize_skip_error: found.authorize_skip_error,
                  allowWithoutCredentials: found.allowWithoutCredentials,
                  output_array_field: found.output_array_field,
                };
                if (n?.data?.model) { n.data.model.template = found.key; n.data.model.templateObj = templateObjN; }
                else if (n?.data) { n.data.template = found.key; n.data.templateObj = templateObjN; }
              } catch {}
            }
          } catch {}
          const templateObj = {
            id: tpl.key,
            name: tpl.name,
            title: tpl.title,
            type: tpl.type,
            category: tpl.category,
            providerKey: tpl.providerKey,
            appId: tpl.providerKey,
            args: tpl.args,
            output: tpl.output,
            inputHandles: Array.isArray(tpl.inputHandles) ? JSON.parse(JSON.stringify(tpl.inputHandles)) : undefined,
            outputHandles: Array.isArray(tpl.outputHandles) ? JSON.parse(JSON.stringify(tpl.outputHandles)) : undefined,
            linkedHandles: Array.isArray(tpl.linkedHandles) ? JSON.parse(JSON.stringify(tpl.linkedHandles)) : undefined,
            authorize_catch_error: tpl.authorize_catch_error,
            authorize_skip_error: tpl.authorize_skip_error,
            allowWithoutCredentials: tpl.allowWithoutCredentials,
            output_array_field: tpl.output_array_field,
          };
          const model = { id: tempId, name: tpl.title || tpl.name || tpl.key, template: tpl.key, templateObj, context: {} };
          const node = { id: tempId, type: 'html-template', point: { x: 0, y: 0 }, data: { model } };
          const edge = { id: `${sourceId}->${tempId}:${sourceHandle}:in`, type: 'template', source: String(sourceId), target: tempId, sourceHandle: String(sourceHandle||'ok'), targetHandle: 'in' };
          graph.nodes = Array.isArray(graph.nodes) ? [...graph.nodes, node] : [node];
          graph.edges = Array.isArray(graph.edges) ? [...graph.edges, edge] : [edge];
          try { console.info('[ai-create-node][args_assistant][invoke]', { tempId, tplKey: tpl.key, nodes: graph.nodes.length, edges: graph.edges.length }); } catch {}
          // Forward les events de l'agent ARGS, avec préfixe pour les tools
          const forwardSend = (obj) => {
            try {
              if (obj?.type === 'tool.start') { send({ ...obj, type:'tool.start', name: `nodeargs.${obj.name}` }); return; }
              if (obj?.type === 'tool.end') { send({ ...obj, type:'tool.end', name: `nodeargs.${obj.name}` }); return; }
              if (obj?.type === 'done') { send({ type:'tool.end', name:'nodeargs.session', ok:true }); return; }
              if (obj?.type === 'await_user') { awaitUserInput = true; send({ type:'await_user', question: obj?.question || '' }); return; }
              if (obj?.type === 'args.partial') { send({ type:'args.partial', args: obj.args }); return; }
              else if (obj?.type === 'args') { pendingArgs = obj.args || {}; argsLocked = true; send(obj); }
              else if (obj?.type === 'desc') {
                pendingDesc = obj.text || '';
                descLocked = true;
                try {
                  const prev = String(pendingDesc||'');
                  const short = prev.length > 160 ? prev.slice(0,160) + '…' : prev;
                  console.info('[ai-create-node][args_assistant][desc]', { len: prev.length, preview: short });
                } catch {}
                send(obj);
              }
              else if (obj?.type) send(obj);
            } catch {}
          };
          // Utiliser le prompt fourni par l'agent (input.prompt) pour guider l'Args agent
          const agentProvidedPrompt = String(input?.prompt || '');
          try { console.info('[ai-create-node][args_assistant][prompt_in]', { len: agentProvidedPrompt.length, text: agentProvidedPrompt }); } catch {}
          await runArgsAgentWithTools({ prompt: agentProvidedPrompt, flowId: String(flowId||''), nodeId: tempId, branch: sourceHandle || null, history, send: forwardSend, done: ()=>{}, seedGraphOverride: graph });
          try { console.info('[ai-create-node][args_assistant][done]', { argKeys: Object.keys(pendingArgs||{}).length, descLen: String(pendingDesc||'').length }); } catch {}
          return 'ok';
        } catch (e) { try { console.warn('[ai-create-node][args_assistant][error]', e?.message||e); } catch {} return 'error'; }
      }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'set_node_args',
      description: 'Propose les arguments finals pour le nœud à créer (context).',
      schema: {},
      func: async (input) => {
        try {
          if (argsLocked) { try { console.warn('[ai-create-node][args][locked_ignore]'); } catch {} return 'args_locked'; }
          const args = (input && typeof input === 'object') ? (input.args && typeof input.args==='object' ? input.args : input) : {};
          pendingArgs = args;
          try { console.info('[ai-create-node][args]', { keys: Object.keys(args||{}).length }); } catch {}
          send({ type: 'args', args });
          return 'ok';
        } catch (e) { try { console.warn('[ai-create-node][args][error]', e?.message||e); } catch {} return 'error'; }
      }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'set_node_description',
      description: 'Propose une description courte (une phrase) pour le nœud.',
      schema: {},
      func: async (input) => {
        try {
          if (descLocked) { try { console.warn('[ai-create-node][desc][locked_ignore]'); } catch {} return 'desc_locked'; }
          let text = '';
          if (input && typeof input==='object') text = String(input.description ?? input.text ?? '');
          pendingDesc = text;
          try {
            const prev = String(text||'');
            const short = prev.length > 160 ? prev.slice(0,160) + '…' : prev;
            console.info('[ai-create-node][desc]', { len: prev.length, preview: short });
          } catch {}
          send({ type:'desc', text });
          return 'ok';
        } catch (e) { try { console.warn('[ai-create-node][desc][error]', e?.message||e); } catch {} return 'error'; }
      }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'emit_graph',
      description: 'Émet le graphe final (APPELER EXACTEMENT UNE FOIS). input: { templateKey, args, description }',
      schema: {},
      func: async (input) => {
        try {
          if (awaitUserInput) {
            try { console.info('[ai-create-node][emit_graph] blocked: awaiting user clarification'); } catch {}
            try { send({ type: 'await_user', reason: 'args_clarification_needed' }); } catch {}
            return 'await_user';
          }
          if (emittedFinal) return 'already_emitted';
          const tplKey = String(input?.templateKey || input?.template || '');
          if (!tplKey) return 'missing_template';
          const nk = normalizeTemplateKey(tplKey);
          let tpl = await NodeTemplate.findOne({ $or: [ { key: nk }, { key: tplKey } ] }).lean();
          if (!tpl) {
            try { console.warn('[ai-create-node][emit_graph] template_not_found', tplKey); } catch {}
            try { send({ type: 'error', code: 'template_not_found', message: `Template not found: ${tplKey} (normalized: ${nk})` }); } catch {}
            return 'template_not_found';
          }
          // Utiliser strictement ce que le sous-agent a proposé si disponible
          let finalArgs = pendingArgs || {};
          let finalDesc = pendingDesc || '';
          let argsSource = 'nodeargs';
          let descSource = finalDesc ? 'nodeargs' : 'create';
          if (!finalArgs || Object.keys(finalArgs||{}).length === 0) {
            finalArgs = (input && typeof input==='object' && input.args) ? input.args : {};
            argsSource = 'create';
          }
          if (!finalDesc) {
            finalDesc = (input && typeof input==='object' && (input.description || input.text)) ? (input.description || input.text) : '';
          }
          try {
            const dprev = String(finalDesc||'');
            const dshort = dprev.length > 160 ? dprev.slice(0,160) + '…' : dprev;
            console.info('[ai-create-node][emit_graph][args_source]', { source: argsSource });
            console.info('[ai-create-node][emit_graph][desc_source]', { source: descSource, len: dprev.length, preview: dshort });
          } catch {}
          try {
            const providedKeys = Object.keys(finalArgs||{});
            const required = collectRequiredKeys(tpl.args || {});
            const missing = required.filter(k => finalArgs == null || finalArgs[k] == null || finalArgs[k] === '');
            console.info('[ai-create-node][emit_graph]', { tplKey, argKeys: providedKeys.length, descLen: String(finalDesc||'').length });
            console.info('[ai-create-node][emit_graph][args_check]', { required, providedKeys, missing });
            const preview = JSON.stringify(finalArgs || {});
            console.info('[ai-create-node][emit_graph][args_preview]', preview.length > 400 ? preview.slice(0, 400) + '…' : preview);
          } catch {}
          const newId = 'n_' + Math.random().toString(36).slice(2, 10);
          // Build templateObj to mirror frontend normalization (keep handles + schemas intact)
          const templateObj = {
            id: tpl.key,
            name: tpl.name,
            title: tpl.title,
            type: tpl.type,
            category: tpl.category,
            providerKey: tpl.providerKey,
            appId: tpl.providerKey,
            // Schema/args
            args: tpl.args,
            // v1 outputs (legacy)
            output: tpl.output,
            // v2 handles — important: preserve schema on each handle as-is
            inputHandles: Array.isArray(tpl.inputHandles) ? JSON.parse(JSON.stringify(tpl.inputHandles)) : undefined,
            outputHandles: Array.isArray(tpl.outputHandles) ? JSON.parse(JSON.stringify(tpl.outputHandles)) : undefined,
            linkedHandles: Array.isArray(tpl.linkedHandles) ? JSON.parse(JSON.stringify(tpl.linkedHandles)) : undefined,
            // Feature flags
            authorize_catch_error: tpl.authorize_catch_error,
            authorize_skip_error: tpl.authorize_skip_error,
            allowWithoutCredentials: tpl.allowWithoutCredentials,
            // Legacy field for conditions (kept for compatibility)
            output_array_field: tpl.output_array_field,
          };
          try { console.info('[ai-create-node][emit_graph][tpl_ids]', { key: tpl.key, mongoId: tpl._id?.toString?.(), outId: templateObj.id }); } catch {}
          const model = {
            id: newId,
            name: tpl.title || tpl.name || tpl.key || 'Node',
            // Important: use business key for template (like frontend)
            template: tpl.key,
            templateObj,
            context: finalArgs,
            description: String(finalDesc || ''),
            templateChecksum: argsChecksum(tpl.args || {}),
            templateFeatureSig: featureChecksum(tpl),
          };
          // Auto-attach first available credential for this provider in flow workspace
          try {
            const pk = String(templateObj.providerKey || '');
            try { console.info('[ai-create-node][cred][auto_debug]', { step: 'before_lookup', providerKey: pk }); } catch {}
            if (pk) {
              const credId = await firstCredentialIdForFlow(pk);
              if (credId) { model.credentialId = credId; try { console.info('[ai-create-node][cred][auto]', { nodeId: newId, providerKey: pk, credentialId: credId }); } catch {} }
              else { try { console.info('[ai-create-node][cred][auto_debug]', { step: 'not_attached', reason: 'no_match' }); } catch {} }
            } else { try { console.info('[ai-create-node][cred][auto_debug]', { step: 'not_attached', reason: 'no_provider_key' }); } catch {} }
          } catch (e) { try { console.warn('[ai-create-node][cred][auto_debug][error]', e?.message || e); } catch {} }
          const node = { id: newId, type: 'html-template', point: { x: source?.point?.x || 0, y: (source?.point?.y || 0) + 160 }, data: { model } };
          const edge = { id: `${sourceId}->${newId}:${sourceHandle}:in`, type: 'template', source: String(sourceId), target: newId, sourceHandle: String(sourceHandle || 'ok'), targetHandle: 'in' };
          const out = { nodes: [...(graph.nodes||[]), node], edges: [...(graph.edges||[]), edge] };
          send({ type:'final', graph: out });
          emittedFinal = true;
          return 'ok';
        } catch (e) { try { console.error('[ai-create-node][emit_graph][error]', e?.message||e); } catch {} send({ type:'error', code:'emit_failed', message: e?.message||String(e) }); return 'error'; }
      }
    }));

    const model = new ChatOpenAI({ temperature: 0, modelName: process.env.OPENAI_MODEL || 'gpt-4o', openAIApiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_APIKEY || '', streaming: true });
    const promptT = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt()],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);
    try { const { ensureToolMetadata } = require('./tools-registry'); await ensureToolMetadata(tools); } catch {}
    const agent = await createOpenAIToolsAgent({ llm: model, tools, prompt: promptT });
    const executor = new AgentExecutor({ agent, tools, maxIterations: 8 });
    const inputText = String(prompt||'').trim();
    try { send({ type: 'message', role: 'assistant', text: "Démarrage de l'assistant de création…" }); } catch {}
    const stream = await executor.streamEvents({ input: inputText, chat_history: Array.isArray(history)? history: [] }, { version: 'v2' });
    for await (const ev of stream) {
      try {
        if (ev.event === 'on_chat_model_stream') {
          const chunk = ev.data?.chunk; if (chunk?.content) send({ type:'message', role:'assistant', text: chunk.content });
        } else if (ev.event === 'on_tool_start') {
          try { console.info('[ai-create-node][tool] start', ev.name); } catch {}
          send({ type:'tool.start', name: ev.name, args: ev.data?.input?.input || {} });
        } else if (ev.event === 'on_tool_end') {
          try { console.info('[ai-create-node][tool] end', ev.name); } catch {}
          send({ type:'tool.end', name: ev.name, ok: true });
          // Do not finalize stream here; allow the model to emit any final assistant messages
          // after emit_graph completes. We'll call done() once the event stream naturally ends.
        }
      } catch {}
    }
    // Finalize the SSE stream after model completes (whether or not a final graph was emitted)
    try { done(); } catch {}
  } catch (e) {
    const msg = String(e?.message || e || 'error');
    // Sub-agent seed-only to infer args using scenarios and predecessors
    async function runSeedArgsAgent(templateKey){
      try {
        const { DynamicStructuredTool, ChatOpenAI, createOpenAIToolsAgent, AgentExecutor, ChatPromptTemplate } = await importLC();
        const toolsInner = [];
        toolsInner.push(new DynamicStructuredTool({
          name: 'get_template_schema',
          description: 'Retourne le schema des arguments pour un template (seed-only).',
          schema: {},
          func: async () => {
            try {
              const nk = normalizeTemplateKey(String(templateKey||''));
              const NodeTemplate = require('../db/models/node-template.model');
              const tpl = await NodeTemplate.findOne({ $or: [ { key: nk }, { key: templateKey } ]}).lean();
              const out = { key: tpl?.key || templateKey, argsSchema: tpl?.args || null };
              try { console.info('[ai-create-node][args_seed][schema]', { raw: templateKey, normalized: nk, found: !!tpl, fields: Array.isArray(out.argsSchema?.fields)? out.argsSchema.fields.length:0 }); } catch {}
              return JSON.stringify(out);
            } catch (e) { try { console.warn('[ai-create-node][args_seed][schema][error]', e?.message||e); } catch {} return 'error'; }
          }
        }));
        toolsInner.push(new DynamicStructuredTool({
          name: 'list_seed_predecessors',
          description: 'Liste les prédécesseurs directs de la source dans seedGraph (seed-only).',
          schema: {},
          func: async () => {
            try {
              const edges = Array.isArray(seedGraph?.edges) ? seedGraph.edges : [];
              const nodes = new Map((Array.isArray(seedGraph?.nodes)?seedGraph.nodes:[]).map(n => [String(n.id), n]));
              const preds = edges.filter(e => String(e?.target) === String(sourceId)).map(e => ({ id: String(e.source), sourceHandle: String((e).sourceHandle||''), node: nodes.get(String(e.source)) }));
              const out = preds.map(p => {
                const m = (p.node && (p.node.data && p.node.data.model)) ? p.node.data.model : (p.node?.data || {});
                const key = String(m?.template || m?.templateObj?.id || '');
                return { id: p.id, templateKey: key, context: (m?.context || {}), sourceHandle: p.sourceHandle };
              });
              try { console.info('[ai-create-node][args_seed][preds]', { count: out.length }); } catch {}
              return JSON.stringify(out);
            } catch (e) { try { console.warn('[ai-create-node][args_seed][preds][error]', e?.message||e); } catch {} return 'error'; }
          }
        }));
        toolsInner.push(new DynamicStructuredTool({
          name: 'get_seed_scenarios',
          description: 'Simule des scénarios vers la source (seed-only).',
          schema: {},
          func: async () => {
            try {
              const { simulateViaEngineSplit, simulateViaEngine } = require('../utils/flow-simulate-engine');
              let data = null; try { data = await simulateViaEngineSplit(seedGraph, String(sourceId)); } catch { try { data = await simulateViaEngine(seedGraph, String(sourceId)); } catch {} }
              if (!data) { const { simulateScenarios } = require('../utils/flow-simulate'); data = simulateScenarios(seedGraph, String(sourceId), 'all'); }
              const arr = Array.isArray(data?.scenarios) ? data.scenarios : [];
              const chosen = arr[0] || null; const keys = chosen && chosen.msgIn ? Object.keys(chosen.msgIn) : [];
              try { console.info('[ai-create-node][args_seed][scenarios]', { total: arr.length, picked: chosen ? true : false, keys }); } catch {}
              return JSON.stringify({ total: arr.length, selected: chosen ? { label: chosen.label, index: chosen.index, msgIn: chosen.msgIn, keys } : null });
            } catch (e) { try { console.warn('[ai-create-node][args_seed][scenarios][error]', e?.message||e); } catch {} return 'error'; }
          }
        }));
        toolsInner.push(new DynamicStructuredTool({
          name: 'set_args',
          description: 'Définit les arguments proposés (seed-only -> extérieur).',
          schema: {},
          func: async (input) => { try { const a = (input && typeof input==='object') ? input : {}; pendingArgs = a; send({ type:'args', args: a }); return 'ok'; } catch { return 'error'; } }
        }));
        toolsInner.push(new DynamicStructuredTool({
          name: 'set_desc',
          description: 'Définit la description proposée (seed-only -> extérieur).',
          schema: {},
          func: async (input) => { try { const t = (typeof input==='string') ? input : (input && typeof input==='object' ? (input.description||input.text||'') : ''); pendingDesc = String(t||''); send({ type:'desc', text: pendingDesc }); return 'ok'; } catch { return 'error'; } }
        }));

        const sys = escapeLC([
          'Agent ARGS seed-only: propose les arguments (context) et une courte description pour le template fourni,',
          'en utilisant le schema (get_template_schema), les prédécesseurs (list_seed_predecessors) et des scénarios seed (get_seed_scenarios).',
          "Quand prêt, appelle set_args (avec les champs pertinents) ET set_desc (phrase courte).",
        ].join('\n'));
          const promptT = ChatPromptTemplate.fromMessages([[ 'system', sys ], [ 'human', '{input}' ], [ 'placeholder', '{agent_scratchpad}' ]]);
          const model = new ChatOpenAI({ temperature: 0, modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini', openAIApiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_APIKEY || '', streaming: true });
          try { const { ensureToolMetadata } = require('./tools-registry'); await ensureToolMetadata(toolsInner); } catch {}
          const agent = await createOpenAIToolsAgent({ llm: model, tools: toolsInner, prompt: promptT });
        const executor = new AgentExecutor({ agent, tools: toolsInner, maxIterations: 6 });
        const text = `Template: ${String(templateKey||'')}. Déduis les valeurs utiles (seed-only).`;
        const stream = await executor.streamEvents({ input: text }, { version: 'v2' });
        for await (const ev of stream) {
          try {
            if (ev.event === 'on_chat_model_stream') { const chunk = ev.data?.chunk; if (chunk?.content) send({ type:'message', role:'assistant', text: `[args] ${chunk.content}` }); }
            else if (ev.event === 'on_tool_start') { send({ type:'tool.start', name: `args.${ev.name}`, args: ev.data?.input?.input || {} }); }
            else if (ev.event === 'on_tool_end') { send({ type:'tool.end', name: `args.${ev.name}`, ok: true }); }
          } catch {}
        }
      } catch (e) { try { console.warn('[ai-create-node][args_seed][failed]', e?.message||e); } catch {} }
    }

    if (/aborted/i.test(msg)) { try { console.info('[ai-create-node][agent_cancelled]', msg); } catch {} }
    else { try { console.error('[ai-create-node][agent_failed]', e?.stack || e?.message || e); } catch {}; send({ type:'error', code:'agent_failed', message: e?.message || String(e) }); }
    try { done(); } catch {}
  }
}

module.exports = { runCreateNodeAgent };
