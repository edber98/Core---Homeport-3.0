// Node args tools — mode-specific tools for configuring a node's arguments
// Used when agent mode === 'node_args'
// Ported from the old args-agent.js with full simulation support

const { Types } = require('mongoose');
const Flow = require('../../db/models/flow.model');

const NODE_ARGS_TOOL_DEFINITIONS = [
  {
    name: 'get_node_schema',
    description: 'Récupère le schéma d\'arguments du nœud courant (fields, types, required, options, descriptions). TOUJOURS appeler en premier.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_node_info',
    description: 'Retourne les infos du nœud courant (id, nom, description actuelle, titre du template, type).',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_predecessors',
    description: 'Liste TOUS les nœuds en amont (prédécesseurs) avec id, nom, type et description. Permet de comprendre d\'où viennent les données.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_predecessor_context',
    description: 'Retourne pour chaque prédécesseur direct : description, schéma d\'arguments et handles de sortie. Permet de comprendre les données disponibles en amont.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'search_predecessors',
    description: 'Recherche textuelle parmi les prédécesseurs (nom, description, type). Retourne les meilleurs candidats ordonnés par pertinence.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texte de recherche (nom d\'action, type de nœud, description)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_scenarios',
    description: 'Simule les scénarios du workflow jusqu\'au nœud courant et retourne le msgIn (données entrantes). Montre les clés payload.* et les résultats des nœuds précédents.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_msgin_preview',
    description: 'Retourne un aperçu texte lisible des données entrantes du nœud (ex: "Prénom: Jean, Email: jean@test.com"). Utile pour comprendre rapidement les valeurs disponibles.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'set_node_args',
    description: 'Applique les arguments au nœud courant. Utilise des expressions {{ }} pour les données dynamiques (ex: {{payload.name}}, {{nodeId.result}}). N\'envoie QUE les clés pertinentes.',
    parameters: {
      type: 'object',
      properties: {
        args: { type: 'object', description: 'Arguments à appliquer (clé → valeur ou expression {{ }})' },
      },
      required: ['args'],
    },
  },
  {
    name: 'set_node_description',
    description: 'Définit la description du nœud courant (1 phrase ~120 caractères, structure : VERBE + ACTION + SOURCE).',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Description courte du nœud' },
      },
      required: ['description'],
    },
  },
];

/**
 * Create a node args tools executor bound to a specific node.
 * @param {object} metadata - { flowId, nodeId, branch, workspaceId, graph (optional seed) }
 * @param {function} emit - Callback for side events (args, desc, etc.)
 */
