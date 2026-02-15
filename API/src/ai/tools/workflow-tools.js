// Workflow tools — mode-specific tools for flow building and modification
// Used when agent mode === 'workflow'

const { Types } = require('mongoose');
const Flow = require('../../db/models/flow.model');
const Form = require('../../db/models/form.model');
const NodeTemplate = require('../../db/models/node-template.model');
const Credential = require('../../db/models/credential.model');
const Provider = require('../../db/models/provider.model');
const Run = require('../../db/models/run.model');
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
    description: 'Recherche les templates de nodes disponibles. Détecte automatiquement le provider dans la query. Sans query + avec provider → liste TOUTES les actions du provider. Utilise avant add_node pour trouver le bon template.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texte de recherche. Peut contenir le nom du provider (ex: "openai chat completion").' },
        provider: { type: 'string', description: 'Filtrer par provider (clé, nom ou alias — résolu dynamiquement depuis la DB)' },
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
    name: 'set_node_credential',
    description: 'Assigne un credential spécifique à un node du workflow. Utilise list_credentials(providerKey) pour trouver les credentials disponibles, puis assigne le bon.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID du node' },
        credentialId: { type: 'string', description: 'ID du credential (retourné par list_credentials)' },
      },
      required: ['nodeId', 'credentialId'],
    },
  },
  {
    name: 'propose_context_mapping',
    description: 'Simule le workflow jusqu\'à un node cible et propose un mapping automatique des arguments. Retourne aussi upstreamOutputs : le schéma de sortie de chaque node en amont (CRITIQUE pour les multi-output/classifiers — contient les noms de champs exacts pour {{ }}).',
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
        orientation: { type: 'string', enum: ['horizontal', 'vertical'], description: 'Orientation (défaut: horizontal)' },
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
        displayTitle: { type: 'boolean', description: 'Afficher le titre dans le formulaire (défaut: false pour schema node, true pour form standalone)' },
        displayDescription: { type: 'boolean', description: 'Afficher la description dans le formulaire' },
      },
      required: ['fields'],
    },
  },
  // ── Deployment & Trigger tools ────────────────────────────────────────
  {
    name: 'deploy_flow',
    description: 'Déploie un workflow en production. Le flow doit contenir un noeud event (trigger). Active l\'écoute des événements (webhook, polling, subscription).',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du flow à déployer (optionnel si un flow est déjà chargé)' },
      },
    },
  },
  {
    name: 'undeploy_flow',
    description: 'Arrête la production d\'un workflow. Désactive l\'écoute des événements et remet le flow en brouillon.',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du flow à arrêter (optionnel si un flow est déjà chargé)' },
      },
    },
  },
  {
    name: 'get_deployment_status',
    description: 'Vérifie le statut de déploiement d\'un workflow : actif/inactif, type de trigger, date de déploiement, nombre d\'événements.',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du flow (optionnel si un flow est déjà chargé)' },
      },
    },
  },
  // ── Run / Execution tools ─────────────────────────────────────────────
  {
    name: 'start_run',
    description: 'Lance une exécution manuelle du workflow. Retourne l\'ID du run immédiatement (exécution asynchrone).',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du flow (optionnel si un flow est déjà chargé)' },
        payload: { type: 'object', description: 'Données d\'entrée (optionnel)' },
      },
    },
  },
  {
    name: 'list_runs',
    description: 'Liste les exécutions d\'un workflow avec pagination. Retourne statut, durée, nombre de noeuds exécutés.',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du flow (optionnel si un flow est déjà chargé)' },
        status: { type: 'string', enum: ['queued', 'running', 'success', 'error', 'cancelled', 'timed_out'], description: 'Filtrer par statut' },
        limit: { type: 'number', description: 'Nombre max de résultats (défaut: 20, max: 50)' },
        offset: { type: 'number', description: 'Offset pour la pagination (défaut: 0)' },
      },
    },
  },
  {
    name: 'get_run_stats',
    description: 'Statistiques d\'exécution d\'un workflow : total, succès, erreurs, durée moyenne.',
    parameters: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'ID du flow (optionnel si un flow est déjà chargé)' },
      },
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

  /** Build a styled edge matching frontend format (type, labels, colors, markers) */
  function buildEdge(sourceId, targetId, sourceHandle, targetHandle) {
    const isErr = sourceHandle === 'err';
    const label = computeEdgeLabelBackend(sourceId, sourceHandle);
    return {
      type: 'template',
      id: `${sourceId}->${targetId}:${sourceHandle}:${targetHandle}`,
      source: sourceId, target: targetId,
      sourceHandle, targetHandle,
      edgeLabels: label ? { center: { type: 'html-template', data: { text: label } } } : undefined,
      data: isErr ? { error: true, strokeWidth: 1, color: '#f759ab' } : { strokeWidth: 2, color: '#b1b1b7' },
      markers: { end: { type: 'arrow-closed', color: isErr ? '#f759ab' : '#b1b1b7' } },
    };
  }

  /** Compute edge label from source node handle (mirrors frontend flow-graph.service.ts computeEdgeLabel EXACTLY) */
  function computeEdgeLabelBackend(sourceId, sourceHandle) {
    const node = findNode(sourceId);
    if (!node) return '';
    const model = node.data?.model || {};
    const tmpl = model.templateObj || {};
    const type = String(tmpl.type || '').toLowerCase();
    const names = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Success'];

    if (sourceHandle === 'err') return 'Error';

    // Start/event/endpoint nodes → "Success"
    if (['start', 'start_form', 'event', 'endpoint'].includes(type)) return 'Success';

    const idx = sourceHandle != null && /^\d+$/.test(String(sourceHandle)) ? parseInt(String(sourceHandle), 10) : NaN;

    // CONDITION NODES
    if (type === 'condition') {
      const field = tmpl.output_array_field || 'items';
      const arr = (model.context && Array.isArray(model.context[field])) ? model.context[field] : [];

      if (Number.isFinite(idx)) {
        const it = arr[idx];
        if (it == null) return '';
        if (typeof it === 'string') return it;
        if (typeof it === 'object') return it.name ?? '';
        return '';
      }
      // Match by _id
      const it = arr.find(x => x && typeof x === 'object' && String(x._id) === String(sourceHandle));
      if (it) return (typeof it === 'object') ? (it.name ?? '') : '';
      // Else branch
      try {
        const elseId = (model.context?.else?._id) ? String(model.context.else._id) : (model.context?.elseId ? String(model.context.elseId) : null);
        if (elseId && String(sourceHandle) === elseId) return 'Else';
      } catch {}
      return '';
    }

    // MULTI-OUTPUT FUNCTIONS (output_array_field on non-condition)
    const dynField = tmpl.output_array_field;
    if (dynField) {
      const arr = (model.context && Array.isArray(model.context[dynField])) ? model.context[dynField] : [];

      if (Number.isFinite(idx)) {
        const it = arr[idx];
        if (it == null) return '';
        if (typeof it === 'string') return it;
        if (typeof it === 'object') return it.name ?? '';
        return '';
      }
      // Match by _id
      const it = arr.find(x => x && typeof x === 'object' && String(x._id) === String(sourceHandle));
      if (it) return (typeof it === 'object') ? (it.name ?? '') : '';
      // Else branch
      try {
        const elseId = (model.context?.else?._id) ? String(model.context.else._id) : (model.context?.elseId ? String(model.context.elseId) : null);
        if (elseId && String(sourceHandle) === elseId) return 'Else';
      } catch {}
      return '';
    }

    // V2 OUTPUT HANDLES (declared on template)
    if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
      if (type === 'loop') {
        const legacy = String(sourceHandle);
        if (legacy === 'loop_start' || legacy === 'each') return 'Each';
        if (legacy === 'loop_end' || legacy === 'end' || legacy === 'after') return 'After';
      }
      const h = tmpl.outputHandles
        .filter(x => !Array.isArray(x?.accepts) && !x?.arrayField)
        .find(hh => String(hh.id) === String(sourceHandle));
      return h?.name || '';
    }

    // LEGACY: numeric index → tmpl.output array
    if (Array.isArray(names) && Number.isFinite(idx) && idx >= 0 && idx < names.length) return names[idx];
    if (Array.isArray(names) && names.length === 1) return names[0] || 'Success';
    return '';
  }

  const START_TYPES = ['start', 'start_form', 'event', 'endpoint', 'trigger'];

  /**
   * Extract output fields from a schema object.
   * Handles both form-style { fields: [{ key, type }] } (from $var: resolution)
   * and flat key-value { text: "string", count: "number" }.
   */
  function extractFieldsFromSchema(schema) {
    if (!schema || typeof schema !== 'object') return null;
    const fields = [];
    if (Array.isArray(schema.fields)) {
      for (const f of schema.fields) {
        const k = f?.key || f?.name;
        if (k) fields.push({ key: k, type: f.type || 'text' });
      }
    } else {
      for (const [k, v] of Object.entries(schema)) {
        if (k === '_id' || k === '__v' || k === 'title' || k === 'ui' || k === 'displayTitle' || k === 'displayDescription') continue;
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          fields.push({ key: k, type: v.type || 'object' });
        } else {
          fields.push({ key: k, type: typeof v === 'string' ? v : 'text' });
        }
      }
    }
    return fields.length ? fields : null;
  }

  /**
   * Build upstream context for a node: what each predecessor outputs.
   * Uses schema analysis + optional simulation for maximum coverage.
   * `payload.xxx` is valid if `xxx` exists in ANY direct predecessor's output.
   * Returns { upstreamOutputs, payloadFields, allKnownExpressions }.
   */
  function buildUpstreamContext(g, targetId, simData) {
    const upstreamOutputs = [];
    const payloadFields = new Set();
    const allKnownExpressions = new Map();

    // If simulation data provided, extract field names from msgIn
    // The engine puts node results as top-level keys: msgIn[nodeId] = { field1, field2, ... }
    // It also has payload, _nodes, loop as special keys
    const simFields = new Map(); // nodeId → Set of field names
    const INTERNAL_KEYS = new Set(['_meta', '_nodeResults', '_nodes', 'payload', 'loop']);
    const graphNodeIds = new Set((g.nodes || []).map(n => String(n.id)));
    if (simData) {
      const scenarios = Array.isArray(simData.scenarios) ? simData.scenarios : [];
      for (const sc of scenarios) {
        const msg = sc.msgIn || {};
        // payload.xxx fields
        const payload = msg.payload;
        if (payload && typeof payload === 'object') {
          for (const k of Object.keys(payload)) {
            payloadFields.add(k);
            allKnownExpressions.set(`payload.${k}`, true);
          }
        }
        // Top-level keys that are node IDs → per-node results (engine simulation format)
        for (const [k, v] of Object.entries(msg)) {
          if (INTERNAL_KEYS.has(k)) continue;
          if (graphNodeIds.has(k) && v && typeof v === 'object') {
            // This is a node result: msgIn[nodeId] = { text: "...", ok: true, ... }
            if (!simFields.has(k)) simFields.set(k, new Set());
            for (const field of Object.keys(v)) {
              simFields.get(k).add(field);
              allKnownExpressions.set(`${k}.${field}`, true);
            }
          } else {
            // Regular payload-level field
            payloadFields.add(k);
            allKnownExpressions.set(`payload.${k}`, true);
          }
        }
        // Also check _nodeResults format (from simulateScenarios fallback)
        const nr = msg._nodeResults || {};
        for (const [nid, result] of Object.entries(nr)) {
          if (!simFields.has(nid)) simFields.set(nid, new Set());
          if (result && typeof result === 'object') {
            for (const k of Object.keys(result)) {
              simFields.get(nid).add(k);
              allKnownExpressions.set(`${nid}.${k}`, true);
            }
          }
        }
      }
    }

    const incomingEdges = (g.edges || []).filter(e => String(e.target) === String(targetId));
    for (const edge of incomingEdges) {
      const srcNode = (g.nodes || []).find(n => String(n.id) === String(edge.source));
      if (!srcNode) continue;
      const srcModel = srcNode?.data?.model || {};
      const srcTmpl = srcModel?.templateObj || {};
      const srcType = String(srcTmpl.type || '').toLowerCase();

      const info = {
        nodeId: edge.source,
        name: srcModel.name || srcTmpl.title || '',
        template: srcModel.template || srcTmpl.key || '',
        type: srcType,
        availableExpressions: [],
      };

      let outputFields = null;

      // 1. Start_form: fields from the form schema
      if (srcType === 'start_form') {
        const formSchema = srcModel.context?.formSchema || srcModel.formSchema;
        const fieldsArr = formSchema?.fields || (srcModel.context || {}).fields;
        if (Array.isArray(fieldsArr)) {
          outputFields = [];
          for (const f of fieldsArr) {
            const k = f?.key || f?.name;
            if (k) outputFields.push({ key: k, type: f.type || 'text' });
          }
        }
      }
      // 2. Multi-output (output_array_field): outputSchema defines fields per branch
      else if (srcTmpl.output_array_field && Array.isArray(srcTmpl.outputSchema) && srcTmpl.outputSchema.length) {
        info.isMultiOutput = true;
        // outputSchema can be flat array or form-style
        const first = srcTmpl.outputSchema[0];
        if (first?.key || first?.name) {
          outputFields = srcTmpl.outputSchema.map(f => ({ key: f.key || f.name, type: f.type || 'text' }));
        } else if (first?.fields) {
          outputFields = extractFieldsFromSchema(first);
        }
      }
      // 3. Dynamic schema (output_schema_field): reads schema from context
      else if (srcTmpl.output_schema_field && srcModel.context) {
        const dynSchema = srcModel.context[srcTmpl.output_schema_field];
        outputFields = extractFieldsFromSchema(dynSchema);
      }
      // 4. Standard outputHandles with schema
      else if (Array.isArray(srcTmpl.outputHandles) && srcTmpl.outputHandles.length) {
        const handle = srcTmpl.outputHandles.find(h => String(h.id) === String(edge.sourceHandle || '0'));
        if (handle?.schema && typeof handle.schema === 'object') {
          outputFields = extractFieldsFromSchema(handle.schema);
        }
      }

      // 5. Fallback: use simulation data if schema analysis found nothing
      if (!outputFields && simFields.has(edge.source)) {
        const sf = simFields.get(edge.source);
        outputFields = [...sf].map(k => ({ key: k, type: 'unknown' }));
      }

      if (outputFields && outputFields.length) {
        info.outputSchema = outputFields;
        info.availableExpressions = outputFields.map(f => ({
          field: f.key, expression: `{{ ${edge.source}.${f.key} }}`, type: f.type,
        }));
        for (const f of outputFields) {
          allKnownExpressions.set(`${edge.source}.${f.key}`, true);
          payloadFields.add(f.key);
          allKnownExpressions.set(`payload.${f.key}`, true);
        }
      }

      upstreamOutputs.push(info);
    }

    return { upstreamOutputs, payloadFields, allKnownExpressions, simFields };
  }

  /** Generate a node ID matching frontend format: type_slug_random */
  function genNodeId(tpl) {
    const type = String(tpl?.type || 'node').toLowerCase();
    const raw = String(tpl?.name || tpl?.title || 'node').trim();
    const slug = raw.toLowerCase().normalize('NFD').replace(/[^\w\s-]/g, ' ').replace(/[\s-]+/g, '_').replace(/^_+|_+$/g, '') || 'node';
    const s1 = Date.now().toString(36).slice(-4);
    const s2 = Math.random().toString(36).slice(2, 6);
    return `${type}_${slug}_${s1}_${s2}`;
  }

  /** Stable JSON.stringify: sorts object keys recursively (must match frontend stableStringify) */
  function stableStringify(obj) {
    const seen = new WeakSet();
    const sort = (x) => {
      if (x === null || typeof x !== 'object') return x;
      if (seen.has(x)) return undefined; // drop cycles
      seen.add(x);
      if (Array.isArray(x)) return x.map(sort);
      const out = {};
      Object.keys(x).sort().forEach(k => { out[k] = sort(x[k]); });
      return out;
    };
    try { return JSON.stringify(sort(obj)); } catch { return JSON.stringify(obj || {}); }
  }

  /** DJB2 32-bit hash (same as frontend) */
  function djb2(str) {
    let h = 5381 >>> 0;
    for (let i = 0; i < str.length; i++) h = (((h << 5) + h) + str.charCodeAt(i)) >>> 0;
    return ('00000000' + h.toString(16)).slice(-8);
  }

  /** Must match frontend flow-builder-utils.service.ts argsChecksum exactly */
  function argsChecksum(args) {
    try { return djb2(stableStringify(args || {})); } catch { return '00000000'; }
  }

  /** Must match frontend flow-builder-utils.service.ts featureChecksum exactly */
  function featureChecksum(tpl) {
    try {
      if (!tpl) return '';
      const obj = {
        authorize_catch_error: !!tpl.authorize_catch_error,
        authorize_skip_error: !!tpl.authorize_skip_error,
        allowWithoutCredentials: !!tpl.allowWithoutCredentials,
        nodeKind: tpl.nodeKind || tpl.type || '',
        inputHandles: tpl.inputHandles || [],
        outputHandles: tpl.outputHandles || [],
        linkedHandles: tpl.linkedHandles || [],
        output_array_field: tpl.output_array_field || undefined,
        output_schema_field: tpl.output_schema_field || undefined,
        outputSchema: tpl.outputSchema || undefined,
      };
      return argsChecksum(obj);
    } catch { return ''; }
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

  /**
   * Normalize a raw MongoDB template doc to the frontend templateObj format.
   * Must produce EXACTLY the same object as catalog.service.ts listNodeTemplates().
   * Only adds frontend mappings (id, appId). Never changes template values.
   */
  function normalizeTemplateObj(tpl) {
    // Deep-clone and convert to plain JSON (strips ObjectIds, Dates → strings, removes undefined)
    const obj = JSON.parse(JSON.stringify(tpl));
    // Map key → id (frontend uses templateObj.id for identification)
    if (!obj.id && obj.key) obj.id = obj.key;
    // Map providerKey → appId (frontend node-card-header uses templateObj.appId for provider lookup)
    if (!obj.appId && obj.providerKey) obj.appId = obj.providerKey;
    // Remove Mongoose internal fields
    delete obj._id;
    delete obj.__v;
    return obj;
  }

  /** Build a properly structured node matching frontend format */
  async function buildNode(tpl, opts = {}) {
    const id = opts.id || genNodeId(tpl);
    const ctx = { ...buildInitialContext(tpl), ...(opts.context || {}) };
    const templateObj = normalizeTemplateObj(tpl);

    // Auto-assign credential if the provider requires one
    let credentialId;
    if (tpl.providerKey && !tpl.allowWithoutCredentials) {
      try {
        const provider = await Provider.findOne({ key: tpl.providerKey }, 'hasCredentials allowWithoutCredentials').lean();
        if (provider?.hasCredentials && !provider?.allowWithoutCredentials) {
          const creds = await Credential.find(
            { providerKey: tpl.providerKey, workspaceId: metadata.workspaceId },
            'id _id name'
          ).lean();
          if (creds.length === 1) {
            credentialId = creds[0].id || String(creds[0]._id);
          } else if (creds.length > 1) {
            // Use the first one as default — user can change later
            credentialId = creds[0].id || String(creds[0]._id);
          }
        }
      } catch {}
    }

    return {
      id,
      point: opts.point || { x: 0, y: 0 },
      type: 'html-template',
      data: {
        model: {
          id,
          name: opts.title || tpl.title || tpl.name || tpl.key || 'Node',
          template: tpl.key || tpl._id || '',
          templateObj,
          context: ctx,
          templateChecksum: argsChecksum(tpl.args || {}),
          templateFeatureSig: featureChecksum(tpl),
          ...(credentialId ? { credentialId } : {}),
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
      // Block if already inside a flow builder (flowId exists)
      if (metadata.flowId || flowDoc) {
        return {
          success: false,
          error: 'Un workflow est déjà ouvert dans le builder. Tu NE DOIS PAS créer un nouveau flow. Utilise list_graph pour voir l\'état actuel et modifie le graph existant avec add_node, remove_node, connect_nodes, etc.',
        };
      }
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
      // Signal thread to link to this flow and switch mode
      emit({ type: 'thread.link', mode: 'workflow', flowId: String(flow._id), flowShortId: flow.id });
      return { success: true, flowId: flow.id, _id: String(flow._id) };
    },

    async list_graph() {
      await ensureGraph();
      const g = gref();
      const nodes = (g.nodes || []).map(n => {
        const model = n?.data?.model || {};
        const tpl = model?.templateObj || {};
        const outputIds = getOutputHandleIds(n);
        const info = {
          id: n.id,
          name: model.name || tpl.title || tpl.name || n.id,
          template: model.template || tpl.key || '',
          type: tpl.type || '',
          description: model.description || '',
          hasContext: !!(model.context && Object.keys(model.context).length),
          contextKeys: model.context ? Object.keys(model.context) : [],
          outputHandles: outputIds.map(hid => ({ id: hid, name: getOutputHandleName(n, hid) })),
        };
        // Include output schema for multi-output nodes so AI knows the available fields
        if (tpl.output_array_field && Array.isArray(tpl.outputSchema) && tpl.outputSchema.length) {
          info.isMultiOutput = true;
          info.outputSchema = tpl.outputSchema.map(f => ({ key: f.key || f.name, type: f.type || 'text' }));
        }
        return info;
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
      const templates = toolIndex.search(input?.query || '', { provider: input?.provider, type: input?.type, limit: input?.limit || 20 });
      const result = { success: true, templates };

      // Smart hint: detect classification-related queries and suggest classifiers
      const q = (input?.query || '').toLowerCase();
      const classifyPatterns = ['analys', 'categori', 'classif', 'trier', 'tri ', 'savoir si', 'determiner', 'router', 'type de', 'sorte de'];
      const hasClassifyIntent = classifyPatterns.some(p => q.includes(p));
      const hasClassifierInResults = templates.some(t => t.key?.includes('classify') || t.key?.includes('classifier'));
      if (hasClassifyIntent && !hasClassifierInResults) {
        // Also search for classifiers and include them as suggestions
        const classifiers = toolIndex.search('classify', { limit: 5 });
        if (classifiers.length) {
          result.hint = `⚠ Ta recherche semble impliquer de la CLASSIFICATION. Voici les templates classifier disponibles (multi-output, routage automatique par branche). Préfère-les à chat_completion pour du routage :`;
          result.classifierSuggestions = classifiers;
        }
      }

      return result;
    },

    async get_template_details(input) {
      const tpl = await NodeTemplate.findOne({ key: input.key }).lean();
      if (!tpl) return { success: false, error: `Template '${input.key}' introuvable` };
      const result = {
        success: true, key: tpl.key, name: tpl.title || tpl.name,
        description: tpl.description || '', type: tpl.type, provider: tpl.providerKey || null,
        args: tpl.args || {}, argsSchema: tpl.args ? argsToJsonSchema(tpl.args) : null,
        inputHandles: tpl.inputHandles || [], outputHandles: tpl.outputHandles || [],
        linkedHandles: tpl.linkedHandles || [], outputSchema: tpl.outputSchema || null,
        output_array_field: tpl.output_array_field || null,
        output_schema_field: tpl.output_schema_field || null,
      };
      // Add output fields info for multi-output nodes (classifiers, conditions, any node with output_array_field)
      if (tpl.output_array_field) {
        result.isMultiOutput = true;
        result.outputArrayField = tpl.output_array_field;
        let note = `⚠ NODE MULTI-SORTIE. Les sorties sont DYNAMIQUES et dépendent du champ "${tpl.output_array_field}" dans les args (tableau d'objets avec "name"). `
          + `Séquence : 1) add_node → outputHandles VIDES (normal). 2) set_node_args avec "${tpl.output_array_field}" → retourne les outputHandles générés. `
          + `3) connect_by_output_name avec les noms retournés. JAMAIS inventer de noms de sortie.`;
        if (Array.isArray(tpl.outputSchema) && tpl.outputSchema.length) {
          note += ` Données par branche : ${tpl.outputSchema.map(f => f.key || f.name).join(', ')} — accès via {{ nodeId.<champ> }}.`;
        }
        note += ` Consulte search_manual("multi_output", "workflow") pour les détails.`;
        result.dataAccessNote = note;
      }
      return result;
    },

    async ensure_start(input) {
      await ensureGraph();
      const g = gref();
      const existing = (g.nodes || []).find(n => START_TYPES.includes(String(n?.data?.model?.templateObj?.type || '').toLowerCase()));
      if (existing) return { success: true, ensured: false, nodeId: existing.id, type: existing.data?.model?.templateObj?.type };

      const key = String(input?.type || 'start').toLowerCase();
      const tpl = await NodeTemplate.findOne({ key }).lean() || { key, name: key, type: key };
      const node = await buildNode(tpl, { point: { x: 0, y: 0 } });
      g.nodes.push(node);
      emitPatch([{ op: 'add', path: '/nodes/-', value: node }]);
      return { success: true, ensured: true, nodeId: node.id, type: key };
    },

    async add_node(input) {
      await ensureGraph();
      const g = gref();
      const tpl = await NodeTemplate.findOne({ key: input.templateKey }).lean();
      if (!tpl) return { success: false, error: `Template '${input.templateKey}' introuvable` };

      // Prevent duplicate start nodes — but upgrade if different template
      if (START_TYPES.includes(String(tpl.type || '').toLowerCase())) {
        const existing = (g.nodes || []).find(n => START_TYPES.includes(String(n?.data?.model?.templateObj?.type || '').toLowerCase()));
        if (existing) {
          const existingKey = existing.data?.model?.template || existing.data?.model?.templateObj?.key || '';
          if (existingKey !== tpl.key) {
            // Upgrade: replace templateObj with the new template (e.g. start → email_new_message)
            const idx = findNodeIndex(existing.id);
            if (idx >= 0) {
              const ctx = { ...buildInitialContext(tpl), ...(existing.data?.model?.context || {}) };
              g.nodes[idx].data.model.template = tpl.key;
              g.nodes[idx].data.model.name = tpl.title || tpl.name || tpl.key;
              g.nodes[idx].data.model.templateObj = normalizeTemplateObj(tpl);
              g.nodes[idx].data.model.context = ctx;
              g.nodes[idx].data.model.templateChecksum = argsChecksum(tpl.args || {});
              g.nodes[idx].data.model.templateFeatureSig = featureChecksum(tpl);
              changed = true;
              emitPatch([{ op: 'replace', path: `/nodes/${idx}`, value: g.nodes[idx] }]);
            }
          }
          const outputHandles = getOutputHandleIds(existing).map(hid => ({
            id: hid, name: getOutputHandleName(existing, hid),
          }));
          return { success: true, ensured: true, nodeId: existing.id, type: tpl.type, outputHandles };
        }
      }

      const node = await buildNode(tpl, {
        title: input.title,
        point: input.near || { x: 0, y: 0 },
      });
      g.nodes.push(node);
      emitPatch([{ op: 'add', path: '/nodes/-', value: node }]);

      // Return output handles info so AI knows how to connect
      const outputHandles = getOutputHandleIds(node).map(hid => ({
        id: hid, name: getOutputHandleName(node, hid),
      }));
      const result = { success: true, nodeId: node.id, name: node.data.model.name, type: tpl.type, outputHandles };
      // Report credential status
      if (node.data.model.credentialId) {
        result.credentialId = node.data.model.credentialId;
        result.credentialNote = 'Credential auto-assigné.';
      } else if (tpl.providerKey) {
        try {
          const prov = await Provider.findOne({ key: tpl.providerKey }, 'hasCredentials allowWithoutCredentials').lean();
          if (prov?.hasCredentials && !prov?.allowWithoutCredentials && !tpl.allowWithoutCredentials) {
            result.credentialMissing = true;
            result.credentialNote = `⚠ Ce node requiert des credentials (provider: ${tpl.providerKey}) mais aucun n'est disponible. Utilise open_credentials("${tpl.providerKey}") pour en créer, ou list_credentials("${tpl.providerKey}") pour vérifier.`;
          }
        } catch {}
      }
      // For multi-output nodes: include outputSchema so AI knows the data fields per branch
      if (tpl.output_array_field && Array.isArray(tpl.outputSchema) && tpl.outputSchema.length) {
        result.isMultiOutput = true;
        result.outputArrayField = tpl.output_array_field;
        result.outputSchema = tpl.outputSchema.map(f => ({ key: f.key || f.name, type: f.type || 'text' }));
        result.dataAccessNote = `Node multi-output. Les sorties (outputHandles) sont VIDES pour l'instant car elles dépendent des arguments "${tpl.output_array_field}". `
          + `SÉQUENCE OBLIGATOIRE : 1) set_node_args avec le champ "${tpl.output_array_field}" (tableau d'objets avec "name") → les sorties seront générées automatiquement et retournées dans la réponse. `
          + `2) Utilise les outputHandles retournés par set_node_args pour connect_by_output_name. `
          + `NE JAMAIS inventer de noms de sortie — utilise UNIQUEMENT les noms retournés.`;
      }
      return result;
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
            name: tpl.title || tpl.name || tpl.key || 'Node',
            template: input.templateKey,
            templateObj: normalizeTemplateObj(tpl),
            context: ctx,
            templateChecksum: argsChecksum(tpl.args || {}),
            templateFeatureSig: featureChecksum(tpl),
          },
        },
      };

      // Recompute edge labels on all outgoing edges (template change affects labels)
      const nodeId = String(input.nodeId);
      const g = gref();
      const ops = [{ op: 'replace', path: `/nodes/${idx}`, value: g.nodes[idx] }];
      for (let i = 0; i < g.edges.length; i++) {
        const e = g.edges[i];
        if (String(e.source) === nodeId) {
          const updated = buildEdge(e.source, e.target, e.sourceHandle || '0', e.targetHandle || 'in');
          updated.id = e.id || updated.id; // preserve original edge id
          g.edges[i] = updated;
          ops.push({ op: 'replace', path: `/edges/${i}`, value: updated });
        }
      }

      emitPatch(ops);
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

      const edge = buildEdge(input.sourceId, input.targetId, sourceHandle, targetHandle);
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

      // Validate keys against template args schema — warn about unknown keys
      const tplForValidation = g.nodes[idx]?.data?.model?.templateObj || {};
      const nodeTypeForValidation = String(tplForValidation.type || '').toLowerCase();
      const warnings = [];
      if (tplForValidation.args?.fields && !['condition', 'loop'].includes(nodeTypeForValidation)) {
        const extractKeys = (fields, prefix = '') => {
          const keys = new Set();
          for (const f of (fields || [])) {
            const k = f?.key || f?.name;
            if (!k) continue;
            keys.add(prefix ? `${prefix}.${k}` : k);
            // section_array sub-fields
            if (f.type === 'section_array' && Array.isArray(f.fields)) {
              for (const sf of f.fields) {
                const sk = sf?.key || sf?.name;
                if (sk) keys.add(sk); // sub-fields are set as flat keys in context
              }
            }
            // section sub-fields
            if (f.type === 'section' && Array.isArray(f.fields)) {
              for (const sf of f.fields) {
                const sk = sf?.key || sf?.name;
                if (sk) keys.add(sk);
              }
            }
          }
          return keys;
        };
        const validKeys = extractKeys(tplForValidation.args.fields);
        // Also allow output_array_field key (e.g. "categories" for classifiers)
        if (tplForValidation.output_array_field) validKeys.add(tplForValidation.output_array_field);
        const unknownKeys = Object.keys(args).filter(k => !validKeys.has(k));
        if (unknownKeys.length) {
          warnings.push(`⚠ Clés inconnues dans le schéma du template: ${unknownKeys.join(', ')}. Clés valides: ${[...validKeys].join(', ')}. Utilise get_node_schema(nodeId) pour voir le schéma complet. Les clés inconnues ont été IGNORÉES.`);
          // Remove unknown keys to prevent corrupting the node
          for (const k of unknownKeys) delete args[k];
          if (!Object.keys(args).length) return { success: false, error: `Toutes les clés fournies sont invalides. Clés valides: ${[...validKeys].join(', ')}. Appelle get_node_schema pour voir le schéma.`, warnings };
        }
      }

      // Auto-validate {{ }} expressions in args against upstream context + simulation
      // This catches errors when the agent skips propose_context_mapping
      try {
        const allArgValues = JSON.stringify(args);
        const exprRegex = /\{\{\s*([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)\s*\}\}/g;
        const usedExpressions = [];
        let m;
        while ((m = exprRegex.exec(allArgValues)) !== null) {
          usedExpressions.push(m[1]);
        }

        if (usedExpressions.length > 0) {
          // Run simulation for additional field coverage (catches cases where schema alone isn't enough)
          let simData = null;
          try { const { simulateViaEngine } = require('../../utils/flow-simulate-engine'); simData = await simulateViaEngine(g, input.nodeId); } catch {}
          if (!simData) { try { const { simulateScenarios } = require('../../utils/flow-simulate'); simData = simulateScenarios(g, input.nodeId); } catch {} }

          const upstream = buildUpstreamContext(g, String(input.nodeId), simData);
          const badExpressions = [];

          for (const expr of usedExpressions) {
            // Check if this expression is known
            if (upstream.allKnownExpressions.has(expr)) continue;

            // Check payload.xxx — field must exist in a direct predecessor's output
            if (expr.startsWith('payload.')) {
              const fieldName = expr.replace('payload.', '');
              if (!upstream.payloadFields.has(fieldName)) {
                const suggestions = [...upstream.payloadFields].slice(0, 15);
                if (suggestions.length) {
                  badExpressions.push(`⚠ {{ ${expr} }} : champ "${fieldName}" introuvable dans la sortie des nodes précédents. Champs disponibles via payload : ${suggestions.join(', ')}. Appelle propose_context_mapping("${input.nodeId}") pour voir les expressions exactes.`);
                } else {
                  badExpressions.push(`⚠ {{ ${expr} }} : impossible de vérifier — aucun schéma de sortie connu pour les nodes précédents. Appelle propose_context_mapping("${input.nodeId}") pour vérifier.`);
                }
              }
              continue;
            }

            // Check nodeId.xxx — node might not be a predecessor or field might not exist
            const dotIdx = expr.indexOf('.');
            if (dotIdx > 0) {
              const refNodeId = expr.slice(0, dotIdx);
              const refField = expr.slice(dotIdx + 1);
              // Check against direct predecessors first
              const upstreamNode = upstream.upstreamOutputs.find(u => String(u.nodeId) === refNodeId);
              if (upstreamNode && upstreamNode.outputSchema && upstreamNode.outputSchema.length) {
                const validFields = upstreamNode.outputSchema.map(f => f.key);
                if (!validFields.includes(refField)) {
                  badExpressions.push(`⚠ {{ ${expr} }} : champ "${refField}" introuvable dans la sortie de "${upstreamNode.name}" (${upstreamNode.template}). Champs disponibles : ${validFields.join(', ')}.`);
                }
              }
              // Non-direct predecessor: check simulation data (covers nodes behind conditions/loops)
              if (!upstreamNode && upstream.simFields && upstream.simFields.has(refNodeId)) {
                const sf = upstream.simFields.get(refNodeId);
                if (!sf.has(refField)) {
                  const simNodeFields = [...sf].slice(0, 15);
                  badExpressions.push(`⚠ {{ ${expr} }} : champ "${refField}" introuvable dans la sortie simulée du node "${refNodeId}". Champs disponibles : ${simNodeFields.join(', ')}.`);
                }
              }
            }
          }

          if (badExpressions.length) {
            warnings.push(...badExpressions);
            // Also include the correct upstream context so the agent can self-correct
            const upstreamSummary = upstream.upstreamOutputs
              .filter(u => u.availableExpressions.length)
              .map(u => `${u.name} (${u.nodeId}) : ${u.availableExpressions.map(e => e.expression).join(', ')}`)
              .join(' | ');
            if (upstreamSummary) {
              warnings.push(`📋 Expressions directes disponibles : ${upstreamSummary}`);
            }
            // Include simulation-derived expressions for non-direct predecessors (behind conditions/loops)
            if (upstream.simFields && upstream.simFields.size) {
              const directIds = new Set(upstream.upstreamOutputs.map(u => String(u.nodeId)));
              const simSummary = [];
              for (const [nid, fields] of upstream.simFields) {
                if (directIds.has(nid)) continue; // already shown in upstreamSummary
                const flds = [...fields].slice(0, 10);
                simSummary.push(`${nid} : ${flds.map(f => `{{ ${nid}.${f} }}`).join(', ')}`);
              }
              if (simSummary.length) {
                warnings.push(`📋 Expressions simulées (nodes en amont via conditions/boucles) : ${simSummary.join(' | ')}`);
              }
            }
            if (upstream.payloadFields.size) {
              warnings.push(`📋 Champs payload disponibles (depuis les prédécesseurs) : ${[...upstream.payloadFields].join(', ')}`);
            }
            warnings.push(`💡 Appelle propose_context_mapping("${input.nodeId}") pour obtenir toutes les expressions valides, puis corrige avec set_node_args.`);
          }
        }
      } catch (exprErr) {
        // Don't fail set_node_args if expression validation errors — just log
        console.warn('[wf-tool:set_node_args] expression validation error:', exprErr.message);
      }

      g.nodes[idx].data = g.nodes[idx].data || {};
      g.nodes[idx].data.model = g.nodes[idx].data.model || {};
      const existing = g.nodes[idx].data.model.context || {};
      g.nodes[idx].data.model.context = { ...existing, ...args };

      // Ensure stable _ids on condition/multi-output array items (mirrors frontend ensureStableConditionIds)
      const tpl = g.nodes[idx].data.model.templateObj || {};
      const nodeType = String(tpl.type || '').toLowerCase();
      const oaf = tpl.output_array_field;
      if (nodeType === 'condition' || oaf) {
        const field = oaf || 'items';
        const arr = g.nodes[idx].data.model.context[field];
        if (Array.isArray(arr)) {
          const used = new Set();
          for (const item of arr) {
            if (item && typeof item === 'object') {
              if (item._id) { used.add(item._id); continue; }
              let id;
              do { id = 'cid_' + Math.random().toString(36).slice(2); } while (used.has(id));
              item._id = id;
              used.add(id);
            }
          }
        }
      }

      // Recalculate templateChecksum after args change
      g.nodes[idx].data.model.templateChecksum = argsChecksum(tpl.args || {});

      // For multi-output nodes: auto-cleanup stale edges pointing to old handles that no longer exist
      // When categories change, old _ids are gone → edges become orphan → must be removed
      let removedStaleEdges = 0;
      if (oaf && Array.isArray(g.nodes[idx].data.model.context[oaf])) {
        const newHandleIds = new Set(getOutputHandleIds(g.nodes[idx]));
        const nid = String(input.nodeId);
        const before = g.edges.length;
        g.edges = (g.edges || []).filter(e => {
          if (String(e.source) !== nid) return true; // not from this node
          const sh = String(e.sourceHandle || '');
          // Keep edges whose sourceHandle still exists in the new handles
          if (newHandleIds.has(sh)) return true;
          // Remove stale edge (handle no longer exists)
          return false;
        });
        removedStaleEdges = before - g.edges.length;
      }

      // Emit full node replace so frontend gets _id changes + output handles
      if (removedStaleEdges > 0) {
        // Edges changed too → emit full snapshot
        emitSnapshot();
      } else {
        emitPatch([{ op: 'replace', path: `/nodes/${idx}`, value: g.nodes[idx] }]);
      }
      emit({ type: 'args', nodeId: input.nodeId, args });
      const result = { success: true, keys: Object.keys(args) };
      if (warnings.length) result.warnings = warnings;

      // For multi-output nodes (classifiers, etc.): return the newly generated outputHandles
      // so the AI can immediately use connect_by_output_name with the correct names
      if (oaf && Array.isArray(g.nodes[idx].data.model.context[oaf])) {
        const handleIds = getOutputHandleIds(g.nodes[idx]);
        result.outputHandles = handleIds.map(hid => ({
          id: hid, name: getOutputHandleName(g.nodes[idx], hid),
        }));
        result.isMultiOutput = true;
        if (removedStaleEdges > 0) {
          result.removedStaleEdges = removedStaleEdges;
          result.multiOutputNote = `⚠ ${removedStaleEdges} connexion(s) obsolète(s) supprimée(s) automatiquement (les anciens handles n'existent plus). `
            + `Les nouvelles sorties sont ci-dessus (outputHandles). Tu DOIS reconnecter les branches nécessaires avec connect_by_output_name en utilisant ces noms.`;
        } else {
          result.multiOutputNote = `Les sorties ont été générées depuis "${oaf}". Utilise connect_by_output_name avec les noms ci-dessus (outputHandles[].name) pour connecter chaque branche. NE JAMAIS inventer de nom — utilise UNIQUEMENT ceux retournés ici.`;
        }
      }

      return result;
    },

    async set_node_description(input) {
      await ensureGraph();
      const idx = findNodeIndex(input.nodeId);
      if (idx < 0) return { success: false, error: 'Node introuvable' };
      const g = gref();
      g.nodes[idx].data = g.nodes[idx].data || {};
      g.nodes[idx].data.model = g.nodes[idx].data.model || {};
      g.nodes[idx].data.model.description = input.description || '';
      // Emit full node replacement (NOT partial path — frontend only supports /nodes/{idx} level)
      emitPatch([{ op: 'replace', path: `/nodes/${idx}`, value: g.nodes[idx] }]);
      emit({ type: 'desc', nodeId: input.nodeId, text: input.description });
      return { success: true };
    },

    async set_node_credential(input) {
      await ensureGraph();
      const g = gref();
      const idx = findNodeIndex(input.nodeId);
      if (idx < 0) return { success: false, error: 'Node introuvable' };
      g.nodes[idx].data = g.nodes[idx].data || {};
      g.nodes[idx].data.model = g.nodes[idx].data.model || {};
      g.nodes[idx].data.model.credentialId = input.credentialId;
      emitPatch([{ op: 'replace', path: `/nodes/${idx}`, value: g.nodes[idx] }]);
      return { success: true, nodeId: input.nodeId, credentialId: input.credentialId };
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

      // Reuse shared buildUpstreamContext utility (with simulation data for max coverage)
      const upstream = buildUpstreamContext(g, String(input.targetId), sim);

      const variants = scenarios.map(sc => ({ label: sc.label || `scenario_${sc.index}`, mapping: guessMapping(tArgs, sc.msgIn || {}), previewMsg: sc.msgIn || {} }));
      const best = variants[0] || { mapping: {}, previewMsg: {} };
      const result = { success: true, scenarioCount: scenarios.length, mapping: best.mapping, variants, upstreamOutputs: upstream.upstreamOutputs };
      if (upstream.payloadFields.size) {
        result.payloadFields = [...upstream.payloadFields];
      }
      // Include ALL available expressions (direct + simulation) for complete coverage
      if (upstream.allKnownExpressions.size) {
        result.availableExpressions = [...upstream.allKnownExpressions.keys()].map(e => `{{ ${e} }}`);
      }
      // Include simulation-derived expressions for non-direct predecessors (behind conditions/loops)
      if (upstream.simFields && upstream.simFields.size) {
        const directIds = new Set(upstream.upstreamOutputs.map(u => String(u.nodeId)));
        const simUpstream = [];
        for (const [nid, fields] of upstream.simFields) {
          if (directIds.has(nid)) continue;
          const nodeInGraph = (g.nodes || []).find(n => String(n.id) === nid);
          const nodeName = nodeInGraph?.data?.model?.name || nid;
          simUpstream.push({
            nodeId: nid,
            name: nodeName,
            note: 'non-direct predecessor (derrière condition/boucle)',
            availableExpressions: [...fields].map(f => ({ field: f, expression: `{{ ${nid}.${f} }}` })),
          });
        }
        if (simUpstream.length) {
          result.upstreamSimulated = simUpstream;
        }
      }
      return result;
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
          issues.push({ level: 'error', nodeId: id, message: `Node '${n?.data?.model?.name || id}' orphelin (aucune connexion)` });
        } else if (!connectedTargets.has(id)) {
          // Non-trigger nodes MUST have at least one incoming edge
          issues.push({ level: 'error', nodeId: id, message: `Node '${n?.data?.model?.name || id}' n'a aucune entrée (tous les nodes sauf triggers doivent être connectés en entrée)` });
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
        const { layoutGraph } = require('../../utils/elk-layout');
        // Read orientation from flow settings (same as frontend) or input override
        let orient = String(input?.orientation || '').toLowerCase();
        if (orient !== 'horizontal' && orient !== 'vertical') {
          orient = flowDoc?.settings?.portOrientation === 'vertical' ? 'vertical' : 'horizontal';
        }
        // Use same layout params as frontend flow-builder.component.ts
        const gapX = orient === 'horizontal' ? 360 : 260;
        const { positions } = await layoutGraph(
          { nodes: g.nodes, edges: g.edges },
          { orientation: orient, nodeWidth: 223, nodeHeight: 110, gapX, gapY: 160, normalizeLevels: true }
        );
        // Apply positions to nodes (same as frontend flow-builder.component.ts)
        let applied = 0;
        for (const [id, p] of Object.entries(positions)) {
          const n = (g.nodes || []).find(nn => String(nn.id) === String(id));
          if (n) { n.point = { x: Math.round(p.x), y: Math.round(p.y) }; applied++; }
        }
        changed = true;
        emitSnapshot();
        return { success: true, applied };
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

      // Build form schema — embedded directly in the node model (NOT a separate Form document)
      const schema = {
        title: input.formName || 'Formulaire de démarrage',
        ui: { layout: 'vertical', labelsOnTop: true },
        fields,
        displayTitle: true,
        displayDescription: true,
      };

      await ensureGraph();
      const g = gref();
      const tpl = await NodeTemplate.findOne({ key: 'start_form' }).lean() || { key: 'start_form', name: 'Formulaire', type: 'start_form' };
      const startNode = (g.nodes || []).find(n => START_TYPES.includes(String(n?.data?.model?.templateObj?.type || '').toLowerCase()));

      let nodeId;
      if (startNode) {
        const idx = findNodeIndex(startNode.id);
        if (idx >= 0) {
          g.nodes[idx].data.model.template = 'start_form';
          g.nodes[idx].data.model.name = input.formName || tpl.title || 'Démarrage formulaire';
          g.nodes[idx].data.model.templateObj = normalizeTemplateObj(tpl);
          g.nodes[idx].data.model.startFormSchema = schema;
          g.nodes[idx].data.model.startFormEnabled = true;
          g.nodes[idx].data.model.startFormAppliedAt = Date.now();
          g.nodes[idx].data.model.templateChecksum = argsChecksum(tpl.args || {});
          g.nodes[idx].data.model.templateFeatureSig = featureChecksum(tpl);
          emitPatch([{ op: 'replace', path: `/nodes/${idx}`, value: g.nodes[idx] }]);
          nodeId = String(startNode.id);
        }
      } else {
        const node = await buildNode(tpl, { point: { x: 0, y: 0 } });
        node.data.model.startFormSchema = schema;
        node.data.model.startFormEnabled = true;
        node.data.model.startFormAppliedAt = Date.now();
        node.data.model.name = input.formName || tpl.title || 'Démarrage formulaire';
        g.nodes.push(node);
        emitPatch([{ op: 'add', path: '/nodes/-', value: node }]);
        nodeId = String(node.id);
      }

      // Recompute edge labels on outgoing edges
      if (nodeId) {
        const edgeOps = [];
        for (let i = 0; i < g.edges.length; i++) {
          const e = g.edges[i];
          if (String(e.source) === nodeId) {
            const updated = buildEdge(e.source, e.target, e.sourceHandle || 'ok', e.targetHandle || 'in');
            updated.id = e.id || updated.id;
            g.edges[i] = updated;
            edgeOps.push({ op: 'replace', path: `/edges/${i}`, value: updated });
          }
        }
        if (edgeOps.length) emitPatch(edgeOps);
      }

      return { success: true, nodeId, fields: fields.map(f => f.key), formTitle: schema.title };
    },

    async build_schema(input) {
      const fields = (input.fields || []).map(f => ({
        key: f.key,
        type: f.type || 'text',
        label: f.label,
        ...(f.description ? { description: f.description } : {}),
        defaultValue: f.defaultValue !== undefined ? f.defaultValue : '',
        validators: f.required ? [{ type: 'required' }] : [],
        col: f.col || { xs: 24, sm: 24, md: f.type === 'textarea' ? 24 : 12 },
        ...(f.options ? { options: f.options } : {}),
      }));

      // When building a schema for node args (schema_builder, extraction_schema, etc.),
      // hide title and description by default. For standalone forms/start_forms, show them.
      const isNodeSchema = !!(input.targetNodeId && input.targetArgKey);
      const schema = {
        ...(input.title ? { title: input.title } : {}),
        ...(input.description ? { description: input.description } : {}),
        // Hide title/description for embedded schemas (node args), show for standalone forms
        displayTitle: isNodeSchema ? false : (input.displayTitle !== undefined ? input.displayTitle : true),
        displayDescription: isNodeSchema ? false : (input.displayDescription !== undefined ? input.displayDescription : true),
        ui: input.ui || { layout: 'vertical', labelsOnTop: true },
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

    // ── Deployment & Trigger tools ──────────────────────────────────────

    async deploy_flow(input) {
      const fid = input?.flowId || metadata.flowId;
      if (!fid) return { success: false, error: 'Aucun flow. Spécifie flowId ou charge un flow d\'abord.' };
      try {
        let flow = Types.ObjectId.isValid(fid) ? await Flow.findById(fid) : null;
        if (!flow) flow = await Flow.findOne({ id: fid });
        if (!flow) return { success: false, error: 'Flow introuvable' };
        if (!flow.enabled) return { success: false, error: 'Le flow est désactivé. Active-le d\'abord.' };
        if (flow.status === 'production') return { success: false, error: 'Le flow est déjà en production.' };

        // Auto-save in-memory graph to DB before deploying (trigger-manager re-reads from DB)
        if (graph) {
          flow.graph = gref();
          await flow.save();
          changed = false;
        }

        const { triggerManager } = require('../../services/trigger-manager');
        const status = await triggerManager.deployFlow(flow._id);
        return {
          success: true,
          status: 'deployed',
          triggerType: status?.triggerType || flow.triggerType || null,
          webhookUrl: status?.webhookUrl || null,
          message: `Flow "${flow.name}" déployé en production.`,
        };
      } catch (e) {
        const msg = e?.message || String(e);
        if (msg.includes('already deployed')) return { success: false, error: 'Le flow est déjà déployé.' };
        if (msg.includes('No event trigger')) return { success: false, error: 'Aucun nœud event/trigger trouvé. Ajoute un nœud event pour activer le déploiement.' };
        if (msg.includes('No trigger adapter')) return { success: false, error: `Adaptateur de trigger introuvable : ${msg}` };
        return { success: false, error: msg };
      }
    },

    async undeploy_flow(input) {
      const fid = input?.flowId || metadata.flowId;
      if (!fid) return { success: false, error: 'Aucun flow. Spécifie flowId ou charge un flow d\'abord.' };
      try {
        let flow = Types.ObjectId.isValid(fid) ? await Flow.findById(fid) : null;
        if (!flow) flow = await Flow.findOne({ id: fid });
        if (!flow) return { success: false, error: 'Flow introuvable' };
        if (flow.status !== 'production') return { success: false, error: 'Le flow n\'est pas en production.' };

        const { triggerManager } = require('../../services/trigger-manager');
        await triggerManager.undeployFlow(flow._id);
        return { success: true, status: 'undeployed', message: `Flow "${flow.name}" arrêté.` };
      } catch (e) {
        return { success: false, error: e?.message || String(e) };
      }
    },

    async get_deployment_status(input) {
      const fid = input?.flowId || metadata.flowId;
      if (!fid) return { success: false, error: 'Aucun flow. Spécifie flowId ou charge un flow d\'abord.' };
      try {
        let flow = Types.ObjectId.isValid(fid) ? await Flow.findById(fid).lean() : null;
        if (!flow) flow = await Flow.findOne({ id: fid }).lean();
        if (!flow) return { success: false, error: 'Flow introuvable' };

        const { triggerManager } = require('../../services/trigger-manager');
        const triggerStatus = triggerManager.getStatus ? triggerManager.getStatus(flow._id) : {};
        return {
          success: true,
          flowName: flow.name,
          status: flow.status || 'draft',
          enabled: flow.enabled !== false,
          deployed: flow.status === 'production',
          deployedAt: flow.deployedAt || null,
          lastDeployedAt: flow.lastDeployedAt || null,
          triggerType: flow.triggerType || triggerStatus?.triggerType || null,
          triggerNodeId: flow.triggerNodeId || null,
          active: triggerStatus?.active || false,
          eventCount: triggerStatus?.eventCount || 0,
        };
      } catch (e) {
        return { success: false, error: e?.message || String(e) };
      }
    },

    // ── Run / Execution tools ───────────────────────────────────────────

    async start_run(input) {
      const fid = input?.flowId || metadata.flowId;
      if (!fid) return { success: false, error: 'Aucun flow. Spécifie flowId ou charge un flow d\'abord.' };
      try {
        let flow = Types.ObjectId.isValid(fid) ? await Flow.findById(fid) : null;
        if (!flow) flow = await Flow.findOne({ id: fid });
        if (!flow) return { success: false, error: 'Flow introuvable' };
        if (!flow.enabled) return { success: false, error: 'Le flow est désactivé.' };

        // Auto-save in-memory graph to DB before running (engine reads from DB)
        if (graph) {
          flow.graph = gref();
          await flow.save();
          changed = false;
        }

        // Validate templates before run
        const { validateFlowTemplates } = require('../../plugins/validate');
        const valResult = validateFlowTemplates(flow.graph);
        if (valResult && valResult.errors && valResult.errors.length) {
          return { success: false, error: 'Le flow a des erreurs de validation.', validationErrors: valResult.errors.slice(0, 5) };
        }

        const run = await Run.create({
          flowId: flow._id,
          workspaceId: flow.workspaceId,
          companyId: flow.companyId,
          status: 'queued',
          graph: flow.graph,
          meta: flow.settings || {},
          startedAt: new Date(),
        });

        // Async execution
        const { runFlow } = require('../../engine');
        setImmediate(async () => {
          try {
            await Run.updateOne({ _id: run._id }, { status: 'running' });
            const result = await runFlow(flow.graph, { flowId: flow._id, workspaceId: flow.workspaceId }, input?.payload ? { payload: input.payload } : { payload: {} });
            await Run.updateOne({ _id: run._id }, { status: 'success', result, finishedAt: new Date(), durationMs: Date.now() - run.startedAt.getTime() });
          } catch (err) {
            await Run.updateOne({ _id: run._id }, { status: 'error', result: { error: err?.message || String(err) }, finishedAt: new Date(), durationMs: Date.now() - run.startedAt.getTime() });
          }
        });

        return { success: true, runId: String(run._id), status: 'queued', message: `Exécution lancée pour "${flow.name}".` };
      } catch (e) {
        return { success: false, error: e?.message || String(e) };
      }
    },

    async list_runs(input) {
      const fid = input?.flowId || metadata.flowId;
      if (!fid) return { success: false, error: 'Aucun flow. Spécifie flowId ou charge un flow d\'abord.' };
      try {
        const limit = Math.min(Math.max(input?.limit || 20, 1), 50);
        const offset = Math.max(input?.offset || 0, 0);

        const query = { flowId: fid };
        if (input?.status) query.status = input.status;

        const [runs, total] = await Promise.all([
          Run.find(query, 'status startedAt finishedAt durationMs')
            .sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
          Run.countDocuments(query),
        ]);

        return {
          success: true,
          total,
          limit,
          offset,
          runs: runs.map(r => ({
            id: String(r._id),
            status: r.status,
            startedAt: r.startedAt,
            finishedAt: r.finishedAt || null,
            durationMs: r.durationMs || null,
          })),
        };
      } catch (e) {
        return { success: false, error: e?.message || String(e) };
      }
    },

    async get_run_stats(input) {
      const fid = input?.flowId || metadata.flowId;
      if (!fid) return { success: false, error: 'Aucun flow. Spécifie flowId ou charge un flow d\'abord.' };
      try {
        const flowObjId = Types.ObjectId.isValid(fid) ? new Types.ObjectId(fid) : null;
        if (!flowObjId) return { success: false, error: 'flowId invalide' };

        const stats = await Run.aggregate([
          { $match: { flowId: flowObjId } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
              error: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
              running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
              cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
              timed_out: { $sum: { $cond: [{ $eq: ['$status', 'timed_out'] }, 1, 0] } },
              avgDurationMs: { $avg: '$durationMs' },
            },
          },
        ]);

        const s = stats[0] || { total: 0, success: 0, error: 0, running: 0, cancelled: 0, timed_out: 0, avgDurationMs: null };
        return {
          success: true,
          total: s.total,
          success: s.success,
          error: s.error,
          running: s.running,
          cancelled: s.cancelled,
          timed_out: s.timed_out,
          avgDurationMs: s.avgDurationMs ? Math.round(s.avgDurationMs) : null,
        };
      } catch (e) {
        return { success: false, error: e?.message || String(e) };
      }
    },
  };

  // When a flow is already loaded (builder mode), remove create_flow from the tool list
  // so the LLM cannot even attempt to call it
  const defs = metadata.flowId
    ? WORKFLOW_TOOL_DEFINITIONS.filter(d => d.name !== 'create_flow')
    : WORKFLOW_TOOL_DEFINITIONS;

  return {
    definitions: defs,
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
