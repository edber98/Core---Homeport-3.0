# Intégration MCP externe

## Vue d'ensemble

MCP (Model Context Protocol) permet de connecter des serveurs d'outils externes au système IA Homeport. Les outils découverts sont automatiquement disponibles pour le LLM.

```
McpServer (DB)           McpClient              McpRegistry (singleton)
══════════════           ═════════              ═══════════════════════
{ transport,             connect()              connections Map<id, McpClient>
  command/url,           listTools()            getTools(workspaceId)
  toolPrefix }           callTool()             callTool(serverId, name, args)
                         disconnect()           connectServer(config)
```

---

## Transports

### Stdio (child process)

Le serveur MCP est lancé comme processus fils. Communication via stdin/stdout en JSON-RPC 2.0.

```javascript
// Configuration DB
{
  transport: 'stdio',
  command: 'node',                    // ou 'python', 'npx', etc.
  args: ['path/to/server.js'],
  env: { DATABASE_URL: '...' },       // Variables d'environnement
  toolPrefix: 'myserver',
}
```

```javascript
// mcp-client.js — connexion stdio
async _connectStdio() {
  this._process = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  this._process.stdout.on('data', (chunk) => {
    this._buffer += chunk.toString();
    this._processBuffer();  // Parse JSON-RPC responses
  });
}
```

### SSE (HTTP stateless)

Le serveur MCP est accessible via HTTP. Chaque appel est un POST indépendant.

```javascript
// Configuration DB
{
  transport: 'sse',
  url: 'https://mcp-server.example.com/rpc',
  headers: { 'Authorization': 'Bearer xxx' },
  toolPrefix: 'remote',
}
```

```javascript
// mcp-client.js — requête HTTP
async _sendHttp(message) {
  const res = await fetch(this._sseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...this._sseHeaders },
    body: JSON.stringify(message),  // JSON-RPC 2.0
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body.result;
}
```

---

## McpClient (`API/src/ai/mcp/mcp-client.js`)

### Lifecycle

```javascript
const client = new McpClient(serverConfig);

// 1. Connect (auto-initialize + discover tools)
await client.connect();
// → _connectStdio() ou _connectSse()
// → _initialize() → JSON-RPC "initialize" + "notifications/initialized"
// → _listToolsRpc() → JSON-RPC "tools/list" → cache this._tools

// 2. List tools (returns cached)
const tools = await client.listTools();
// → [{ name, description, inputSchema, serverPrefix }]

// 3. Call a tool
const result = await client.callTool('create_issue', { title: 'Bug' });
// → JSON-RPC "tools/call" { name, arguments }

// 4. Disconnect
await client.disconnect();
// → kill process (stdio) ou cleanup
```

### JSON-RPC 2.0

```javascript
// Request
{ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'xxx', arguments: {} } }

// Response
{ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: '...' }] } }

// Error
{ jsonrpc: '2.0', id: 1, error: { code: -1, message: 'Error description' } }
```

### Timeout

Chaque requête stdio a un timeout de 30s :

```javascript
const timeout = setTimeout(() => {
  this._pendingRequests.delete(message.id);
  reject(new Error('MCP request timeout'));
}, 30000);
```

---

## McpRegistry (`API/src/ai/mcp/mcp-registry.js`)

### Singleton

```javascript
const mcpRegistry = new McpRegistry();
module.exports = { mcpRegistry };
```

### API

```javascript
// Connecter un serveur (lazy, auto-reconnect)
await mcpRegistry.connectServer(serverConfig);

// Obtenir tous les outils d'un workspace
const tools = await mcpRegistry.getTools(workspaceId);
// → Charge les McpServer depuis la DB
// → Connecte chaque serveur (si pas déjà connecté)
// → Retourne tous les outils avec serverId

// Appeler un outil
const result = await mcpRegistry.callTool(serverId, toolName, args);

// Déconnecter un serveur
await mcpRegistry.disconnectServer(serverId);

// Déconnecter tous
await mcpRegistry.disconnectAll();

// Status
mcpRegistry.getStatus(serverId);
// → { connected: boolean, toolCount: number }
```

