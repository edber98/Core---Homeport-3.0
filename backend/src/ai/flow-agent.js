// AI Flow Agent — Tools-only LangChain agent to build flow graphs
// Mirrors the AI Form Agent structure with DynamicStructuredTool, SSE patches, and snapshots.

let z;
try { ({ z } = require('zod')); } catch { z = undefined; }
// Fallback meta index to differentiate default titles when LLM is unavailable
let _fallbackMetaIndex = 1;

async function computeDefaultMeta(workspaceId){
  let idx = _fallbackMetaIndex++;
  try {
    const { Types } = require('mongoose');
    const Workspace = require('../db/models/workspace.model');
    const Flow = require('../db/models/flow.model');
    const raw = String(workspaceId || '').trim();
    let ws = null;
    if (raw) {
      ws = Types.ObjectId.isValid(raw) ? await Workspace.findById(raw).lean() : await Workspace.findOne({ id: raw }).lean();
      const wsOid = ws ? ws._id : (Types.ObjectId.isValid(raw) ? raw : null);
      if (wsOid) idx = (await Flow.countDocuments({ workspaceId: wsOid }).exec()) + 1;
    }
  } catch (e) { try { console.warn('[ai-flow][meta][fallback][count_error]', e?.message || e); } catch {} }
  const name = `Workflow #${idx}`;
  const description = 'Automatise un processus.';
  return { name, description, idx };
}

function sentenceCase(str){
  try {
    const s = String(str || '').trim();
    if (!s) return s;
    const lower = s.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  } catch { return str; }
}
// Fallback meta index to differentiate default titles when LLM is unavailable
// removed duplicate declaration

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
    'Processus: 1) get_templates pour connaître les nœuds disponibles (type, outputs, args), 2) list_graph, 3) add_node pour Start/Triggers (ne crée JAMAIS plus d’un nœud de départ: start/start_form/trigger), 4) add_node pour les fonctions et conditions, 5) pour CHAQUE nœud non-start qui possède des arguments: has_node_args → get_node_context_inputs (args complets + meta + outputs + prompt + prédécesseurs + squelette) → GÉNÈRE un objet context COMPLET puis APPELLE create_node_context({ nodeId, context }) (ou inject_node_context/apply_node_params) → validate_node_params (répète jusqu’à missing=0), 6) connect avec le handle de sortie approprié (préfère ok), 7) auto_place pour un placement cohérent, 8) finalize (emit_snapshot).',
    'Règle stricte: si un nœud a des arguments (args>0), tu DOIS appeler create_node_context pour ce nœud avant de finaliser. Ne laisse JAMAIS un context vide ou seulement squelette.',
    'Sorties & labels: les nœuds function ont outputs = tableau; tu dois connecter sur l’index ("0", "1", …) et le label de l’arête est la string du tableau à cet index. Exemple: output=["Success","Retry"], handle="1" → label="Retry".',
    'Erreur/try-catch: si on te demande de brancher la sortie Erreur (try/catch), et uniquement si le template l’autorise, appelle d’abord set_node_flags({catch_error:true}) sur le nœud source, puis connecte avec sourceHandle="err" (label="Error"). Les options catch/skip sont mutuellement exclusives.',
    'Connexion par nom: si l’utilisateur demande une sortie nommée (ex: "Retry"), appelle get_output_options pour lister {handle,label} puis connecte sur le handle correspondant, ou utilise connect_by_output_name({ sourceId, targetId, outputName }).',
    'Ne modifie JAMAIS le tableau output dans templateObj: les labels de sorties viennent du template canonique; utilise uniquement les handles valides (indices numériques ou "err" si catch activé).',
    'Interdictions: ne pas créer de context partiel — remplis autant de champs que possible depuis le prompt et le schéma; n’invente pas de valeurs hors schéma.',
    'Important: s’il manque des requis (validate_node_params), complète et réapplique via create_node_context/inject_node_context jusqu’à résolution.',
    'Rappels: un seul nœud "start-like". Évite la sortie err sauf si catch_error activé et pertinent. Respecte paramsSchema/args. Préfère des chaînes simples et exemples concrets pour les valeurs par défaut.',
    'Exemples de séquences:',
    '- Webhook → HTTP → Log: add_node(trigger.http), add_node(http.request), get_node_context_inputs(http), create_node_context({nodeId:http, context:{url:"https://...", method:"GET"}}), connect(trigger->http:ok), add_node(util.log), connect(http->log:ok), finalize.',
    '- Start_Form → Transform → Endpoint: add_node(start_form), add_node(data.transform), get_node_context_inputs(transform), create_node_context({nodeId:transform, context:{mapping:"..."}}), connect, add_node(endpoint.http), get_node_context_inputs(endpoint), create_node_context({nodeId:endpoint, context:{url:"https://..."}}), connect, finalize.',
    'Formulaires (important): si l’intention utilisateur implique la création d’un formulaire (ex: "formulaire de maintenance"), après add_node(start_form), appelle ai_generate_form_schema({ nodeId:<id_start_form>, prompt:"<résumé court du besoin>" }) pour attacher le schéma au nœud start_form (champ startFormSchema). Ensuite, ajoute les actions (ex: sendmail) et connecte en sortie ok. N’insère pas de JSON du formulaire toi-même: utilise le tool.',
    'Exemple formulaire: add_node(start_form) → ai_generate_form_schema({ nodeId, prompt:"Formulaire de maintenance" }) → add_node(sendmail) → get_node_context_inputs(sendmail) → create_node_context({ nodeId:sendmail, context:{ to:"support@exemple.com", subject:"{{ \"Demande maintenance - \" + (payload?.titre||\"\") }}", body:"Nouvelle demande — Description: {{ payload.description }}" } }) → connect(start_form→sendmail).',
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
  // Place below the source (frontend palette-like behavior)
  return { x: p.x, y: p.y + 200 };
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
  const emitEvent = (obj) => { try { if (obj && typeof obj === 'object' && obj.type) send(obj); } catch {} };

  try {
    if (!z) throw new Error('zod_not_available');
    const { DynamicStructuredTool, ChatOpenAI, createOpenAIToolsAgent, AgentExecutor, ChatPromptTemplate } = await importLC();

    // Tools
    const instruction = String(prompt || '').trim();
    const tools = await buildTools({ DynamicStructuredTool, getGraph: () => graph, emitPatch, emitSnapshot, emitMessage, emitEvent, workspaceId, instruction, history });
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
    const stream = await executor.streamEvents({ input: instruction, chat_history: (Array.isArray(history)?history:[]) }, { version: 'v2' });
    for await (const event of stream) {
      try {
        if (event.event === 'on_chat_model_stream') {
          const chunk = event.data?.chunk;
          if (chunk?.content) emitMessage(chunk.content);
        } else if (event.event === 'on_tool_start') {
          try { emitEvent({ type: 'flow.tool.start', name: event.name || '' }); } catch {}
        } else if (event.event === 'on_tool_end') {
          try { emitEvent({ type: 'flow.tool.end', name: event.name || '', ok: true }); } catch {}
        }
      } catch {}
    }

    // Post-pass: ensure every node that has args gets a generated context from prompt + schema + predecessors
    // This runs even if the primary agent forgot to call the context tools.
    async function autoHydrateContexts() {
      try {
        const { DynamicStructuredTool: T } = await importLC();
        const tools2 = await buildTools({ DynamicStructuredTool: T, getGraph: () => graph, emitPatch, emitSnapshot, emitMessage, workspaceId, instruction, history });
        const list = tools2.find(t => t.name === 'list_graph');
        const hasArgs = tools2.find(t => t.name === 'has_node_args');
        const getInputs = tools2.find(t => t.name === 'get_node_context_inputs');
        const createCtx = tools2.find(t => t.name === 'create_node_context') || tools2.find(t => t.name === 'inject_node_context') || tools2.find(t => t.name === 'apply_node_params');
        const validate = tools2.find(t => t.name === 'validate_node_params');
        if (!list || !hasArgs || !getInputs || !createCtx || !validate) return;
        let changed = false;
        const maxRounds = 2;
        for (let round = 0; round < maxRounds; round++) {
          const snap = JSON.parse(await list.func({})).graph || graph;
          const nodes = Array.isArray(snap?.nodes) ? snap.nodes : [];
          let roundChanged = false;
          for (const n of nodes) {
            const id = String(n?.id || ''); if (!id) continue;
            const has = JSON.parse(await hasArgs.func({ nodeId: id }));
            if (!(has && has.success && has.count > 0)) continue;
            // Check required missing
            const vres = JSON.parse(await validate.func({ nodeId: id }));
            const missing = (vres && vres.success) ? (vres.missing || []) : [];
            // Also consider empty or skeleton-only context
            const inputResp = JSON.parse(await getInputs.func({ nodeId: id }));
            const skeleton = (inputResp && inputResp.success) ? (inputResp.data?.skeleton || {}) : {};
            const curCtx = (((n||{}).data||{}).model||{}).context || {};
            const isSame = stableStringify(curCtx) === stableStringify({ ...curCtx, ...skeleton }) && Object.keys(curCtx||{}).length <= Object.keys(skeleton||{}).length;
            if (missing.length === 0 && !isSame) continue;
            // Build a context-only prompt for the small LLM pass
            const data = inputResp?.data || {};
            const meta = data.template || {};
            const fields = (Array.isArray(data.args?.fields) ? data.args.fields : []).concat(...(Array.isArray(data.args?.steps) ? data.args.steps.map(s => s.fields || []) : []));
            const preds = Array.isArray(data.predecessors) ? data.predecessors : [];
            const userInstruction = String(data.instruction || instruction || '');
            const describeField = (f) => {
              const opt = Array.isArray(f.options) && f.options.length ? ` options=[${f.options.map(o => (o && typeof o==='object') ? (o.label+':'+o.value) : o).join(', ')}]` : '';
              const req = f.required ? ' required' : '';
              return `- ${f.key} (${f.type}${req}): ${f.label || ''}${opt}`;
            };
            const fieldsTxt = (fields || []).filter(f=>f&&f.key).map(describeField).join('\n');
            const predsTxt = preds.map(p => `- ${p.id} ${p.template}/${p.name || ''} ctx=${stableStringify(p.context||{})}`).join('\n');
            const sys = [
              'Tu construis un objet JSON "context" pour paramétrer un nœud de workflow.',
              'Contraintes:',
              '- Utilise uniquement les clés définies par le schéma.',
              '- Respecte les types: string/number/boolean/array/object.',
              '- Remplis tous les champs requis; exploite au maximum le prompt utilisateur et le contexte des prédécesseurs.',
              '- Ne crée pas de clés inconnues; n’ajoute pas de méta.',
              '- Réponds EXCLUSIVEMENT par le JSON de l’objet (pas de texte autour).'
            ].join('\n');
            const user = [
              `Template: ${meta?.id || meta?.name || meta?.title || ''} (type=${meta?.type || ''})`,
              `Champs:`,
              fieldsTxt || '(aucun)',
              `Prompt utilisateur: ${userInstruction}`,
              `Prédécesseurs:`,
              predsTxt || '(aucun)',
              `Squelette par défaut (pour référence): ${stableStringify(skeleton)}`,
              'Produis le JSON du context.'
            ].join('\n');
            let jsonOut = null;
            try {
              const mini = new ChatOpenAI({ temperature: 0, modelName: process.env.OPENAI_MODEL || 'gpt-4o', openAIApiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_APIKEY || '', streaming: false });
              const promptOnly = ChatPromptTemplate.fromMessages([[ 'system', sys ], [ 'human', '{input}' ]]);
              const chain = await promptOnly.pipe(mini);
              const resp = await chain.invoke({ input: user });
              const text = String(resp?.content || '').trim();
              // Try parse strict JSON
              try { jsonOut = JSON.parse(text); } catch {
                const m = text.match(/\{[\s\S]*\}/);
                if (m) { try { jsonOut = JSON.parse(m[0]); } catch {} }
              }
            } catch {}
            if (!jsonOut || typeof jsonOut !== 'object') { try { emitMessage(`[context.auto][skip] nodeId=${id} no_json`); } catch {} ; continue; }
            // Apply
            const created = JSON.parse(await createCtx.func({ nodeId: id, context: jsonOut }));
            if (created && created.success) { roundChanged = true; changed = true; try { emitMessage(`[context.auto] nodeId=${id} keys=${Object.keys(jsonOut||{}).length}`); } catch {} }
          }
          if (!roundChanged) break;
        }
        if (!changed) { try { emitMessage('[context.auto] none'); } catch {} }
      } catch (e) { try { emitMessage('[context.auto][error] ' + (e?.message || e)); } catch {} }
    }
    await autoHydrateContexts();
    // Safety: ensure a start-like node exists; if missing, add it and auto-connect to a likely first node
    try {
      const g = graph || { nodes: [], edges: [] };
      const { DynamicStructuredTool: T } = await importLC();
        const tmpTools = await buildTools({ DynamicStructuredTool: T, getGraph: () => graph, emitPatch, emitSnapshot, emitMessage, emitEvent, workspaceId, instruction, history });
      const ensure = tmpTools.find(t => t.name === 'ensure_start');
      const list = tmpTools.find(t => t.name === 'list_graph');
      const connect = tmpTools.find(t => t.name === 'connect');
      if (ensure && list) {
        const snap = JSON.parse(await list.func({})).graph || g;
        const hasStart = (snap.nodes || []).some(n => {
          const ty = String(n?.data?.model?.templateObj?.type || '').toLowerCase();
          return ty === 'start' || ty === 'start_form' || ty === 'trigger' || ty === 'event' || ty === 'endpoint';
        });
        if (!hasStart) {
          const res = JSON.parse(await ensure.func({ prefer: 'start' }));
          const startId = res?.nodeId || (graph.nodes.find(n => String(n?.data?.model?.templateObj?.type || '').toLowerCase() === 'start')?.id);
          try { emitMessage(`[start] ensured id=${startId || 'unknown'}`); } catch {}
          // Auto-connect start->first node without incoming if present
          if (connect && startId) {
            const snap2 = JSON.parse(await list.func({})).graph || graph;
            const nodes = Array.isArray(snap2.nodes) ? snap2.nodes : [];
            const edges = Array.isArray(snap2.edges) ? snap2.edges : [];
            const hasIncoming = (id) => edges.some(e => String(e.target) === String(id));
            const candidates = nodes.filter(n => String(n.id) !== String(startId) && !hasIncoming(n.id));
            if (candidates.length) {
              const target = candidates[0];
              try { await connect.func({ sourceId: startId, targetId: target.id, sourceHandle: 'out', targetHandle: 'in' }); emitMessage(`[start] auto-connect to ${target.id}`); } catch (e) { try { emitMessage(`[start][warn] auto-connect failed: ${e?.message || e}`); } catch {} }
            }
          }
        }
      }
      // Always run a global layout pass to align nodes neatly for the builder
      try {
        const { DynamicStructuredTool: T2 } = await importLC();
        const tmp2 = await buildTools({ DynamicStructuredTool: T2, getGraph: () => graph, emitPatch, emitSnapshot, emitMessage, emitEvent, workspaceId, instruction, history });
        const layout = tmp2.find(t => t.name === 'auto_layout');
        if (layout) await layout.func({});
      } catch {}
    } catch {}

    emitSnapshot();
    try { console.log('[ai-flow][final_graph]', JSON.stringify(graph)); } catch {}
    // Suggest concise name/description for Launch Control consumers
    if (process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_APIKEY) {
      try { console.log('[ai-flow][meta] LLM key detected'); } catch {}
      const meta = await (async function suggestMeta(promptText){
        function sanitizeInstruction(s){
          try {
            let x = String(s || '');
            x = x.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ''); // emails
            x = x.replace(/https?:\/\/\S+/gi, ''); // urls
            x = x.replace(/\s{2,}/g, ' ').trim();
            return x;
          } catch { return String(s||''); }
        }
        // LLM-only: derive a concise business title/desc from the instruction (no technical terms, no prompt copying)
        try {
          const sysRaw = [
            'Tu rédiges un titre COURT et une description CONCISE pour un workflow.',
            'Contraintes:',
            "- N’UTILISE JAMAIS le prompt mot à mot et ne le paraphrase pas.",
            "- NE CITE AUCUN terme technique (nœuds, templates, providers, marques, API).",
            "- Décris l'objectif MÉTIER: ce que FAIT le workflow et sa subtilité (règle/condition) qui le rend unique.",
            "- Titre: 3–6 mots, ≤ 50 caractères, simple, parlant, sans deux-points ni guillemets, ne pas écrire le mot 'workflow'.",
            "- Capitalisation du titre: une seule majuscule initiale (phrase), sauf noms propres; n’écris pas Chaque Mot En Majuscule.",
            "- Description: ≤ 160 caractères, une seule phrase claire et actionnable, sans détails techniques, sans emails/URLs.",
            "- Varie naturellement les formulations (synonymes légers), reste professionnel.",
            'Réponds uniquement en JSON STRICT: {"name":"...","description":"..."}.'
          ].join('\n');
          // Escape curly braces so LangChain doesn't treat JSON example as variables
          const sys = escapeForLangChain(sysRaw);
          const user = [
            'BESOIN UTILISATEUR (résumer en concepts):', sanitizeInstruction(promptText).slice(0, 800)
          ].join('\n');
          const modelName = process.env.OPENAI_MODEL || 'gpt-4o';
          const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_APIKEY || '';
          try { console.log('[ai-flow][meta][env]', { model: modelName, key_len: apiKey ? apiKey.length : 0 }); } catch {}
          const mini = new ChatOpenAI({ temperature: 0, modelName, openAIApiKey: apiKey, streaming: false });
          const promptT = ChatPromptTemplate.fromMessages([[ 'system', sys ], [ 'human', '{input}' ]]);
          const chain = await promptT.pipe(mini);
          let resp;
          try {
            resp = await chain.invoke({ input: user });
          } catch (e) {
            try { console.error('[ai-flow][meta][invoke_error]', e?.response?.status || '', e?.response?.data || e?.message || e); } catch {}
            throw e;
          }
          const txt = String(resp?.content || '').trim();
          let obj = null;
          try { obj = JSON.parse(txt); } catch { const m = txt.match(/\{[\s\S]*\}/); if (m) { try { obj = JSON.parse(m[0]); } catch {} } }
          let name = (obj && typeof obj.name === 'string' && obj.name.trim()) ? obj.name.trim().slice(0,50) : 'Workflow';
          const descriptionRaw = (obj && typeof obj.description === 'string' && obj.description.trim()) ? obj.description.trim() : 'Automatise un processus.';
          const description = descriptionRaw.slice(0,160);
          name = sentenceCase(name);
          try { console.log('[ai-flow][meta][llm]', { name, descriptionLen: description.length }); } catch {}
          try { send({ type: 'message', role: 'assistant', text: `[ai-flow][meta][llm] name="${name}" desc.len=${description.length}` }); } catch {}
          send({ type: 'meta', name, description });
        } catch (e) {
          try { console.warn('[ai-flow][meta][llm_failed]', e?.message || e); } catch {}
          try { send({ type: 'message', role: 'assistant', text: `[ai-flow][meta][llm_error] ${(e && e.message) ? e.message : String(e)}` }); } catch {}
          // LLM generation failed: emit a minimal default meta with an incremental index based on DB count
          const def = await computeDefaultMeta(workspaceId);
          try { console.warn('[ai-flow][meta][llm_failed] fallback', { idx: def.idx }); } catch {}
          try { send({ type: 'message', role: 'assistant', text: `[ai-flow][meta][fallback] idx=${def.idx}` }); } catch {}
          send({ type: 'meta', name: def.name, description: def.description });
        }
      })(instruction);
      void meta;
    } else {
      // No LLM key: emit a minimal default meta with an incremental index based on DB count
      const def = await computeDefaultMeta(workspaceId);
      try { console.warn('[ai-flow][meta][no_key] fallback', { idx: def.idx }); } catch {}
      try { send({ type: 'message', role: 'assistant', text: `[ai-flow][meta][no_key] idx=${def.idx}` }); } catch {}
      send({ type: 'meta', name: def.name, description: def.description });
    }
    done();
  } catch (err) {
    const msg = (err && err.stack) ? err.stack : (err?.message || String(err));
    emitMessage('[langchain][error] ' + msg);
    done();
  }
}

