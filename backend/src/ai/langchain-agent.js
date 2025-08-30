// CommonJS wrapper around ESM-only LangChain packages
// Provides: runFormAgentWithTools({ prompt, history, seedSchema, send, done })
// Uses zod + DynamicStructuredTool and streams events back via send() as SSE-compatible messages

let z;
try { ({ z } = require('zod')); } catch { z = undefined; }
const {
  toPointer,
  getAt,
  listTree,
  parentArrayPtr,
  indexFromPtr,
  clampCol,
} = require('./schema-utils');
const { getCatalog } = require('./input-types');

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

function applyPatch(target, ops) {
  const parsePtr = (p) => String(p || '').replace(/^\//, '').split('/').map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  const get = (obj, parts) => parts.reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
  const ensureParent = (obj, parts, isAdd, lastToken) => {
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      const k = parts[i];
      const next = parts[i + 1];
      if (cur[k] == null) {
        const makeArray = (next !== undefined && (next === '-' || String(+next) === next)) || k === 'fields' || k === 'steps' || (isAdd && lastToken === '-');
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

function normalizeHistory(h) {
  if (!Array.isArray(h)) return [];
  return h.filter(m => m && typeof m === 'object' && m.role && m.content).map(m => ({ role: m.role, content: String(m.content) }));
}

function systemPrompt() {
  // Tools-only planner: reflect first, then build via tools.
  return [
    'Tu es un concepteur expert de formulaires Dynamic Form. Tu utilises UNIQUEMENT les tools fournis (pas de JSON final dans ta sortie).',
    "Processus: 1) fetch_input_catalog pour connaître toutes les options disponibles, et les types respect bien ces informations le type email N'EXISTE PAS c'est text avec validators 2) list_tree pour voir l’état, 3) set_form pour fixer le title et l’UI (layout, labelsOnTop), 4) crée les sections/steps et champs avec descriptions, placeholders, validators, options, conditions, 5) ajuste la grille (set_col) et set_at pour des updates précis, 6) emit_snapshot à la fin (et à chaque étape importante).",
    'Toujours réfléchir au besoin utilisateur, regrouper par thèmes, et documenter les sections avec une description claire résumant le but des champs inclus.',
    `Tu dois privilégier des formulaires détaillés: pour chaque champ, envisager placeholder, description, default, validators (required, min/max, minLength/maxLength, pattern) selon le type; pour select et radio, fournir des "options" sous forme de paires label/value en json en tableau dans options pour le field tu dois pas oublié !!, ne pas oublié pour les select OBLIGATOIRE; et respecter bien les types et informations fourni par le tool fetch_input_catalog, ajouter visibleIf/requiredIf/disabledIf pertinents; renseigner col.xs=24 par défaut et adapter si nécessaire.`,
    "UI par défaut: layout='vertical', labelsOnTop=true; steps uniquement lorsque plusieurs sujets distincts; ajouter summary si utile. Grille responsive: xs=24, sm=24; en vertical, privilégie la division sur grands écrans: md≈12 (2 colonnes), lg≈8–12 (2–3 colonnes), xl≈6–8 (3–4 colonnes) selon la densité. Conserve 24 pour les champs larges (textarea, descriptions longues) et les blocs critiques. Applique set_col après chaque ajout pour refléter cette répartition.",
    "Chemins UI-style STRICTS: racine sections='fields', ex: 'fields[0]' (première section), 'fields[0].fields[1]' (2e champ de la 1re section). Avec steps: 'steps[0]' (1re step), 'steps[0].fields[0]' (1re section de la step), 'steps[0].fields[0].fields[1]' (2e champ). Si l’index n’existe pas, tu le crées. AUCUN JSON Pointer ('/…') et AUCUN 'sections' dans les paths.",
    'Exemples (format manifest plugins) — inspiration uniquement:',
    "- Sans steps: title='Formulaire', ui.layout='vertical', ui.labelsOnTop=true, fields[0].type='section', fields[0].title='Informations Générales', fields[0].fields[0] est un champ (key/label/type/col).",
    "- Avec steps: steps[0].title='Étape 1', steps[0].fields[0].type='section', steps[0].fields[0].fields[0] est un champ (key/label/type/col).",
  ].join('\n');
}

async function runFormAgentWithTools({ prompt, history = [], seedSchema = null, preferSteps = false, layout = 'vertical', maxFields = 6, send, done }) {
  // In-memory schema
  let schema = seedSchema && typeof seedSchema === 'object' ? JSON.parse(JSON.stringify(seedSchema)) : {};

  const emitMessage = (text) => { try { console.log('[ai-form][langchain]', text); } catch {} ; send({ type: 'message', role: 'assistant', text }); };
  const emitPatch = (ops) => { try { applyPatch(schema, ops); } catch {} ; send({ type: 'patch', ops }); };
  const emitSnapshot = () => send({ type: 'snapshot', schema });

  try {
    if (!z) throw new Error('zod_not_available');
    emitMessage('[langchain] init…');
    const { DynamicStructuredTool, ChatOpenAI, createOpenAIToolsAgent, AgentExecutor, ChatPromptTemplate } = await importLC();
    // Tools
    const tools = await buildToolsLC({ DynamicStructuredTool, getSchema: () => schema, emitPatch, emitSnapshot, emitMessage });
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

    emitMessage('Agent LangChain initialisé. Démarrage du streaming…');
    const instruction = String(prompt || '').trim();
    const stream = await executor.streamEvents({ input: instruction, chat_history: normalizeHistory(history) }, { version: 'v2' });
    const toolArgs = {};
    for await (const event of stream) {
      try {
        if (event.event === 'on_chat_model_stream') {
          const chunk = event.data?.chunk;
          if (chunk?.content) emitMessage(chunk.content);
          const tcc = chunk?.tool_call_chunks || [];
          for (const tc of tcc) {
            const idx = tc.index;
            if (!toolArgs[idx]) toolArgs[idx] = { name: tc.name || null, args: '' };
            if (tc.name && !toolArgs[idx].name) toolArgs[idx].name = tc.name;
            if (typeof tc.args === 'string') toolArgs[idx].args += tc.args;
          }
        } else if (event.event === 'on_tool_start') {
          emitMessage(`>>> tool ${event.name} args=${JSON.stringify(event.data?.input?.input || {})}`);
        } else if (event.event === 'on_tool_end') {
          emitMessage(`✓ ${event.name} ok`);
        }
      } catch {}
    }
    emitSnapshot();
    try { console.log('[ai-form][langchain][final_schema]', JSON.stringify(schema)); } catch {}
    done();
  } catch (err) {
    const msg = (err && err.stack) ? err.stack : (err?.message || String(err));
    emitMessage('[langchain][error] ' + msg);
    // Pas de fallback heuristique: l’agent doit générer et appeler les tools lui-même.
    done();
  }
}

async function buildToolsLC({ DynamicStructuredTool, getSchema, emitPatch, emitSnapshot, emitMessage }) {
  function normalizeFieldOptions(field){
    try {
      if (!field || typeof field !== 'object') return;
      const t = String(field.type || '').toLowerCase();
      if (t !== 'select' && t !== 'radio') return;
      let opts = field.options;
      if (opts == null) return;
      const toTitle = (s) => { try { const x = String(s || '').trim(); return x.slice(0,1).toUpperCase() + x.slice(1); } catch { return String(s); } };
      let out = [];
      if (Array.isArray(opts)) {
        if (opts.length && typeof opts[0] === 'string') out = opts.map(v => ({ label: toTitle(v), value: String(v) }));
        else if (opts.length && typeof opts[0] === 'object') {
          out = opts.map(o => {
            if (o && typeof o === 'object') {
              if (o.label != null && o.value != null) return { label: String(o.label), value: String(o.value) };
              if (o.text != null && o.value != null) return { label: String(o.text), value: String(o.value) };
              const k = Object.keys(o)[0]; if (k) return { label: toTitle(k), value: String(o[k]) };
            }
            return null;
          }).filter(Boolean);
        }
      } else if (typeof opts === 'object') {
        out = Object.entries(opts).map(([k, v]) => ({ label: toTitle(k), value: String(v) }));
      } else if (typeof opts === 'string') {
        out = opts.split(',').map(s => s.trim()).filter(Boolean).map(v => ({ label: toTitle(v), value: v }));
      }
      if (out.length === 0) out = [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }];
      field.options = out;
      if (field.default != null) {
        const dv = String(field.default);
        if (!out.find(o => String(o.value) === dv)) out.push({ label: toTitle(dv), value: dv });
      }
    } catch {}
  }
  const ensureUiPath = (path) => {
    const s = String(path || '').trim();
    if (!s || s.startsWith('/')) throw new Error('path_must_be_ui_style');
    const head = s.split(/[.\[]/, 1)[0];
    if (head !== 'fields' && head !== 'steps') throw new Error('path_must_start_with_fields_or_steps');
    if (s.includes('sections')) throw new Error('path_must_not_use_sections');
    return s;
  };

  // Form config (title + ui)
  const setFormTool = new DynamicStructuredTool({
    name: 'set_form',
    description: 'Définit le title et l’UI du formulaire (layout, labelsOnTop, labelAlign, labelCol/controlCol, widthPx).',
    schema: z.object({
      title: z.string().optional().describe('Titre du formulaire.'),
      ui: z.record(z.any()).optional().describe('Objet UI complet ou partiel.'),
    }).describe('Configuration formulaire.'),
    func: async ({ title, ui }) => {
      const ops = [];
      if (typeof title === 'string') ops.push({ op: 'add', path: '/title', value: title });
      if (ui && typeof ui === 'object') ops.push({ op: 'add', path: '/ui', value: ui });
      if (ops.length) emitPatch(ops);
      emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  // UI config
  const setUiTool = new DynamicStructuredTool({
    name: 'set_ui',
    description: 'Définit ui du formulaire (layout, labelsOnTop, labelAlign, labelCol/controlCol, widthPx).',
    schema: z.object({
      ui: z.record(z.any()).describe('Objet UI complet ou partiel.'),
    }).describe('Configuration UI.'),
    func: async ({ ui }) => {
      emitPatch([{ op: 'add', path: '/ui', value: ui || {} }]); emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });
  const fetchCatalogTool = new DynamicStructuredTool({
    name: 'fetch_input_catalog',
    description: 'Retourne la liste des types (sections/champs) et leurs options pour construire des formulaires dynamiques tu trouveras les type existants il ni a que ce dans la liste respect uniquement ca mais avec les validator tu gerer ca.',
    schema: z.object({}).describe('Aucun argument.'),
    func: async () => JSON.stringify({ success: true, catalog: getCatalog() }),
  });

  const listTreeTool = new DynamicStructuredTool({
    name: 'list_tree',
    description: 'Liste les sections et champs du schéma (chemins inclus).',
    schema: z.object({}).describe('Sans argument.'),
    func: async () => JSON.stringify({ success: true, tree: listTree(getSchema()) }),
  });

  const findByKeyTool = new DynamicStructuredTool({
    name: 'find_by_key',
    description: 'Retourne les emplacements (pointer + uiPath) pour une key de champ/section donnée.',
    schema: z.object({ key: z.string().describe('Clé à chercher (field/section).') }).describe('Recherche par key.'),
    func: async ({ key }) => {
      const { findPathsByKey } = require('./schema-utils');
      const ptrs = findPathsByKey(getSchema(), key);
      const out = ptrs.map((p) => ({ pointer: p, uiPath: toUiPathFromPointer(p) }));
      return JSON.stringify({ success: true, results: out });
    },
  });

  const addSectionTool = new DynamicStructuredTool({
    name: 'add_section',
    description: "Ajoute une section à la racine (ou sous steps[i]) via location.path optionnel.",
    schema: z.object({
      location: z.object({
        path: z.string().optional().describe("Chemin UI-style vers le conteneur (ex: 'fields' pour racine, 'steps[0]' pour une step)."),
        root: z.string().optional().describe("'fields' ou 'steps' si pas de path."),
        index: z.number().int().optional().describe('Index de step si root==steps.'),
      }).optional().describe('Position ciblée.'),
      index: z.number().int().optional().describe("Index d'insertion (0..n) dans le conteneur."),
      section: z.object({
        title: z.string().describe('Titre de la section.'),
        description: z.string().optional().describe('Description.'),
        type: z.string().optional().describe("'section' ou 'section_array' (défaut section)."),
        key: z.string().optional().describe('Clé optionnelle.'),
        fields: z.array(z.record(z.any())).optional().describe('Champs internes.'),
      }).partial().describe('Objet section, fields est auto-initialisé.'),
    }).describe('Ajout de section.'),
    func: async ({ location, section, index }) => {
      const containerPtrFor = (loc) => {
        if (loc && loc.path) {
          ensureUiPath(loc.path);
          const base = toPointer(String(loc.path));
          if (/^\/steps\/\d+$/.test(base)) return `${base}/fields`;
          if (base === '/fields' || base.endsWith('/fields')) return base;
          throw new Error('invalid_container_path_for_section');
        }
        if (loc && loc.root === 'steps') {
          if (Number.isFinite(loc.index)) return `/steps/${loc.index}/fields`;
          throw new Error('missing_step_index_for_root_steps');
        }
        return '/fields';
      };
      const sec = { type: (section && section.type) || 'section', title: section?.title || 'Section', description: section?.description, key: section?.key, fields: Array.isArray(section?.fields) ? section.fields : [] };
      const containerPtr = containerPtrFor(location || {});
      const parent = Array.isArray(getAt(getSchema(), containerPtr)) ? getAt(getSchema(), containerPtr) : [];
      let arr = parent.slice();
      if (sec.key) {
        const dup = arr.findIndex((it) => it && typeof it === 'object' && it.key === sec.key);
        if (dup >= 0) { arr.splice(dup, 1); if (typeof index === 'number' && dup < index) index = Math.max(0, (index|0) - 1); }
      }
      const idx = typeof index === 'number' ? Math.max(0, Math.min(arr.length, index|0)) : arr.length;
      arr.splice(idx, 0, sec);
      emitPatch([{ op: 'replace', path: containerPtr, value: arr }]);
      const pointer = `${containerPtr}/${idx}`;
      const uiPath = toUiPathFromPointer(pointer);
      emitSnapshot();
      return JSON.stringify({ success: true, pointer, uiPath });
    },
  });

  const updateSectionTool = new DynamicStructuredTool({
    name: 'update_section',
    description: 'Met à jour une section (titre, description, ui, col, etc.) via path.',
    schema: z.object({
      path: z.string().describe("Chemin UI-style vers la section (ex: 'sections[0]')."),
      patch: z.record(z.any()).describe('Propriétés à fusionner dans la section.'),
    }).describe('Mise à jour section.'),
    func: async ({ path, patch }) => {
      ensureUiPath(path);
      const ptr = toPointer(path);
      const p = { ...(patch || {}) };
      // Apply pointer-like keys (relative to the section) with mapping sections→fields
      const ops = [];
      for (const k of Object.keys(p)) {
        if (k.startsWith('/')) {
          const nk = k.replace(/\/(sections)(?=\/|$)/g, '/fields');
          if (nk.startsWith('/fields') && Array.isArray(p[k])) {
            const curItems = Array.isArray(getAt(getSchema(), ptr + '/fields')) ? getAt(getSchema(), ptr + '/fields') : [];
            const src = p[k];
            const merged = curItems.map((it, i) => {
              const pi = src[i];
              return (pi && typeof pi === 'object') ? { ...it, ...pi } : (pi !== undefined ? pi : it);
            });
            ops.push({ op: 'replace', path: ptr + '/fields', value: merged });
          } else {
            ops.push({ op: 'replace', path: ptr + nk, value: p[k] });
          }
          delete p[k];
        }
      }
      if (ops.length) emitPatch(ops);
      if (Object.keys(p).length) {
        const current = getAt(getSchema(), ptr) || {};
        const next = { ...current, ...p };
        emitPatch([{ op: 'replace', path: ptr, value: next }]);
      }
      emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  const addFieldTool = new DynamicStructuredTool({
    name: 'add_field',
    description: "Ajoute un champ dans fields d'une section ciblée par location.path.",
    schema: z.object({
      location: z.object({
        path: z.string().describe("Chemin UI-style du conteneur (ex: 'fields' pour racine, 'fields[0]' pour la première section, ou 'steps[0]' pour la première step)."),
      }).describe('Position.'),
      index: z.number().int().optional().describe("Index d'insertion (0..n) dans le conteneur."),
      field: z.object({
        key: z.string().describe('Clé technique du champ (obligatoire).'),
        label: z.string().describe('Libellé affiché.'),
        type: z.string().describe("Type: text, email, number, select, checkbox, date."),
        options: z.record(z.any()).optional().describe('Options spécifiques.'),
      }).describe('Objet champ.'),
    }).describe('Ajout de champ.'),
    func: async ({ location, field, index }) => {
      ensureUiPath(location?.path || '');
      const ptr = toPointer(String(location?.path || 'fields'));
      let containerPtr = ptr;
      let explicitIdx;
      // Case 1: explicit slot inside a section's fields: .../fields/<sectionIndex>/fields/<fieldIndex>
      let m = ptr.match(/^(.*\/fields\/\d+\/fields)\/(\d+)$/);
      if (m) {
        containerPtr = m[1];
        explicitIdx = Number(m[2]);
      } else {
        // Case 2: path points to a section item (root or within step): .../fields/<sectionIndex>
        if (/^\/fields\/\d+$/.test(ptr) || /^\/steps\/\d+\/fields\/\d+$/.test(ptr)) {
          containerPtr = `${ptr}/fields`;
        } else if (/^\/steps\/\d+$/.test(ptr)) {
          // Case 3: path points to a step container → its sections container is /steps/<i>/fields
          containerPtr = `${ptr}/fields`;
        } else if (ptr === '/fields' || /\/fields$/.test(ptr)) {
          // Case 4: already a fields container (root or nested)
          containerPtr = ptr;
        } else {
          // Fallback: treat as container owning a fields property
          containerPtr = `${ptr}/fields`;
        }
      }
      const f = { ...(field || {}) };
      if (!f.key && f.name) { f.key = f.name; delete f.name; }
      const parent = Array.isArray(getAt(getSchema(), containerPtr)) ? getAt(getSchema(), containerPtr) : [];
      let arr = parent.slice();
      let targetIdx = (explicitIdx !== undefined) ? explicitIdx : (typeof index === 'number' ? Math.max(0, Math.min(arr.length + 1, index|0)) : arr.length);
      if (targetIdx > arr.length) targetIdx = arr.length; // avoid creating placeholder holes
      if (explicitIdx === undefined) {
        const dup = arr.findIndex((it) => it && typeof it === 'object' && it.key === f.key);
        if (dup >= 0) {
          arr.splice(dup, 1);
          if (dup < targetIdx) targetIdx = Math.max(0, targetIdx - 1);
        }
      }
      arr[targetIdx] = f;
      emitPatch([{ op: 'replace', path: containerPtr, value: arr }]);
      const pointer = `${containerPtr}/${targetIdx}`;
      const uiPath = toUiPathFromPointer(pointer);
      emitSnapshot();
      return JSON.stringify({ success: true, pointer, uiPath });
    },
  });

  const addStepTool = new DynamicStructuredTool({
    name: 'add_step',
    description: 'Ajoute une step (titre requis) et optionnellement des champs initiaux.',
    schema: z.object({
      step: z.object({
        title: z.string().describe('Titre de la step.'),
        fields: z.array(z.record(z.any())).optional().describe('Champs initiaux.'),
      }).describe('Objet step.'),
      index: z.number().int().optional().describe('Index insertion (sinon fin).'),
    }).describe('Ajout de step.'),
    func: async ({ step, index }) => {
      const value = { title: step?.title || 'Étape', fields: Array.isArray(step?.fields) ? step.fields : [] };
      const parentPtr = '/steps';
      const parent = Array.isArray(getAt(getSchema(), parentPtr)) ? getAt(getSchema(), parentPtr) : [];
      let arr = parent.slice();
      const idx = typeof index === 'number' ? Math.max(0, Math.min(arr.length, index|0)) : arr.length;
      arr.splice(idx, 0, value);
      emitPatch([{ op: 'replace', path: parentPtr, value: arr }]);
      const pointer = `${parentPtr}/${idx}`;
      const uiPath = toUiPathFromPointer(pointer);
      emitSnapshot();
      return JSON.stringify({ success: true, pointer, uiPath });
    },
  });

  const updateFieldTool = new DynamicStructuredTool({
    name: 'update_field',
    description: 'Patch superficiel sur un champ via path.',
    schema: z.object({
      path: z.string().describe("Chemin UI-style du champ (ex: 'fields[0].fields[1]')."),
      patch: z.record(z.any()).describe('Propriétés à fusionner.'),
    }).describe('Mise à jour.'),
    func: async ({ path, patch }) => {
      ensureUiPath(path);
      const ptr = toPointer(path);
      const p = { ...(patch || {}) };
      if (!p.key && p.name) { p.key = p.name; delete p.name; }
      const ops = [];
      for (const k of Object.keys(p)) {
        if (k.startsWith('/')) {
          const nk = k.replace(/\/(sections)(?=\/|$)/g, '/fields');
          ops.push({ op: 'replace', path: ptr + nk, value: p[k] });
          delete p[k];
        }
      }
      if (ops.length) emitPatch(ops);
      if (Object.keys(p).length) {
        const current = getAt(getSchema(), ptr) || {};
        const next = { ...current, ...p };
        emitPatch([{ op: 'replace', path: ptr, value: next }]);
      }
      emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  const removeAtTool = new DynamicStructuredTool({
    name: 'remove_at',
    description: 'Supprime un élément au chemin indiqué.',
    schema: z.object({ path: z.string().describe("Chemin UI-style.") }).describe('Suppression.'),
    func: async ({ path }) => {
      ensureUiPath(path);
      const ptr = toPointer(path);
      emitPatch([{ op: 'remove', path: ptr }]); emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  const moveItemTool = new DynamicStructuredTool({
    name: 'move_item',
    description: "Déplace un item dans son tableau parent (dir='up'|'down' ou toIndex).",
    schema: z.object({
      path: z.string().describe("Chemin UI-style vers l’élément."),
      dir: z.enum(['up', 'down']).optional().describe('Direction relative.'),
      toIndex: z.number().int().optional().describe('Index absolu cible.'),
    }).describe('Déplacement.'),
    func: async ({ path, dir, toIndex }) => {
      ensureUiPath(path);
      const ptr = toPointer(path);
      const arrayPtr = parentArrayPtr(ptr);
      const from = indexFromPtr(ptr);
      let target = typeof toIndex === 'number' ? toIndex : (dir === 'up' ? from - 1 : from + 1);
      const arr = getAt(getSchema(), arrayPtr);
      if (!Array.isArray(arr)) return JSON.stringify({ success: false, error: 'not_an_array' });
      const clone = JSON.parse(JSON.stringify(arr));
      const n = clone.length; if (target < 0) target = 0; if (target >= n) target = n - 1;
      if (from === target) return JSON.stringify({ success: true, nochange: true });
      const [it] = clone.splice(from, 1); clone.splice(target, 0, it);
      emitPatch([{ op: 'replace', path: arrayPtr, value: clone }]); emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  const setColTool = new DynamicStructuredTool({
    name: 'set_col',
    description: 'Ajuste la grille responsive (col) d’un champ/section.',
    schema: z.object({
      path: z.string().describe("Chemin UI-style vers le champ/section (ex: 'sections[0].fields[1]')."),
      col: z.record(z.number()).describe('Objet colonnes xs..xl (1..24).'),
    }).describe('Cols responsive.'),
    func: async ({ path, col }) => {
      ensureUiPath(path);
      ensureUiPath(path);
      const ptr = toPointer(path);
      const current = getAt(getSchema(), ptr) || {};
      const next = { ...current, col: clampCol(col) };
      emitPatch([{ op: 'replace', path: ptr, value: next }]); emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  // Generic path helpers
  const resolvePathTool = new DynamicStructuredTool({
    name: 'resolve_path',
    description: 'Résout un chemin UI-style (ex: sections[0].fields[1]) en JSON Pointer et renvoie aussi le uiPath normalisé. N’accepte pas de JSON Pointer.',
    schema: z.object({ path: z.string().describe('Chemin UI-style uniquement.') }).describe('Résolution.'),
    func: async ({ path }) => {
      ensureUiPath(path);
      const ptr = toPointer(path);
      const ui = toUiPathFromPointer(ptr);
      return JSON.stringify({ success: true, pointer: ptr, uiPath: ui });
    },
  });

  const setAtTool = new DynamicStructuredTool({
    name: 'set_at',
    description: "Affecte une valeur (merge ou replace) au chemin donné. Utilise des chemins UI-style uniquement (ex: 'fields' pour racine, 'fields[0].fields[1].col' pour un champ dans la première section).",
    schema: z.object({
      path: z.string().describe('Chemin UI-style uniquement.'),
      value: z.record(z.any()).describe('Valeur (objet) à écrire ou fusionner.'),
      merge: z.boolean().optional().describe('Si true et cibles objets: fusion superficielle.'),
    }).describe('Écriture générique.'),
    func: async ({ path, value, merge }) => {
      ensureUiPath(path);
      const ptr = toPointer(path);
      const cur = getAt(getSchema(), ptr);
      let next = value;
      if (merge && cur && typeof cur === 'object' && value && typeof value === 'object' && !Array.isArray(cur) && !Array.isArray(value)) {
        next = { ...cur, ...value };
      }
      emitPatch([{ op: 'replace', path: ptr, value: next }]); emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  const setSummaryTool = new DynamicStructuredTool({
    name: 'set_summary',
    description: 'Active et configure le résumé (summary) du formulaire.',
    schema: z.object({
      summary: z.object({}).describe('Objet summary: {enabled, title?, includeHidden?, dateFormat?}'),
    }).describe('Configuration summary.'),
    func: async ({ summary }) => {
      emitPatch([{ op: 'add', path: '/summary', value: summary || { enabled: true } }]); emitSnapshot();
      return JSON.stringify({ success: true });
    },
  });

  const emitSnapshotTool = new DynamicStructuredTool({
    name: 'emit_snapshot',
    description: 'Demande un snapshot complet du schéma courant.',
    schema: z.object({}).describe('Sans argument.'),
    func: async () => { emitSnapshot(); return JSON.stringify({ success: true }); },
  });

  return [
    setFormTool,
    fetchCatalogTool,
    listTreeTool,
    setUiTool,
    addSectionTool,
    updateSectionTool,
    addFieldTool,
    addStepTool,
    updateFieldTool,
    removeAtTool,
    moveItemTool,
    setColTool,
    resolvePathTool,
    setAtTool,
    setSummaryTool,
    emitSnapshotTool,
  ];
}

module.exports = { runFormAgentWithTools };

function makeZodShim() {
  const wrap = (x) => ({
    describe: () => wrap(x),
    optional: () => wrap(x),
    default: () => wrap(x),
    partial: () => wrap(x),
  });
  const base = {
    object: () => wrap({}),
    string: () => wrap(''),
    number: () => wrap(0),
    boolean: () => wrap(true),
    enum: () => wrap(''),
    array: () => wrap([]),
    record: () => wrap({}),
    any: () => wrap(null),
  };
  return base;
}