function createNodeArgsExecutor(metadata, emit) {
  let graph = null;
  let lastScenario = null;

  async function ensureGraph() {
    if (graph) return graph;

    if (metadata.graph && typeof metadata.graph === 'object') {
      graph = metadata.graph;
      return graph;
    }

    if (metadata.flowId) {
      const fid = String(metadata.flowId);
      const flow = Types.ObjectId.isValid(fid) ? await Flow.findById(fid).lean() : await Flow.findOne({ id: fid }).lean();
      if (flow?.graph) { graph = flow.graph; return graph; }
    }

    graph = { nodes: [], edges: [] };
    return graph;
  }

  const nodeId = metadata.nodeId;
  const branch = metadata.branch || null;

  function findNode(g, nid) {
    return (Array.isArray(g?.nodes) ? g.nodes : []).find(n => String(n.id) === String(nid || nodeId));
  }

  function listPredecessors(g, targetId) {
    const nodes = Array.isArray(g.nodes) ? g.nodes : [];
    const edges = Array.isArray(g.edges) ? g.edges : [];
    const rev = {};
    for (const e of edges) {
      const t = String(e.target || ''); const s = String(e.source || '');
      if (!rev[t]) rev[t] = [];
      rev[t].push(s);
    }
    const prev = new Set();
    const stack = [String(targetId || '')];
    const seen = new Set(stack);
    while (stack.length) {
      const t = stack.pop();
      for (const s of (rev[t] || [])) {
        if (!seen.has(s)) { seen.add(s); stack.push(s); prev.add(s); }
      }
    }
    const byId = new Map(nodes.map(n => [String(n.id), n]));
    return Array.from(prev).map(id => {
      const n = byId.get(id);
      if (!n) return null;
      const model = n?.data?.model || {};
      const tpl = model?.templateObj || {};
      return { id, name: model.name || tpl.title || tpl.name || id, type: tpl.type || '', description: model.description || '' };
    }).filter(Boolean);
  }

  function flattenKeys(obj, prefix = '') {
    const out = [];
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        const p = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flattenKeys(v, p));
        else out.push(p);
      }
    }
    return out;
  }

  const tools = {
    async get_node_schema() {
      const g = await ensureGraph();
      const n = findNode(g);
      if (!n) return { success: false, error: 'Nœud introuvable' };
      const tpl = n?.data?.model?.templateObj || {};
      return { success: true, schema: tpl?.args || {}, currentContext: n?.data?.model?.context || {} };
    },

    async get_node_info() {
      const g = await ensureGraph();
      const n = findNode(g);
      if (!n) return { success: false, error: 'Nœud introuvable' };
      const model = n?.data?.model || {};
      const tpl = model?.templateObj || {};
      return {
        success: true, id: nodeId, name: model.name || tpl.title || tpl.name || '',
        description: model.description || '', templateTitle: tpl.title || '', type: tpl.type || '',
        outputHandles: Array.isArray(tpl.outputHandles) ? tpl.outputHandles : [],
      };
    },

    async list_predecessors() {
      const g = await ensureGraph();
      return { success: true, predecessors: listPredecessors(g, nodeId) };
    },

    async get_predecessor_context() {
      const g = await ensureGraph();
      const edges = Array.isArray(g.edges) ? g.edges : [];
      const nodes = Array.isArray(g.nodes) ? g.nodes : [];
      const rev = new Map();
      for (const e of edges) {
        const t = String(e.target || ''); const s = String(e.source || '');
        if (!rev.has(t)) rev.set(t, []);
        rev.get(t).push(s);
      }
      const directPreds = rev.get(String(nodeId)) || [];
      const byId = new Map(nodes.map(n => [String(n.id), n]));
      const result = [];
      for (const id of directPreds) {
        const n = byId.get(id);
        if (!n) continue;
        const model = n?.data?.model || {};
        const tpl = model?.templateObj || {};
        result.push({
          id, name: model.name || tpl.title || tpl.name || id,
          description: model.description || '',
          argsSchema: tpl.args || null,
          outputHandles: Array.isArray(tpl.outputHandles) ? tpl.outputHandles : [],
        });
      }
      return { success: true, predecessors: result };
    },

    async search_predecessors(input) {
      const g = await ensureGraph();
      const q = String(input?.query || '').trim().toLowerCase();
      const edges = Array.isArray(g.edges) ? g.edges : [];
      const nodes = Array.isArray(g.nodes) ? g.nodes : [];
      const rev = new Map();
      for (const e of edges) {
        const t = String(e.target || ''); const s = String(e.source || '');
        if (!rev.has(t)) rev.set(t, []);
        rev.get(t).push(s);
      }
      const preds = rev.get(String(nodeId)) || [];
      const byId = new Map(nodes.map(n => [String(n.id), n]));

      const scoreOf = (needle, hay) => {
        if (!needle || !hay) return 0;
        return String(hay).toLowerCase().includes(needle) ? 1 : 0;
      };

      const results = [];
      for (const id of preds) {
        const n = byId.get(id);
        if (!n) continue;
        const model = n?.data?.model || {};
        const tpl = model?.templateObj || {};
        const name = model.name || tpl.title || tpl.name || id;
        const desc = model.description || '';
        const type = tpl.type || '';
        const score = q ? (scoreOf(q, name) * 2 + scoreOf(q, desc) * 2 + scoreOf(q, type) + scoreOf(q, id)) : 0;
        results.push({ id, name, description: desc, type, score });
      }
      results.sort((a, b) => b.score - a.score);
      return { success: true, results };
    },

    async get_scenarios() {
      const g = await ensureGraph();
      let data = null;
      try {
        const { simulateViaEngineSplit, simulateViaEngine } = require('../../utils/flow-simulate-engine');
        try { data = await simulateViaEngineSplit(g, String(nodeId)); } catch {}
        if (!data) data = await simulateViaEngine(g, String(nodeId));
      } catch {}
      if (!data) {
        try { const { simulateScenarios } = require('../../utils/flow-simulate'); data = simulateScenarios(g, String(nodeId), 'all'); } catch {}
      }

      const arr = Array.isArray(data?.scenarios) ? data.scenarios : [];

      // Pick by branch handle if specified
      let picked = null;
      if (branch) {
        for (const sc of arr) {
          const edges = sc?.path?.edges || [];
          if (edges.some(e => String(e.targetId) === String(nodeId) && String(e.sourceHandle || '') === String(branch))) { picked = sc; break; }
        }
      }

      const chosen = picked || arr[0] || null;
      lastScenario = chosen;

      if (!chosen) return { success: true, total: 0, selected: null };

      const msgIn = chosen.msgIn || {};
      const keys = flattenKeys(msgIn);
      const payload = msgIn.payload || {};
      const payloadKeys = Object.keys(payload);
      const rootKeys = Object.keys(msgIn).filter(k => k !== '_nodes');

      return {
        success: true, total: arr.length,
        selected: { label: chosen.label, index: chosen.index ?? 0, msgIn, msgKeys: keys, payloadKeys, rootKeys },
      };
    },

    async get_msgin_preview() {
      const g = await ensureGraph();

      if (!lastScenario) {
        // Compute if not cached
        let data = null;
        try {
          const { simulateViaEngineSplit, simulateViaEngine } = require('../../utils/flow-simulate-engine');
          try { data = await simulateViaEngineSplit(g, String(nodeId)); } catch {}
          if (!data) data = await simulateViaEngine(g, String(nodeId));
        } catch {}
        if (!data) {
          try { const { simulateScenarios } = require('../../utils/flow-simulate'); data = simulateScenarios(g, String(nodeId), 'all'); } catch {}
        }
        const arr = Array.isArray(data?.scenarios) ? data.scenarios : [];
        lastScenario = arr[0] || null;
      }

      const msg = lastScenario?.msgIn || {};
      const pairs = [];
      const pushPair = (k, v) => {
        const val = v == null ? '' : (typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : (typeof v === 'boolean' ? (v ? 'true' : 'false') : '...')));
        if (k && val !== '') pairs.push(`${k}: ${val}`);
      };

      // Payload keys
      if (msg.payload && typeof msg.payload === 'object') {
        for (const [k, v] of Object.entries(msg.payload).slice(0, 10)) pushPair(k, v);
      }

      // Root keys (node results)
      for (const [k, v] of Object.entries(msg).filter(([k]) => k !== '_nodes' && k !== 'payload').slice(0, 8)) {
        if (v == null) continue;
        const t = typeof v;
        if (t === 'string' || t === 'number' || t === 'boolean') { pushPair(k, v); continue; }
        if (t === 'object') {
          let count = 0;
          for (const [sk, sv] of Object.entries(v)) {
            const ts = typeof sv;
            if (ts === 'string' || ts === 'number' || ts === 'boolean') { pushPair(`${k}.${sk}`, sv); count++; }
            if (count >= 4) break;
          }
        }
      }

      return { success: true, text: pairs.join(', '), fields: pairs.length };
    },

    async set_node_args(input) {
      const g = await ensureGraph();
      const args = input?.args || {};
      const keys = Object.keys(args);
      if (!keys.length) return { success: false, error: 'Aucun argument fourni' };

      // Validate against schema
      const nodes = Array.isArray(g.nodes) ? g.nodes : [];
      const n = nodes.find(x => String(x.id) === String(nodeId));
      if (!n) return { success: false, error: 'Nœud introuvable' };

      const schema = n?.data?.model?.templateObj?.args || null;
      const collectSchemaKeys = (sch) => {
        const set = new Set();
        const walk = (arr) => {
          for (const f of (arr || [])) {
            const k = f?.key || f?.id || f?.name;
            if (k) set.add(String(k));
            if (Array.isArray(f.fields)) walk(f.fields);
            if (Array.isArray(f.steps)) for (const s of f.steps) walk(s.fields || []);
          }
        };
        if (sch?.fields) walk(sch.fields);
        if (sch?.steps) for (const s of sch.steps) walk(s.fields || []);
        return set;
      };

      const allowed = collectSchemaKeys(schema);
      let filtered = args;
      if (allowed.size) {
        filtered = {};
        const bad = [];
        for (const k of keys) {
          if (allowed.has(k)) filtered[k] = args[k]; else bad.push(k);
        }
        if (bad.length) emit({ type: 'error', code: 'args_unknown_keys', message: 'Clés inconnues ignorées', details: bad });
      }

      if (!Object.keys(filtered).length) return { success: false, error: 'Aucun argument valide après filtrage' };

      emit({ type: 'args', nodeId, args: filtered });
      return { success: true, keys: Object.keys(filtered) };
    },

    async set_node_description(input) {
      const desc = String(input?.description || '').trim();
      if (!desc) return { success: false, error: 'Description vide' };
      emit({ type: 'desc', nodeId, text: desc });
      return { success: true };
    },
  };

  return {
    definitions: NODE_ARGS_TOOL_DEFINITIONS,
    canHandle(name) { return name in tools; },
    async execute(name, input) {
      if (!(name in tools)) throw new Error(`Unknown node-args tool: ${name}`);
      return tools[name](input || {});
    },
  };
}

module.exports = { NODE_ARGS_TOOL_DEFINITIONS, createNodeArgsExecutor };
