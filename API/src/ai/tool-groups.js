// Tool Groups Registry — orchestrator + capsule architecture
// Pattern: ~18 primitive tools always visible + capsules activated on demand
//
// Primitive tools = meta-tools (search, execute, ask, memory, navigation, manual)
// Capsules = mode-specific tool packs (workflow, form, node_args) injected when needed

const { META_TOOL_DEFINITIONS, executeMetaTool } = require('./tools/meta-tools');
const { createWorkflowExecutor } = require('./tools/workflow-tools');
const { createNodeArgsExecutor } = require('./tools/node-args-tools');
const { createFormExecutor } = require('./tools/form-tools');
const { createProjectFsExecutor } = require('./tools/project-fs-tools');
const { createDocumentExecutor } = require('./tools/document-tools');
const { createCodeExecExecutor } = require('./tools/code-exec-tools');
const { createWebExecutor } = require('./tools/web-tools');

// ── Primitive groups (always available in orchestrator) ──
const PRIMITIVE_GROUPS = {
  core:            ['ask_user', 'save_memory', 'get_memory', 'enrich_context', 'render_structured', 'propose_plan', 'generate_diagram', 'display_image', 'display_file', 'render_interactive_canvas', 'install_package', 'send_message_to_agent', 'todo_write'],
  navigation:      ['open_element', 'open_credentials'],
  execution:       ['search_tools', 'get_tool_details', 'execute_tool', 'list_providers', 'list_credentials'],
  workflow_search:  ['search_workflows', 'run_workflow', 'deploy_flow', 'undeploy_flow', 'get_deployment_status', 'list_runs', 'get_run_stats'],
  project_memory:  ['save_project_memory', 'get_project_memory'],
  project_knowledge: ['get_project_knowledge', 'set_project_knowledge'],
  thread:          ['compact_and_transfer', 'attach_thread_to_flow', 'attach_thread_to_form', 'detach_thread'],
  manual:          ['search_manual', 'get_manual_section'],
  subagent:        ['spawn_subagent', 'research_deep'],
  // Outils internes réservés aux subagents (jamais exposés au LLM principal).
  // Filtrés en sortie : seuls les subagents avec allowedTools:[...] les voient.
  subagent_internal: ['suggest_memory_entries'],
};

// Tools réservés aux subagents — cachés au LLM principal SAUF si allowedTools
// contient explicitement leur nom (ex: memory_extractor.toolsAllowed).
const SUBAGENT_INTERNAL_TOOLS = new Set(['suggest_memory_entries']);

// All primitive tool names (flat)
const ALL_PRIMITIVE_NAMES = new Set(Object.values(PRIMITIVE_GROUPS).flat());

// ── Capsules (activated on demand) ──
const CAPSULE_NAMES = ['workflow', 'form', 'node_args', 'project_fs', 'document', 'code_exec', 'web'];

const CAPSULE_INFO = {
  workflow: {
    label: 'Workflow builder',
    description: 'Outils de construction de workflow : créer, ajouter des nœuds, connecter, configurer, valider, déployer',
    toolCount: '~28 outils',
  },
  form: {
    label: 'Formulaire builder',
    description: 'Outils de construction de formulaire : créer, ajouter des champs/sections, configurer, sauvegarder',
    toolCount: '~14 outils',
  },
  node_args: {
    label: 'Configuration nœud',
    description: 'Outils de configuration d\'un nœud : schéma, prédécesseurs, scénarios, mapping, arguments',
    toolCount: '~9 outils',
  },
  project_fs: {
    label: 'Système de fichiers projet',
    description: 'Lecture/écriture de fichiers dans un projet distant (Nextcloud, Drive, Dropbox, OneDrive).',
    toolCount: '~12 outils',
  },
  document: {
    label: 'Rédaction de documents',
    description: 'Génère et édite des livrables (docx, pptx, xlsx, html).',
    toolCount: '~6 outils',
  },
  code_exec: {
    label: 'Exécution de code',
    description: 'Exécute du code Python ou Node.js en sandbox isolée.',
    toolCount: '~2 outils',
  },
  web: {
    label: 'Web (recherche, fetch, download)',
    description: 'Recherche web (DuckDuckGo), fetch URL (texte/markdown/readability), téléchargement fichiers binaires (logos, CSS, fonts, PDF), recherche approfondie multi-étapes via subagent.',
    toolCount: '4 outils (web_search, web_fetch, web_download, research_deep)',
  },
};

