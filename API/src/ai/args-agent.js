// Args Agent — specialized assistant to propose/fill node arguments using scenarios and graph context
// Streams SSE messages via provided send(); does not mutate DB directly.

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

function escapeForLangChain(text){
  return String(text || '').replace(/\{/g, '{{').replace(/\}/g, '}}');
}

function systemPromptBase(){
  const raw = [
    'Tu es un assistant spécialisé pour compléter les arguments (context) d’un nœud dans Homeport.',
    "Utilise UNIQUEMENT les tools fournis pour: 1) récupérer le schéma, 2) lister les nœuds précédents (noms, descriptions), 3) récupérer les scénarios simulés (msgIn).",
    "Objectif: produire des valeurs concrètes et cohérentes pour les champs du schéma en te basant sur les descriptions des champs, du nœud, des nœuds précédents et le msgIn du scénario.",
    "Contraintes: réponds en français; ne change PAS la structure du schéma; n’affiche PAS de listes exhaustives (schéma, nœuds, scénarios) dans le message; n’écho PAS le contexte brut.",
    "Pose une question UNIQUEMENT si une information est réellement ambigüe, et limite-toi à UNE question courte; sinon, propose directement les valeurs.",
    "Garde des réponses courtes et utiles (1–3 phrases), sans répéter le contexte.",
  ].join('\n');
  return escapeForLangChain(raw);
}

async function buildToolsLC({ DynamicStructuredTool, flowId, nodeId, branch, send }){
  // Load flow graph lazily
  const { Types } = require('mongoose');
  const Flow = require('../db/models/flow.model');
  const getFlow = async () => {
    let flow = null;
    const fid = String(flowId || '');
    if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid).lean();
    if (!flow) flow = await Flow.findOne({ id: fid }).lean();
    if (!flow) throw new Error('flow_not_found');
    return flow.graph || flow;
  };

  const listPredecessors = (graph, targetId) => {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const prev = new Set();
    const rev = {};
    for (const e of edges) { const t = String(e.target||''); const s = String(e.source||''); if (!rev[t]) rev[t] = []; rev[t].push(s); }
    const stack = [String(targetId||'')];
    const seen = new Set(stack);
    while (stack.length){
      const t = stack.pop();
      for (const s of (rev[t]||[])){
        if (!seen.has(s)) { seen.add(s); stack.push(s); prev.add(s); }
      }
    }
    const byId = new Map(nodes.map(n => [String(n.id), n]));
    const out = [];
    for (const id of prev) {
      const n = byId.get(String(id)); if (!n) continue;
      const model = (n.data && n.data.model) ? n.data.model : (n.data || {});
      const tpl = model?.templateObj || {};
      const name = model?.name || tpl?.title || tpl?.name || String(id);
      out.push({ id: String(id), name: String(name||''), type: String(tpl?.type||tpl?.id||tpl?.name||''), description: String(model?.description || '') });
    }
    return out;
  };
  const flattenKeys = (obj, prefix = '') => {
    const out = [];
    try {
      if (obj && typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          const p = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flattenKeys(v, p));
          else out.push(p);
        }
      }
    } catch {}
    return out;
  };

  return [
    new DynamicStructuredTool({
      name: 'get_node_schema',
      description: "Récupère le schéma d'arguments du nœud (fields/steps).",
      schema: {},
      func: async () => {
        const graph = await getFlow();
        const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const n = nodes.find(x => String(x.id) === String(nodeId));
        const model = (n?.data && n.data.model) ? n.data.model : (n?.data || {});
        const schema = model?.templateObj?.args || null;
        return JSON.stringify(schema || {});
      }
    }),
    new DynamicStructuredTool({
      name: 'list_predecessors',
      description: 'Liste les nœuds précédents (id, nom, type, description).',
      schema: {},
      func: async () => {
        const graph = await getFlow();
        const arr = listPredecessors(graph, nodeId);
        return JSON.stringify(arr);
      }
    }),
    new DynamicStructuredTool({
      name: 'get_scenarios',
      description: 'Simule les scénarios vers le nœud cible et retourne le msgIn du scénario sélectionné (si disponible).',
      schema: {},
      func: async () => {
        const graph = await getFlow();
        // Prefer engine split when available
        const { simulateViaEngineSplit, simulateViaEngine } = require('../utils/flow-simulate-engine');
        let data = null;
        try { data = await simulateViaEngineSplit(graph, String(nodeId)); }
        catch { try { data = await simulateViaEngine(graph, String(nodeId)); } catch {} }
        if (!data) { const { simulateScenarios } = require('../utils/flow-simulate'); data = simulateScenarios(graph, String(nodeId), 'all'); }
        const arr = Array.isArray(data?.scenarios) ? data.scenarios : [];
        // Optional: pick by branch handle
        let picked = null;
        if (branch) {
          try {
            for (const sc of arr) {
              const edges = (sc?.path?.edges)||[];
              if (edges.some(e => String(e.targetId) === String(nodeId) && String(e.sourceHandle||'') === String(branch))) { picked = sc; break; }
            }
          } catch {}
        }
        const chosen = picked || arr[0] || null;
        const keys = chosen && chosen.msgIn ? flattenKeys(chosen.msgIn) : [];
        return JSON.stringify({ total: arr.length, selected: chosen ? { label: chosen.label, index: chosen.index, msgIn: chosen.msgIn, msgKeys: keys } : null });
      }
    }),
    new DynamicStructuredTool({
      name: 'set_node_args',
      description: "Propose les valeurs finales des arguments du nœud (context). Appeler ce tool une fois les décisions prises.",
      schema: {},
      func: async (input) => {
        try {
          const args = (input && typeof input === 'object') ? input : {};
          send({ type: 'args', args });
          return 'ok';
        } catch (e) { return 'error'; }
      }
    })
  ];
}

