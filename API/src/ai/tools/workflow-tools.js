// Workflow tools — mode-specific tools for flow building and modification
// Used when agent mode === 'workflow'

const { Types } = require('mongoose');
const Flow = require('../../db/models/flow.model');
const Form = require('../../db/models/form.model');
const NodeTemplate = require('../../db/models/node-template.model');
const { argsToJsonSchema, extractOutputSchema } = require('./tool-converter');

const WORKFLOW_TOOL_DEFINITIONS = [
  {
    name: 'create_flow',
    description: 'Crée un nouveau workflow. Retourne l\'ID du flow créé.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du workflow' },
        description: { type: 'string', description: 'Description du workflow' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_graph',
    description: 'Retourne le graph actuel du workflow : nodes (id, nom, template, type, description, contexte) et edges (source, target, handles). TOUJOURS appeler en premier pour comprendre l\'état du workflow.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_templates',
    description: 'Recherche les templates de nodes disponibles (actions, conditions, boucles, etc.). Utilise avant add_node pour trouver le bon template.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texte de recherche (nom, description, provider)' },
        provider: { type: 'string', description: 'Filtrer par provider (ex: slack, gitlab, openai)' },
        type: { type: 'string', description: 'Filtrer par type (function, condition, loop, agent, start, start_form, event)' },
        limit: { type: 'number', description: 'Nombre max de résultats (défaut: 20)' },
      },
    },
  },
  {
    name: 'get_template_details',
    description: 'Retourne le schéma complet d\'un template : args (paramètres à configurer), inputHandles, outputHandles, type, outputSchema. Utilise avant d\'ajouter un node pour comprendre ses besoins.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé du template (ex: slack_post_message)' },
      },
      required: ['key'],
    },
  },
  {
    name: 'ensure_start',
    description: 'S\'assure qu\'un noeud de démarrage existe. S\'il en existe déjà un, retourne son ID sans en créer un nouveau.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['start', 'start_form', 'event', 'endpoint'], description: 'Type de démarrage (défaut: start)' },
      },
    },
  },
  {
    name: 'add_node',
    description: 'Ajoute un nouveau node au workflow. Charge le template complet depuis la DB. Retourne l\'ID du node créé.',
    parameters: {
      type: 'object',
      properties: {
        templateKey: { type: 'string', description: 'Clé du template (obtenue via get_templates)' },
        title: { type: 'string', description: 'Titre affiché (optionnel, défaut: titre du template)' },
        near: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, description: 'Position approximative' },
      },
      required: ['templateKey'],
    },
  },
  {
    name: 'remove_node',
    description: 'Supprime un node et toutes ses connexions.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID du node à supprimer' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'replace_node',
    description: 'Remplace le template d\'un node existant. Garde la même position et le même ID.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID du node' },
        templateKey: { type: 'string', description: 'Nouveau template' },
      },
      required: ['nodeId', 'templateKey'],
    },
  },
  {
    name: 'connect_nodes',
    description: 'Connecte deux nodes. Vérifie la compatibilité des types de handles.',
    parameters: {
      type: 'object',
      properties: {
        sourceId: { type: 'string', description: 'ID du node source' },
        targetId: { type: 'string', description: 'ID du node cible' },
        sourceHandle: { type: 'string', description: 'Handle de sortie (défaut: "0")' },
        targetHandle: { type: 'string', description: 'Handle d\'entrée (défaut: "in")' },
      },
      required: ['sourceId', 'targetId'],
    },
  },
  {
    name: 'connect_by_output_name',
    description: 'Connecte deux nodes en utilisant le nom de la sortie (utile pour conditions et multi-output). Ex: outputName="Oui" ou "Non".',
    parameters: {
      type: 'object',
      properties: {
        sourceId: { type: 'string', description: 'ID du node source' },
        targetId: { type: 'string', description: 'ID du node cible' },
        outputName: { type: 'string', description: 'Nom de la sortie (ex: "Oui", "Non", "Erreur")' },
      },
      required: ['sourceId', 'targetId', 'outputName'],
    },
  },
  {
    name: 'disconnect_nodes',
    description: 'Supprime la connexion entre deux nodes.',
    parameters: {
      type: 'object',
      properties: {
        sourceId: { type: 'string', description: 'ID du node source' },
        targetId: { type: 'string', description: 'ID du node cible' },
        sourceHandle: { type: 'string', description: 'Handle de sortie spécifique (optionnel)' },
      },
      required: ['sourceId', 'targetId'],
    },
  },
  {
    name: 'get_output_options',
    description: 'Liste les sorties disponibles d\'un node (handles de sortie avec nom et type). Appeler avant connect_nodes pour savoir quel handle utiliser.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID du node' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'get_node_schema',
    description: 'Retourne le schéma d\'arguments d\'un node (fields, types, required, options). Permet de savoir quels paramètres configurer.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID du node' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'get_output_schema',
    description: 'Retourne le schéma des données de sortie d\'un handle spécifique d\'un node.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID du node' },
        handleId: { type: 'string', description: 'Handle de sortie (défaut: "0")' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'set_node_args',
    description: 'Configure les arguments d\'un node. Utilise des expressions {{ }} pour les données dynamiques (ex: {{payload.name}}, {{nodeId.result}}).',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID du node' },
        args: { type: 'object', description: 'Arguments (clé → valeur ou expression {{ }})' },
      },
      required: ['nodeId', 'args'],
    },
  },
  {
    name: 'set_node_description',
    description: 'Définit la description d\'un node (1-2 phrases décrivant ce qu\'il fait).',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID du node' },
        description: { type: 'string', description: 'Description courte' },
      },
      required: ['nodeId', 'description'],
    },
  },
  {
    name: 'propose_context_mapping',
    description: 'Simule le workflow jusqu\'à un node cible et propose un mapping automatique des arguments basé sur les données entrantes (msgIn).',
    parameters: {
      type: 'object',
      properties: {
        targetId: { type: 'string', description: 'ID du node cible' },
      },
      required: ['targetId'],
    },
  },
  {
    name: 'validate_flow',
    description: 'Valide le workflow : vérifie les connexions, les noeud orphelins, les arguments requis manquants.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'auto_layout',
    description: 'Réorganise automatiquement le graph (algorithme ELK) pour un affichage lisible.',
    parameters: {
      type: 'object',
      properties: {
        orientation: { type: 'string', enum: ['vertical', 'horizontal'], description: 'Orientation (défaut: vertical)' },
      },
    },
  },
  {
    name: 'save_flow',
    description: 'Sauvegarde le graph actuel en base de données.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'create_start_form',
    description: 'Crée un formulaire de démarrage pour le workflow. Crée le formulaire + configure le noeud start_form.',
    parameters: {
      type: 'object',
      properties: {
        formName: { type: 'string', description: 'Nom du formulaire' },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Identifiant (snake_case)' },
              type: { type: 'string', description: 'Type (text, textarea, number, email, select, checkbox, date, file, etc.)' },
              label: { type: 'string', description: 'Libellé' },
              required: { type: 'boolean', description: 'Obligatoire ?' },
              description: { type: 'string', description: 'Description/aide' },
              defaultValue: { description: 'Valeur par défaut' },
              options: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } } } },
            },
            required: ['key', 'type', 'label'],
          },
        },
      },
      required: ['formName', 'fields'],
    },
  },
  {
    name: 'build_schema',
    description: 'Construit un schéma de formulaire (FormSchema). Utilisé pour : (1) configurer un champ schema_builder dans les args d\'un node (ex: extraction_schema), (2) créer un formulaire standalone, (3) créer un formulaire de démarrage. Retourne le schéma prêt à passer à set_node_args ou create_start_form.',
    parameters: {
      type: 'object',
      properties: {
        fields: {
          type: 'array',
          description: 'Liste des champs du schéma',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Identifiant unique (snake_case)' },
              type: { type: 'string', description: 'Type: text, textarea, number, email, url, tel, select, radio, checkbox, boolean, date, file, tags, text_array, color, code, expression, json, html, schema_builder, section, section_array' },
              label: { type: 'string', description: 'Libellé affiché' },
              required: { type: 'boolean', description: 'Obligatoire ?' },
              description: { type: 'string', description: 'Description/aide' },
              defaultValue: { description: 'Valeur par défaut' },
              options: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } } }, description: 'Options (pour select, radio)' },
              col: { type: 'object', properties: { xs: { type: 'number' }, sm: { type: 'number' }, md: { type: 'number' } }, description: 'Largeur responsive (grille 24 colonnes)' },
            },
            required: ['key', 'type', 'label'],
          },
        },
        title: { type: 'string', description: 'Titre du schéma (optionnel)' },
        targetNodeId: { type: 'string', description: 'Si fourni, applique automatiquement le schéma à ce node via set_node_args' },
        targetArgKey: { type: 'string', description: 'Clé de l\'argument schema_builder à remplir (ex: extraction_schema). Requis si targetNodeId est fourni.' },
      },
      required: ['fields'],
    },
  },
];

