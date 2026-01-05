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
// NOTE: removed zod — dynamic tools use permissive schemas

function systemPromptBase(){
  const raw = [
    'Tu es un assistant spécialisé pour PROPOSER les arguments (context) d’un nœud et une description courte du nœud dans Homeport.',
    "Utilise UNIQUEMENT les tools fournis pour: 1) récupérer le schéma, 2) lister les nœuds précédents (noms, descriptions), 3) récupérer les scénarios simulés (msgIn), 4) récupérer les infos du nœud si utile (get_node_info), 5) émettre tes propositions via les tools (pas dans le message).",
    "Objectif: produire des valeurs concrètes et cohérentes pour les champs du schéma en te basant sur les descriptions des champs, du nœud, des nœuds précédents et le msgIn du scénario; et PROPOSER une description claire et concise du nœud (1–2 phrases) qui reflète ce qu’il fait.",
    "Astuce: appelle get_scenarios puis get_msgin_preview pour synthétiser les infos utiles (ex: 'Prénom: …, Nom: …, …') et les intégrer dans le prompt.",
    "Contraintes: réponds en français; ne change PAS la structure du schéma; n’affiche PAS de listes exhaustives (schéma, nœuds, scénarios) dans le message; n’écho PAS le contexte brut.",
    "SI TU AS ASSEZ D’INFORMATIONS: tu DOIS appeler set_node_args (avec les champs pertinents seulement) ET set_node_description (1–2 phrases). N’écris PAS les valeurs dans ton message; utilise les tools.",
    "Injection de chemins: lorsque la valeur d’un argument vient d’un message précédent (msgIn) ou du résultat d’un nœud antérieur, n’insère PAS de valeur littérale — insère un chemin de template Homeport entre {{ }}:",
    "- Si la donnée est dans msgIn.payload: utilise {{payload.clef}} (ex: {{payload.first_name}}).",
    "- Si la donnée vient d’un nœud précédent: utilise {{<nodeId>.clef}} où <nodeId> est l’identifiant vu dans msgIn (ex: {{start_form_startform_abc.first_name}} ou {{function_xxx.text}}).",
    "- Ne devine pas de clés; base-toi sur les clés observées via get_scenarios/get_msgin_preview (payloadKeys et clés de nœuds).",
    "- Préfère les chemins stables et explicites; n’injecte PAS de valeurs statiques quand un chemin est disponible.",
    "SI UNE INFORMATION MANQUE: pose UNE question courte et précise, sinon propose directement via les tools.",
    "Important: ne dis jamais que la configuration est appliquée. Dans tes messages, écris seulement: 'Proposition prête à être appliquée.' (ou pose ta question si nécessaire).",
    "Description: très courte (≈ une phrase, ~120 caractères max), en tenant compte de la description actuelle si pertinente (via get_node_info).",
    "Garde les messages très courts (max 1 phrase) et utiles.",
  ].join('\n');
  return escapeForLangChain(raw);
}