// ── activate_capsule tool definition ──
const ACTIVATE_CAPSULE_DEFINITION = {
  name: 'activate_capsule',
  description: 'Active un groupe d\'outils spécialisés. Utilise quand tu as besoin d\'outils non disponibles dans ton set actuel (ex: créer un workflow, modifier un formulaire). Les capsules disponibles : workflow (builder), form (formulaire), node_args (configuration nœud).',
  parameters: {
    type: 'object',
    properties: {
      capsule: {
        type: 'string',
        enum: CAPSULE_NAMES,
        description: 'Nom de la capsule à activer',
      },
      reason: {
        type: 'string',
        description: 'Pourquoi cette capsule est nécessaire (pour le log)',
      },
    },
    required: ['capsule'],
  },
};

/**
 * Build the orchestrator tool set with capsule support.
 * Returns a MUTABLE tool set that supports dynamic capsule activation.
 *
 * @param {object} opts
 * @param {object} opts.context - AI context
 * @param {object} opts.metadata - Mode metadata
 * @param {function} opts.emit - Side event emitter
 * @param {Set<string>} opts.activeCapsules - Currently active capsule names (mutated on activation)
 * @param {string[]} [opts.blockedTools] - Blocked tool names
 * @param {Array} [opts.mcpTools] - MCP tools to include
 * @returns {object} Mutable tool set with activateCapsule() method
 */
