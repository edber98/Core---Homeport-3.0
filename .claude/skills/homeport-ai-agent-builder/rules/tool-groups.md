# Tool Groups Registry (tool-groups.js)

## Fichier : `API/src/ai/tool-groups.js`

Le registry organise les outils en **groupes primitifs** (toujours disponibles) et **capsules** (activées à la demande).

## Groupes primitifs

Toujours disponibles dans l'orchestrateur (~18 outils) :

```javascript
const PRIMITIVE_GROUPS = {
  core:            ['ask_user', 'save_memory', 'get_memory', 'enrich_context'],
  navigation:      ['open_element', 'open_credentials'],
  execution:       ['search_tools', 'get_tool_details', 'execute_tool', 'list_providers'],
  workflow_search:  ['search_workflows', 'run_workflow'],
  project_memory:  ['save_project_memory', 'get_project_memory'],
  thread:          ['compact_and_transfer'],
  manual:          ['search_manual', 'get_manual_section'],
};
```

Plus `activate_capsule` (ajouté automatiquement).

## Capsules

Packs d'outils activés dynamiquement :

```javascript
const CAPSULE_NAMES = ['workflow', 'form', 'node_args'];

const CAPSULE_INFO = {
  workflow: {
    label: 'Workflow builder',
    description: 'Outils de construction de workflow : créer, ajouter des nœuds, connecter...',
    toolCount: '~28 outils',
  },
  form: {
    label: 'Formulaire builder',
    description: 'Outils de construction de formulaire : créer, ajouter des champs/sections...',
    toolCount: '~14 outils',
  },
  node_args: {
    label: 'Configuration nœud',
    description: 'Outils de configuration d\'un nœud : schéma, prédécesseurs, scénarios...',
    toolCount: '~9 outils',
  },
};
```

## buildOrchestratorToolSet() — API complète

```javascript
function buildOrchestratorToolSet(opts) {
  // opts = { context, metadata, emit, activeCapsules, blockedTools, mcpTools }

  // Retourne un objet mutable :
  return {
    definitions,           // Array<ToolDef> — MUTABLE, capsules ajoutent in-place
    executors,             // Array<Executor> — capsule executors créés

    activateCapsule(name), // Ajoute une capsule dynamiquement
    canHandle(name),       // Vérifie si un outil est dans le seen Set
    execute(name, input),  // Route et exécute un outil
    cleanup(),             // Appelle cleanup() sur chaque executor
  };
}
```

### Ordre de routing dans execute()

```
1. activate_capsule → return { _capsuleRequest: true, capsule, reason }
2. Capsule executors → executors.find(ex => ex.canHandle(name))
3. MCP tools → mcpToolMap.has(name) → mcpRegistry.callTool()
4. Meta-tools → metaNames.has(name) → executeMetaTool()
5. Aucun match → { error: "Outil inconnu" }
```

### Blocked tools

Les outils bloqués sont filtrés via un Set :

```javascript
const blocked = new Set(blockedTools); // ex: ['create_flow', 'save_flow']

// Filtrage des meta-tools
const metaDefs = META_TOOL_DEFINITIONS.filter(t => !blocked.has(t.name));

// Filtrage des capsule tools
if (!blocked.has(t.name) && !seen.has(t.name)) { ... }

// Filtrage MCP
if (blocked.has(prefixedName) || seen.has(prefixedName)) continue;

// Rejet à l'exécution
if (blocked.has(name)) return { error: `Tool '${name}' is blocked.` };
```

## activateCapsule() — mutation in-place

```javascript
activateCapsule(name) {
  if (activeCapsules.has(name)) return { activated: false, alreadyActive: true };
  if (!CAPSULE_NAMES.includes(name)) return { activated: false, error: 'Capsule inconnue' };

  activeCapsules.add(name);           // Mute le Set
  const newDefs = _addCapsule(name);  // Crée executor + ajoute au definitions[]
  return { activated: true, newTools: newDefs.map(t => t.name) };
}
```

### _addCapsule() et _createExecutor()

```javascript
function _createExecutor(name) {
  switch (name) {
    case 'workflow': return createWorkflowExecutor(metadata, emit);
    case 'form':     return createFormExecutor(metadata, emit);
    case 'node_args': return createNodeArgsExecutor(metadata, emit);
    default: return null;
  }
}

function _addCapsule(name) {
  const exec = _createExecutor(name);
  if (!exec) return [];
  executors.push(exec);                 // Ajoute au array d'executors
  const newDefs = [];
  for (const t of exec.definitions) {
    if (!blocked.has(t.name) && !seen.has(t.name)) {
      seen.add(t.name);
      definitions.push(t);              // MUTATION IN-PLACE du definitions[]
      newDefs.push(t);
    }
  }
  return newDefs;
}
```

## MCP tools

Les outils MCP sont préfixés et ajoutés aux definitions :

```javascript
for (const t of mcpTools) {
  const prefixedName = `mcp_${t.serverPrefix}_${t.name}`;
  if (blocked.has(prefixedName) || seen.has(prefixedName)) continue;

  definitions.push({
    name: prefixedName,
    description: t.description || '',
    parameters: t.inputSchema || { type: 'object', properties: {} },
  });
  mcpToolMap.set(prefixedName, { serverId: t.serverId, originalName: t.name });
}
```

## Capsule executor interface

Chaque capsule retourne un objet executor :

```javascript
// Interface commune (workflow, form, node_args)
{
  definitions: ToolDef[],           // Tableau des définitions d'outils
  canHandle(name): boolean,         // Le tool est-il dans cet executor ?
  execute(name, input): Promise,    // Exécuter le tool
  cleanup?(): Promise,              // Auto-save (form, workflow)
  // + méthodes spécifiques au mode
}
```

## Ajouter un nouveau groupe primitif

```javascript
// 1. Dans PRIMITIVE_GROUPS (tool-groups.js)
const PRIMITIVE_GROUPS = {
  // ... existants ...
  mon_groupe: ['mon_tool_1', 'mon_tool_2'],
};

// 2. Les outils doivent exister dans META_TOOL_DEFINITIONS (meta-tools.js)
// 3. Les handlers doivent exister dans executeMetaTool() (meta-tools.js)
```