async function buildToolsLC({ DynamicStructuredTool, flowId, nodeId, branch, send, getFlow }){
  // getFlow est fourni par l'appelant (peut retourner un seedGraph override)
  const ensureGetFlow = typeof getFlow === 'function' ? getFlow : async () => { throw new Error('getFlow_not_provided'); };

  // Mémo du dernier scénario choisi
  let lastScenario = null;

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
      name: 'get_node_info',
      description: "Retourne les infos du nœud (id, name, description courante, template title).",
      schema: {},
      func: async () => {
        const graph = await ensureGetFlow();
        const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const n = nodes.find(x => String(x.id) === String(nodeId));
        const model = (n?.data && n.data.model) ? n.data.model : (n?.data || {});
        const tpl = model?.templateObj || {};
        const out = { id: String(nodeId), name: model?.name || tpl?.title || tpl?.name || '', description: model?.description || '', templateTitle: tpl?.title || '' };
        return JSON.stringify(out);
      }
    }),
    new DynamicStructuredTool({
      name: 'get_node_schema',
      description: "Récupère le schéma d'arguments du nœud (fields/steps).",
      schema: {},
      func: async () => {
        const graph = await ensureGetFlow();
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
        const graph = await ensureGetFlow();
        const arr = listPredecessors(graph, nodeId);
        console.log("arrarr", arr)
        return JSON.stringify(arr);
      }
    }),
    new DynamicStructuredTool({
      name: 'get_scenarios',
      description: 'Simule les scénarios vers le nœud cible et retourne le msgIn du scénario sélectionné (si disponible).',
      schema: {},
      func: async () => {
        const graph = await ensureGetFlow();
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
        try {
          lastScenario = chosen;
          console.info('[ai-args][get_scenarios]', { total: arr.length, pickedIndex: (chosen && chosen.index != null) ? chosen.index : -1, keys: keys.length });
          const full = (chosen && chosen.msgIn && typeof chosen.msgIn === 'object') ? chosen.msgIn : {};
          const payload = full && typeof full === 'object' ? (full.payload || {}) : {};
          const rootKeys = Object.keys(full || {});
          const payloadKeys = Object.keys(payload || {});
          // Console log complet (tronqué) pour debug backend
          try {
            const j = JSON.stringify(full);
            console.info('[ai-args][get_scenarios][msgIn]', { rootKeys, payloadKeys, size: j.length });
            console.info('[ai-args][get_scenarios][msgIn.json]', j.length > 1200 ? j.slice(0, 1200) + '…' : j);
          } catch {}
          // Emit concise debug messages pour l'UI
          send({ type:'message', role:'assistant', text: `[tool] msgIn keys=${keys.length} payloadKeys=${payloadKeys.length}` });
          const prev = JSON.stringify({ payload }, null, 0);
          const short = prev.length > 500 ? prev.slice(0, 500) + '…' : prev;
          send({ type:'message', role:'assistant', text: `[tool] msgIn.payload ${short}` });
        } catch {}
        
        
    return  JSON.stringify({ total: arr.length, selected: chosen ? { label: chosen.label, index: (chosen.index != null ? chosen.index : 0), msgIn: chosen.msgIn, msgKeys: keys } : null });

  }
    }),
    new DynamicStructuredTool({
      name: 'get_msgin_preview',
      description: "Retourne une synthèse texte des valeurs utiles du msgIn sélectionné (ex: 'Prénom: …, Nom: …, …').",
      schema: {},
      func: async () => {
        try {
          const graph = await ensureGetFlow();
          // Si aucun scénario en cache, calculer par défaut
          if (!lastScenario) {
            const { simulateViaEngineSplit, simulateViaEngine } = require('../utils/flow-simulate-engine');
            let data = null;
            try { data = await simulateViaEngineSplit(graph, String(nodeId)); }
            catch { try { data = await simulateViaEngine(graph, String(nodeId)); } catch {} }
            if (!data) { const { simulateScenarios } = require('../utils/flow-simulate'); data = simulateScenarios(graph, String(nodeId), 'all'); }
            const arr = Array.isArray(data?.scenarios) ? data.scenarios : [];
            lastScenario = arr[0] || null;
          }
          const msg = (lastScenario && lastScenario.msgIn) ? lastScenario.msgIn : {};

          try {
            const startEntry = Object.entries(msg || {}).find(([k,v]) => /^start_/i.test(String(k)) && v && typeof v === 'object');
            const startKeys = startEntry ? Object.keys(startEntry[1] || {}) : [];
            console.info('[ai-args][msg_preview][start_keys]', { node: startEntry ? startEntry[0] : null, keys: startKeys });
          } catch {}

          // Heuristique: privilégier les champs du start_form si accessibles; sinon payload + racine
          const pairs = [];
          const pushPair = (k, v) => {
            const val = (v == null) ? '' : (typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : (typeof v === 'boolean' ? (v?'true':'false') : '…')));
            if (k && val !== '') pairs.push(`${k}: ${val}`);
          };
          try {
            // payload keys
            if (msg && typeof msg === 'object' && msg.payload && typeof msg.payload === 'object') {
              const entries = Object.entries(msg.payload).slice(0, 8);
              for (const [k,v] of entries) pushPair(k, v);
            }
          } catch {}
          try {
            // Aperçu des clés racines (inclure aussi les résultats de fonctions)
            const entries = Object.entries(msg).filter(([k,_]) => k !== '_nodes' && k !== 'payload').slice(0, 6);
            for (const [k,v] of entries) {
              if (v == null) continue;
              const t = typeof v;
              if (t === 'string' || t === 'number' || t === 'boolean') { pushPair(k, v); continue; }
              if (t === 'object') {
                // Extraire rapidement quelques scalaires de l'objet (ex: résultats de fonctions)
                try {
                  let count = 0;
                  for (const [sk, sv] of Object.entries(v)){
                    const ts = typeof sv;
                    if (ts === 'string' || ts === 'number' || ts === 'boolean') { pushPair(`${k}.${sk}`, sv); count++; }
                    if (count >= 3) break;
                  }
                } catch {}
              }
            }
          } catch {}
          const text = pairs.length ? pairs.join(', ') : '';

          try { console.info('[ai-args][msg_preview]', { len: text.length, fields: pairs.length }); } catch {}
          console.log("texxxxt", text)
          return JSON.stringify({ text, fields: pairs.length });
        } catch (e) { try { console.warn('[ai-args][msg_preview][error]', e?.message||e); } catch {} return 'error'; }
      }
    }),
    new DynamicStructuredTool({
      name: 'set_node_args',
      description: "Propose les valeurs finales des arguments du nœud (context). Appeler ce tool une fois les décisions prises.",
      schema: {},
      func: async (input) => {
        try {
          const args = (input && typeof input === 'object') ? (input.args && typeof input.args==='object' ? input.args : input) : {};
          const keys = Object.keys(args || {});
          if (!keys.length) {
            try { console.warn('[ai-args][set_node_args] empty_args_ignored'); } catch {}
            send({ type: 'error', code: 'args_empty', message: 'Aucun argument fourni dans set_node_args' });
            return 'args_empty';
          }
          send({ type: 'args', args });
          return 'ok';
        } catch (e) { return 'error'; }
      }
    }),
    new DynamicStructuredTool({
      name: 'set_node_description',
      description: 'Propose une description courte et précise du nœud (1–2 phrases).',
      schema: {},
      func: async (input) => {
        try {
          let text = '';
          try {
            if (typeof input === 'string') text = input; else if (input && typeof input === 'object') text = String(input.description ?? input.text ?? '');
            else text = '';
          } catch { text = ''; }
          try {
            const prev = String(text || '');
            const short = prev.length > 160 ? prev.slice(0,160) + '…' : prev;
            console.info('[ai-args][set_node_description]', { len: prev.length, preview: short });
          } catch {}
          if (!text.trim()) { send({ type: 'error', code: 'desc_empty', message: 'Description vide' }); return 'desc_empty'; }
          send({ type: 'desc', text });
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

async function runArgsAgentWithTools({ prompt, flowId, nodeId, branch = null, history = [], send, done, seedGraphOverride = null }){
  // Track whether concrete proposals were produced; otherwise, signal clarification
  let proposedArgs = false;
  let proposedDesc = false;
  let lastAssistantText = '';
  const localSend = (obj) => {
    try {
      if (obj && obj.type === 'args') {
        const k = Object.keys(obj.args || {});
        if (k.length) proposedArgs = true;
      }
      if (obj && obj.type === 'desc') {
        if (obj.text && String(obj.text).trim().length) proposedDesc = true;
      }
      if (obj && obj.type === 'message' && obj.text) lastAssistantText = String(obj.text || '').trim();
    } catch {}
    try { send(obj); } catch {}
  };
  const emitMessage = (text) => { if (text) localSend({ type: 'message', role: 'assistant', text }); };
  try {
    try { console.info('[ai-args] start', { flowId: String(flowId||''), nodeId: String(nodeId||''), branch: branch ? String(branch) : null, promptLen: (String(prompt||'').length||0), histLen: Array.isArray(history) ? history.length : 0 }); } catch {}
    const { DynamicStructuredTool, ChatOpenAI, createOpenAIToolsAgent, AgentExecutor, ChatPromptTemplate } = await importLC();
    // Prépare getFlow: seedGraph override ou chargement DB
    const { Types } = require('mongoose');
    const Flow = require('../db/models/flow.model');
    const getFlow = async () => {
      if (seedGraphOverride && typeof seedGraphOverride === 'object') return seedGraphOverride;
      let flow = null; const fid = String(flowId || '');
      if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid).lean();
      if (!flow) flow = await Flow.findOne({ id: fid }).lean();
      if (!flow) throw new Error('flow_not_found');
      return flow.graph || flow;
    };
    const tools = await buildToolsLC({ DynamicStructuredTool, flowId, nodeId, branch, send: localSend, getFlow });
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
    const rawPrompt = String(prompt || '').trim();
    const usedDefault = rawPrompt.length === 0;
    const inputText = usedDefault ? 'Complète les arguments pour ce nœud en utilisant get_node_schema, list_predecessors et get_scenarios. Pose une question si nécessaire.' : rawPrompt;
    try { console.info('[ai-args][prompt]', { usedDefault, len: inputText.length, text: inputText }); } catch {}
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
          localSend({ type: 'tool.start', name: ev.name, args });
        } else if (ev.event === 'on_tool_end') {
          try { console.info('[ai-args][tool] end', ev.name); } catch {}
          localSend({ type: 'tool.end', name: ev.name, ok: true });
        } else if (ev.event === 'on_chain_error' || ev.event === 'on_tool_error' || ev.event === 'on_chat_model_error') {
          const emsg = ev?.data?.error?.message || ev?.data?.error || 'stream_error';
          try { console.error('[ai-args][stream][error]', emsg); } catch {}
          localSend({ type: 'error', code: 'llm_stream_error', message: String(emsg) });
        }
      } catch {}
    }
    try { console.info('[ai-args] done'); } catch {}
    // If nothing was proposed, signal that the agent awaits user clarification
    try {
      if (!proposedArgs && !proposedDesc) {
        const question = (lastAssistantText || '').trim();
        localSend({ type: 'await_user', question });
      }
    } catch {}
    done();
  } catch (e) {
    const msg = e?.message || String(e);
    try { console.error('[ai-args][agent_failed]', e?.stack || msg); } catch {}
    send({ type: 'error', code: 'agent_failed', message: msg });
    done();
  }
}

module.exports = { runArgsAgentWithTools };