function buildOrchestratorToolSet(opts) {
  const { context, metadata, emit = () => {}, activeCapsules, blockedTools = [], allowedTools = null, mcpTools = [] } = opts;
  const blocked = new Set(blockedTools);
  // Whitelist mode : si allowedTools est un array (même vide), seuls ces outils
  // sont exposés au LLM. Sert aux subagents très contraints (ex: memory_extractor
  // qui ne doit appeler que `suggest_memory_entries`).
  const allowList = Array.isArray(allowedTools) && allowedTools.length ? new Set(allowedTools) : null;
  // Overlay : allowList restreint encore plus que blocked.
  const isToolAllowed = (name) => {
    if (blocked.has(name)) return false;
    if (allowList && !allowList.has(name)) return false;
    return true;
  };

  // 1. Primitive meta-tools (always available sauf blocked / hors allowList).
  // Les outils `SUBAGENT_INTERNAL_TOOLS` ne sont exposés QUE si allowList les
  // contient explicitement (cas memory_extractor).
  const metaDefs = META_TOOL_DEFINITIONS.filter(t => {
    if (!ALL_PRIMITIVE_NAMES.has(t.name)) return false;
    if (SUBAGENT_INTERNAL_TOOLS.has(t.name)) {
      return !!(allowList && allowList.has(t.name));
    }
    return isToolAllowed(t.name);
  });
  const metaNames = new Set(metaDefs.map(t => t.name));

  // 2. activate_capsule tool (always available — sauf blocked / allowList)
  const capsuleDef = isToolAllowed('activate_capsule') ? ACTIVATE_CAPSULE_DEFINITION : null;

  // Mutable state for dynamic capsule management
  const executors = [];
  const seen = new Set();
  const definitions = [];

  // Helper: create a capsule executor
  function _createExecutor(name) {
    switch (name) {
      case 'workflow':   return createWorkflowExecutor(metadata || {}, emit);
      case 'form':       return createFormExecutor(metadata || {}, emit);
      case 'node_args':  return createNodeArgsExecutor(metadata || {}, emit);
      case 'project_fs': return createProjectFsExecutor(metadata || {}, emit);
      case 'document':   return createDocumentExecutor(metadata || {}, emit);
      case 'code_exec':  return createCodeExecExecutor(metadata || {}, emit);
      case 'web':        return createWebExecutor(metadata || {}, emit);
      default: return null;
    }
  }

  // Helper: add a capsule (creates executor, adds definitions)
  function _addCapsule(name) {
    const exec = _createExecutor(name);
    if (!exec) return [];
    executors.push(exec);
    const newDefs = [];
    if (exec.definitions) {
      for (const t of exec.definitions) {
        if (isToolAllowed(t.name) && !seen.has(t.name)) {
          seen.add(t.name);
          definitions.push(t);
          newDefs.push(t);
        }
      }
    }
    return newDefs;
  }

  // Initialize: meta tools + activate_capsule
  for (const t of metaDefs) {
    if (!seen.has(t.name)) { seen.add(t.name); definitions.push(t); }
  }
  if (capsuleDef && !seen.has(capsuleDef.name)) {
    seen.add(capsuleDef.name);
    definitions.push(capsuleDef);
  }

  // Load initial capsules (for builder modes)
  for (const name of activeCapsules) _addCapsule(name);

  // 3. MCP tools
  const mcpToolMap = new Map();
  if (mcpTools.length) {
    for (const t of mcpTools) {
      const prefixedName = `mcp_${t.serverPrefix}_${t.name}`;
      if (!isToolAllowed(prefixedName) || seen.has(prefixedName)) continue;
      seen.add(prefixedName);
      definitions.push({
        name: prefixedName,
        description: t.description || '',
        parameters: t.inputSchema || { type: 'object', properties: {} },
      });
      mcpToolMap.set(prefixedName, { serverId: t.serverId, originalName: t.name });
    }
  }

  return {
    definitions,
    executors,

    /**
     * Dynamically activate a capsule — adds tools to definitions array in place.
     * @param {string} name - Capsule name
     * @returns {{ activated: boolean, alreadyActive?: boolean, newTools?: string[], error?: string }}
     */
    activateCapsule(name) {
      if (activeCapsules.has(name)) return { activated: false, alreadyActive: true };
      if (!CAPSULE_NAMES.includes(name)) return { activated: false, error: `Capsule inconnue: "${name}"` };
      activeCapsules.add(name);
      const newDefs = _addCapsule(name);
      return { activated: true, newTools: newDefs.map(t => t.name) };
    },

    canHandle(name) {
      return seen.has(name);
    },

    async execute(name, input, callCtx) {
      if (blocked.has(name)) return { error: `Tool '${name}' is blocked for this agent.` };
      // Hors allowList (quand whitelist active) → refus. Seuls les outils
      // internes (suggest_memory_entries) sont strictement limités par allowList.
      if (allowList && !allowList.has(name) && SUBAGENT_INTERNAL_TOOLS.has(name)) {
        return { error: `Tool '${name}' est réservé aux subagents autorisés.` };
      }

      // activate_capsule — return marker for harness
      if (name === 'activate_capsule') {
        return { _capsuleRequest: true, capsule: input?.capsule, reason: input?.reason };
      }

      // Injecte toolId dans tous les events émis durant l'exécution pour permettre
      // au frontend de corréler `ui.preview.update` avec le bon tool call live.
      const toolId = callCtx?.toolId || null;
      const toolName = callCtx?.toolName || name;
      const scopedEmit = toolId ? (ev) => {
        try {
          if (ev && typeof ev === 'object' && ev.type === 'ui.preview.update') {
            emit(Object.assign({ toolId, toolName }, ev));
          } else {
            emit(ev);
          }
        } catch { /* non-fatal */ }
      } : emit;

      // Try capsule executors first
      const executor = executors.find(ex => ex?.canHandle(name));
      if (executor) {
        // Legacy: executors were built with the shared `emit`. To inject toolId on
        // ui.preview.update events emitted synchronously during this call, we
        // temporarily swap the emit on the closure via a side-band:
        // we pass the scoped emit via `executor._scopedEmit` if supported.
        if (typeof executor.executeWithCtx === 'function') {
          return executor.executeWithCtx(name, input, { emit: scopedEmit, toolId, toolName });
        }
        return executor.execute(name, input);
      }

      // MCP tools
      if (mcpToolMap.has(name)) {
        const { serverId, originalName } = mcpToolMap.get(name);
        const { mcpRegistry } = require('./mcp/mcp-registry');
        return mcpRegistry.callTool(serverId, originalName, input);
      }

      // Meta-tools (primitives) — inject emit so meta-tools can publish side events
      if (metaNames.has(name)) {
        const metaCtx = Object.assign({}, context, { _emit: scopedEmit, _toolId: toolId, _toolName: toolName });
        return executeMetaTool(name, input, metaCtx);
      }

      return { error: `Outil inconnu : '${name}'. Utilise search_tools pour trouver l'outil adapté.` };
    },

    async cleanup() {
      for (const exec of executors) {
        if (exec?.cleanup) {
          try { await exec.cleanup(); } catch (e) { console.error('[tool-groups] cleanup:', e?.message); }
        }
      }
    },
  };
}

/**
 * Get capsule info for prompt building.
 */
function getCapsuleInfo() {
  return { ...CAPSULE_INFO };
}

/**
 * Get all primitive tool names.
 */
function getPrimitiveToolNames() {
  return [...ALL_PRIMITIVE_NAMES];
}

module.exports = {
  buildOrchestratorToolSet,
  getCapsuleInfo,
  getPrimitiveToolNames,
  CAPSULE_NAMES,
  CAPSULE_INFO,
  PRIMITIVE_GROUPS,
  ALL_PRIMITIVE_NAMES,
};
