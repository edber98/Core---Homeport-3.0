// Workflow Agent v2 — LangChain tools agent (v2 handles)

function buildRuntimeTools(ctx){
  let templates, graph, context, layout;
  try { templates = require('./tools/templates')(ctx); } catch (e) { try { console.error('[ai-workflow-v2] require tools/templates failed', e?.message || e); } catch {} throw e; }
  try { graph = require('./tools/graph')(ctx); } catch (e) { try { console.error('[ai-workflow-v2] require tools/graph failed', e?.message || e); } catch {} throw e; }
  try { context = require('./tools/context')(ctx); } catch (e) { try { console.error('[ai-workflow-v2] require tools/context failed', e?.message || e); } catch {} throw e; }
  try { layout = require('./tools/layout')(ctx); } catch (e) { try { console.error('[ai-workflow-v2] require tools/layout failed', e?.message || e); } catch {} throw e; }
  return { ...templates, ...graph, ...context, ...layout };
}

async function importLC(){
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

async function runWorkflowAgentV2({ prompt, flowId, workspaceId, action, history = [], send, done }){
  const ctx = { prompt, flowId, workspaceId, send, done };
  try { console.log('[ai-workflow-v2] init', { flowId, workspaceId }); } catch {}
  let toolsImpl;
  try { toolsImpl = buildRuntimeTools(ctx); } catch (e) {
    try { console.error('[ai-workflow-v2] build tools error', e?.message || e); } catch {}
    try { send({ type:'error', code:'buildtools_failed', message: String(e?.message || e) }); } catch {}
    try { send({ type:'done' }); } catch {}
    try { done?.(); } catch {}
    return;
  }
  try { console.log('[ai-workflow-v2] stream start', { flowId, workspaceId, history: Array.isArray(history) ? history.length : 0 }); send({ type: 'message', role: 'assistant', text: '[ai-workflow-v2] start' }); } catch {}
  // Envoyer un snapshot initial du workflow courant pour contexte
  try {
    const snap0 = await (async () => {
      try { return await buildRuntimeTools(ctx).list_graph(); } catch { return null; }
    })();
    if (snap0 && snap0.graph) {
      try {
        const nn = Array.isArray(snap0.graph.nodes) ? snap0.graph.nodes.length : 0;
        const ee = Array.isArray(snap0.graph.edges) ? snap0.graph.edges.length : 0;
        const types = (snap0.graph.nodes||[]).map(n => (n && n.data && n.data.model && n.data.model.templateObj && n.data.model.templateObj.type) || null).filter(Boolean);
        console.log('[ai-workflow-v2][snapshot0]', { nodes: nn, edges: ee, types });
      } catch {}
      send({ type: 'snapshot', graph: snap0.graph });
      // Si le graphe est vide, poser une question de départ (IA guidée, pas heuristique de contenu)
      try {
        const nn = Array.isArray(snap0.graph.nodes) ? snap0.graph.nodes.length : 0;
        if (nn === 0) {
          const tt = await buildRuntimeTools(ctx).get_templates_v2?.({});
          const list = Array.isArray(tt?.templates) ? tt.templates : [];
          const startChoices = list.filter(t => ['start','start_form','event','trigger','endpoint'].includes(String(t.type||'').toLowerCase()))
                                   .slice(0, 6)
                                   .map(t => ({ key: t.key || t.name, label: t.title || t.name }));
          send({ type: 'question', text: 'Aucun départ détecté. Quel nœud de départ souhaitez-vous créer ?', choices: startChoices });
        }
      } catch {}
    }
  } catch {}

  let z; try { ({ z } = require('zod')); } catch {}
  try {
    const { DynamicStructuredTool, ChatOpenAI, createOpenAIToolsAgent, AgentExecutor, ChatPromptTemplate } = await importLC();
    function mkTool(name, schema, fn, description){
      const cfg = {
        name,
        description: description || name,
        schema: schema || ((z && z.object) ? z.object({}) : undefined),
        func: async (args) => {
          const a = args || {};
          try {
            try { console.log('[ai-workflow-v2][tool][start]', name, a); } catch {}
            const out = await fn(a);
            try { console.log('[ai-workflow-v2][tool][end]', name, { ok: !!(out && out.success), keys: out && typeof out==='object' ? Object.keys(out) : [] }); } catch {}
            try { send({ type: 'message', role: 'assistant', text: `[tool:${name}] ok` }); } catch (e1) {}
            return JSON.stringify(out || {});
          } catch (e) {
            try { console.error('[ai-workflow-v2][tool][error]', name, (e && e.message) || e); } catch {}
            try { send({ type: 'error', code: `tool_${name}_failed`, message: String((e && e.message) || e) }); } catch (e2) {}
            return JSON.stringify({ success: false, error: String((e && e.message) || e) });
          }
        }
      };
      return new DynamicStructuredTool(cfg);
    }
    const tools = [];
    const obj = z && z.object ? z.object.bind(z) : undefined;
    const str = z && z.string ? z.string.bind(z) : undefined;
    const any = z && z.any ? z.any.bind(z) : undefined;
    const listGraphSchema = obj ? obj({}) : undefined;
    const addNodeSchema = obj && str && any ? obj({ templateKey: str(), title: str().optional(), subtitle: str().optional(), near: (any()).optional() }) : undefined;
    const removeNodeSchema = obj && str ? obj({ nodeId: str() }) : undefined;
    const replaceNodeSchema = obj && str ? obj({ nodeId: str(), templateKey: str() }) : undefined;
    const connectSchema = obj && str ? obj({ sourceId: str(), targetId: str(), sourceHandle: str().optional(), targetHandle: str().optional() }) : undefined;
    const connectByNameSchema = obj && str ? obj({ sourceId: str(), targetId: str(), outputName: str() }) : undefined;
    const templatesSchema = obj ? obj({}) : undefined;
    const outputOptionsSchema = obj && str ? obj({ nodeId: str() }) : undefined;
    const autoLayoutSchema = obj && str ? obj({ orientation: str().optional() }) : undefined;

    if (toolsImpl.list_graph) tools.push(mkTool('list_graph', listGraphSchema , toolsImpl.list_graph, 'Liste le graphe actuel'));
    if (toolsImpl.ensure_start) tools.push(mkTool('ensure_start', obj ? obj({ prefer: str ? str().optional() : undefined }) : undefined, toolsImpl.ensure_start, 'Garantit un nœud de départ'));
    if (toolsImpl.add_node) tools.push(mkTool('add_node', addNodeSchema, toolsImpl.add_node, 'Ajoute un nœud par template'));
    if (toolsImpl.remove_node) tools.push(mkTool('remove_node', removeNodeSchema, toolsImpl.remove_node, 'Supprime un nœud'));
    if (toolsImpl.replace_node) tools.push(mkTool('replace_node', replaceNodeSchema, toolsImpl.replace_node, 'Remplace un nœud'));
    if (toolsImpl.connect) tools.push(mkTool('connect', connectSchema, toolsImpl.connect, 'Connecte deux nœuds (handles typés)'));
    if (toolsImpl.connect_by_output_name) tools.push(mkTool('connect_by_output_name', connectByNameSchema, toolsImpl.connect_by_output_name, 'Connecte par nom de sortie'));
    if (toolsImpl.get_templates_v2) tools.push(mkTool('get_templates_v2', templatesSchema, toolsImpl.get_templates_v2, 'Liste des templates v2'));
    if (toolsImpl.get_output_options) tools.push(mkTool('get_output_options', outputOptionsSchema, toolsImpl.get_output_options, 'Options de sorties d’un nœud'));
    if (toolsImpl.auto_layout) tools.push(mkTool('auto_layout', autoLayoutSchema, toolsImpl.auto_layout, 'Auto-layout du graphe'));
    // context tools (si disponibles)
    if (toolsImpl.get_node_args_schema) tools.push(mkTool('get_node_args_schema', obj && str ? obj({ nodeId: str() }) : undefined, toolsImpl.get_node_args_schema, 'Schéma des arguments d’un nœud'));
    if (toolsImpl.get_output_schema) tools.push(mkTool('get_output_schema', obj && str ? obj({ nodeId: str(), handleId: str() }) : undefined, toolsImpl.get_output_schema, 'Schéma de sortie pour un handle'));
    if (toolsImpl.create_node_context) tools.push(mkTool('create_node_context', obj && str ? obj({ nodeId: str(), context: (obj ? obj({}).passthrough() : undefined) }) : undefined, toolsImpl.create_node_context, 'Crée/assigne le contexte d’un nœud'));
    if (toolsImpl.validate_node_params) tools.push(mkTool('validate_node_params', obj && str ? obj({ nodeId: str() }) : undefined, toolsImpl.validate_node_params, 'Valide les paramètres d’un nœud'));
    if (toolsImpl.propose_context_mapping) tools.push(mkTool('propose_context_mapping', obj && str ? obj({ sourceId: str(), handleId: str(), targetId: str() }) : undefined, toolsImpl.propose_context_mapping, 'Propose un mapping de contexte'));

    const system = [
      'Tu es un agent de génération/édition de workflows Homeport (v2).',
      'Utilise UNIQUEMENT les tools fournis; n\'écris pas de JSON de graphe directement.',
      'Toujours travailler sur le workflow courant: commence par list_graph pour connaître les nœuds/liaisons existants.',
      'Important: ne crée JAMAIS un deuxième nœud de départ (start/start_form/event/trigger). S\'il existe déjà, réutilise-le et ajoute la suite après ce nœud.',
      'Si aucun nœud de départ n\'existe, POSE une question concise pour choisir le type de départ (ex: formulaire, webhook, événement).',
      'Si un formulaire de départ (start_form) existe déjà, enchaîne directement les actions (ex: envoi d\'email) après ce départ (pas de doublon).',
      'Objectif: comprendre la demande, puis appeler les tools pour ajouter/modifier/remplacer/relier, et terminer par un snapshot.',
      'Pour paramétrer un nœud, récupère d\'abord son schéma d\'arguments (get_node_args_schema), puis propose un mapping depuis le message entrant (propose_context_mapping) et applique via create_node_context. Valide ensuite (validate_node_params) et complète si besoin.',
      'Pour relier des nœuds par nom de sortie, liste d’abord les options (get_output_options) puis connecte (connect_by_output_name).',
      'Respecte les handles typés (outputHandles/inputHandles). Fais l’autolayout si nécessaire.',
      'Réponds avec des messages concis pendant le streaming.'
    ].join('\n');
    const model = new ChatOpenAI({ temperature: 0, modelName: process.env.OPENAI_MODEL || 'gpt-4o', openAIApiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_APIKEY || '', streaming: true });
    const promptT = ChatPromptTemplate.fromMessages([
      ['system', system],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);
    const agent = await createOpenAIToolsAgent({ llm: model, tools, prompt: promptT });
    const executor = new AgentExecutor({ agent, tools });
    send({ type:'message', role:'assistant', text:'Agent v2 initialisé. Démarrage du streaming…' });
    const instruction = String(prompt || '').trim();
    const stream = await executor.streamEvents({ input: instruction, chat_history: (Array.isArray(history)?history:[]) }, { version: 'v2' });
    for await (const event of stream) {
      try {
        if (event.event === 'on_chat_model_stream') {
          const chunk = event.data?.chunk;
          if (chunk?.content) send({ type:'message', role:'assistant', text: chunk.content });
        } else if (event.event === 'on_tool_start') {
          try { send({ type: 'message', role:'assistant', text: `[tool] ${event.name}…` }); } catch {}
        } else if (event.event === 'on_tool_end') {
          try { send({ type: 'message', role:'assistant', text: `[tool] ${event.name} ✓` }); } catch {}
        }
      } catch {}
    }
    // Envoyer un final avec le graphe résultant
    try {
      const fin = await toolsImpl.list_graph?.({});
      if (fin && fin.graph) send({ type: 'final', graph: fin.graph });
    } catch {}
  } catch (e) { try { console.error('[ai-workflow-v2] error', e?.message || e); send({ type: 'error', code: 'agent_failed', message: String(e?.message || e) }); } catch {} }
  finally { try { send({ type: 'done' }); done?.(); } catch {} }
}

module.exports = { runWorkflowAgentV2 };