### Workspace-scoped

Les outils MCP sont isolés par workspace :

```javascript
async getTools(workspaceId) {
  const McpServer = require('../../db/models/mcp-server.model');
  const servers = await McpServer.find({ workspaceId, enabled: true }).lean();
  // Pour chaque serveur → connect + listTools
  // Retourne tous les outils agrégés avec serverId
}
```

---

## Intégration dans le harness

### Chargement au démarrage

```javascript
// agent-harness.js
let mcpTools = [];
try {
  if (metadata?.workspaceId) {
    const { mcpRegistry } = require('./mcp/mcp-registry');
    mcpTools = await mcpRegistry.getTools(metadata.workspaceId);
  }
} catch (e) {
  console.error('[harness] MCP tools load error:', e.message);
}
```

### Injection dans le toolset

```javascript
// tool-groups.js → buildOrchestratorToolSet()
const mcpToolMap = new Map();
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

### Routing des appels

```javascript
// tool-groups.js → execute()
if (mcpToolMap.has(name)) {
  const { serverId, originalName } = mcpToolMap.get(name);
  const { mcpRegistry } = require('./mcp/mcp-registry');
  return mcpRegistry.callTool(serverId, originalName, input);
}
```

---

## Tool naming

Format : `mcp_{toolPrefix}_{originalName}`

| Config | Tool original | Nom final |
|--------|--------------|-----------|
| `toolPrefix: "github"` | `create_issue` | `mcp_github_create_issue` |
| `toolPrefix: "jira"` | `search_tickets` | `mcp_jira_search_tickets` |
| `toolPrefix: "db"` | `query` | `mcp_db_query` |

Le `toolPrefix` doit être unique par workspace pour éviter les collisions.

---

## Modèle McpServer

```javascript
{
  workspaceId: ObjectId,
  name: String,                // Nom affiché
  transport: 'stdio' | 'sse',
  // Stdio
  command: String,             // ex: 'node', 'python'
  args: [String],              // ex: ['server.js', '--port', '3001']
  env: Object,                 // Variables d'environnement
  // SSE
  url: String,                 // ex: 'https://mcp.example.com/rpc'
  headers: Object,             // Headers HTTP
  // Commun
  toolPrefix: String,          // Préfixe pour le nommage des outils
  enabled: Boolean,
}
```

---

## Checklist : connecter un nouveau serveur MCP

### 1. Créer le serveur MCP (externe)

Le serveur doit implémenter le protocole MCP :
- `initialize` → retourner capabilities
- `tools/list` → retourner la liste des outils
- `tools/call` → exécuter un outil

### 2. Ajouter en DB

```javascript
await McpServer.create({
  workspaceId: '...',
  name: 'Mon serveur MCP',
  transport: 'stdio',           // ou 'sse'
  command: 'npx',               // stdio
  args: ['-y', '@my/mcp-server'],
  toolPrefix: 'myserver',
  enabled: true,
});
```

### 3. Vérifier

```javascript
const { mcpRegistry } = require('./mcp/mcp-registry');
const tools = await mcpRegistry.getTools(workspaceId);
console.log(tools.filter(t => t.serverPrefix === 'myserver'));
```

### 4. Tester

Envoyer un message en mode chat. Le LLM devrait pouvoir utiliser les outils `mcp_myserver_*`.

### Points d'attention

- Le process stdio est lancé au premier `connect()` et reste actif
- Les erreurs de connexion sont logged mais ne bloquent pas les autres outils
- Les outils MCP bloqués via `blockedTools` sont préfixés : `['mcp_github_delete_repo']`
- Le registry est singleton — un seul process par serveur même avec plusieurs requêtes parallèles