function normalizeHistory(h) {
  if (!Array.isArray(h)) return [];
  return h.filter(m => m && typeof m === 'object' && m.role && (m.content != null)).map(m => ({ role: String(m.role), content: String(m.content) }));
}

async function runArgsAgentWithTools({ prompt, flowId, nodeId, branch = null, history = [], send, done }){
  const emitMessage = (text) => { if (text) send({ type: 'message', role: 'assistant', text }); };
  try {
    try { console.info('[ai-args] start', { flowId: String(flowId||''), nodeId: String(nodeId||''), branch: branch ? String(branch) : null, promptLen: (String(prompt||'').length||0), histLen: Array.isArray(history) ? history.length : 0 }); } catch {}
    const { DynamicStructuredTool, ChatOpenAI, createOpenAIToolsAgent, AgentExecutor, ChatPromptTemplate } = await importLC();
    const tools = await buildToolsLC({ DynamicStructuredTool, flowId, nodeId, branch, send });
    try { console.info('[ai-args] tools ready', tools.map(t => t?.name).filter(Boolean)); } catch {}
    const model = new ChatOpenAI({
      temperature: 0,
      modelName: process.env.OPENAI_MODEL || 'gpt-4o',
      openAIApiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_APIKEY || '',
      streaming: true,
    });
    const promptT = ChatPromptTemplate.fromMessages([
      ['system', systemPromptBase()],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);
    const agent = await createOpenAIToolsAgent({ llm: model, tools, prompt: promptT });
    const executor = new AgentExecutor({ agent, tools });
    const inputText = String(prompt || '').trim() || 'Complète les arguments pour ce nœud en utilisant get_node_schema, list_predecessors et get_scenarios. Pose une question si nécessaire.';
    const chatHistory = normalizeHistory(history);
    // Stream raw LangChain messages and tool logs only
    const stream = await executor.streamEvents({ input: inputText, chat_history: chatHistory }, { version: 'v2' });
    for await (const ev of stream) {
      try {
        if (ev.event === 'on_chat_model_stream') {
          const chunk = ev.data?.chunk;
          const content = chunk?.content;
          if (content) emitMessage(content);
        } else if (ev.event === 'on_tool_start') {
          const args = ev.data?.input?.input || {};
          try { console.info('[ai-args][tool] start', ev.name, { hasArgs: !!args, keys: args ? Object.keys(args) : [] }); } catch {}
          send({ type: 'tool.start', name: ev.name, args });
        } else if (ev.event === 'on_tool_end') {
          try { console.info('[ai-args][tool] end', ev.name); } catch {}
          send({ type: 'tool.end', name: ev.name, ok: true });
        } else if (ev.event === 'on_chain_error' || ev.event === 'on_tool_error' || ev.event === 'on_chat_model_error') {
          const emsg = ev?.data?.error?.message || ev?.data?.error || 'stream_error';
          try { console.error('[ai-args][stream][error]', emsg); } catch {}
          send({ type: 'error', code: 'llm_stream_error', message: String(emsg) });
        }
      } catch {}
    }
    try { console.info('[ai-args] done'); } catch {}
    done();
  } catch (e) {
    const msg = e?.message || String(e);
    try { console.error('[ai-args][agent_failed]', e?.stack || msg); } catch {}
    send({ type: 'error', code: 'agent_failed', message: msg });
    done();
  }
}

module.exports = { runArgsAgentWithTools };