async function buildTools({ DynamicStructuredTool, getGraph, emitPatch, emitSnapshot, emitMessage, emitEvent, workspaceId, instruction, history }){
  // Cache templates to enforce canonical outputs (prevent any mutation of templateObj.output)
  let _templatesCache = null;
  const loadTemplatesCache = async () => { if (!_templatesCache) _templatesCache = await getTemplates(); return _templatesCache; };
  const canonicalOutputsFor = async (templateKey) => {
    try {
      const list = await loadTemplatesCache();
      const t = (list || []).find(x => String(x.key) === String(templateKey));
      return (t && Array.isArray(t.output) && t.output.length) ? t.output.slice() : [];
    } catch { return []; }
  };

  // ELK layout integration (layered DAG layout)
  async function elkLayoutCurrentGraph(g, gapX, gapY) {
    try {
      const ELK = (await import('elkjs')).default;
      const elk = new ELK();
      const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
      const edges = Array.isArray(g.edges) ? g.edges.slice() : [];
      // Match frontend visual size: ~250x100 top-left placement
      const nodeW = Number(process.env.AI_FLOW_NODE_WIDTH || 250);
      const nodeH = Number(process.env.AI_FLOW_NODE_HEIGHT || 100);
      // Frontend top-left gaps: gx=260, gy=200 → border gaps = 260 - width, 200 - height
      const topLeftGapX = Number.isFinite(gapX) ? gapX : 260;
      const topLeftGapY = Number.isFinite(gapY) ? gapY : 160;
      const borderGapX = Math.max(0, topLeftGapX - nodeW);
      const borderGapY = Math.max(0, topLeftGapY - nodeH);
      const child = nodes.map(n => ({ id: String(n.id), width: nodeW, height: nodeH }));
      const eds = edges.map(e => ({ id: String(e.id || (String(e.source)+'->'+String(e.target))), sources: [String(e.source)], targets: [String(e.target)] }));
      const graph = {
        id: 'root',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'DOWN',
          'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
          'elk.layered.mergeEdges': 'true',
          'elk.layered.crossingMinimization.semiInteractive': 'true',
          // Vertical gap between layers (border to border)
          'elk.layered.spacing.nodeNodeBetweenLayers': String(borderGapY),
          // Horizontal minimal gap (border to border)
          'elk.spacing.nodeNode': String(borderGapX),
          'elk.edgeRouting': 'ORTHOGONAL'
        },
        children: child,
        edges: eds
      };
      const res = await elk.layout(graph);
      const byId = new Map(nodes.map(n => [String(n.id), JSON.parse(JSON.stringify(n))]));
      for (const c of (res.children || [])) {
        const n = byId.get(String(c.id));
        if (n) {
          // ELK x,y is top-left; use directly as point
          n.point = { x: Math.round(c.x || 0), y: Math.round(c.y || 0) };
          byId.set(String(c.id), n);
        }
      }
      // Optional vertical gap normalization to match exact frontend spacing between top-lefts
      try {
        const wantGapY = topLeftGapY; // e.g., 200
        // Longest-path layering from sources
        const ids = Array.from(byId.keys());
        const incoming = new Map(ids.map(id => [id, 0]));
        const outs = new Map(ids.map(id => [id, []]));
        for (const e of (edges || [])) {
          const s = String(e.source), t = String(e.target);
          if (!byId.has(s) || !byId.has(t)) continue;
          incoming.set(t, (incoming.get(t) || 0) + 1);
          outs.get(s).push(t);
        }
        const q = [];
        const level = new Map(ids.map(id => [id, 0]));
        for (const id of ids) if ((incoming.get(id) || 0) === 0) q.push(id);
        while (q.length) {
          const u = q.shift();
          for (const v of (outs.get(u) || [])) {
            level.set(v, Math.max(level.get(v) || 0, (level.get(u) || 0) + 1));
            incoming.set(v, (incoming.get(v) || 0) - 1);
            if ((incoming.get(v) || 0) === 0) q.push(v);
          }
        }
        // Apply normalized Y per level
        for (const [id, n] of byId.entries()) {
          const lv = level.get(id) || 0;
          n.point = { x: n.point?.x || 0, y: lv * wantGapY };
        }
        emitMessage(`[layout.elk][normalize] gapY=${wantGapY}`);
      } catch {}
      try { emitMessage(`[layout.elk][apply] nodeW=${nodeW} nodeH=${nodeH} gapX=${topLeftGapX} gapY=${topLeftGapY} borderGapX=${borderGapX} borderGapY=${borderGapY}`); } catch {}
      return Array.from(byId.values());
    } catch (e) {
      try { emitMessage('[layout.elk][error] ' + (e?.message || e)); } catch {}
      return null;
    }
  }
  // Helper: find first credential id for a provider in current workspace
  const firstCredentialIdFor = async (providerKey) => {
    try {
      if (!providerKey) return null;
      const Credential = require('../db/models/credential.model');
      const Workspace = require('../db/models/workspace.model');
      let ws = null; if (workspaceId) ws = await Workspace.findOne({ id: String(workspaceId) }).lean();
      const q = {};
      if (ws && ws._id) q.workspaceId = ws._id;
      q.providerKey = String(providerKey);
      const cred = await Credential.findOne(q).lean();
      return cred ? (cred.id || String(cred._id)) : null;
    } catch { return null; }
  };
  // Basic NLP helpers from instruction
  const textInstruction = String(instruction || '');
  const extractEmails = () => {
    try { const re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig; return (textInstruction.match(re) || []).map(s => s.trim()); } catch { return []; }
  };
  const extractUrls = () => {
    try { const re = /(https?:\/\/[^\s]+)/ig; return (textInstruction.match(re) || []).map(s => s.trim()); } catch { return []; }
  };
  const firstEmail = () => extractEmails()[0] || null;
  const firstUrl = () => extractUrls()[0] || null;
  // Helpers start-like
  const isStartLike = (tpl) => {
    const t = String(tpl?.type || '').toLowerCase();
    // Aligne-toi sur l’éditeur: on considère uniquement start/start_form/trigger comme nœuds de départ
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

  // Build an empty context object from args schema (structure only; no semantic autofill)
  const makeEmptyContextFromArgs = (args) => {
    try {
      const out = {};
      const coerce = (f) => {
        const t = String(f?.type || '').toLowerCase();
        // Section arrays (for condition items) → default to []
        if (t === 'section' && (f?.mode === 'array' || f?.array)) return [];
        if (f && f.default != null) return f.default;
        if (t === 'number' || t === 'integer') return 0;
        if (t === 'boolean' || t === 'checkbox' || t === 'switch') return false;
        if (t === 'multiselect' || t === 'tags') return [];
        if (t === 'json' || t === 'code' || t === 'object') return {};
        // text/textarea/string/select/radio or unknown → empty string
        return '';
      };
      const add = (arr) => { for (const f of (arr || [])) { const key = f && (f.key || f.name); if (key && !(key in out)) out[String(key)] = coerce(f); } };
      add(args?.fields);
      for (const s of (args?.steps || [])) add(s?.fields);
      return out;
    } catch { return {}; }
  };

  // Backend mirror of FlowGraphService.computeEdgeLabel
  function computeEdgeLabelFrom(srcModel, handle){
    try {
      const model = srcModel || {};
      const tpl = model?.templateObj || {};
      const names = Array.isArray(tpl.output) && tpl.output.length ? tpl.output : ['Succes'];
      if (String(handle) === 'err') return 'Error';
      const t = String(tpl.type || '').toLowerCase();
      if (t === 'start' || t === 'start_form' || t === 'event' || t === 'endpoint') return 'Succes';
      // Condition: resolve by index or by stable _id
      if (t === 'condition') {
        const field = tpl.output_array_field || 'items';
        const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        const hs = String(handle ?? '');
        const isIdx = /^\d+$/.test(hs);
        if (isIdx) {
          const i = parseInt(hs, 10);
          const it = arr[i];
          if (it == null) return '';
          if (typeof it === 'string') return it;
          if (typeof it === 'object') return (it.name ?? '');
          return '';
        }
        const it = arr.find(x => x && typeof x === 'object' && String(x._id) === hs);
        if (!it) return '';
        return (typeof it === 'object') ? (it.name ?? '') : '';
      }
      // Function-like: map index to output name
      const hs = String(handle ?? '');
      const isIdx = /^\d+$/.test(hs);
      if (Array.isArray(names) && isIdx) {
        const i = parseInt(hs, 10);
        if (i >= 0 && i < names.length) return names[i];
      }
      if (Array.isArray(names) && names.length === 1) return names[0] || 'Succes';
      return '';
    } catch { return String(handle || ''); }
  }

  const getTemplatesTool = new DynamicStructuredTool({
    name: 'get_templates',
    description: 'Retourne la liste des Node Templates disponibles avec leurs sorties et arguments.',
    schema: z.object({}).describe('Sans argument.'),
    func: async () => JSON.stringify({ success: true, templates: await getTemplates() }),
  });

  // Provide normalized args schema of a node to the agent so it can populate values itself (no provider-specific logic)
  const getNodeArgsSchemaTool = new DynamicStructuredTool({
    name: 'get_node_args_schema',
    description: 'Retourne le schéma d’Arguments (fields/steps), les options et les contraintes du nœud pour permettre à l’agent de proposer des valeurs cohérentes.',
    schema: z.object({ nodeId: z.string() }).describe('Lecture du schéma de paramètres.'),
    func: async ({ nodeId }) => {
      try {
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const node = nodes.find(n => String(n.id) === String(nodeId));
        if (!node) return JSON.stringify({ success: false, error: 'node_not_found' });
        const model = node?.data?.model || {};
        const tpl = model?.templateObj || {};
        const args = tpl?.args || {};
        const normalizeOptions = (opts) => {
          if (!Array.isArray(opts)) return [];
          return opts.map(o => {
            if (o && typeof o === 'object') { return { label: o.label ?? o.name ?? String(o.value ?? o.id ?? o.key ?? ''), value: o.value ?? o.id ?? o.key ?? o.name ?? null }; }
            return { label: String(o), value: o };
          });
        };
        const normalizeField = (f) => {
          try {
            return {
              key: f.key ?? f.name ?? null,
              type: f.type ?? 'text',
              label: f.label ?? null,
              placeholder: f.placeholder ?? null,
              required: !!f.required,
              default: f.default ?? null,
              options: normalizeOptions(f.options),
              min: f.min ?? undefined,
              max: f.max ?? undefined,
              pattern: f.pattern ?? undefined,
              description: f.description ?? f.help ?? null
            };
          } catch { return null; }
        };
        const fields = Array.isArray(args.fields) ? args.fields.map(normalizeField).filter(Boolean) : [];
        const steps = Array.isArray(args.steps) ? args.steps.map(s => ({
          title: s?.title ?? null,
          fields: Array.isArray(s?.fields) ? s.fields.map(normalizeField).filter(Boolean) : []
        })) : [];
        const totalFields = (fields?.length || 0) + (Array.isArray(steps) ? steps.reduce((a, s) => a + (s.fields?.length || 0), 0) : 0);
        // Build a neutral skeleton object for convenience (no business heuristics)
        const coerceDefault = (f) => {
          if (f.default != null) return f.default;
          const t = String(f.type || '').toLowerCase();
          if (t === 'number' || t === 'integer') return 0;
          if (t === 'boolean' || t === 'checkbox' || t === 'switch') return false;
          if (t === 'select' || t === 'radio') return (Array.isArray(f.options) && f.options.length) ? (f.options[0].value ?? null) : null;
          if (t === 'multiselect' || t === 'tags') return [];
          if (t === 'json' || t === 'code' || t === 'object') return {};
          return '';
        };
        const skeleton = {};
        for (const f of fields) { if (f && f.key) skeleton[f.key] = coerceDefault(f); }
        for (const st of steps) { for (const f of (st.fields || [])) { if (f && f.key && !(f.key in skeleton)) skeleton[f.key] = coerceDefault(f); } }
        const keys = Object.keys(skeleton); keys.sort();
        const instr = String(instruction || '');
        const recent = Array.isArray(history) ? history.slice(-4) : [];
        const summary = { fields, steps, template: { id: tpl.id, name: tpl.name, title: tpl.title, type: tpl.type }, skeleton, instruction: instr, recentHistory: recent };
        try {
          const snip = instr.length > 60 ? (instr.slice(0,60) + '…') : instr;
          emitMessage(`[schema] nodeId=${nodeId} template=${tpl.id || tpl.name} fields=${totalFields} keys=${keys.slice(0,6).join(',')}${keys.length>6?',…':''} prompt="${snip}"`);
        } catch {}
        return JSON.stringify({ success: true, nodeId, schema: summary });
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    }
  });

  // Aggregate everything the model needs to generate a complete context:
  // - Template metadata (id/name/title/type/category/providerKey/description/subtitle)
  // - Full args schema (fields/steps with validators/options/default/description)
  // - Outputs list
  // - Instruction (prompt) and recent history
  // - Upstream (predecessor) nodes already connected to this node (id/template/context/sourceHandle)
  // - Current skeleton (structure-only)
  const getNodeContextInputsTool = new DynamicStructuredTool({
    name: 'get_node_context_inputs',
    description: 'Retourne un paquet complet pour générer le context: schéma Args, métadonnées template, outputs, prompt, nœuds précédents (et leur contexte), squelette.',
    schema: z.object({ nodeId: z.string() }).describe('Préparer les entrées pour la génération du context.'),
    func: async ({ nodeId }) => {
      try {
        
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const edges = Array.isArray(g.edges) ? g.edges.slice() : [];
        const node = nodes.find(n => String(n.id) === String(nodeId));
        if (!node) return JSON.stringify({ success: false, error: 'node_not_found' });
        const model = node?.data?.model || {};
        const tpl = model?.templateObj || {};
        const args = tpl?.args || {};
        const normalizeOptions = (opts) => {
          if (!Array.isArray(opts)) return [];
          return opts.map(o => {
            if (o && typeof o === 'object') { return { label: o.label ?? o.name ?? String(o.value ?? o.id ?? o.key ?? ''), value: o.value ?? o.id ?? o.key ?? o.name ?? null }; }
            return { label: String(o), value: o };
          });
        };
        const normalizeField = (f) => {
          try {
            return {
              key: f.key ?? f.name ?? null,
              type: f.type ?? 'text',
              label: f.label ?? null,
              placeholder: f.placeholder ?? null,
              required: !!f.required,
              default: f.default ?? null,
              options: normalizeOptions(f.options),
              min: f.min ?? undefined,
              max: f.max ?? undefined,
              pattern: f.pattern ?? undefined,
              description: f.description ?? f.help ?? null
            };
          } catch { return null; }
        };
        const fields = Array.isArray(args.fields) ? args.fields.map(normalizeField).filter(Boolean) : [];
        const steps = Array.isArray(args.steps) ? args.steps.map(s => ({ title: s?.title ?? null, fields: Array.isArray(s?.fields) ? s.fields.map(normalizeField).filter(Boolean) : [] })) : [];
        const skeleton = makeEmptyContextFromArgs(args);
        const outputs = Array.isArray(tpl.output) ? tpl.output.slice() : [];
        // Upstream nodes connected to this node
        const incoming = edges.filter(e => String(e.target) === String(nodeId));
        const preds = incoming.map(e => {
          const src = nodes.find(n => String(n.id) === String(e.source));
          const sm = src?.data?.model || {};
          const st = sm?.templateObj || {};
          return { id: src?.id, template: st?.id || sm?.template, name: sm?.name || null, type: st?.type || null, providerKey: st?.providerKey || st?.appId || null, context: sm?.context || {}, sourceHandle: e?.sourceHandle || null };
        });
        const instr = String(instruction || '');
        const recent = Array.isArray(history) ? history.slice(-4) : [];
        const meta = { id: tpl.id, name: tpl.name, title: tpl.title, type: tpl.type, category: tpl.category, providerKey: tpl.providerKey, subtitle: tpl.subtitle, description: tpl.description };
        const out = { template: meta, args: { fields, steps }, outputs, instruction: instr, recentHistory: recent, predecessors: preds, skeleton };
        try { emitMessage(`[context.inputs] nodeId=${nodeId} fields=${fields.length + steps.reduce((a,s)=>a+(s.fields?.length||0),0)} preds=${preds.length}`); } catch {}
        return JSON.stringify({ success: true, nodeId, data: out });
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    }
  });

  // Build a Zod schema from node args, and return as string (for model guidance)
  const getNodeArgsZodTool = new DynamicStructuredTool({
    name: 'get_node_args_zod',
    description: 'Retourne un schéma Zod (string) dérivé des Arguments du nœud, pour guider la génération des params JSON (aucun autofill).',
    schema: z.object({ nodeId: z.string() }).describe('Zod schema pour set_node_params.'),
    func: async ({ nodeId }) => {
      try {
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const node = nodes.find(n => String(n.id) === String(nodeId));
        if (!node) return JSON.stringify({ success: false, error: 'node_not_found' });
        const model = node?.data?.model || {}; const tpl = model?.templateObj || {}; const args = tpl?.args || {};
        const fields = Array.isArray(args.fields) ? args.fields : [];
        const steps = Array.isArray(args.steps) ? args.steps : [];
        const all = [];
        const push = (f) => { if (f && typeof f === 'object' && (f.key || f.name)) all.push(f); };
        for (const f of fields) push(f);
        for (const s of steps) for (const f of (s?.fields || [])) push(f);
        const enumVals = (opts) => {
          try { return (Array.isArray(opts) ? opts : []).map(o => (o && typeof o === 'object') ? (o.value ?? o.id ?? o.key ?? o.name) : o).filter(v => v != null).map(v => String(v)); } catch { return []; }
        };
        const lines = [];
        lines.push('z.object({');
        for (const f of all) {
          const key = String(f.key || f.name);
          const t = String(f.type || '').toLowerCase();
          const req = !!f.required || (Array.isArray(f.validators) && f.validators.some(v => v && (v.type === 'required' || v.name === 'required')));
          let zt = 'z.any()';
          if (t === 'text' || t === 'textarea' || t === 'string') zt = 'z.string()';
          else if (t === 'number' || t === 'integer') zt = 'z.number()';
          else if (t === 'boolean' || t === 'checkbox' || t === 'switch') zt = 'z.boolean()';
          else if (t === 'select' || t === 'radio') {
            const ev = enumVals(f.options);
            zt = ev.length ? `z.enum([${ev.map(v => JSON.stringify(v)).join(',')}])` : 'z.string()';
          } else if (t === 'multiselect' || t === 'tags') {
            const ev = enumVals(f.options);
            const base = ev.length ? `z.enum([${ev.map(v => JSON.stringify(v)).join(',')}])` : 'z.string()';
            zt = `z.array(${base})`;
          } else if (t === 'json' || t === 'code' || t === 'object') zt = 'z.any()';
          lines.push(`  ${JSON.stringify(key)}: ${zt}${req ? '' : '.optional()'},`);
        }
        lines.push('})');
        const zodStr = lines.join('\n');
        try { emitMessage(`[schema][zod] nodeId=${nodeId} keys=${all.length}`); } catch {}
        return JSON.stringify({ success: true, nodeId, zod: zodStr });
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    }
  });

  // Generate a Dynamic Form schema via the AI Form Agent and attach it to a start_form node
  const aiGenerateFormSchemaTool = new DynamicStructuredTool({
    name: 'ai_generate_form_schema',
    description: 'Génère un schéma Dynamic Form via l’agent AI Form puis l’attache au nœud start_form dans model.startFormSchema. À utiliser quand l’intention est de créer un formulaire (ex: demande de maintenance).',
    schema: z.object({
      nodeId: z.string(),
      prompt: z.string().optional(),
      options: z.object({ layout: z.enum(['vertical','horizontal','inline']).optional(), steps: z.boolean().optional(), maxFields: z.number().optional() }).optional()
    }).describe('Créer un formulaire attaché au nœud start_form.'),
    func: async ({ nodeId, prompt, options }) => {
      try {
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const idx = nodes.findIndex(n => String(n.id) === String(nodeId));
        if (idx < 0) return JSON.stringify({ success: false, error: 'node_not_found' });
        const node = JSON.parse(JSON.stringify(nodes[idx]));
        const model = node?.data?.model || {}; const tpl = model?.templateObj || {};
        const t = String(tpl?.type || '').toLowerCase();
        if (!(t === 'start_form' || t === 'start')) {
          try { emitMessage(`[ai-form][error] node ${nodeId} type=${t} is not start_form/start`); } catch {}
          return JSON.stringify({ success: false, error: 'invalid_node_type' });
        }
        const instructionGlobal = String(instruction || '').trim();
        const basePrompt = (prompt && String(prompt).trim()) ? String(prompt).trim() : instructionGlobal;
        const userNeed = basePrompt || 'Formulaire';
        // Build a concise, actionable prompt specialized for the AI Form Agent
        const regen = [
          `Construis un formulaire complet: ${userNeed}.`,
          "Objectifs: sections claires (Demandeur, Détails, Localisation), champs requis pertinents, validateurs (required, minLength/min, pattern si email/téléphone), options concises pour listes (priorité, type).",
          "UI: layout='vertical', labelsOnTop=true, 1 à 2 colonnes selon champs; limite le nombre de champs à un ensemble utile.",
          "Ajoute des conditions simples si pertinent (ex: montrer email si 'contacter par email').",
          "Prévoir des champs utiles à des actions suivantes (ex: envoi d’email): un titre/résumé, des coordonnées, et les détails nécessaires à un sujet clair.",
          "N'utilise que les types supportés (texte, textarea, number, select, radio, checkbox, date).",
        ].join(' ');

        const layout = (options && options.layout) || 'vertical';
        const preferSteps = !!(options && options.steps);
        const maxFields = Math.max(1, Math.min(100, Number((options && options.maxFields) || 20)));
        try { emitMessage(`[ai-form][call] nodeId=${nodeId} prompt.len=${regen.length} layout=${layout} steps=${preferSteps} maxFields=${maxFields}`); } catch {}

        let finalSchema = null;
        // Run the AI Form Agent inline and collect final schema
        try {
          const { runFormAgentWithTools } = require('./langchain-agent');
          emitMessage('[ai-form][start]');
          // Also emit a dedicated SSE event so the frontend can display real-time progress from the AI Form generator while inside AI Workflow
          try { emitEvent({ type: 'ai-form.start', at: Date.now(), nodeId }); } catch {}
          const local = { schema: null };
          const send = (obj) => {
            try {
              // Forward as namespaced SSE events to avoid being processed as Flow patches/snapshots
              const t = String(obj?.type || '').toLowerCase();
              if (t === 'message') {
                // Ne pas réémettre en 'message' générique pour éviter les doublons côté chat
                emitEvent({ type: 'ai-form.message', text: String(obj.text || obj.content || '') });
              } else if (t === 'tool.start') {
                emitEvent({ type: 'ai-form.tool.start', name: obj.name || '', args: obj.args || {} });
              } else if (t === 'tool.end') {
                emitEvent({ type: 'ai-form.tool.end', name: obj.name || '', ok: obj.ok !== false });
              } else if (t === 'patch') {
                emitMessage(`[ai-form][patch] ops=${Array.isArray(obj.ops)?obj.ops.length:0}`);
                try { local.schema = local.schema || {}; if (Array.isArray(obj.ops)) applyPatch(local.schema, obj.ops); } catch (e) { emitMessage(`[ai-form][patch][error] ${e?.message||e}`); emitEvent({ type: 'ai-form.patch.error', message: String(e?.message||e) }); }
                emitEvent({ type: 'ai-form.patch', ops: obj.ops || [] });
              } else if (t === 'snapshot') {
                try { local.schema = obj.schema; } catch {}
                emitEvent({ type: 'ai-form.snapshot', schema: obj.schema || null });
              } else if (t === 'error') {
                emitMessage(`[ai-form][error] ${obj.code||''} ${obj.message||''}`);
                emitEvent({ type: 'ai-form.error', code: obj.code || 'unknown', message: obj.message || '' });
              } else if (t === 'final') {
                local.schema = obj.schema;
                emitMessage('[ai-form][final]');
                emitEvent({ type: 'ai-form.final', schema: obj.schema || null });
              }
            } catch {}
          };
          await new Promise((resolve) => {
            runFormAgentWithTools({ prompt: regen, history: [], seedSchema: null, preferSteps, layout, maxFields, send, done: resolve }).catch((e) => { try { emitMessage(`[ai-form][agent][error] ${e?.message || e}`); } catch {}; resolve(); });
          });
          finalSchema = local.schema;
        } catch (e) {
          try { emitMessage(`[ai-form][invoke.error] ${e?.message || e}`); } catch {}
        }

        if (!finalSchema || typeof finalSchema !== 'object') {
          return JSON.stringify({ success: false, error: 'schema_generation_failed' });
        }

          // Attach schema under model.startFormSchema (preferred by frontend)
          try {
            node.data.model = model || {};
            node.data.model.startFormEnabled = true; // always enable Start Form when a schema is generated
            node.data.model.startFormSchema = finalSchema;
            nodes[idx] = node;
            emitPatch([{ op: 'replace', path: '/nodes', value: nodes }]);
            emitSnapshot();
            const fCount = Array.isArray(finalSchema.fields) ? finalSchema.fields.length : (Array.isArray(finalSchema.steps) ? finalSchema.steps.length : 0);
            emitMessage(`[ai-form][attach] nodeId=${nodeId} parts=${fCount}`);
            // Also forward SSE event for the attachment
            try { emitEvent({ type: 'ai-form.attach', nodeId, parts: fCount }); } catch {}
          } catch (e) {
            try { emitMessage(`[ai-form][attach.error] ${e?.message || e}`); } catch {}
            return JSON.stringify({ success: false, error: 'attach_failed' });
          }

        return JSON.stringify({ success: true });
      } catch (e) {
        return JSON.stringify({ success: false, error: String(e?.message||e) });
      }
    }
  });

  // Validate + apply params object using dynamic Zod from node args (no autofill)
  const applyNodeParamsTool = new DynamicStructuredTool({
    name: 'apply_node_params',
    description: 'Valide et applique un objet params pour un nœud à partir de son schéma Args (requis/options). Échoue si invalides ou requis manquants.',
    schema: z.object({ nodeId: z.string(), params: z.record(z.any()) }).describe('Appliquer des paramètres déjà générés par le modèle.'),
    func: async ({ nodeId, params }) => {
      try {
        console.log('paramssssss',params)
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const idx = nodes.findIndex(n => String(n.id) === String(nodeId));
        if (idx < 0) return JSON.stringify({ success: false, error: 'node_not_found' });
        const node = JSON.parse(JSON.stringify(nodes[idx]));
        const model = node?.data?.model || {}; const tpl = model?.templateObj || {}; const args = tpl?.args || {};
        const fields = Array.isArray(args.fields) ? args.fields : [];
        const steps = Array.isArray(args.steps) ? args.steps : [];
        const all = [];
        const push = (f) => { if (f && typeof f === 'object' && (f.key || f.name)) all.push(f); };
        for (const f of fields) push(f);
        for (const s of steps) for (const f of (s?.fields || [])) push(f);
        // Build runtime zod
        const enumVals = (opts) => {
          try { return (Array.isArray(opts) ? opts : []).map(o => (o && typeof o === 'object') ? (o.value ?? o.id ?? o.key ?? o.name) : o).filter(v => v != null).map(v => String(v)); } catch { return []; }
        };
        const shape = {};
        for (const f of all) {
          const key = String(f.key || f.name);
          const t = String(f.type || '').toLowerCase();
          const req = !!f.required || (Array.isArray(f.validators) && f.validators.some(v => v && (v.type === 'required' || v.name === 'required')));
          let zt = z.any();
          if (t === 'text' || t === 'textarea' || t === 'string') zt = z.string();
          else if (t === 'number' || t === 'integer') zt = z.number();
          else if (t === 'boolean' || t === 'checkbox' || t === 'switch') zt = z.boolean();
          else if (t === 'select' || t === 'radio') {
            const ev = enumVals(f.options);
            zt = ev.length ? z.enum([...(ev)]) : z.string();
          } else if (t === 'multiselect' || t === 'tags') {
            const ev = enumVals(f.options);
            zt = ev.length ? z.array(z.enum([...(ev)])) : z.array(z.string());
          } else if (t === 'json' || t === 'code' || t === 'object') zt = z.any();
          shape[key] = req ? zt : zt.optional();
        }
        const schema = z.object(shape);
        // Raw log for debugging
        try { console.log('[args][apply][raw]', nodeId, JSON.stringify(params)); } catch {}
        const check = schema.safeParse(params || {});
        if (!check.success) {
          try { emitMessage(`[args][invalid] nodeId=${nodeId} issues=${check.error.issues?.length || 0}`); } catch {}
          return JSON.stringify({ success: false, error: 'invalid_params', issues: (check.error.issues || []).map(i => ({ path: i.path, message: i.message })) });
        }
        const cur = (model.context && typeof model.context === 'object') ? model.context : {};
        const merged = { ...cur, ...(params || {}) };
        // Stabilize condition items ids so edges by _id remain valid
        try {
          const t = model?.templateObj || {};
          if (String(t.type || '').toLowerCase() === 'condition') {
            const field = t.output_array_field || 'items';
            const oldArr = Array.isArray(cur[field]) ? cur[field] : [];
            const newArr = Array.isArray(merged[field]) ? merged[field] : [];
            const used = new Set((newArr || []).map(it => (it && typeof it === 'object' && it._id) ? String(it._id) : '').filter(Boolean));
            for (let i = 0; i < Math.min(oldArr.length, newArr.length); i++) {
              const oldIt = oldArr[i]; const nu = newArr[i];
              if (!(nu && typeof nu === 'object')) continue;
              const oldId = oldIt && typeof oldIt === 'object' ? String(oldIt._id || '') : '';
              if (!nu._id && oldId && !used.has(oldId)) { nu._id = oldId; used.add(oldId); }
            }
            for (const it of newArr) { if (it && typeof it === 'object' && !it._id) { let id=''; do { id = 'cid_' + Math.random().toString(36).slice(2); } while (used.has(id)); it._id = id; used.add(id); } }
            merged[field] = newArr;
            try { emitMessage(`[condition.ids] nodeId=${nodeId} items=${newArr.length}`); } catch {}
          }
        } catch {}
        node.data.model.context = merged;
        nodes[idx] = node;
        emitPatch([{ op: 'replace', path: '/nodes', value: nodes }]); emitSnapshot();
        try {
          const keys = Object.keys(params || {});
          const preview = (() => { try { const o = params || {}; const pick = ['to','subject','from','text']; const sel = {}; pick.forEach(k => { if (o[k] != null) sel[k] = o[k]; }); return JSON.stringify(sel); } catch { return '{}'; } })();
          emitMessage(`[args] applied nodeId=${nodeId} keys=${keys.length} preview=${preview}`);
        } catch {}
        return JSON.stringify({ success: true });
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    }
  });

  // Alias: inject_node_context → same behavior as apply_node_params (kept for agent phrasing)
  const injectNodeContextTool = new DynamicStructuredTool({
    name: 'inject_node_context',
    description: 'Alias: valide et applique un objet context (mêmes règles que apply_node_params).',
    schema: z.object({ nodeId: z.string(), context: z.record(z.any()) }).describe('Injecter un context validé.'),
    func: async ({ nodeId, context }) => {
      return applyNodeParamsTool.func({ nodeId, params: context });
    }
  });

  // Friendly tool to create/set a node context from the template args schema
  // Validates against the same dynamic Zod as apply_node_params.
  const createNodeContextTool = new DynamicStructuredTool({
    name: 'create_node_context',
    description: 'Crée et applique un context pour un nœud (validé selon le schéma Args du template). À appeler juste après add_node.',
    schema: z.object({ nodeId: z.string(), context: z.record(z.any()) }).describe('Appliquer un context généré par le modèle.'),
    func: async ({ nodeId, context }) => {
      try {
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const idx = nodes.findIndex(n => String(n.id) === String(nodeId));
        if (idx < 0) return JSON.stringify({ success: false, error: 'node_not_found' });
        const node = JSON.parse(JSON.stringify(nodes[idx]));
        const model = node?.data?.model || {}; const tpl = model?.templateObj || {}; const args = tpl?.args || {};
        const fields = Array.isArray(args.fields) ? args.fields : [];
        const steps = Array.isArray(args.steps) ? args.steps : [];
        const all = [];
        const push = (f) => { if (f && typeof f === 'object' && (f.key || f.name)) all.push(f); };
        for (const f of fields) push(f);
        for (const s of steps) for (const f of (s?.fields || [])) push(f);
        // Build runtime zod
        const enumVals = (opts) => {
          try { return (Array.isArray(opts) ? opts : []).map(o => (o && typeof o === 'object') ? (o.value ?? o.id ?? o.key ?? o.name) : o).filter(v => v != null).map(v => String(v)); } catch { return []; }
        };
        const shape = {};
        for (const f of all) {
          const key = String(f.key || f.name);
          const t = String(f.type || '').toLowerCase();
          const req = !!f.required || (Array.isArray(f.validators) && f.validators.some(v => v && (v.type === 'required' || v.name === 'required')));
          let zt = z.any();
          if (t === 'text' || t === 'textarea' || t === 'string') zt = z.string();
          else if (t === 'number' || t === 'integer') zt = z.number();
          else if (t === 'boolean' || t === 'checkbox' || t === 'switch') zt = z.boolean();
          else if (t === 'select' || t === 'radio') {
            const ev = enumVals(f.options);
            zt = ev.length ? z.enum([...(ev)]) : z.string();
          } else if (t === 'multiselect' || t === 'tags') {
            const ev = enumVals(f.options);
            zt = ev.length ? z.array(z.enum([...(ev)])) : z.array(z.string());
          } else if (t === 'json' || t === 'code' || t === 'object') zt = z.any();
          shape[key] = req ? zt : zt.optional();
        }
        const schema = z.object(shape);
        // Validate provided context
        try { console.log('[context][create][raw]', nodeId, JSON.stringify(context)); } catch {}
        const check = schema.safeParse(context || {});
        if (!check.success) {
          try { emitMessage(`[context][create][invalid] nodeId=${nodeId} issues=${check.error.issues?.length || 0}`); } catch {}
          return JSON.stringify({ success: false, error: 'invalid_context', issues: (check.error.issues || []).map(i => ({ path: i.path, message: i.message })) });
        }
        const cur = (model.context && typeof model.context === 'object') ? model.context : {};
        const merged = { ...cur, ...(context || {}) };
        // Stabilize condition items ids like frontend to support handles by _id
        try {
          const t = model?.templateObj || {};
          if (String(t.type || '').toLowerCase() === 'condition') {
            const field = t.output_array_field || 'items';
            const oldArr = Array.isArray(cur[field]) ? cur[field] : [];
            const newArr = Array.isArray(merged[field]) ? merged[field] : [];
            const used = new Set((newArr || []).map(it => (it && typeof it === 'object' && it._id) ? String(it._id) : '').filter(Boolean));
            for (let i = 0; i < Math.min(oldArr.length, newArr.length); i++) {
              const oldIt = oldArr[i]; const nu = newArr[i];
              if (!(nu && typeof nu === 'object')) continue;
              const oldId = oldIt && typeof oldIt === 'object' ? String(oldIt._id || '') : '';
              if (!nu._id && oldId && !used.has(oldId)) { nu._id = oldId; used.add(oldId); }
            }
            for (const it of newArr) { if (it && typeof it === 'object' && !it._id) { let id='cid_' + Math.random().toString(36).slice(2); while (used.has(id)) id = 'cid_' + Math.random().toString(36).slice(2); it._id = id; used.add(id); } }
            merged[field] = newArr;
            try { emitMessage(`[condition.ids] nodeId=${nodeId} items=${newArr.length}`); } catch {}
          }
        } catch {}
        node.data.model.context = merged;
        nodes[idx] = node;
        emitPatch([{ op: 'replace', path: '/nodes', value: nodes }]); emitSnapshot();
        try {
          const keys = Object.keys(context || {});
          emitMessage(`[context][create] nodeId=${nodeId} keys=${keys.length}`);
        } catch {}
        return JSON.stringify({ success: true });
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    }
  });

  // Alias: text_inputs → same data as get_node_context_inputs (shorter name some agents prefer)
  const textInputsTool = new DynamicStructuredTool({
    name: 'text_inputs',
    description: 'Alias: identique à get_node_context_inputs (schéma + prompt + prédécesseurs + skeleton).',
    schema: z.object({ nodeId: z.string() }).describe('Entrées complètes pour générer le context.'),
    func: async ({ nodeId }) => {
      return getNodeContextInputsTool.func({ nodeId });
    }
  });

  // Register the new tool in the returned tools list by appending it

  // Lightweight check to know if a node has arguments to configure
  const hasNodeArgsTool = new DynamicStructuredTool({
    name: 'has_node_args',
    description: 'Indique si le nœud possède des arguments (fields/steps) et retourne un aperçu (clés/required).',
    schema: z.object({ nodeId: z.string() }).describe('Vérifier la présence d’arguments.'),
    func: async ({ nodeId }) => {
      try {
        console.log("ARGUMENTS")
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const node = nodes.find(n => String(n.id) === String(nodeId));
        if (!node) return JSON.stringify({ success: false, error: 'node_not_found' });
        const model = node?.data?.model || {}; const tpl = model?.templateObj || {}; const args = tpl?.args || {};
        const list = [];
        const scan = (arr) => {
          for (const f of (arr || [])) {
            if (!f || typeof f !== 'object') continue;
            const key = f.key || f.name; if (!key) continue;
            const req = !!f.required || (Array.isArray(f.validators) && f.validators.some(v => (v && (v.type === 'required' || v.name === 'required'))));
            list.push({ key: String(key), required: !!req, type: f.type || 'text' });
          }
        };
        scan(args.fields);
        for (const s of (args.steps || [])) scan(s?.fields);
        try { emitMessage(`[args] has nodeId=${nodeId} count=${list.length}`); } catch {}
        return JSON.stringify({ success: true, nodeId, count: list.length, items: list });
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    }
  });

  // List credentials for current workspace (id, name, providerKey)
  const listCredentialsTool = new DynamicStructuredTool({
    name: 'list_credentials',
    description: 'Liste les credentials du workspace courant (id, name, providerKey).',
    schema: z.object({ providerKey: z.string().optional() }).describe('Filtre optionnel par providerKey.'),
    func: async ({ providerKey }) => {
      try {
        const Credential = require('../db/models/credential.model');
        const Workspace = require('../db/models/workspace.model');
        let ws = null;
        if (workspaceId) ws = await Workspace.findOne({ id: String(workspaceId) }).lean();
        const q = {};
        if (ws && ws._id) q.workspaceId = ws._id;
        if (providerKey) q.providerKey = String(providerKey);
        const list = await Credential.find(q).lean();
        const out = list.map(c => ({ id: c.id || String(c._id), name: c.name, providerKey: c.providerKey }));
        return JSON.stringify({ success: true, credentials: out });
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    },
  });

  // Attach a credential to a node (by id or by name/providerKey)
  const attachCredentialTool = new DynamicStructuredTool({
    name: 'attach_credential',
    description: 'Associe un credential à un nœud (nodeId). Utiliser credentialId si connu, sinon name/providerKey pour sélectionner.',
    schema: z.object({
      nodeId: z.string(),
      credentialId: z.string().optional(),
      name: z.string().optional(),
      providerKey: z.string().optional(),
    }).describe('Liaison credential.'),
    func: async ({ nodeId, credentialId, name, providerKey }) => {
      try {
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const idx = nodes.findIndex(n => String(n.id) === String(nodeId));
        if (idx < 0) return JSON.stringify({ success: false, error: 'node_not_found' });
        const node = JSON.parse(JSON.stringify(nodes[idx]));
        const tmpl = node?.data?.model?.templateObj || {};
        const expectedProvider = providerKey || tmpl.providerKey || tmpl.appId || '';
        const Credential = require('../db/models/credential.model');
        const Workspace = require('../db/models/workspace.model');
        let ws = null; if (workspaceId) ws = await Workspace.findOne({ id: String(workspaceId) }).lean();
        const q = {};
        if (ws && ws._id) q.workspaceId = ws._id;
        if (credentialId) q.id = String(credentialId);
        if (!credentialId && expectedProvider) q.providerKey = String(expectedProvider);
        try { console.log('[ai-flow][cred] attach query', { nodeId, expectedProvider, q }); } catch {}
        const list = await Credential.find(q).lean();
        const ids = (list||[]).map(c => c.id || String(c._id));
        try { console.log('[ai-flow][cred] attach found', { count: (list||[]).length, ids }); } catch {}
        try { emitMessage(`[cred] attach candidates nodeId=${nodeId} providerKey=${expectedProvider||'-'} count=${(list||[]).length} ids=${ids.join(',')}`); } catch {}
        let cred = null;
        if (credentialId) cred = list.find(c => (c.id === credentialId || String(c._id) === credentialId));
        else if (name) cred = list.find(c => String(c.name).toLowerCase() === String(name).toLowerCase()) || list[0];
        else cred = list[0] || null;
        if (!cred) { try { console.warn('[ai-flow][cred] attach none found', { nodeId, expectedProvider }); emitMessage(`[cred] attach none found nodeId=${nodeId} providerKey=${expectedProvider||'-'}`); } catch {}; return JSON.stringify({ success: false, error: 'credential_not_found', providerKey: expectedProvider }); }
        node.data.model.credentialId = cred.id || String(cred._id);
        nodes[idx] = node;
        try { console.log('[ai-flow][cred] attached', { nodeId, credentialId: node.data.model.credentialId }); emitMessage(`[cred] attached nodeId=${nodeId} cid=${node.data.model.credentialId}`); } catch {}
        emitPatch([{ op: 'replace', path: '/nodes', value: nodes }]); emitSnapshot();
        return JSON.stringify({ success: true, nodeId, credentialId: node.data.model.credentialId });
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    },
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
      const templateObj = { id: tpl.key, name: tpl.name, title: tpl.title, type: tpl.type, category: tpl.category, providerKey: tpl.providerKey, appId: tpl.providerKey, args: tpl.args, output: tpl.output, authorize_catch_error: tpl.authorize_catch_error, authorize_skip_error: tpl.authorize_skip_error, allowWithoutCredentials: tpl.allowWithoutCredentials, output_array_field: tpl.output_array_field };
      const model = { id, name: name || (tpl.title || tpl.name || tpl.key), template: tpl.key, templateObj, context: {}, templateChecksum: argsChecksum(tpl.args||{}), templateFeatureSig: featureChecksum(tpl) };
      // Auto-attach first credential if available for this provider
      try {
        const pk = templateObj.providerKey || templateObj.appId || '';
        const cid = await firstCredentialIdFor(pk);
        try { console.log('[ai-flow][cred] autoAttach add_node', { nodeId: id, providerKey: pk, attached: !!cid, credentialId: cid || null }); } catch {}
        if (cid) (model).credentialId = cid;
      } catch (e) { try { console.warn('[ai-flow][cred] autoAttach error', e?.message || e); } catch {} }
      const node = { id, point, type: 'html-template', data: { model } };
      const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
      nodes.push(node);
      emitPatch([{ op: 'replace', path: '/nodes', value: nodes }]); emitSnapshot();
      // Re-layout with ELK to keep consistent placement
      try {
        const laid = await elkLayoutCurrentGraph({ nodes, edges: Array.isArray(getGraph().edges)?getGraph().edges.slice():[] }, 260, 160);
        if (laid) { emitPatch([{ op: 'replace', path: '/nodes', value: laid }]); emitSnapshot(); emitMessage('[layout.elk][ensure_start]'); }
      } catch {}
      return JSON.stringify({ success: true, nodeId: id, templateKey: tpl.key });
    },
  });

  const listGraphTool = new DynamicStructuredTool({
    name: 'list_graph',
    description: 'Liste les nœuds et arêtes du graphe courant.',
    schema: z.object({}).describe('Sans argument.'),
    func: async () => JSON.stringify({ success: true, graph: getGraph() }),
  });

  // Find nodes with optional filters (templateKey/type/provider), and report required-missing keys
  const findNodesTool = new DynamicStructuredTool({
    name: 'find_nodes',
    description: 'Liste les nœuds existants avec filtres optionnels (templateKey, type, providerKey) et les champs requis manquants.',
    schema: z.object({ templateKey: z.string().optional(), type: z.string().optional(), providerKey: z.string().optional() }).describe('Filtrer les nœuds.'),
    func: async ({ templateKey, type, providerKey }) => {
      try {
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const out = [];
        for (const n of nodes) {
          const m = n?.data?.model || {}; const t = m?.templateObj || {};
          if (templateKey && String(t.id || m.template || '').toLowerCase() !== String(templateKey).toLowerCase()) continue;
          if (type && String(t.type || '').toLowerCase() !== String(type).toLowerCase()) continue;
          if (providerKey && String(t.providerKey || t.appId || '').toLowerCase() !== String(providerKey).toLowerCase()) continue;
          // Compute required-missing keys
          const args = t?.args || {}; const ctx = m?.context || {};
          const missing = [];
          const scan = (arr) => {
            for (const f of (arr || [])) {
              if (!f || typeof f !== 'object') continue;
              const key = f.key || f.name; if (!key) continue;
              const req = !!f.required || (Array.isArray(f.validators) && f.validators.some(v => v && (v.type === 'required' || v.name === 'required')));
              if (req && (ctx[key] == null || ctx[key] === '')) missing.push(String(key));
            }
          };
          scan(args.fields); for (const s of (args.steps || [])) scan(s?.fields);
          out.push({ id: n.id, name: m?.name || null, templateKey: t.id || m.template || null, type: t.type || null, providerKey: t.providerKey || t.appId || null, missing });
        }
        try { emitMessage(`[nodes] found=${out.length} filtered by tpl=${templateKey||'-'} type=${type||'-'} prov=${providerKey||'-'}`); } catch {}
        return JSON.stringify({ success: true, nodes: out });
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    }
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
      // Prevent multiple start-like nodes
      try {
        const isSL = isStartLike(tpl);
        if (isSL && hasStartLike(g)) {
          const existing = (g.nodes||[]).find(n => isStartLike(n?.data?.model?.templateObj));
          try { emitMessage(`[start][skip] already exists id=${existing?.id}`); } catch {}
          return JSON.stringify({ success: false, error: 'start_already_exists', existingId: existing?.id || null });
        }
      } catch {}
      const usedIds = new Set((g.nodes||[]).map(n => String(n.id)));
      const id = generateNodeId(tpl, usedIds);
      const center = { x: 400, y: 300 };
      const near = (g.nodes||[]).find(n => String(n.id) === String(nearNodeId));
      let point = computeNewNodePosition(near, center);
      try {
        const fieldCount = (() => { try { const a = tpl.args || {}; const f = Array.isArray(a.fields) ? a.fields.length : 0; const s = Array.isArray(a.steps) ? a.steps.reduce((acc, st) => acc + (Array.isArray(st?.fields) ? st.fields.length : 0), 0) : 0; return f + s; } catch { return 0; } })();
        console.log('[ai-flow][node] add_node', { nodeId: id, templateKey, providerKey: tpl.providerKey || null, nearNodeId: nearNodeId || null, argsFields: fieldCount });
        try { emitMessage(`[node] add template=${templateKey} argsFields=${fieldCount}`); } catch {}
      } catch {}
      const templateObj = { id: tpl.key, name: tpl.name, title: tpl.title, type: tpl.type, category: tpl.category, providerKey: tpl.providerKey, appId: tpl.providerKey, args: tpl.args, output: tpl.output, authorize_catch_error: tpl.authorize_catch_error, authorize_skip_error: tpl.authorize_skip_error, allowWithoutCredentials: tpl.allowWithoutCredentials, output_array_field: tpl.output_array_field };
      // Initialize context with structural skeleton if args exist (no semantic values)
      const initCtx = (() => { try { const a = tpl.args || {}; const has = (Array.isArray(a.fields) && a.fields.length) || (Array.isArray(a.steps) && a.steps.some(s => Array.isArray(s?.fields) && s.fields.length)); return has ? makeEmptyContextFromArgs(a) : {}; } catch { return {}; } })();
      const model = { id, name: name || (tpl.title || tpl.name || tpl.key), template: tpl.key, templateObj, context: initCtx, templateChecksum: argsChecksum(tpl.args||{}), templateFeatureSig: featureChecksum(tpl) };
      // Auto-attach first credential if available for this provider
      try {
        const pk = templateObj.providerKey || templateObj.appId || '';
        const cid = await firstCredentialIdFor(pk);
        try { console.log('[ai-flow][cred] autoAttach add_node', { nodeId: id, providerKey: pk, attached: !!cid, credentialId: cid || null }); } catch {}
        if (cid) (model).credentialId = cid;
      } catch (e) { try { console.warn('[ai-flow][cred] autoAttach error', e?.message || e); } catch {} }
      // Prevent overlaps: if too close to an existing node, push right/down
      try {
        const exists = Array.isArray(g.nodes) ? g.nodes : [];
        let tries = 0;
        while (exists.some(n => Math.abs((n?.point?.x ?? 0) - point.x) < 80 && Math.abs((n?.point?.y ?? 0) - point.y) < 60) && tries < 6) {
          point = { x: point.x + 240, y: point.y + 40 };
          tries++;
        }
      } catch {}
      const node = { id, point, type: 'html-template', data: { model } };
      const ops = [];
      const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
      nodes.push(node);
      ops.push({ op: 'replace', path: '/nodes', value: nodes });
      emitPatch(ops); emitSnapshot();
      // Re-layout with ELK after node addition for consistency
      try {
        const g2 = getGraph();
        const laid = await elkLayoutCurrentGraph({ nodes: Array.isArray(g2.nodes)?g2.nodes.slice():[], edges: Array.isArray(g2.edges)?g2.edges.slice():[] }, 260, 160);
        if (laid) { emitPatch([{ op: 'replace', path: '/nodes', value: laid }]); emitSnapshot(); emitMessage('[layout.elk][add_node]'); }
      } catch {}
      try { const kc = Object.keys(initCtx || {}).length; if (kc) emitMessage(`[args] init nodeId=${id} keys=${kc}`); } catch {}
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
      const next = { ...cur, ...(params || {}) };
      // Stabilize condition items ids like frontend ensureStableConditionIds
      try {
        const tpl = node?.data?.model?.templateObj || {};
        if (String(tpl.type || '').toLowerCase() === 'condition') {
          const field = tpl.output_array_field || 'items';
          const oldArr = Array.isArray(cur[field]) ? cur[field] : [];
          const newArr = Array.isArray(next[field]) ? next[field] : [];
          const used = new Set((newArr || []).map(it => (it && typeof it === 'object' && it._id) ? String(it._id) : '').filter(Boolean));
          for (let i = 0; i < Math.min(oldArr.length, newArr.length); i++) {
            const oldIt = oldArr[i]; const newIt = newArr[i];
            if (!(newIt && typeof newIt === 'object')) continue;
            const oldId = oldIt && typeof oldIt === 'object' ? String(oldIt._id || '') : '';
            if (!newIt._id && oldId && !used.has(oldId)) { newIt._id = oldId; used.add(oldId); }
          }
          for (const it of newArr) { if (it && typeof it === 'object' && !it._id) { let id = ''; do { id = 'cid_' + Math.random().toString(36).slice(2); } while (used.has(id)); it._id = id; used.add(id); } }
          next[field] = newArr;
        }
      } catch {}
      node.data.model.context = next;
      nodes[idx] = node;
      try {
        const keys = Object.keys(params || {});
        const head = keys.slice(0, 6).join(',');
        emitMessage(`[args] set nodeId=${nodeId} keys=${keys.length} (${head}${keys.length>6?',…':''})`);
      } catch {}
      emitPatch([{ op: 'replace', path: '/nodes', value: nodes }]); emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  // Validate required args missing for a node (for agent guidance & logs)
  const validateNodeParamsTool = new DynamicStructuredTool({
    name: 'validate_node_params',
    description: 'Retourne les champs requis manquants pour un nœud donné selon son schéma d’Arguments.',
    schema: z.object({ nodeId: z.string() }).describe('Validation des paramètres.'),
    func: async ({ nodeId }) => {
      try {
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const node = nodes.find(n => String(n.id) === String(nodeId));
        if (!node) return JSON.stringify({ success: false, error: 'node_not_found' });
        const model = node?.data?.model || {};
        const ctx = model?.context || {};
        const tpl = model?.templateObj || {};
        const args = tpl?.args || {};
        const collect = [];
        const scanFields = (arr) => {
          for (const f of (arr || [])) {
            if (!f || typeof f !== 'object') continue;
            const key = f.key || f.name; if (!key) continue;
            const req = !!f.required || (Array.isArray(f.validators) && f.validators.some(v => (v && (v.type === 'required' || v.name === 'required'))));
            if (!req) continue;
            if (ctx[key] == null || ctx[key] === '') collect.push(String(key));
          }
        };
        scanFields(args.fields);
        for (const step of (args.steps || [])) scanFields(step?.fields);
        try { emitMessage(`[args] validate nodeId=${nodeId} missing=${collect.length}`); } catch {}
        return JSON.stringify({ success: true, nodeId, missing: collect });
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    }
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
      const edges = Array.isArray(g.edges) ? g.edges.slice() : [];

      // Decide default source handle using frontend-like logic and avoid reusing handles when possible
      const model = src?.data?.model || {};
      const tpl = model?.templateObj || {};
      const srcT = String(tpl?.type || '').toLowerCase();
      let sh = sourceHandle;
      if (!sh) {
        if (srcT === 'start' || srcT === 'start_form' || srcT === 'event' || srcT === 'endpoint') {
          sh = 'out';
        } else if (srcT === 'condition') {
          // Prefer first available condition item by index 0 or existing _id if present
          const field = tpl.output_array_field || 'items';
          const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
          if (arr.length) {
            const h0 = (arr[0] && typeof arr[0] === 'object' && arr[0]._id) ? String(arr[0]._id) : '0';
            sh = h0;
          } else {
            sh = '0';
          }
        } else {
          // Function-like: choose first free non-error handle among indices
          const outs = Array.isArray(tpl.output) && tpl.output.length ? tpl.output.length : 1;
          const enableErr = !!tpl.authorize_catch_error && !!model?.catch_error;
          const used = new Set(edges.filter(e => String(e.source) === String(sourceId)).map(e => String(e.sourceHandle ?? '')));
          let candidate = null;
          for (let i = 0; i < outs; i++) {
            const h = String(i);
            if (!used.has(h)) { candidate = h; break; }
          }
          sh = candidate != null ? candidate : '0';
          if (enableErr && !used.has('err') && !sourceHandle && String(targetHandle || '') === 'err') sh = 'err';
        }
      }
      const th = targetHandle || 'in';

      // Validate numeric handle against outputs length (do not allow out-of-range indexes)
      // Use canonical outputs from templates DB, not the possibly mutated model.templateObj.output
      const canonical = await canonicalOutputsFor(String(tpl.id || model.template || ''));
      const outsCount = (Array.isArray(canonical) && canonical.length) ? canonical.length : 1;
      const shStr = String(sh ?? '');
      const isNumericHandle = /^\d+$/.test(shStr);
      if (isNumericHandle) {
        const idx = parseInt(shStr, 10);
        if (!(idx >= 0 && idx < outsCount)) {
          try { emitMessage(`[edge][invalid_output_index] sourceId=${sourceId} handle=${shStr} outs=${outsCount}`); } catch {}
          return JSON.stringify({ success: false, error: 'invalid_output_index', index: idx, outputs: outsCount });
        }
      }
      // For function-like nodes: enforce numeric handle or 'err'
      const isFuncLike = !(srcT === 'start' || srcT === 'start_form' || srcT === 'event' || srcT === 'endpoint' || srcT === 'condition');
      if (isFuncLike && !isNumericHandle && String(shStr) !== 'err') {
        try { emitMessage(`[edge][invalid_output_handle] sourceId=${sourceId} handle=${shStr} type=${srcT}`); } catch {}
        return JSON.stringify({ success: false, error: 'invalid_output_handle' });
      }
      // Warn if model.templateObj.output differs from canonical
      try {
        const modelOut = Array.isArray(tpl.output) ? tpl.output : [];
        if (stableStringify(modelOut) !== stableStringify(canonical)) {
          emitMessage(`[template.output_mismatch] nodeId=${sourceId} template=${String(tpl.id||model.template||'')} model=${JSON.stringify(modelOut)} canonical=${JSON.stringify(canonical)}`);
        }
      } catch {}

      // For condition: if handle is non-numeric, ensure it matches a known _id; otherwise error
      if (srcT === 'condition' && !/^\d+$/.test(String(sh))) {
        const field = tpl.output_array_field || 'items';
        const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        const ok = arr.some(x => x && typeof x === 'object' && String(x._id) === String(sh));
        if (!ok) {
          try { emitMessage(`[edge][invalid_condition_handle] sourceId=${sourceId} handle=${String(sh)}`); } catch {}
          return JSON.stringify({ success: false, error: 'invalid_condition_handle' });
        }
      }

      // Compute label and error styling identical to frontend; ensure 'err' is allowed only when enabled
      const isErr = String(sh) === 'err';
      if (isErr) {
        const tplAllow = !!tpl.authorize_catch_error;
        const enabled = !!model?.catch_error;
        if (!tplAllow || !enabled) {
          try { emitMessage(`[edge][error_output_disabled] sourceId=${sourceId}`); } catch {}
          return JSON.stringify({ success: false, error: 'error_output_disabled' });
        }
      }
      // Prefer canonical outputs to derive label for function-like nodes
      let label = '';
      if (srcT === 'condition') {
        label = computeEdgeLabelFrom(model, sh);
      } else if (isErr) {
        label = 'Error';
      } else if (isNumericHandle) {
        const idx = parseInt(String(sh), 10);
        label = (canonical && Array.isArray(canonical) && canonical[idx] != null) ? String(canonical[idx]) : computeEdgeLabelFrom(model, sh);
      } else {
        label = computeEdgeLabelFrom(model, sh);
      }
      try { emitMessage(`[edge][label] sourceId=${sourceId} handle=${String(sh)} label=${label}`); } catch {}
      const edgeColor = isErr ? '#f759ab' : '#b1b1b7';
      const newEdge = {
        type: 'template',
        id: makeEdgeId(sourceId, targetId, sh, th),
        source: sourceId,
        target: targetId,
        sourceHandle: sh,
        targetHandle: th,
        edgeLabels: { center: { type: 'html-template', data: { text: label } } },
        data: isErr ? { error: true, strokeWidth: 1, color: edgeColor } : { strokeWidth: 2, color: edgeColor },
        markers: { end: { type: 'arrow-closed', color: edgeColor } }
      };

      // Do not reposition here; placement is handled in auto_place to match frontend sequencing

      try { console.log('[ai-flow][edge] connect', { id: newEdge.id, sh, th }); } catch {}
      edges.push(newEdge);
      emitPatch([{ op: 'replace', path: '/edges', value: edges }]);

      // ELK layout for consistent placement after each connect
      try {
        const g2 = getGraph();
        const laid = await elkLayoutCurrentGraph({ nodes: Array.isArray(g2.nodes)?g2.nodes.slice():[], edges: Array.isArray(g2.edges)?g2.edges.slice():[] }, 260, 160);
        if (laid) { emitPatch([{ op: 'replace', path: '/nodes', value: laid }]); emitSnapshot(); emitMessage('[layout.elk][connect]'); }
        else emitSnapshot();
      } catch { emitSnapshot(); }
      return JSON.stringify({ success: true });
    },
  });

  const autoPlaceTool = new DynamicStructuredTool({
    name: 'auto_place',
    description: 'Repositionne un nœud selon sa première arête entrante (branches côte à côte sous la source).',
    schema: z.object({ nodeId: z.string(), gapX: z.number().optional(), gapY: z.number().optional() }).describe('Placement.'),
    func: async ({ nodeId, gapX, gapY }) => {
      // Delegate to ELK layout for consistent placement
      try {
        const g = getGraph();
        const laid = await elkLayoutCurrentGraph({ nodes: Array.isArray(g.nodes)?g.nodes.slice():[], edges: Array.isArray(g.edges)?g.edges.slice():[] }, Number.isFinite(gapX)?gapX:260, Number.isFinite(gapY)?gapY:160);
        if (laid) { emitPatch([{ op: 'replace', path: '/nodes', value: laid }]); emitSnapshot(); emitMessage(`[layout.elk][auto_place] nodeId=${nodeId}`); return JSON.stringify({ success: true, engine: 'elk' }); }
      } catch (e) {
        try { emitMessage('[layout.elk][auto_place][error] ' + (e?.message || e)); } catch {}
      }
      return JSON.stringify({ success: false, error: 'elk_failed' });
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

      // Try ELK if available or if requested via env var
      try {
        const useElk = String(process.env.AI_FLOW_USE_ELK || '1') === '1';
        if (useElk) {
          const laid = await elkLayoutCurrentGraph({ nodes, edges }, gapX, gapY);
          if (laid && Array.isArray(laid) && laid.length === nodes.length) {
            try { emitMessage(`[layout.elk] nodes=${laid.length} edges=${edges.length}`); } catch {}
            emitPatch([{ op: 'replace', path: '/nodes', value: laid }]);
            emitSnapshot();
            return JSON.stringify({ success: true, engine: 'elk' });
          }
        }
      } catch {}
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
      const outNodes = Array.from(newById.values());
      try { emitMessage(`[layout.bfs] nodes=${outNodes.length} edges=${edges.length}`); } catch {}
      emitPatch([{ op: 'replace', path: '/nodes', value: outNodes }]);
      emitSnapshot();
      return JSON.stringify({ success: true, engine: 'bfs' });
    },
  });

  // List static outputs for a node (function-like); for condition, returns dynamic items names
  const getNodeOutputsTool = new DynamicStructuredTool({
    name: 'get_node_outputs',
    description: 'Retourne les sorties d’un nœud: pour les fonctions, le tableau template.output; pour les conditions, les noms des items du champ output_array_field.',
    schema: z.object({ nodeId: z.string() }).describe('Lister les sorties.'),
    func: async ({ nodeId }) => {
      try {
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const node = nodes.find(n => String(n.id) === String(nodeId));
        if (!node) return JSON.stringify({ success: false, error: 'node_not_found' });
        const model = node?.data?.model || {}; const tpl = model?.templateObj || {};
        const t = String(tpl?.type || '').toLowerCase();
        if (t === 'condition') {
          const field = tpl.output_array_field || 'items';
          const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
          const names = arr.map((it, i) => (it && typeof it === 'object' && (it.name != null)) ? String(it.name) : (typeof it === 'string' ? it : String(i)));
          try { emitMessage(`[outputs] nodeId=${nodeId} type=condition names=${JSON.stringify(names)}`); } catch {}
          return JSON.stringify({ success: true, type: 'condition', outputs: names });
        }
        const outs = Array.isArray(tpl.output) && tpl.output.length ? tpl.output.slice() : ['Success'];
        try { emitMessage(`[outputs] nodeId=${nodeId} type=${t||'function'} names=${JSON.stringify(outs)}`); } catch {}
        return JSON.stringify({ success: true, type: t || 'function', outputs: outs });
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    }
  });

  // Return concrete handles with labels for a node (indices for functions; ids or indices for conditions; 'err' if allowed/enabled)
  const getOutputOptionsTool = new DynamicStructuredTool({
    name: 'get_output_options',
    description: 'Retourne les couples {handle,label} pour chaque sortie disponible du nœud (inclut "err" si catch activé et autorisé).',
    schema: z.object({ nodeId: z.string() }).describe('Lister les handles utilisables.'),
    func: async ({ nodeId }) => {
      try {
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const node = nodes.find(n => String(n.id) === String(nodeId));
        if (!node) return JSON.stringify({ success: false, error: 'node_not_found' });
        const model = node?.data?.model || {}; const tpl = model?.templateObj || {};
        const t = String(tpl?.type || '').toLowerCase();
        const res = [];
        if (t === 'condition') {
          const field = tpl.output_array_field || 'items';
          const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
          arr.forEach((it, i) => {
            if (it && typeof it === 'object') {
              const h = (it._id != null) ? String(it._id) : String(i);
              const name = (it.name != null) ? String(it.name) : String(i);
              res.push({ handle: h, label: name });
            } else {
              res.push({ handle: String(i), label: String(it) });
            }
          });
        } else {
          const outs = Array.isArray(tpl.output) && tpl.output.length ? tpl.output.slice() : ['Success'];
          outs.forEach((name, i) => res.push({ handle: String(i), label: String(name) }));
          if (tpl.authorize_catch_error && model?.catch_error) res.push({ handle: 'err', label: 'Error' });
        }
        try { emitMessage(`[outputs.options] nodeId=${nodeId} options=${JSON.stringify(res)}`); } catch {}
        return JSON.stringify({ success: true, options: res });
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    }
  });

  // Connect by output label/name; resolves to correct handle (enables catch if needed and authorized)
  const connectByOutputNameTool = new DynamicStructuredTool({
    name: 'connect_by_output_name',
    description: 'Connecte deux nœuds en choisissant la sortie par son nom/label (ou "Error"). Active catch si nécessaire et autorisé.',
    schema: z.object({ sourceId: z.string(), targetId: z.string(), outputName: z.string() }).describe('Connexion guidée par nom.'),
    func: async ({ sourceId, targetId, outputName }) => {
      try {
        const g = getGraph();
        const src = (g.nodes||[]).find(n => String(n.id) === String(sourceId));
        const dst = (g.nodes||[]).find(n => String(n.id) === String(targetId));
        if (!src || !dst) return JSON.stringify({ success: false, error: 'node_not_found' });
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const idx = nodes.findIndex(n => String(n.id) === String(sourceId));
        const model = src?.data?.model || {}; const tpl = model?.templateObj || {};
        const t = String(tpl?.type || '').toLowerCase();
        const nameLc = String(outputName || '').trim().toLowerCase();
        const doConnect = async (handle) => {
          const connect = (await buildTools({ DynamicStructuredTool, getGraph, emitPatch, emitSnapshot, emitMessage, workspaceId, instruction, history })).find(t => t.name === 'connect');
          if (!connect) return JSON.stringify({ success: false, error: 'connect_tool_unavailable' });
          return await connect.func({ sourceId, targetId, sourceHandle: String(handle), targetHandle: 'in' });
        };
        if (nameLc === 'error' || nameLc === 'err') {
          if (!tpl.authorize_catch_error) return JSON.stringify({ success: false, error: 'catch_not_authorized' });
          if (!model.catch_error) {
            const setFlags = (await buildTools({ DynamicStructuredTool, getGraph, emitPatch, emitSnapshot, emitMessage, workspaceId, instruction, history })).find(t => t.name === 'set_node_flags');
            if (setFlags) {
              const resp = JSON.parse(await setFlags.func({ nodeId: sourceId, catch_error: true }));
              if (!(resp && resp.success)) return JSON.stringify({ success: false, error: 'catch_enable_failed' });
            }
          }
          try { emitMessage(`[edge][resolve_by_name] sourceId=${sourceId} name=${outputName} handle=err`); } catch {}
          return await doConnect('err');
        }
        if (t === 'condition') {
          const field = tpl.output_array_field || 'items';
          const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
          let handle = null;
          for (let i = 0; i < arr.length; i++) {
            const it = arr[i];
            const label = (it && typeof it === 'object' && (it.name != null)) ? String(it.name) : (typeof it === 'string' ? it : String(i));
            if (String(label).trim().toLowerCase() === nameLc) { handle = (it && typeof it === 'object' && it._id != null) ? String(it._id) : String(i); break; }
          }
          if (handle == null) return JSON.stringify({ success: false, error: 'output_not_found' });
          try { emitMessage(`[edge][resolve_by_name] sourceId=${sourceId} name=${outputName} handle=${handle}`); } catch {}
          return await doConnect(handle);
        }
        const outs = Array.isArray(tpl.output) && tpl.output.length ? tpl.output.slice() : ['Success'];
        const idxMatch = outs.findIndex(n => String(n).trim().toLowerCase() === nameLc);
        if (idxMatch < 0) return JSON.stringify({ success: false, error: 'output_not_found' });
        try { emitMessage(`[edge][resolve_by_name] sourceId=${sourceId} name=${outputName} handle=${idxMatch}`); } catch {}
        return await doConnect(String(idxMatch));
      } catch (e) { return JSON.stringify({ success: false, error: String(e?.message||e) }); }
    }
  });

  // Toggle node flags (catch_error / skip_error) when template authorizes them
  const setNodeFlagsTool = new DynamicStructuredTool({
    name: 'set_node_flags',
    description: 'Active/désactive catch_error ou skip_error si le template le permet (mutuellement exclusifs).',
    schema: z.object({ nodeId: z.string(), catch_error: z.boolean().optional(), skip_error: z.boolean().optional() }).describe('Configurer les options du nœud.'),
    func: async ({ nodeId, catch_error, skip_error }) => {
      const g = getGraph();
      const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
      const idx = nodes.findIndex(n => String(n.id) === String(nodeId));
      if (idx < 0) return JSON.stringify({ success: false, error: 'node_not_found' });
      const node = JSON.parse(JSON.stringify(nodes[idx]));
      const model = node?.data?.model || {}; const tpl = model?.templateObj || {};
      const allowCatch = !!tpl.authorize_catch_error; const allowSkip = !!tpl.authorize_skip_error;
      // Enforce authorizations
      if (catch_error != null && catch_error && !allowCatch) return JSON.stringify({ success: false, error: 'catch_not_authorized' });
      if (skip_error != null && skip_error && !allowSkip) return JSON.stringify({ success: false, error: 'skip_not_authorized' });
      // Apply with mutual exclusivity: enabling one disables the other
      let next = { ...model };
      if (catch_error != null) {
        next.catch_error = !!catch_error;
        if (next.catch_error) next.skip_error = false;
      }
      if (skip_error != null) {
        next.skip_error = !!skip_error;
        if (next.skip_error) next.catch_error = false;
      }
      node.data.model = next;
      nodes[idx] = node;
      emitPatch([{ op: 'replace', path: '/nodes', value: nodes }]); emitSnapshot();
      try { emitMessage(`[flags] nodeId=${nodeId} catch=${!!next.catch_error} skip=${!!next.skip_error}`); } catch {}
      return JSON.stringify({ success: true, nodeId, catch_error: !!next.catch_error, skip_error: !!next.skip_error });
    }
  });

  const emitSnapshotTool = new DynamicStructuredTool({
    name: 'emit_snapshot',
    description: 'Envoie un snapshot complet du graphe.',
    schema: z.object({}).describe('Sans argument.'),
    func: async () => {
      // Validate that required args are set before finalizing; do not autofill (the agent must set params)
      try {
        const g = getGraph();
        const nodes = Array.isArray(g.nodes) ? g.nodes.slice() : [];
        const missingPerNode = [];
        for (const n of nodes) {
          const m = n?.data?.model || {}; const t = m?.templateObj || {}; const a = t?.args || {}; const ctx = m?.context || {};
          const collect = [];
          const scanFields = (arr) => {
            for (const f of (arr || [])) {
              if (!f || typeof f !== 'object') continue;
              const key = f.key || f.name; if (!key) continue;
              const req = !!f.required || (Array.isArray(f.validators) && f.validators.some(v => (v && (v.type === 'required' || v.name === 'required'))));
              if (req && (ctx[key] == null || ctx[key] === '')) collect.push(String(key));
            }
          };
          scanFields(a.fields);
          for (const step of (a.steps || [])) scanFields(step?.fields);
          if (collect.length) missingPerNode.push({ nodeId: String(n.id), missing: collect });
        }
        if (missingPerNode.length) {
          try {
            const gById = new Map((getGraph().nodes||[]).map(n => [String(n.id), n]));
            const details = missingPerNode.map(x => {
              const n = gById.get(String(x.nodeId));
              const name = n?.data?.model?.name || n?.data?.model?.template || 'node';
              const tpl = n?.data?.model?.templateObj?.id || n?.data?.model?.template || '-';
              return `${x.nodeId}(${name}/${tpl}):{${x.missing.join(',')}}`;
            }).join(' ');
            emitMessage(`[args][missing] nodes=${missingPerNode.length} ${details}`);
          } catch {}
          return JSON.stringify({ success: false, code: 'args_missing', nodes: missingPerNode });
        }
      } catch {}
      emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  return [
    getTemplatesTool,
    findNodesTool,
    hasNodeArgsTool,
    textInputsTool,
    getNodeOutputsTool,
    getOutputOptionsTool,
    connectByOutputNameTool,
    getNodeContextInputsTool,
    getNodeArgsSchemaTool,
    getNodeArgsZodTool,
    applyNodeParamsTool,
    injectNodeContextTool,
    createNodeContextTool,
    setNodeFlagsTool,
    validateNodeParamsTool,
    listCredentialsTool,
    attachCredentialTool,
    ensureStartTool,
    listGraphTool,
    addNodeTool,
    setNodeParamsTool,
    connectTool,
    aiGenerateFormSchemaTool,
    autoPlaceTool,
    autoLayoutTool,
    emitSnapshotTool,
  ];
}

module.exports = { runFlowAgentWithTools };
