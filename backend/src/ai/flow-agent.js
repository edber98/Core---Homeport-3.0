// AI Flow Agent — Tools-only LangChain agent to build flow graphs
// Mirrors the AI Form Agent structure with DynamicStructuredTool, SSE patches, and snapshots.

let z;
try { ({ z } = require('zod')); } catch { z = undefined; }

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

function applyPatch(target, ops) {
  const parsePtr = (p) => String(p || '').replace(/^\//, '').split('/').map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  const get = (obj, parts) => parts.reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
  const ensureParent = (obj, parts, isAdd, lastToken) => {
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      const k = parts[i];
      const next = parts[i + 1];
      if (cur[k] == null) {
        const makeArray = (next !== undefined && (next === '-' || String(+next) === next)) || k === 'nodes' || k === 'edges' || (isAdd && lastToken === '-');
        cur[k] = makeArray ? [] : {};
      }
      cur = cur[k];
    }
    return cur;
  };
  const set = (obj, parts, v, opType) => {
    const last = parts[parts.length - 1];
    const parent = ensureParent(obj, parts.slice(0, -1), opType === 'add', last);
    if (Array.isArray(parent)) { if (last === '-') parent.push(v); else parent[Number(last)] = v; }
    else parent[last] = v;
  };
  const removeAt = (obj, parts) => { const last = parts[parts.length - 1]; const parent = get(obj, parts.slice(0, -1)); if (parent == null) return; if (Array.isArray(parent)) parent.splice(Number(last), 1); else delete parent[last]; };
  for (const op of ops || []) {
    const parts = parsePtr(op.path);
    if (op.op === 'add' || op.op === 'replace') set(target, parts, op.value, op.op);
    else if (op.op === 'remove') removeAt(target, parts);
  }
}

function escapeForLangChain(text){
  // Double curly braces so LangChain PromptTemplate doesn't treat them as variables
  return String(text).replace(/\{/g, '{{').replace(/\}/g, '}}');
}

function systemPrompt() {
  const raw = [
    'Tu es un agent de génération de workflows Homeport (Flow Builder).',
    'Tu utilises UNIQUEMENT les tools fournis. N’écris jamais le JSON final directement.',
    'Processus: 1) get_templates pour connaître les nœuds disponibles (type, outputs, args), 2) list_graph, 3) add_node pour Start/Triggers, 4) add_node pour les fonctions et conditions, 5) set_node_params selon les args des templates, 6) connect avec le handle de sortie approprié (préfère ok), 7) auto_place pour un placement cohérent, 8) finalize (emit_snapshot).',
    'Rappels: un seul nœud "start-like". Évite la sortie err sauf si catch_error activé et pertinent. Respecte paramsSchema/args. Préfère des chaînes simples et exemples concrets pour les valeurs par défaut.',
    'Exemples de séquences:',
    '- Webhook → HTTP → Log: add_node(trigger.http), add_node(http.request), connect(trigger->http:ok), add_node(util.log), connect(http->log:ok), set_node_params(http,{url:"https://...",method:"GET"}), finalize.',
    '- Start_Form → Transform → Endpoint: add_node(start_form), set_node_params, add_node(data.transform), connect, add_node(endpoint.http), connect, finalize.',
  ].join('\n');
  return escapeForLangChain(raw);
}

function normalizeTemplateKey(k){ return String(k||'').trim().toLowerCase().replace(/[^a-z0-9_.-]/g,'_'); }

function generateNodeId(tpl, used = new Set()){
  const type = String((tpl?.type || 'node')).toLowerCase();
  const base = String(tpl?.name || tpl?.title || tpl?.key || 'node').toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  let id = '';
  do {
    const s1 = Date.now().toString(36).slice(-4);
    const s2 = Math.random().toString(36).slice(2,6);
    id = `${type}_${base}_${s1}_${s2}`;
  } while (used.has(id));
  return id;
}

function computeNewNodePosition(source, center){
  if (!source) return { x: center.x - 90, y: center.y - 60 };
  const p = source.point || { x: center.x - 90, y: center.y - 60 };
  return { x: p.x + 240, y: p.y + 40 };
}

