# Checklist : ajouter un nouvel outil

Il existe 3 types d'outils dans le système IA Homeport.

---

## Type 1 : Meta-tool (primitif, toujours visible)

Les meta-tools sont les ~18 outils toujours disponibles (search, execute, memory, manual, navigation).

### Checklist

1. **Définition** dans `META_TOOL_DEFINITIONS` (`API/src/ai/tools/meta-tools.js`) :
```javascript
{
  name: 'mon_outil',
  description: 'Description en français pour le LLM.',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Description du param' },
      param2: { type: 'number', description: 'Description du param' },
    },
    required: ['param1'],
  },
},
```

2. **Handler** dans `executeMetaTool()` switch (`API/src/ai/tools/meta-tools.js`) :
```javascript
case 'mon_outil': {
  const { param1, param2 } = input;
  // ... logique ...
  return { success: true, data: result };
}
```

3. **Ajouter au groupe** dans `PRIMITIVE_GROUPS` (`API/src/ai/tool-groups.js`) :
```javascript
const PRIMITIVE_GROUPS = {
  // Dans un groupe existant :
  core: ['ask_user', 'save_memory', 'get_memory', 'enrich_context', 'mon_outil'],
  // OU créer un nouveau groupe :
  mon_groupe: ['mon_outil'],
};
```

4. **Tester** : Envoyer un message en mode chat et vérifier que le LLM peut utiliser l'outil.

### Règles pour les meta-tools

- Le handler reçoit `(name, input, context)` — le context contient company, workspace, user, metadata
- Retourner toujours un objet : `{ success: true, data }` ou `{ success: false, error: 'message' }`
- Pas d'accès au `emit` (side events) — seuls les capsule tools peuvent émettre des patches
- Le nom doit être snake_case et unique (pas de collision avec capsule tools ou MCP tools)
- La description doit être en français et concise (le LLM la lit pour décider quand utiliser l'outil)

---

## Type 2 : Capsule tool (visible après activation)

Les capsule tools sont spécifiques à un mode (workflow, form, node_args) et ne sont disponibles qu'après activation de la capsule.

### Checklist

1. **Définition** dans le tableau de definitions du fichier capsule :
```javascript
// Ex: API/src/ai/tools/workflow-tools.js
const WORKFLOW_TOOL_DEFINITIONS = [
  // ... outils existants ...
  {
    name: 'mon_outil_workflow',
    description: 'Description pour le LLM.',
    parameters: {
      type: 'object',
      properties: { /* ... */ },
      required: ['param1'],
    },
  },
];
```

2. **Handler** dans l'objet `tools` du executor :
```javascript
function createWorkflowExecutor(metadata, emit) {
  // ... état interne (graph, etc.) ...

  const tools = {
    // ... outils existants ...

    async mon_outil_workflow(input) {
      const g = await ensureGraph();
      // ... logique avec graph mutable ...
      emit({ type: 'patch', nodes: g.nodes, edges: g.edges }); // Side event
      return { success: true, data: result };
    },
  };

  return {
    definitions: WORKFLOW_TOOL_DEFINITIONS,
    canHandle(name) { return name in tools; },
    async execute(name, input) {
      if (!(name in tools)) throw new Error(`Unknown tool: ${name}`);
      return tools[name](input || {});
    },
    // ... cleanup, etc.
  };
}
```

3. **Le tool est auto-inclus** via le definitions array du executor — pas besoin de l'ajouter dans tool-groups.js

4. **Tester** :
   - En mode builder (workflow/form/node_args) → l'outil est directement disponible
   - En mode chat → vérifier que `activate_capsule("workflow")` rend l'outil accessible

### Règles pour les capsule tools

- Le handler reçoit `(input)` uniquement — accès au metadata et emit via closure
- Peut émettre des side events via `emit({ type, ... })` pour les patches temps réel
- L'état est mutable et in-memory (graph pour workflow, schema pour form)
- Le nom doit être unique et ne pas collisionner avec les meta-tools
- Implémenter `cleanup()` si l'état doit être auto-sauvegardé en fin de session

---

## Type 3 : MCP tool (externe)

Les outils MCP sont découverts automatiquement depuis les serveurs MCP connectés.

### Checklist

1. **Configurer le serveur MCP** dans la DB (model McpServer) :
```javascript
{
  workspaceId: '...',
  name: 'Mon serveur',
  transport: 'stdio',    // ou 'sse'
  command: 'node',       // stdio uniquement
  args: ['server.js'],   // stdio uniquement
  env: { KEY: 'val' },   // stdio uniquement
  url: 'https://...',    // sse uniquement
  headers: { ... },      // sse uniquement
  toolPrefix: 'myserver',
  enabled: true,
}
```

2. Le tool est **auto-découvert** via `listTools()` lors du connect

3. Nommé automatiquement `mcp_{toolPrefix}_{originalName}` :
   - Serveur avec `toolPrefix: "github"` + tool `create_issue`
   - → Nom final : `mcp_github_create_issue`

4. **Aucun code à modifier** — le routing passe par `mcpToolMap` dans tool-groups.js

### Règles pour les MCP tools

- Le serveur doit implémenter le protocole MCP (JSON-RPC 2.0)
- Le `toolPrefix` doit être unique par workspace
- Les outils sont workspace-scoped (via `McpServer.find({ workspaceId, enabled: true })`)
- Le timeout par requête est de 30s (configurable dans mcp-client.js)

---

## Conventions communes

### Format de retour

Tous les handlers doivent retourner un objet JSON sérialisable :

```javascript
// Succès
return { success: true, data: result, count: 5 };

// Erreur
return { success: false, error: 'Message d\'erreur descriptif en français' };

// Avec action frontend
return { _action: true, action: 'open_credentials', providerKey: 'slack' };
```

### Side events (capsule tools uniquement)

```javascript
emit({ type: 'patch', nodes: g.nodes, edges: g.edges });
emit({ type: 'snapshot', graph: g });
emit({ type: 'args', nodeId, args: { key: 'value' } });
emit({ type: 'desc', nodeId, text: 'Description' });
emit({ type: 'form.update', schema });
```

### Nommage

- snake_case pour tous les noms d'outils
- Préfixer par le domaine si nécessaire : `search_workflows`, `save_project_memory`
- Description en français, concise, orientée action
- Paramètres en anglais (camelCase dans les properties)
