// Create-Node Agent — plans one node to add after a source handle using seedGraph only (no DB writes)
// It may call the Args agent logic to propose args and a short description.

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
    "Étapes: 1) lister les templates compatibles, 2) choisir le meilleur template et expliquer brièvement, 3) utiliser get_template_schema(templateKey) pour voir les champs requis (et list_seed_predecessors pour comprendre le contexte), 4) si nécessaire, APPELER args_fill_via_node_assistant(templateKey) pour proposer les arguments avec scénarios seed-only, 5) appeler set_node_args avec un JSON complet couvrant AU MOINS les champs requis et set_node_description (une phrase courte), 6) APPELER EXACTEMENT UNE FOIS le tool emit_graph pour émettre le graphe final (seed + 1 nœud + 1 arête), puis TERMINER.",
    "Contraintes: n'appelle JAMAIS emit_graph plus d'une fois. Utilise UNIQUEMENT les tools fournis.",
    "Important: n’écris 'Proposition prête à être appliquée.' QU’APRÈS un emit_graph réussi. En cas d’erreur de tool (ex: template introuvable), explique l’erreur et ne propose pas d’appliquer.",
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
    let emittedFinal = false;
    let pendingArgs = null;
    let pendingDesc = '';
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
      description: "Appelle l'agent ARGS (node assistant) avec un nœud temporaire (seed-only) pour proposer context/description.",
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
          const graph = seedGraph && typeof seedGraph === 'object' ? JSON.parse(JSON.stringify(seedGraph)) : { nodes: [], edges: [] };
          const templateObj = {
            id: tpl.key, name: tpl.name, title: tpl.title, type: tpl.type, category: tpl.category,
            providerKey: tpl.providerKey, appId: tpl.providerKey, args: tpl.args,
            output: tpl.output, authorize_catch_error: tpl.authorize_catch_error, authorize_skip_error: tpl.authorize_skip_error, allowWithoutCredentials: tpl.allowWithoutCredentials,
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
              if (obj?.type === 'tool.start') send({ ...obj, type:'tool.start', name: `nodeargs.${obj.name}` });
              else if (obj?.type === 'tool.end') send({ ...obj, type:'tool.end', name: `nodeargs.${obj.name}` });
              else if (obj?.type === 'args') { pendingArgs = obj.args || {}; send(obj); }
              else if (obj?.type === 'desc') { pendingDesc = obj.text || ''; send(obj); }
              else if (obj?.type) send(obj);
            } catch {}
          };
          await runArgsAgentWithTools({ prompt: String(prompt||''), flowId: String(flowId||''), nodeId: tempId, branch: sourceHandle || null, history, send: forwardSend, done: ()=>{}, seedGraphOverride: graph });
          try { console.info('[ai-create-node][args_assistant][done]', { argKeys: Object.keys(pendingArgs||{}).length, descLen: String(pendingDesc||'').length }); } catch {}
          return 'ok';
        } catch (e) { try { console.warn('[ai-create-node][args_assistant][error]', e?.message||e); } catch {} return 'error'; }
      }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'set_node_args',
      description: 'Propose les arguments finals pour le nœud à créer (context).',
      schema: {},
      func: async (input) => { try { const args = (input && typeof input === 'object') ? input : {}; pendingArgs = args; try { console.info('[ai-create-node][args]', { keys: Object.keys(args||{}).length }); } catch {} send({ type: 'args', args }); return 'ok'; } catch (e) { try { console.warn('[ai-create-node][args][error]', e?.message||e); } catch {} return 'error'; } }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'set_node_description',
      description: 'Propose une description courte (une phrase) pour le nœud.',
      schema: {},
      func: async (input) => { try { let text = ''; if (typeof input === 'string') text = input; else if (input && typeof input==='object') text = String(input.description ?? input.text ?? ''); pendingDesc = text; try { console.info('[ai-create-node][desc]', { len: (text||'').length }); } catch {} send({ type:'desc', text }); return 'ok'; } catch (e) { try { console.warn('[ai-create-node][desc][error]', e?.message||e); } catch {} return 'error'; } }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'emit_graph',
      description: 'Émet le graphe final (APPELER EXACTEMENT UNE FOIS). input: { templateKey, args, description }',
      schema: {},
      func: async (input) => {
        try {
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
          const finalArgs = (input && typeof input==='object' && input.args) ? input.args : (pendingArgs || {});
          const finalDesc = (input && typeof input==='object' && (input.description || input.text)) ? (input.description || input.text) : (pendingDesc || '');
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
          // Build templateObj exactly like frontend/flow-agent
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
            authorize_catch_error: tpl.authorize_catch_error,
            authorize_skip_error: tpl.authorize_skip_error,
            allowWithoutCredentials: tpl.allowWithoutCredentials,
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
          if (emittedFinal && String(ev.name||'') === 'emit_graph') { try { done(); } catch {} break; }
        }
      } catch {}
    }
    if (!emittedFinal) done();
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