function findBestSourceNode(nodes, wx, wy){
  try {
    let best = null; let bestDist = Infinity;
    for (const n of nodes || []){
      const p = n?.point || { x: 0, y: 0 };
      const dx = (p.x - wx), dy = (p.y - wy); const d2 = dx*dx + dy*dy;
      if (d2 < bestDist){ best = n; bestDist = d2; }
    }
    return best;
  } catch { return null; }
}

function makeEdgeId(src, dst, sh = 'ok', th = 'in'){ return `${src}->${dst}:${sh || ''}:${th || ''}`; }

async function runFlowAgentWithTools({ prompt, history = [], seedGraph = null, workspaceId = null, send, done }){
  // In-memory graph
  let graph = seedGraph && typeof seedGraph === 'object'
    ? JSON.parse(JSON.stringify(seedGraph))
    : { nodes: [], edges: [] };

  const emitMessage = (text) => { try { console.log('[ai-flow][langchain]', text); } catch {} ; send({ type: 'message', role: 'assistant', text }); };
  const emitPatch = (ops) => { try { applyPatch(graph, ops); } catch {} ; send({ type: 'patch', ops }); };
  const emitSnapshot = () => send({ type: 'snapshot', graph });

  try {
    if (!z) throw new Error('zod_not_available');
    const { DynamicStructuredTool, ChatOpenAI, createOpenAIToolsAgent, AgentExecutor, ChatPromptTemplate } = await importLC();

    // Tools
    const tools = await buildTools({ DynamicStructuredTool, getGraph: () => graph, emitPatch, emitSnapshot, emitMessage, workspaceId });
    try { emitMessage('[langchain] tools ready: ' + tools.map(t => t.name).join(', ')); } catch {}

    const model = new ChatOpenAI({
      temperature: 0,
      modelName: process.env.OPENAI_MODEL || 'gpt-4o',
      openAIApiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_APIKEY || '',
      streaming: true,
    });
    emitMessage('[langchain] model=' + (process.env.OPENAI_MODEL || 'gpt-5') + ' key=' + (process.env.OPENAI_API_KEY ? 'set' : 'missing'));

    const promptT = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt()],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);

    const agent = await createOpenAIToolsAgent({ llm: model, tools, prompt: promptT });
    const executor = new AgentExecutor({ agent, tools });

    emitMessage('Agent Flow initialisé. Démarrage du streaming…');
    const instruction = String(prompt || '').trim();
    const stream = await executor.streamEvents({ input: instruction, chat_history: (Array.isArray(history)?history:[]) }, { version: 'v2' });
    for await (const event of stream) {
      try {
        if (event.event === 'on_chat_model_stream') {
          const chunk = event.data?.chunk;
          if (chunk?.content) emitMessage(chunk.content);
        } else if (event.event === 'on_tool_start') {
          emitMessage(`>>> tool ${event.name}`);
        } else if (event.event === 'on_tool_end') {
          emitMessage(`✓ ${event.name} ok`);
        }
      } catch {}
    }
    // Safety: ensure a start-like node exists and layout before final snapshot
    try {
      const g = graph || { nodes: [], edges: [] };
      const startLike = (g.nodes||[]).some(n => ['start','start_form','trigger'].includes(String(n?.data?.model?.templateObj?.type||'').toLowerCase()));
      if (!startLike) {
        const { DynamicStructuredTool: T } = await importLC();
        const tmpTools = await buildTools({ DynamicStructuredTool: T, getGraph: () => graph, emitPatch, emitSnapshot, emitMessage, workspaceId });
        const ensure = tmpTools.find(t => t.name === 'ensure_start');
        if (ensure) await ensure.func({ prefer: 'start' });
      }
      // Global layout pass
      try {
        const { DynamicStructuredTool: T2 } = await importLC();
        const tmp2 = await buildTools({ DynamicStructuredTool: T2, getGraph: () => graph, emitPatch, emitSnapshot, emitMessage, workspaceId });
        const layout = tmp2.find(t => t.name === 'auto_layout');
        if (layout) await layout.func({});
      } catch {}
    } catch {}
    emitSnapshot();
    try { console.log('[ai-flow][final_graph]', JSON.stringify(graph)); } catch {}
    done();
  } catch (err) {
    const msg = (err && err.stack) ? err.stack : (err?.message || String(err));
    emitMessage('[langchain][error] ' + msg);
    done();
  }
}

