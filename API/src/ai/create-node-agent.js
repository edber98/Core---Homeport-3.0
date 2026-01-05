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

function systemPrompt(){
  const raw = [
    'Tu es un assistant de CRÉATION DE NŒUDS pour Homeport.',
    "But: à partir d'un prompt et d'un graphe (seedGraph), PROPOSER UN SEUL nouveau nœud à relier depuis la sortie indiquée (sourceId/sourceHandle).",
    "Étapes: 1) lister les templates compatibles, 2) choisir le meilleur template et expliquer brièvement, 3) proposer les arguments (context) pertinents et UNE courte description (1 phrase), 4) émettre le graphe final (seed + 1 nœud + 1 arête).",
    "Utilise UNIQUEMENT les tools fournis. Ne dis JAMAIS que c'est appliqué; écris seulement 'Proposition prête à être appliquée.'",
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
    try { console.info('[ai-create-node][agent] start', { sourceId, sourceHandle, hasPrompt: !!prompt, seedNodes: Array.isArray(seedGraph?.nodes)?seedGraph.nodes.length:0, seedEdges: Array.isArray(seedGraph?.edges)?seedGraph.edges.length:0, histLen: Array.isArray(history)?history.length:0 }); } catch {}

    const { DynamicStructuredTool, ChatOpenAI, createOpenAIToolsAgent, AgentExecutor, ChatPromptTemplate } = await importLC();
    const NodeTemplate = require('../db/models/node-template.model');

    const graph = seedGraph && typeof seedGraph === 'object' ? JSON.parse(JSON.stringify(seedGraph)) : { nodes: [], edges: [] };
    const nodeById = new Map((graph.nodes||[]).map(n => [String(n.id), n]));
    const source = nodeById.get(String(sourceId));
    const sourceModel = source?.data?.model || {};
    const sourceTpl = sourceModel?.templateObj || {};

    const tools = [];
    tools.push(new DynamicStructuredTool({
      name: 'list_templates',
      description: 'Liste les templates de nœuds disponibles (id, name, title, category, outputHandles).',
      schema: {},
      func: async () => {
        const list = await NodeTemplate.find({ enabled: true }).lean();
        const arr = (list||[]).map(t => ({ id: t.id || t._id, key: t.key, name: t.name, title: t.title, category: t.category, type: t.type, outputHandles: listOutputHandlesFromTemplate(t) }));
        return JSON.stringify(arr);
      }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'get_source_info',
      description: "Retourne les infos de la source (id, template type, handle choisi, label d'edge).",
      schema: {},
      func: async () => {
        const handle = String(sourceHandle || 'ok');
        const out = { id: String(sourceId), templateType: String(sourceTpl?.type||sourceTpl?.id||''), handle };
        return JSON.stringify(out);
      }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'set_node_args',
      description: 'Propose les arguments finals pour le nœud à créer (context).',
      schema: {},
      func: async (input) => { try { const args = (input && typeof input === 'object') ? input : {}; send({ type: 'args', args }); return 'ok'; } catch { return 'error'; } }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'set_node_description',
      description: 'Propose une description courte (une phrase) pour le nœud.',
      schema: {},
      func: async (input) => { try { let text = ''; if (typeof input === 'string') text = input; else if (input && typeof input==='object') text = String(input.description ?? input.text ?? ''); send({ type:'desc', text }); return 'ok'; } catch { return 'error'; } }
    }));
    tools.push(new DynamicStructuredTool({
      name: 'emit_graph',
      description: 'Émet le graphe final. input: { templateKey, args, description }',
      schema: {},
      func: async (input) => {
        try {
          const tplKey = String(input?.templateKey || input?.template || '');
          if (!tplKey) return 'missing_template';
          const tpl = await NodeTemplate.findOne({ key: tplKey }).lean();
          if (!tpl) return 'template_not_found';
          const newId = 'n_' + Math.random().toString(36).slice(2, 10);
          const node = { id: newId, type: 'html-template', point: { x: source?.point?.x || 0, y: (source?.point?.y || 0) + 160 }, data: { model: { id: newId, name: tpl.name || tpl.title || tpl.type || 'Node', template: tpl.id, templateObj: tpl, context: (input?.args || {}), description: String(input?.description || '') } } };
          const edge = { id: `${sourceId}->${newId}:${sourceHandle}:in`, type: 'template', source: String(sourceId), target: newId, sourceHandle: String(sourceHandle || 'ok'), targetHandle: 'in' };
          const out = { nodes: [...(graph.nodes||[]), node], edges: [...(graph.edges||[]), edge] };
          send({ type:'final', graph: out });
          return 'ok';
        } catch (e) { send({ type:'error', code:'emit_failed', message: e?.message||String(e) }); return 'error'; }
      }
    }));

    const model = new ChatOpenAI({ temperature: 0, modelName: process.env.OPENAI_MODEL || 'gpt-4o', openAIApiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_APIKEY || '', streaming: true });
    const promptT = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt()],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);
    const agent = await createOpenAIToolsAgent({ llm: model, tools, prompt: promptT });
    const executor = new AgentExecutor({ agent, tools });
    const inputText = String(prompt||'').trim();
    try { send({ type: 'message', role: 'assistant', text: 'Démarrage de l'assistant de création…' }); } catch {}
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
        }
      } catch {}
    }
    done();
  } catch (e) { try { console.error('[ai-create-node][agent_failed]', e?.stack || e?.message || e); } catch {}; send({ type:'error', code:'agent_failed', message: e?.message || String(e) }); done(); }
}

module.exports = { runCreateNodeAgent };

