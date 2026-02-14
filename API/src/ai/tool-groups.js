// Tool Groups Registry — orchestrator + capsule architecture
// Pattern: ~18 primitive tools always visible + capsules activated on demand
//
// Primitive tools = meta-tools (search, execute, ask, memory, navigation, manual)
// Capsules = mode-specific tool packs (workflow, form, node_args) injected when needed

const { META_TOOL_DEFINITIONS, executeMetaTool } = require('./tools/meta-tools');
const { createWorkflowExecutor } = require('./tools/workflow-tools');
const { createNodeArgsExecutor } = require('./tools/node-args-tools');
const { createFormExecutor } = require('./tools/form-tools');

// ── Primitive groups (always available in orchestrator) ──
const PRIMITIVE_GROUPS = {
  core:            ['ask_user', 'save_memory', 'get_memory', 'enrich_context'],
  navigation:      ['open_element', 'open_credentials'],
  execution:       ['search_tools', 'get_tool_details', 'execute_tool', 'list_providers'],
  workflow_search:  ['search_workflows', 'run_workflow'],
  project_memory:  ['save_project_memory', 'get_project_memory'],
  thread:          ['compact_and_transfer'],
  manual:          ['search_manual', 'get_manual_section'],
};

// All primitive tool names (flat)
const ALL_PRIMITIVE_NAMES = new Set(Object.values(PRIMITIVE_GROUPS).flat());

// ── Capsules (activated on demand) ──
const CAPSULE_NAMES = ['workflow', 'form', 'node_args'];

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
  const { context, metadata, emit = () => {}, activeCapsules, blockedTools = [], mcpTools = [] } = opts;
  const blocked = new Set(blockedTools);

  // 1. Primitive meta-tools (always available)
  const metaDefs = META_TOOL_DEFINITIONS.filter(t => ALL_PRIMITIVE_NAMES.has(t.name) && !blocked.has(t.name));
  const metaNames = new Set(metaDefs.map(t => t.name));

  // 2. activate_capsule tool (always available)
  const capsuleDef = blocked.has('activate_capsule') ? null : ACTIVATE_CAPSULE_DEFINITION;

  // Mutable state for dynamic capsule management
  const executors = [];
  const seen = new Set();
  const definitions = [];

  // Helper: create a capsule executor
  function _createExecutor(name) {
    switch (name) {
      case 'workflow': return createWorkflowExecutor(metadata || {}, emit);
      case 'form': return createFormExecutor(metadata || {}, emit);
      case 'node_args': return createNodeArgsExecutor(metadata || {}, emit);
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
        if (!blocked.has(t.name) && !seen.has(t.name)) {
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
      if (blocked.has(prefixedName) || seen.has(prefixedName)) continue;
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

    async execute(name, input) {
      if (blocked.has(name)) return { error: `Tool '${name}' is blocked for this agent.` };

      // activate_capsule — return marker for harness
      if (name === 'activate_capsule') {
        return { _capsuleRequest: true, capsule: input?.capsule, reason: input?.reason };
      }

      // Try capsule executors first
      const executor = executors.find(ex => ex?.canHandle(name));
      if (executor) return executor.execute(name, input);

      // MCP tools
      if (mcpToolMap.has(name)) {
        const { serverId, originalName } = mcpToolMap.get(name);
        const { mcpRegistry } = require('./mcp/mcp-registry');
        return mcpRegistry.callTool(serverId, originalName, input);
      }

      // Meta-tools (primitives)
      if (metaNames.has(name)) return executeMetaTool(name, input, context);

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