async function buildTools({ DynamicStructuredTool, getGraph, emitPatch, emitSnapshot, emitMessage, workspaceId }){
  // Helpers start-like
  const isStartLike = (tpl) => {
    const t = String(tpl?.type || '').toLowerCase();
    return t === 'start' || t === 'start_form' || t === 'trigger';
  };
  const hasStartLike = (g) => { try { return (g.nodes||[]).some(n => isStartLike(n?.data?.model?.templateObj)); } catch { return false; } };

  // Fetch templates from DB (filtered by workspace if needed)
  const getTemplates = async () => {
    try {
      const NodeTemplate = require('../db/models/node-template.model');
      const Workspace = require('../db/models/workspace.model');
      const allowed = new Set();
      if (workspaceId) {
        // Workspace ids in this app are custom strings (field `id`), not Mongo _id
        const ws = await Workspace.findOne({ id: String(workspaceId) }).lean();
        if (ws && Array.isArray(ws.templatesAllowed) && ws.templatesAllowed.length) ws.templatesAllowed.forEach(k => allowed.add(String(k)));
      }
      const q = {};
      const list = await NodeTemplate.find(q).lean();
      const items = list.filter(t => (allowed.size ? allowed.has(String(t.key)) : true)).map(t => ({
        key: t.key,
        name: t.name || t.key,
        title: t.title || t.name || t.key,
        type: t.type,
        category: t.category,
        providerKey: t.providerKey,
        args: t.args || {},
        output: t.output || ['ok'],
        authorize_catch_error: !!t.authorize_catch_error,
        authorize_skip_error: !!t.authorize_skip_error,
        allowWithoutCredentials: !!t.allowWithoutCredentials,
        output_array_field: t.output_array_field,
      }));
      return items;
    } catch (e) {
      emitMessage('[get_templates][error] ' + (e?.message || e));
      return [];
    }
  };

  function computeEdgeLabelFrom(srcModel, handle){
    try {
      const tpl = srcModel?.templateObj;
      if (!tpl) return String(handle || '');
      if (tpl.type === 'condition') return String(handle || '');
      if (handle === 'err') return 'Error';
      return 'OK';
    } catch { return String(handle || ''); }
  }

  const getTemplatesTool = new DynamicStructuredTool({
    name: 'get_templates',
    description: 'Retourne la liste des Node Templates disponibles avec leurs sorties et arguments.',
    schema: z.object({}).describe('Sans argument.'),
    func: async () => JSON.stringify({ success: true, templates: await getTemplates() }),
  });

  // Ensure start-like node exists
  const ensureStartTool = new DynamicStructuredTool({
    name: 'ensure_start',
    description: 'Crée un nœud de départ si absent. prefer="form"|"trigger"|"start".',
    schema: z.object({ prefer: z.enum(['form','trigger','start']).optional(), name: z.string().optional() }).describe('Création start.'),
    func: async ({ prefer, name }) => {
      const g = getGraph();
      if (hasStartLike(g)) return JSON.stringify({ success: true, existed: true });
      const templates = await getTemplates();
      const pick = (pred) => templates.find(pred);
      let tpl = null;
      if (prefer === 'form') tpl = pick(t => String(t.type).toLowerCase()==='start_form');
      if (!tpl && prefer === 'trigger') tpl = pick(t => String(t.type).toLowerCase()==='trigger');
      if (!tpl && prefer === 'start') tpl = pick(t => String(t.type).toLowerCase()==='start');
      if (!tpl) tpl = pick(t => String(t.type).toLowerCase()==='start_form') || pick(t => String(t.type).toLowerCase()==='trigger') || pick(t => String(t.type).toLowerCase()==='start');
      if (!tpl) return JSON.stringify({ success: false, error: 'no_start_template_available' });
      const usedIds = new Set((g.nodes||[]).map(n => String(n.id)));
      const id = generateNodeId(tpl, usedIds);
      const point = { x: 400, y: 240 };
      const templateObj = { id: tpl.key, name: tpl.name, title: tpl.title, type: tpl.type, category: tpl.category, args: tpl.args, output: tpl.output, authorize_catch_error: tpl.authorize_catch_error, authorize_skip_error: tpl.authorize_skip_error, allowWithoutCredentials: tpl.allowWithoutCredentials, output_array_field: tpl.output_array_field };
      const model = { id, name: name || (tpl.title || tpl.name || tpl.key), template: tpl.key, templateObj, context: {}, templateChecksum: argsChecksum(tpl.args||{}), templateFeatureSig: featureChecksum(tpl) };
      const node = { id, point, type: 'html-template', data: { model } };
      const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
      nodes.push(node);
      emitPatch([{ op: 'replace', path: '/nodes', value: nodes }]); emitSnapshot();
      return JSON.stringify({ success: true, nodeId: id, templateKey: tpl.key });
    },
  });

  const listGraphTool = new DynamicStructuredTool({
    name: 'list_graph',
    description: 'Liste les nœuds et arêtes du graphe courant.',
    schema: z.object({}).describe('Sans argument.'),
    func: async () => JSON.stringify({ success: true, graph: getGraph() }),
  });

  const addNodeTool = new DynamicStructuredTool({
    name: 'add_node',
    description: 'Ajoute un nœud à partir d’un templateKey. Placement auto, id généré.',
    schema: z.object({
      templateKey: z.string().describe('Clé du template.'),
      name: z.string().optional().describe('Nom du nœud.'),
      nearNodeId: z.string().optional().describe('Optionnel: id de nœud proche pour placement.'),
    }).describe('Ajout de nœud.'),
    func: async ({ templateKey, name, nearNodeId }) => {
      const templates = await getTemplates();
      const tpl = templates.find(t => normalizeTemplateKey(t.key) === normalizeTemplateKey(templateKey));
      if (!tpl) return JSON.stringify({ success: false, error: 'template_not_found' });
      const g = getGraph();
      const usedIds = new Set((g.nodes||[]).map(n => String(n.id)));
      const id = generateNodeId(tpl, usedIds);
      const center = { x: 400, y: 300 };
      const near = (g.nodes||[]).find(n => String(n.id) === String(nearNodeId));
      const point = computeNewNodePosition(near, center);
      const templateObj = { id: tpl.key, name: tpl.name, title: tpl.title, type: tpl.type, category: tpl.category, args: tpl.args, output: tpl.output, authorize_catch_error: tpl.authorize_catch_error, authorize_skip_error: tpl.authorize_skip_error, allowWithoutCredentials: tpl.allowWithoutCredentials, output_array_field: tpl.output_array_field };
      const model = { id, name: name || (tpl.title || tpl.name || tpl.key), template: tpl.key, templateObj, context: {}, templateChecksum: argsChecksum(tpl.args||{}), templateFeatureSig: featureChecksum(tpl) };
      const node = { id, point, type: 'html-template', data: { model } };
      const ops = [];
      const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
      nodes.push(node);
      ops.push({ op: 'replace', path: '/nodes', value: nodes });
      emitPatch(ops); emitSnapshot();
      return JSON.stringify({ success: true, nodeId: id });
    },
  });

  const setNodeParamsTool = new DynamicStructuredTool({
    name: 'set_node_params',
    description: 'Ajoute ou remplace des paramètres (context) du nœud (merge superficiel).',
    schema: z.object({ nodeId: z.string(), params: z.record(z.any()) }).describe('Patch params.'),
    func: async ({ nodeId, params }) => {
      const g = getGraph();
      const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
      const idx = nodes.findIndex(n => String(n.id) === String(nodeId));
      if (idx < 0) return JSON.stringify({ success: false, error: 'node_not_found' });
      const node = JSON.parse(JSON.stringify(nodes[idx]));
      const cur = (node?.data?.model?.context && typeof node.data.model.context === 'object') ? node.data.model.context : {};
      node.data.model.context = { ...cur, ...(params || {}) };
      nodes[idx] = node;
      emitPatch([{ op: 'replace', path: '/nodes', value: nodes }]); emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  const connectTool = new DynamicStructuredTool({
    name: 'connect',
    description: 'Connecte deux nœuds. Par défaut sourceHandle="ok" et targetHandle="in".',
    schema: z.object({ sourceId: z.string(), targetId: z.string(), sourceHandle: z.string().optional(), targetHandle: z.string().optional() }).describe('Connexion.'),
    func: async ({ sourceId, targetId, sourceHandle, targetHandle }) => {
      const g = getGraph();
      const src = (g.nodes||[]).find(n => String(n.id) === String(sourceId));
      const dst = (g.nodes||[]).find(n => String(n.id) === String(targetId));
      if (!src || !dst) return JSON.stringify({ success: false, error: 'node_not_found' });
      // Choose sensible default handle per template type
      const srcT = String(src?.data?.model?.templateObj?.type || '').toLowerCase();
      let sh = sourceHandle;
      if (!sh) {
        if (srcT === 'start' || srcT === 'start_form' || srcT === 'event' || srcT === 'endpoint') sh = 'out';
        else if (srcT === 'condition') {
          // Try first condition item by index 0
          sh = '0';
        } else {
          // Functions: default to first output index '0'
          sh = '0';
        }
      }
      const th = targetHandle || 'in';
      const label = computeEdgeLabelFrom(src?.data?.model, sh);
      const newEdge = { type: 'template', id: makeEdgeId(sourceId, targetId, sh, th), source: sourceId, target: targetId, sourceHandle: sh, targetHandle: th, edgeLabels: { center: { type: 'html-template', data: { text: label } } }, data: { strokeWidth: 2, color: '#b1b1b7' }, markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } } };
      const edges = Array.isArray(g.edges) ? g.edges.slice() : [];
      edges.push(newEdge);
      // Optionally reposition target relative to source for a clean layout
      try {
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const si = nodes.findIndex(n => String(n.id) === String(sourceId));
        const ti = nodes.findIndex(n => String(n.id) === String(targetId));
        if (si >= 0 && ti >= 0) {
          const proposed = computeNewNodePosition(nodes[si], { x: 400, y: 300 });
          const cur = nodes[ti];
          // If target overlaps source too much, move it
          const dx = Math.abs((cur?.point?.x ?? 0) - (nodes[si]?.point?.x ?? 0));
          const dy = Math.abs((cur?.point?.y ?? 0) - (nodes[si]?.point?.y ?? 0));
          if (dx < 60 && dy < 60) {
            const next = JSON.parse(JSON.stringify(cur));
            next.point = proposed;
            nodes[ti] = next;
            emitPatch([{ op: 'replace', path: '/nodes', value: nodes }]);
          }
        }
      } catch {}
      emitPatch([{ op: 'replace', path: '/edges', value: edges }]);
      emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  const autoPlaceTool = new DynamicStructuredTool({
    name: 'auto_place',
    description: 'Repositionne un nœud (simple heuristique: sous le plus proche).',
    schema: z.object({ nodeId: z.string() }).describe('Placement.'),
    func: async ({ nodeId }) => {
      const g = getGraph();
      const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
      const idx = nodes.findIndex(n => String(n.id) === String(nodeId));
      if (idx < 0) return JSON.stringify({ success: false, error: 'node_not_found' });
      const current = nodes[idx];
      const best = findBestSourceNode(nodes.filter(n => String(n.id) !== String(nodeId)), current?.point?.x ?? 400, current?.point?.y ?? 300);
      const nextPoint = computeNewNodePosition(best, { x: 400, y: 300 });
      const next = JSON.parse(JSON.stringify(current));
      next.point = nextPoint;
      nodes[idx] = next;
      emitPatch([{ op: 'replace', path: '/nodes', value: nodes }]); emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  // Auto layout the whole graph (layered top-down, BFS from start)
  const autoLayoutTool = new DynamicStructuredTool({
    name: 'auto_layout',
    description: 'Positionne tous les nœuds en couches (haut → bas) en fonction des arêtes.',
    schema: z.object({ gapX: z.number().optional(), gapY: z.number().optional() }).describe('Placement global.'),
    func: async ({ gapX, gapY }) => {
      const g = getGraph();
      const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
      const edges = Array.isArray(g.edges) ? g.edges.slice() : [];
      const byId = new Map(nodes.map(n => [String(n.id), n]));
      const incoming = new Map(); const outgoing = new Map();
      for (const n of nodes) { incoming.set(String(n.id), []); outgoing.set(String(n.id), []); }
      for (const e of edges) { const s = String(e.source); const t = String(e.target); if (byId.has(s) && byId.has(t)) { outgoing.get(s).push(t); incoming.get(t).push(s); } }
      const isStartLikeNode = (n) => {
        const ty = String(n?.data?.model?.templateObj?.type || '').toLowerCase();
        return ty === 'start' || ty === 'start_form' || ty === 'event';
      };
      const sources = nodes.filter(n => isStartLikeNode(n) || (incoming.get(String(n.id))?.length === 0));
      const start = sources.length ? sources[0] : (nodes[0] || null);
      const level = new Map();
      const q = [];
      if (start) { level.set(String(start.id), 0); q.push(String(start.id)); }
      while (q.length) {
        const cur = q.shift(); const lv = level.get(cur) || 0;
        for (const t of (outgoing.get(cur) || [])) { if (!level.has(t)) { level.set(t, lv + 1); q.push(t); } else { level.set(t, Math.max(level.get(t), lv + 1)); } }
      }
      // Assign any unvisited to last level
      const maxLevel = Array.from(level.values()).reduce((a,b)=>Math.max(a,b), 0);
      for (const n of nodes) if (!level.has(String(n.id))) level.set(String(n.id), maxLevel + 1);
      const buckets = new Map();
      for (const n of nodes) { const lv = level.get(String(n.id)); if (!buckets.has(lv)) buckets.set(lv, []); buckets.get(lv).push(n); }
      // Ordering within level: by average parent index
      const parentsAvgIndex = new Map();
      const idxInLevel = new Map();
      const levelsSorted = Array.from(buckets.keys()).sort((a,b)=>a-b);
      const gx = Number.isFinite(gapX) ? Number(gapX) : 260; const gy = Number.isFinite(gapY) ? Number(gapY) : 200;
      let xOrigin = 200; let yOrigin = 80;
      const newNodes = nodes.map(n => JSON.parse(JSON.stringify(n)));
      const newById = new Map(newNodes.map(n => [String(n.id), n]));
      for (const lv of levelsSorted) {
        const arr = buckets.get(lv);
        // Compute ordering
        if (lv === 0) {
          arr.sort((a,b)=> String(a.id).localeCompare(String(b.id)));
        } else {
          parentsAvgIndex.clear();
          for (const n of arr) {
            const ins = incoming.get(String(n.id)) || [];
            const parentLevels = ins.map(pid => ({ pid, lv: level.get(pid), idx: idxInLevel.get(pid) })).filter(x => x && Number.isFinite(x.idx));
            const avg = parentLevels.length ? parentLevels.map(x=>x.idx).reduce((a,b)=>a+b,0)/parentLevels.length : 0;
            parentsAvgIndex.set(String(n.id), avg);
          }
          arr.sort((a,b)=> (parentsAvgIndex.get(String(a.id))||0) - (parentsAvgIndex.get(String(b.id))||0));
        }
        // Place nodes of this level
        let i = 0;
        for (const n of arr) {
          idxInLevel.set(String(n.id), i);
          const nn = newById.get(String(n.id));
          if (nn) nn.point = { x: xOrigin + i * gx, y: yOrigin + lv * gy };
          i++;
        }
      }
      emitPatch([{ op: 'replace', path: '/nodes', value: Array.from(newById.values()) }]);
      emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  const emitSnapshotTool = new DynamicStructuredTool({
    name: 'emit_snapshot',
    description: 'Envoie un snapshot complet du graphe.',
    schema: z.object({}).describe('Sans argument.'),
    func: async () => { emitSnapshot(); return JSON.stringify({ success: true }); },
  });

  return [
    getTemplatesTool,
    ensureStartTool,
    listGraphTool,
    addNodeTool,
    setNodeParamsTool,
    connectTool,
    autoPlaceTool,
    autoLayoutTool,
    emitSnapshotTool,
  ];
}

module.exports = { runFlowAgentWithTools };