/**
 * Create a workflow tools executor bound to a specific flow.
 * @param {object} metadata - { flowId, workspaceId, graph (optional seed) }
 * @param {function} emit - Callback for side events (patches, snapshots, etc.)
 * @returns {{ definitions, canHandle, execute, getGraph, hasChanges }}
 */
function createWorkflowExecutor(metadata, emit) {
  let graph = null;
  let flowDoc = null;
  let changed = false;

  async function ensureGraph() {
    if (graph) return graph;

    if (metadata.graph && typeof metadata.graph === 'object') {
      graph = {
        nodes: Array.isArray(metadata.graph.nodes) ? [...metadata.graph.nodes] : [],
        edges: Array.isArray(metadata.graph.edges) ? [...metadata.graph.edges] : [],
      };
      return graph;
    }

    if (metadata.flowId) {
      const fid = String(metadata.flowId);
      flowDoc = Types.ObjectId.isValid(fid) ? await Flow.findById(fid) : await Flow.findOne({ id: fid });
      if (flowDoc?.graph) {
        graph = {
          nodes: Array.isArray(flowDoc.graph.nodes) ? [...flowDoc.graph.nodes] : [],
          edges: Array.isArray(flowDoc.graph.edges) ? [...flowDoc.graph.edges] : [],
        };
        return graph;
      }
    }

    graph = { nodes: [], edges: [] };
    return graph;
  }

  function gref() { return graph || { nodes: [], edges: [] }; }
  function findNode(nodeId) { return (gref().nodes || []).find(n => String(n.id) === String(nodeId)); }
  function findNodeIndex(nodeId) { return (gref().nodes || []).findIndex(n => String(n.id) === String(nodeId)); }

  function emitPatch(ops) {
    changed = true;
    emit({ type: 'patch', ops });
  }

  function emitSnapshot() {
    changed = true;
    emit({ type: 'snapshot', graph: gref() });
  }

  const START_TYPES = ['start', 'start_form', 'event', 'endpoint', 'trigger'];

  /** Generate a node ID matching frontend format: type_slug_random */
  function genNodeId(tpl) {
    const type = String(tpl?.type || 'node').toLowerCase();
    const raw = String(tpl?.name || tpl?.title || 'node').trim();
    const slug = raw.toLowerCase().normalize('NFD').replace(/[^\w\s-]/g, ' ').replace(/[\s-]+/g, '_').replace(/^_+|_+$/g, '') || 'node';
    const s1 = Date.now().toString(36).slice(-4);
    const s2 = Math.random().toString(36).slice(2, 6);
    return `${type}_${slug}_${s1}_${s2}`;
  }

  /** DJB2 hash (same as frontend argsChecksum / featureChecksum) */
  function djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function argsChecksum(args) {
    try { return djb2(JSON.stringify(args || {})); } catch { return '00000000'; }
  }

  function featureChecksum(tpl) {
    try {
      const obj = {
        authorize_catch_error: tpl?.authorize_catch_error,
        authorize_skip_error: tpl?.authorize_skip_error,
        allowWithoutCredentials: tpl?.allowWithoutCredentials,
        nodeKind: tpl?.nodeKind,
        inputHandles: tpl?.inputHandles,
        outputHandles: tpl?.outputHandles,
        linkedHandles: tpl?.linkedHandles,
        output_array_field: tpl?.output_array_field,
        output_schema_field: tpl?.output_schema_field,
        outputSchema: tpl?.outputSchema,
      };
      return djb2(JSON.stringify(obj));
    } catch { return '00000000'; }
  }

  /** Build proper initial context for a template (conditions, output_array_field, etc.) */
  function buildInitialContext(tpl) {
    const ctx = {};
    const type = String(tpl?.type || '').toLowerCase();
    const oaf = tpl?.output_array_field;

    // Condition nodes and functions with output_array_field need initial items with _id
    if (type === 'condition' || oaf) {
      const field = oaf || 'items';
      const defaultItems = [];

      // If template has outputSchema with default items, use those
      if (Array.isArray(tpl?.outputSchema) && tpl.outputSchema.length) {
        for (const item of tpl.outputSchema) {
          const name = item?.name || item?.label || '';
          defaultItems.push({ _id: 'cid_' + Math.random().toString(36).slice(2), name });
        }
      } else if (type === 'condition') {
        // Default condition: Oui / Non
        defaultItems.push({ _id: 'cid_' + Math.random().toString(36).slice(2), name: 'Oui', condition: '' });
        defaultItems.push({ _id: 'cid_' + Math.random().toString(36).slice(2), name: 'Non', condition: '' });
      }

      if (defaultItems.length) ctx[field] = defaultItems;
    }

    return ctx;
  }

  /** Build a properly structured node matching frontend format */
  function buildNode(tpl, opts = {}) {
    const id = opts.id || genNodeId(tpl);
    const ctx = { ...buildInitialContext(tpl), ...(opts.context || {}) };

    return {
      id,
      point: opts.point || { x: 0, y: 0 },
      type: 'html-template',
      data: {
        model: {
          id,
          name: opts.title || tpl.title || tpl.name || tpl.key || 'Node',
          template: tpl.key || tpl._id || '',
          templateObj: tpl,
          context: ctx,
          templateChecksum: argsChecksum(tpl.args || {}),
          templateFeatureSig: featureChecksum(tpl),
          ...(tpl.authorize_catch_error ? { catch_error: false } : {}),
        },
      },
    };
  }

  /** Get actual output handle IDs for a node (same logic as frontend flow-graph.service.ts) */
  function getOutputHandleIds(node) {
    const model = node?.data?.model || {};
    const tmpl = model?.templateObj || {};
    const type = String(tmpl.type || '').toLowerCase();

    if (type === 'end') return [];

    if (['start', 'start_form', 'event', 'endpoint'].includes(type)) {
      if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
        return tmpl.outputHandles.filter(h => !Array.isArray(h?.accepts) && !h?.arrayField).map(h => String(h.id));
      }
      return ['out'];
    }

    if (type === 'loop') {
      if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
        return tmpl.outputHandles.filter(h => !Array.isArray(h?.accepts) && !h?.arrayField).map(h => String(h.id));
      }
      return ['each', 'after'];
    }

    if (type === 'condition') {
      const field = tmpl.output_array_field || 'items';
      const arr = (model.context && Array.isArray(model.context[field])) ? model.context[field] : [];
      const ids = arr.map((it, i) => (it && typeof it === 'object' && it._id) ? String(it._id) : String(i));
      // Add else if present
      try {
        const elseId = (model.context?.else?._id) ? String(model.context.else._id) : (model.context?.elseId ? String(model.context.elseId) : null);
        if (elseId && !ids.includes(elseId)) ids.push(elseId);
      } catch {}
      return ids;
    }

    // Default: check for output_array_field (multi-output functions)
    const dynField = tmpl.output_array_field;
    if (dynField) {
      const arr = (model.context && Array.isArray(model.context[dynField])) ? model.context[dynField] : [];
      const ids = arr.map((it, i) => (it && typeof it === 'object' && it._id) ? String(it._id) : String(i));
      return ids;
    }

    // Standard outputHandles
    if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
      return tmpl.outputHandles.filter(h => !Array.isArray(h?.accepts) && !h?.arrayField).map(h => String(h.id));
    }

    // Fallback: count from output array or default to ['0']
    const outs = Array.isArray(tmpl.output) ? tmpl.output : [];
    const n = outs.length || 1;
    return Array.from({ length: n }, (_, i) => String(i));
  }

  /** Get output handle name for a node */
  function getOutputHandleName(node, handleId) {
    const model = node?.data?.model || {};
    const tmpl = model?.templateObj || {};
    const type = String(tmpl.type || '').toLowerCase();

    // Condition or output_array_field: look in context items
    const field = tmpl.output_array_field || (type === 'condition' ? 'items' : null);
    if (field) {
      const arr = (model.context && Array.isArray(model.context[field])) ? model.context[field] : [];
      const item = arr.find(it => it && typeof it === 'object' && String(it._id) === String(handleId));
      if (item) return item.name || item.label || handleId;
      // Check else
      if (model.context?.else && String(model.context.else._id) === String(handleId)) return 'Else';
    }

    // Standard outputHandles
    if (Array.isArray(tmpl.outputHandles)) {
      const h = tmpl.outputHandles.find(h => String(h.id) === String(handleId));
      if (h) return h.name || h.id;
    }

    // output array
    if (Array.isArray(tmpl.output)) {
      const idx = parseInt(handleId, 10);
      if (!isNaN(idx) && tmpl.output[idx]) return tmpl.output[idx];
    }

    return handleId;
  }

  const tools = {
    async create_flow(input) {
      const flow = await Flow.create({
        name: input.name,
        description: input.description || '',
        workspaceId: metadata.workspaceId,
        graph: { nodes: [], edges: [] },
      });
      flowDoc = flow;
      metadata.flowId = flow._id;
      graph = { nodes: [], edges: [] };
      emit({ type: 'flow.created', flow: { id: flow.id, _id: String(flow._id), name: flow.name } });
      return { success: true, flowId: flow.id, _id: String(flow._id) };
    },

    async list_graph() {
      await ensureGraph();
      const g = gref();
      const nodes = (g.nodes || []).map(n => {
        const model = n?.data?.model || {};
        const tpl = model?.templateObj || {};
        const outputIds = getOutputHandleIds(n);
        return {
          id: n.id,
          name: model.name || tpl.title || tpl.name || n.id,
          template: model.template || tpl.key || '',
          type: tpl.type || '',
          description: model.description || '',
          hasContext: !!(model.context && Object.keys(model.context).length),
          contextKeys: model.context ? Object.keys(model.context) : [],
          outputHandles: outputIds.map(hid => ({ id: hid, name: getOutputHandleName(n, hid) })),
        };
      });
      const edges = (g.edges || []).map(e => ({
        id: e.id, source: e.source, target: e.target,
        sourceHandle: e.sourceHandle || '0', targetHandle: e.targetHandle || 'in',
      }));
      return { success: true, nodeCount: nodes.length, edgeCount: edges.length, nodes, edges };
    },

    async get_templates(input) {
      const { toolIndex } = require('./tool-index');
      await toolIndex.ensureBuilt();
      return { success: true, templates: toolIndex.search(input?.query || '', { provider: input?.provider, type: input?.type, limit: input?.limit || 20 }) };
    },

    async get_template_details(input) {
      const tpl = await NodeTemplate.findOne({ key: input.key }).lean();
      if (!tpl) return { success: false, error: `Template '${input.key}' introuvable` };
      return {
        success: true, key: tpl.key, name: tpl.title || tpl.name,
        description: tpl.description || '', type: tpl.type, provider: tpl.providerKey || null,
        args: tpl.args || {}, argsSchema: tpl.args ? argsToJsonSchema(tpl.args) : null,
        inputHandles: tpl.inputHandles || [], outputHandles: tpl.outputHandles || [],
        linkedHandles: tpl.linkedHandles || [], outputSchema: tpl.outputSchema || null,
        output_array_field: tpl.output_array_field || null,
      };
    },

    async ensure_start(input) {
      await ensureGraph();
      const g = gref();
      const existing = (g.nodes || []).find(n => START_TYPES.includes(String(n?.data?.model?.templateObj?.type || '').toLowerCase()));
      if (existing) return { success: true, ensured: false, nodeId: existing.id, type: existing.data?.model?.templateObj?.type };

      const key = String(input?.type || 'start').toLowerCase();
      const tpl = await NodeTemplate.findOne({ key }).lean() || { key, name: key, type: key };
      const node = buildNode(tpl, { point: { x: 0, y: 0 } });
      g.nodes.push(node);
      emitPatch([{ op: 'add', path: '/nodes/-', value: node }]);
      return { success: true, ensured: true, nodeId: node.id, type: key };
    },

    async add_node(input) {
      await ensureGraph();
      const g = gref();
      const tpl = await NodeTemplate.findOne({ key: input.templateKey }).lean();
      if (!tpl) return { success: false, error: `Template '${input.templateKey}' introuvable` };

      // Prevent duplicate start nodes
      if (START_TYPES.includes(String(tpl.type || '').toLowerCase())) {
        const existing = (g.nodes || []).find(n => START_TYPES.includes(String(n?.data?.model?.templateObj?.type || '').toLowerCase()));
        if (existing) return { success: true, ensured: true, nodeId: existing.id, message: 'Noeud de démarrage existant réutilisé' };
      }

      const node = buildNode(tpl, {
        title: input.title,
        point: input.near || { x: 0, y: 0 },
      });
      g.nodes.push(node);
      emitPatch([{ op: 'add', path: '/nodes/-', value: node }]);

      // Return output handles info so AI knows how to connect
      const outputHandles = getOutputHandleIds(node).map(hid => ({
        id: hid, name: getOutputHandleName(node, hid),
      }));
      return { success: true, nodeId: node.id, name: node.data.model.name, type: tpl.type, outputHandles };
    },

    async remove_node(input) {
      await ensureGraph();
      const g = gref();
      const idx = findNodeIndex(input.nodeId);
      if (idx < 0) return { success: false, error: 'Node introuvable' };

      const nodeId = String(input.nodeId);
      const removedEdges = (g.edges || []).filter(e => String(e.source) === nodeId || String(e.target) === nodeId).length;
      g.edges = (g.edges || []).filter(e => String(e.source) !== nodeId && String(e.target) !== nodeId);
      g.nodes.splice(idx, 1);
      emitSnapshot();
      return { success: true, removedEdges };
    },

    async replace_node(input) {
      await ensureGraph();
      const idx = findNodeIndex(input.nodeId);
      if (idx < 0) return { success: false, error: 'Node introuvable' };
      const tpl = await NodeTemplate.findOne({ key: input.templateKey }).lean();
      if (!tpl) return { success: false, error: `Template '${input.templateKey}' introuvable` };
      const cur = gref().nodes[idx];
      const ctx = buildInitialContext(tpl);
      gref().nodes[idx] = {
        ...cur,
        data: {
          ...cur.data,
          model: {
            ...(cur.data?.model || {}),
            template: input.templateKey,
            templateObj: tpl,
            context: ctx,
            templateChecksum: argsChecksum(tpl.args || {}),
            templateFeatureSig: featureChecksum(tpl),
          },
        },
      };
      emitPatch([{ op: 'replace', path: `/nodes/${idx}`, value: gref().nodes[idx] }]);
      return { success: true };
    },

    async connect_nodes(input) {
      await ensureGraph();
      const src = findNode(input.sourceId);
      const dst = findNode(input.targetId);
      if (!src) return { success: false, error: `Node source '${input.sourceId}' introuvable` };
      if (!dst) return { success: false, error: `Node cible '${input.targetId}' introuvable` };

      // Use getOutputHandleIds for proper handle validation (handles conditions, output_array_field, etc.)
      const validOutputIds = getOutputHandleIds(src);

      // Always use the first valid handle as default — never hardcode type-based handles
      // because templates may define custom outputHandles (e.g. start with 'ok' instead of 'out')
      let defaultSrcHandle;
      if (validOutputIds.length) {
        defaultSrcHandle = validOutputIds[0];
      } else {
        // Ultimate fallback when no handles detected (should rarely happen)
        const srcType = String(src?.data?.model?.templateObj?.type || '').toLowerCase();
        if (['start', 'start_form', 'event', 'endpoint'].includes(srcType)) defaultSrcHandle = 'out';
        else if (srcType === 'loop') defaultSrcHandle = 'each';
        else defaultSrcHandle = '0';
      }

      const sourceHandle = input.sourceHandle || defaultSrcHandle;

      // Validate sourceHandle exists on the source node
      if (validOutputIds.length && !validOutputIds.includes(sourceHandle)) {
        const availableNames = validOutputIds.map(hid => `${hid} (${getOutputHandleName(src, hid)})`);
        return { success: false, error: `Handle source '${sourceHandle}' invalide. Handles disponibles: ${availableNames.join(', ')}` };
      }

      // Guard against duplicate edges
      const targetHandle = input.targetHandle || 'in';
      const existingEdge = gref().edges.find(e =>
        String(e.source) === String(input.sourceId) &&
        String(e.target) === String(input.targetId) &&
        String(e.sourceHandle) === String(sourceHandle) &&
        String(e.targetHandle) === String(targetHandle)
      );
      if (existingEdge) {
        return { success: true, edgeId: existingEdge.id, message: 'Connexion déjà existante' };
      }

      const edge = {
        id: `e_${Date.now().toString(36)}`, source: input.sourceId, target: input.targetId,
        sourceHandle, targetHandle,
      };
      gref().edges.push(edge);
      emitPatch([{ op: 'add', path: '/edges/-', value: edge }]);
      return { success: true, edgeId: edge.id };
    },

    async connect_by_output_name(input) {
      const opts = await tools.get_output_options({ nodeId: input.sourceId });
      if (!opts?.success) return { success: false, error: 'Impossible de lire les sorties' };
      const name = String(input.outputName || '').trim().toLowerCase();
      const opt = (opts.outputs || []).find(o => String(o.name).toLowerCase() === name);
      return tools.connect_nodes({ sourceId: input.sourceId, targetId: input.targetId, sourceHandle: opt ? String(opt.handle) : '0', targetHandle: 'in' });
    },

    async disconnect_nodes(input) {
      await ensureGraph();
      const g = gref();
      const before = g.edges.length;
      g.edges = g.edges.filter(e => {
        if (String(e.source) !== String(input.sourceId) || String(e.target) !== String(input.targetId)) return true;
        if (input.sourceHandle && String(e.sourceHandle) !== String(input.sourceHandle)) return true;
        return false;
      });
      if (before !== g.edges.length) emitSnapshot();
      return { success: true, removed: before - g.edges.length };
    },

    async get_output_options(input) {
      await ensureGraph();
      const node = findNode(input.nodeId);
      if (!node) return { success: false, error: 'Node introuvable' };

      // Use getOutputHandleIds which properly handles conditions, output_array_field, etc.
      const handleIds = getOutputHandleIds(node);
      const outputs = handleIds.map(hid => ({
        handle: hid,
        name: getOutputHandleName(node, hid),
      }));
      return { success: true, outputs };
    },

    async get_node_schema(input) {
      await ensureGraph();
      const node = findNode(input.nodeId);
      if (!node) return { success: false, error: 'Node introuvable' };
      const tpl = node?.data?.model?.templateObj || {};
      return {
        success: true, nodeId: input.nodeId, name: node?.data?.model?.name || tpl.title || '',
        type: tpl.type || '', args: tpl.args || {},
        argsSchema: tpl.args ? argsToJsonSchema(tpl.args) : null,
        currentContext: node?.data?.model?.context || {},
      };
    },

    async get_output_schema(input) {
      await ensureGraph();
      const node = findNode(input.nodeId);
      if (!node) return { success: false, error: 'Node introuvable' };
      const tpl = node?.data?.model?.templateObj || {};
      const outs = Array.isArray(tpl.outputHandles) ? tpl.outputHandles : [];
      const h = outs.find(o => String(o.id) === String(input.handleId || '0'));
      return { success: true, schema: h?.schema || {}, handleId: input.handleId || '0' };
    },

    async set_node_args(input) {
      await ensureGraph();
      const g = gref();
      const idx = findNodeIndex(input.nodeId);
      if (idx < 0) return { success: false, error: 'Node introuvable' };
      // Accept args nested under input.args OR as flat properties (LLMs often flatten)
      let args = input.args || {};
      if (!Object.keys(args).length) {
        // Fallback: extract all non-meta keys as args
        const meta = new Set(['nodeId', 'args']);
        args = {};
        for (const [k, v] of Object.entries(input)) {
          if (!meta.has(k) && v !== undefined) args[k] = v;
        }
      }
      if (!Object.keys(args).length) return { success: false, error: 'Aucun argument fourni' };

      g.nodes[idx].data = g.nodes[idx].data || {};
      g.nodes[idx].data.model = g.nodes[idx].data.model || {};
      const existing = g.nodes[idx].data.model.context || {};
      g.nodes[idx].data.model.context = { ...existing, ...args };

      // Recalculate templateChecksum after args change
      const tpl = g.nodes[idx].data.model.templateObj || {};
      g.nodes[idx].data.model.templateChecksum = argsChecksum(tpl.args || {});

      emitPatch([{ op: 'replace', path: `/nodes/${idx}/data/model/context`, value: g.nodes[idx].data.model.context }]);
      emit({ type: 'args', nodeId: input.nodeId, args });
      return { success: true, keys: Object.keys(args) };
    },

    async set_node_description(input) {
      await ensureGraph();
      const idx = findNodeIndex(input.nodeId);
      if (idx < 0) return { success: false, error: 'Node introuvable' };
      const g = gref();
      g.nodes[idx].data = g.nodes[idx].data || {};
      g.nodes[idx].data.model = g.nodes[idx].data.model || {};
      g.nodes[idx].data.model.description = input.description || '';
      emitPatch([{ op: 'replace', path: `/nodes/${idx}/data/model/description`, value: input.description }]);
      emit({ type: 'desc', nodeId: input.nodeId, text: input.description });
      return { success: true };
    },

    async propose_context_mapping(input) {
      await ensureGraph();
      const g = gref();
      let sim = null;
      try { const { simulateViaEngine } = require('../../utils/flow-simulate-engine'); sim = await simulateViaEngine(g, input.targetId); } catch {}
      if (!sim) { try { const { simulateScenarios } = require('../../utils/flow-simulate'); sim = simulateScenarios(g, input.targetId); } catch {} }

      const scenarios = Array.isArray(sim?.scenarios) ? sim.scenarios : [];
      const target = findNode(input.targetId);
      const tArgs = target?.data?.model?.templateObj?.args || {};

      const deepKeys = (obj, prefix = '') => {
        const out = [];
        if (!obj || typeof obj !== 'object') return out;
        for (const [k, v] of Object.entries(obj)) {
          const p = prefix ? `${prefix}.${k}` : k;
          out.push(p);
          if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...deepKeys(v, p));
        }
        return out;
      };

      const guessMapping = (schema, msg) => {
        const mapping = {};
        const msgKeys = deepKeys(msg);
        const fields = Array.isArray(schema?.fields) ? schema.fields : [];
        for (const f of fields) {
          const key = f?.key || f?.name;
          if (!key) continue;
          const candidates = [`payload.${key}`, ...msgKeys.filter(k => k.endsWith(`.${key}`))];
          const chosen = candidates.find(k => msgKeys.includes(k));
          if (chosen) mapping[key] = `{{ ${chosen} }}`;
        }
        return mapping;
      };

      const variants = scenarios.map(sc => ({ label: sc.label || `scenario_${sc.index}`, mapping: guessMapping(tArgs, sc.msgIn || {}), previewMsg: sc.msgIn || {} }));
      const best = variants[0] || { mapping: {}, previewMsg: {} };
      return { success: true, scenarioCount: scenarios.length, mapping: best.mapping, variants };
    },

    async validate_flow() {
      await ensureGraph();
      const g = gref();
      const issues = [];

      const hasStart = (g.nodes || []).some(n => START_TYPES.includes(String(n?.data?.model?.templateObj?.type || '').toLowerCase()));
      if (!hasStart) issues.push({ level: 'error', message: 'Aucun noeud de démarrage' });

      const connectedSources = new Set((g.edges || []).map(e => String(e.source)));
      const connectedTargets = new Set((g.edges || []).map(e => String(e.target)));
      for (const n of (g.nodes || [])) {
        const id = String(n.id);
        const type = String(n?.data?.model?.templateObj?.type || '').toLowerCase();
        if (START_TYPES.includes(type)) continue;
        if (!connectedTargets.has(id) && !connectedSources.has(id)) {
          issues.push({ level: 'warning', nodeId: id, message: `Node '${n?.data?.model?.name || id}' orphelin (aucune connexion)` });
        }
      }

      for (const n of (g.nodes || [])) {
        const tpl = n?.data?.model?.templateObj || {};
        const ctx = n?.data?.model?.context || {};
        const fields = Array.isArray(tpl?.args?.fields) ? tpl.args.fields : [];
        for (const f of fields) {
          const k = f?.key || f?.name;
          if (!k) continue;
          const validators = Array.isArray(f?.validators) ? f.validators : [];
          const isReq = !!f?.required || validators.some(v => v?.type === 'required' || v?.kind === 'required');
          if (isReq && (ctx[k] === undefined || ctx[k] === null || ctx[k] === '')) {
            issues.push({ level: 'error', nodeId: n.id, message: `Champ requis '${f.label || k}' manquant dans '${n?.data?.model?.name || n.id}'` });
          }
        }
      }

      return { success: true, valid: !issues.some(i => i.level === 'error'), issues };
    },

    async auto_layout(input) {
      await ensureGraph();
      const g = gref();
      try {
        const { layoutGraphApplyToNodes } = require('../../utils/elk-layout');
        let orient = String(input?.orientation || 'vertical').toLowerCase();
        if (orient !== 'horizontal') orient = 'vertical';
        const laid = await layoutGraphApplyToNodes({ nodes: g.nodes, edges: g.edges }, { orientation: orient, nodeWidth: 250, nodeHeight: 100, gapX: 260, gapY: 160, normalizeLevels: true });
        if (laid?.nodes) {
          for (const p of laid.nodes) { const n = (g.nodes || []).find(nn => nn.id === p.id); if (n) n.point = { x: p.x, y: p.y }; }
          emitPatch(laid.ops || []);
        }
        return { success: true };
      } catch (e) { return { success: false, error: e?.message || String(e) }; }
    },

    async save_flow() {
      await ensureGraph();
      if (!metadata.flowId && !flowDoc) return { success: false, error: 'Aucun flow. Utilise create_flow d\'abord.' };
      let flow = flowDoc;
      if (!flow && metadata.flowId) {
        const fid = String(metadata.flowId);
        flow = Types.ObjectId.isValid(fid) ? await Flow.findById(fid) : await Flow.findOne({ id: fid });
      }
      if (!flow) return { success: false, error: 'Flow introuvable' };
      flow.graph = gref();
      await flow.save();
      changed = false;
      return { success: true, flowId: flow.id };
    },

    async create_start_form(input) {
      const fields = (input.fields || []).map(f => ({
        key: f.key, type: f.type || 'text', label: f.label, description: f.description || '',
        defaultValue: f.defaultValue !== undefined ? f.defaultValue : '',
        validators: f.required ? [{ type: 'required' }] : [],
        col: { xs: 24, sm: 24, md: f.type === 'textarea' ? 24 : 12 },
        ...(f.options ? { options: f.options } : {}),
      }));

      const form = await Form.create({ name: input.formName, workspaceId: metadata.workspaceId, schema: { fields } });
      emit({ type: 'form.created', form: { id: form.id, _id: String(form._id), name: form.name } });

      await ensureGraph();
      const g = gref();
      const tpl = await NodeTemplate.findOne({ key: 'start_form' }).lean() || { key: 'start_form', name: 'Formulaire', type: 'start_form' };
      const startNode = (g.nodes || []).find(n => START_TYPES.includes(String(n?.data?.model?.templateObj?.type || '').toLowerCase()));

      if (startNode) {
        const idx = findNodeIndex(startNode.id);
        if (idx >= 0) {
          g.nodes[idx].data.model.template = 'start_form';
          g.nodes[idx].data.model.templateObj = tpl;
          g.nodes[idx].data.model.context = { ...(g.nodes[idx].data.model.context || {}), formId: form.id };
          g.nodes[idx].data.model.templateChecksum = argsChecksum(tpl.args || {});
          g.nodes[idx].data.model.templateFeatureSig = featureChecksum(tpl);
          emitPatch([{ op: 'replace', path: `/nodes/${idx}`, value: g.nodes[idx] }]);
        }
      } else {
        const node = buildNode(tpl, {
          point: { x: 0, y: 0 },
          context: { formId: form.id },
        });
        g.nodes.push(node);
        emitPatch([{ op: 'add', path: '/nodes/-', value: node }]);
      }

      return { success: true, formId: form.id, fields: fields.map(f => f.key) };
    },

    async build_schema(input) {
      const fields = (input.fields || []).map(f => ({
        key: f.key,
        type: f.type || 'text',
        label: f.label,
        description: f.description || '',
        defaultValue: f.defaultValue !== undefined ? f.defaultValue : '',
        validators: f.required ? [{ type: 'required' }] : [],
        col: f.col || { xs: 24, sm: 24, md: f.type === 'textarea' ? 24 : 12 },
        ...(f.options ? { options: f.options } : {}),
      }));

      const schema = {
        ...(input.title ? { title: input.title } : {}),
        ui: { layout: 'vertical', labelsOnTop: true },
        fields,
      };

      // If targetNodeId + targetArgKey provided, auto-apply via set_node_args
      if (input.targetNodeId && input.targetArgKey) {
        const result = await tools.set_node_args({
          nodeId: input.targetNodeId,
          args: { [input.targetArgKey]: schema },
        });
        if (!result.success) return { success: false, error: result.error };
        return { success: true, applied: true, nodeId: input.targetNodeId, argKey: input.targetArgKey, fieldCount: fields.length, schema };
      }

      return { success: true, applied: false, fieldCount: fields.length, schema };
    },
  };

  return {
    definitions: WORKFLOW_TOOL_DEFINITIONS,
    canHandle(name) { return name in tools; },
    async execute(name, input) {
      if (!(name in tools)) throw new Error(`Unknown workflow tool: ${name}`);
      const tag = `[wf-tool:${name}]`;
      console.log(`${tag} input:`, JSON.stringify(input || {}, null, 2));
      console.log(`${tag} graph state: ${(gref().nodes || []).length} nodes, ${(gref().edges || []).length} edges`);
      try {
        const result = await tools[name](input || {});
        console.log(`${tag} result:`, JSON.stringify(result, null, 2));
        console.log(`${tag} graph after: ${(gref().nodes || []).length} nodes, ${(gref().edges || []).length} edges`);
        if (result?.nodeId) console.log(`${tag} nodeId created/used: ${result.nodeId}`);
        return result;
      } catch (err) {
        console.error(`${tag} ERROR:`, err.message, err.stack);
        throw err;
      }
    },
    getGraph() { return gref(); },
    hasChanges() { return changed; },
    /** Auto-save graph to DB when agent finishes — prevents lost work */
    async cleanup() {
      if (!changed) return;
      try {
        let flow = flowDoc;
        if (!flow && metadata.flowId) {
          const fid = String(metadata.flowId);
          flow = Types.ObjectId.isValid(fid) ? await Flow.findById(fid) : await Flow.findOne({ id: fid });
        }
        if (flow && graph) {
          flow.graph = graph;
          await flow.save();
          console.log(`[wf-tools] auto-saved flow (${(graph.nodes || []).length} nodes, ${(graph.edges || []).length} edges)`);
          changed = false;
        }
      } catch (e) {
        console.error('[wf-tools] auto-save failed:', e?.message || e);
      }
    },
  };
}

module.exports = { WORKFLOW_TOOL_DEFINITIONS, createWorkflowExecutor };
