# Architecture de chargement dynamique de tools pour agents IA

> Documentation du pattern "Orchestrator + Capsules" implémenté dans Homeport,
> conçu pour être reproduit dans n'importe quelle application utilisant un LLM avec tool calling.

---

## Le problème

Quand on donne trop de tools à un LLM en une seule requête :

1. **Latence** : le modèle analyse toutes les définitions avant de répondre (+2-5s par 50 tools)
2. **Confusion** : avec 80+ tools, le LLM fait des erreurs de sélection ou hallucine des paramètres
3. **Tokens** : chaque tool = ~200-500 tokens de contexte consommés inutilement
4. **Coût** : les tokens de tools comptent dans l'input (facturé)

### Chiffres réels (Homeport — système capsules)

| Métrique | Valeur |
|----------|--------|
| Tools au démarrage (chat) | 18 primitives + `activate_capsule` |
| Tools max après activation | ~46 (18 + 28 capsule workflow) |
| Temps 1er token | ~1-2s |
| Précision tool call | ~95% |

---

## L'architecture en 3 couches

```
┌─────────────────────────────────────────────────┐
│                    LLM (Claude/GPT)             │
│                                                 │
│  Voit : 18 primitives + activate_capsule        │
│  Après activation : +28 tools workflow OU       │
│                     +14 tools form OU            │
│                     +9 tools node_args           │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│           ORCHESTRATOR (agent-harness)           │
│                                                 │
│  • Boucle LLM avec tool_use                     │
│  • Gère activate_capsule → inject tools         │
│  • Route tool calls vers le bon executor        │
│  • Mutable tool set (ajout en cours de conv.)   │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│              TOOL GROUPS (registre)              │
│                                                 │
│  PRIMITIVES (toujours chargés)                  │
│  ├── core: ask_user, save_memory, get_memory    │
│  ├── navigation: open_element, open_credentials │
│  ├── execution: search_tools, execute_tool      │
│  ├── workflow_search: run_workflow, deploy...    │
│  └── manual: search_manual, get_manual_section  │
│                                                 │
│  CAPSULES (chargés à la demande)                │
│  ├── workflow: 28 tools (create, add_node...)   │
│  ├── form: 14 tools (add_field, set_schema...)  │
│  └── node_args: 9 tools (set_node_args...)      │
│                                                 │
│  MCP (externes, chargés au démarrage)           │
│  └── mcp_{server}_{tool}: tools MCP préfixés    │
└─────────────────────────────────────────────────┘
```

---

## Implémentation pas à pas

### Étape 1 : Définir les primitives (tools toujours disponibles)

Ce sont les tools légers, utiles dans tous les contextes. Maximum **15-20 tools**.

```javascript
// tool-groups.js

const PRIMITIVE_GROUPS = {
  // Interaction utilisateur
  core: ['ask_user', 'save_memory', 'get_memory'],

  // Découverte & exécution d'actions
  execution: ['search_functions', 'get_function_details', 'execute_function'],

  // Navigation / UI
  navigation: ['open_page', 'open_settings'],

  // Recherche documentaire
  manual: ['search_manual', 'get_manual_section'],
};

const ALL_PRIMITIVE_NAMES = new Set(
  Object.values(PRIMITIVE_GROUPS).flat()
);
```

**Principe clé** : les primitives incluent un outil de **découverte** (`search_functions`) qui permet au LLM de trouver des fonctions sans les avoir toutes en mémoire.

---

### Étape 2 : Définir les capsules (packs de tools spécialisés)

Chaque capsule = un groupe de tools chargé ensemble quand le LLM en a besoin.

```javascript
const CAPSULE_INFO = {
  crm: {
    label: 'CRM',
    description: 'Outils de gestion clients : créer contacts, opportunités, devis',
    toolCount: '~15 outils',
  },
  comptabilite: {
    label: 'Comptabilité',
    description: 'Facturation, paiements, rapports financiers',
    toolCount: '~12 outils',
  },
  projet: {
    label: 'Gestion de projet',
    description: 'Tâches, sprints, suivi de temps, kanban',
    toolCount: '~10 outils',
  },
};

const CAPSULE_NAMES = Object.keys(CAPSULE_INFO);
```

---

### Étape 3 : Créer le tool `activate_capsule`

C'est le mécanisme central — un meta-tool que le LLM appelle pour charger un pack.

```javascript
const ACTIVATE_CAPSULE_DEFINITION = {
  name: 'activate_capsule',
  description: `Active un groupe d'outils spécialisés. Utilise quand tu as besoin d'outils
    non disponibles dans ton set actuel. Capsules disponibles :
    ${Object.entries(CAPSULE_INFO)
      .map(([k, v]) => `${k} (${v.description})`)
      .join(', ')
    }.`,
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
        description: 'Pourquoi cette capsule est nécessaire',
      },
    },
    required: ['capsule'],
  },
};
```

---

### Étape 4 : Le tool set mutable

L'orchestrateur maintient un set de tools **mutable** — on peut ajouter des tools en cours de conversation.

```javascript
function buildOrchestratorToolSet({ context, activeCapsules, blockedTools = [] }) {
  const blocked = new Set(blockedTools);
  const seen = new Set();
  const definitions = [];  // ← MUTABLE : on y ajoute des tools dynamiquement
  const executors = [];

  // 1. Charger les primitives
  for (const toolDef of PRIMITIVE_TOOL_DEFINITIONS) {
    if (!blocked.has(toolDef.name)) {
      seen.add(toolDef.name);
      definitions.push(toolDef);
    }
  }

  // 2. Ajouter activate_capsule
  if (!blocked.has('activate_capsule')) {
    seen.add('activate_capsule');
    definitions.push(ACTIVATE_CAPSULE_DEFINITION);
  }

  // 3. Charger les capsules déjà actives (pour les modes builder)
  for (const name of activeCapsules) {
    _addCapsule(name);
  }

  // Helper : ajouter une capsule
  function _addCapsule(name) {
    const executor = createCapsuleExecutor(name);
    if (!executor) return [];
    executors.push(executor);
    const newDefs = [];
    for (const t of executor.definitions) {
      if (!blocked.has(t.name) && !seen.has(t.name)) {
        seen.add(t.name);
        definitions.push(t);  // ← MUTATION : ajout au tableau existant
        newDefs.push(t);
      }
    }
    return newDefs;
  }

  return {
    definitions,   // ← Ce tableau est passé au LLM à chaque itération
    executors,

    // Activation dynamique — appelée quand le LLM utilise activate_capsule
    activateCapsule(name) {
      if (activeCapsules.has(name)) {
        return { activated: false, alreadyActive: true };
      }
      if (!CAPSULE_NAMES.includes(name)) {
        return { activated: false, error: `Capsule inconnue: "${name}"` };
      }
      activeCapsules.add(name);
      const newDefs = _addCapsule(name);
      return { activated: true, newTools: newDefs.map(t => t.name) };
    },

    // Routing : trouver quel executor gère quel tool
    canHandle(name) { return seen.has(name); },

    async execute(name, input) {
      // 1. activate_capsule → retourne un marqueur spécial
      if (name === 'activate_capsule') {
        return { _capsuleRequest: true, capsule: input.capsule };
      }
      // 2. Chercher dans les executors de capsules
      const executor = executors.find(ex => ex.canHandle(name));
      if (executor) return executor.execute(name, input);
      // 3. Chercher dans les primitives
      return executePrimitiveTool(name, input, context);
    },
  };
}
```

**Point crucial** : le tableau `definitions` est passé **par référence** au LLM stream. Quand on fait `definitions.push(newTool)`, l'itération suivante de la boucle LLM verra automatiquement les nouveaux tools.

---

### Étape 5 : La boucle orchestrateur (harness)

```javascript
async function* runHarness({ mode, messages, context }) {
  // Déterminer les capsules initiales selon le mode
  const activeCapsules = new Set();
  // En mode spécialisé, pré-charger la capsule pertinente
  if (mode === 'crm') activeCapsules.add('crm');
  if (mode === 'comptabilite') activeCapsules.add('comptabilite');
  // En mode "chat" général → AUCUNE capsule → le LLM activera à la demande

  // Construire le tool set mutable
  const toolSet = buildOrchestratorToolSet({ context, activeCapsules });

  // Construire le system prompt
  let systemPrompt = buildSystemPrompt(context);
  if (mode === 'chat') {
    systemPrompt += buildCapsuleInstructions(activeCapsules);
  }

  // Créer le client LLM
  const llm = createLlmClient(context.llmConfig);

  // Conversation
  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  // Boucle agent
  let loopCount = 0;
  while (loopCount < 40) {
    loopCount++;

    // ⭐ Le LLM reçoit toolSet.definitions à CHAQUE itération
    // → Si une capsule a été activée au tour précédent, les nouveaux tools sont visibles
    const stream = llm.stream(conversation, toolSet.definitions);

    const pendingToolCalls = [];
    let assistantText = '';

    // Collecter la réponse
    for await (const event of stream) {
      if (event.type === 'text_delta') {
        assistantText += event.text;
        yield { type: 'message', text: event.text };
      }
      if (event.type === 'tool_use_end') {
        pendingToolCalls.push(event);
      }
    }

    // Pas de tool calls → terminé
    if (pendingToolCalls.length === 0) {
      yield { type: 'done' };
      return;
    }

    // Exécuter les tools
    const toolResults = [];
    for (const tc of pendingToolCalls) {
      const result = await toolSet.execute(tc.name, tc.input);

      // ⭐ Gérer l'activation de capsule
      if (result?._capsuleRequest) {
        const activation = toolSet.activateCapsule(result.capsule);
        const response = activation.activated
          ? {
              ok: true,
              message: `Capsule "${result.capsule}" activée. Utilise les outils directement.`,
              newTools: activation.newTools,
            }
          : { ok: true, message: `Capsule "${result.capsule}" déjà active.` };

        toolResults.push({
          id: tc.id,
          content: JSON.stringify(response),
        });
        continue;
      }

      // Résultat normal
      toolResults.push({
        id: tc.id,
        content: JSON.stringify(result),
      });
    }

    // Ajouter à la conversation et continuer la boucle
    conversation.push({
      role: 'assistant',
      content: assistantText || null,
      tool_calls: pendingToolCalls.map(tc => ({
        id: tc.id, name: tc.name, input: tc.input,
      })),
    });
    for (const tr of toolResults) {
      conversation.push({ role: 'tool', tool_call_id: tr.id, content: tr.content });
    }
    // → Retour en haut de la boucle : le LLM revoit toolSet.definitions
    //   (maintenant enrichi des tools de la capsule activée)
  }
}
```

---

### Étape 6 : Le prompt système pour les capsules

En mode chat (pas de capsule pré-chargée), on ajoute au system prompt :

```javascript
function buildCapsuleInstructions(activeCapsules) {
  const info = getCapsuleInfo();
  const lines = Object.entries(info).map(([name, i]) => {
    const active = activeCapsules.has(name) ? ' (ACTIVE)' : '';
    return `- **${name}** : ${i.description} (${i.toolCount})${active}`;
  });

  return `
## Capsules d'outils

Tu disposes d'un set de base (~18 outils) toujours disponibles.
Pour des tâches spécialisées, active une capsule avec \`activate_capsule\`.

### Capsules disponibles
${lines.join('\n')}

### Règles
- PAS de capsule pour : questions simples, mémoire, recherches
- Active DÈS que nécessaire, ne demande pas la permission
- Après activation, les outils deviennent des TOOL CALLS DIRECTS
`;
}
```

---

## Pattern de découverte (search_tools / execute_tool)

En parallèle des capsules, le système offre un pattern **discovery + execute** pour les fonctions métier (équivalent à un MCP dynamique) :

```
┌──────────────────────────────────────────────────────────┐
│                     FLUX DISCOVERY                        │
│                                                          │
│  1. LLM appelle search_tools("envoyer email")           │
│     → Retourne : [{key: "smtp_send_email", title:...}]  │
│                                                          │
│  2. LLM appelle get_tool_details("smtp_send_email")     │
│     → Retourne : {args: [{key:"to"}, {key:"subject"}]}  │
│                                                          │
│  3. LLM appelle execute_tool({                           │
│       key: "smtp_send_email",                            │
│       args: {to: "...", subject: "..."}                  │
│     })                                                   │
│     → Exécute la fonction et retourne le résultat        │
└──────────────────────────────────────────────────────────┘
```

Ce pattern permet d'avoir **500+ fonctions** sans jamais les charger comme tools LLM. Le LLM utilise 3 meta-tools pour découvrir et exécuter n'importe quelle fonction.

### Implémentation du Tool Index (recherche in-memory)

```javascript
class ToolIndex {
  constructor() {
    this._tools = [];      // Toutes les fonctions indexées
    this._byKey = new Map();
    this._byCategory = new Map();
  }

  // Charger depuis la base de données au démarrage
  async rebuild() {
    const tools = await FunctionModel.find({ enabled: true }).lean();
    this._tools = tools.map(t => ({
      key: t.key,
      name: t.name,
      title: t.title,
      description: t.description,
      category: t.category,
      tags: t.tags || [],
      // Pré-normaliser pour la recherche
      _name: t.name.toLowerCase(),
      _desc: (t.description || '').toLowerCase(),
      _tags: (t.tags || []).map(x => x.toLowerCase()),
    }));
    // Construire les index
    for (const t of this._tools) {
      this._byKey.set(t.key, t);
      const cat = t.category || 'other';
      if (!this._byCategory.has(cat)) this._byCategory.set(cat, []);
      this._byCategory.get(cat).push(t);
    }
  }

  // Recherche full-text simple
  search(query, { category, limit = 20 } = {}) {
    const tokens = query.toLowerCase().split(/\s+/);
    let pool = category
      ? (this._byCategory.get(category) || [])
      : this._tools;

    const scored = pool.map(t => {
      let score = 0;
      for (const tok of tokens) {
        if (t._name.includes(tok)) score += 3;
        if (t.key.toLowerCase().includes(tok)) score += 2;
        if (t._desc.includes(tok)) score += 1;
        if (t._tags.some(tag => tag.includes(tok))) score += 1;
      }
      return { tool: t, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({
        key: s.tool.key,
        title: s.tool.title,
        category: s.tool.category,
        description: s.tool.description?.slice(0, 100),
      }));
  }
}
```

---

## Les deux mécanismes combinés

### Capsules = tools directs pour les modes builder

```
Tour 1 : LLM reçoit [18 primitives + activate_capsule]
          LLM : "J'ai besoin de créer un workflow" → activate_capsule("workflow")

Tour 2 : LLM reçoit [18 primitives + activate_capsule + 28 workflow tools]
          LLM : create_flow({name: "..."}) → direct tool call (pas de search)
```

### Discovery = accès illimité sans charger les tools

```
Tour 1 : LLM appelle search_tools("envoyer email")
          → Résultat : [{key: "smtp_send_email", title: "Envoyer un email"}]

Tour 2 : LLM appelle get_tool_details("smtp_send_email")
          → Résultat : {args: [{key:"to"}, {key:"subject"}, {key:"body"}]}

Tour 3 : LLM appelle execute_tool({key: "smtp_send_email", args: {...}})
          → Exécute la fonction, retourne le résultat
```

### Résultat : architecture hybride

```
Capsules pour les outils de construction (workflow, form, node_args)
+ Discovery pour les fonctions métier (500+ templates Odoo, Slack, etc.)
= Maximum 46 tools LLM + accès illimité aux fonctions
```

---

## Guide d'adaptation pour un autre logiciel

### 1. Identifier tes catégories de fonctions

Fais l'inventaire de toutes les fonctions que ton agent doit pouvoir appeler :

```
Exemple pour un ERP :
├── Ventes (20 fonctions) → capsule "ventes"
├── Achats (15 fonctions) → capsule "achats"
├── Stock (12 fonctions) → capsule "stock"
├── Comptabilité (18 fonctions) → capsule "compta"
├── RH (10 fonctions) → capsule "rh"
└── Administration (5 fonctions) → primitive (toujours dispo)
```

### 2. Définir les primitives

Règle : **maximum 15-20 tools** toujours disponibles.

Inclure obligatoirement :
- `search_functions` — découvrir les fonctions disponibles
- `get_function_details` — obtenir le schéma d'une fonction
- `execute_function` — exécuter une fonction par sa clé
- `activate_capsule` — charger un pack de tools
- `ask_user` — poser une question à l'utilisateur
- Des tools de contexte (mémoire, navigation, etc.)

### 3. Créer les capsules

Chaque capsule = un fichier avec :
- Les définitions de tools (JSON Schema)
- Les handlers d'exécution
- Un `canHandle(name)` pour le routing

```javascript
// capsules/ventes.js
function createVentesExecutor() {
  const definitions = [
    {
      name: 'creer_devis',
      description: 'Créer un nouveau devis pour un client',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          lignes: { type: 'array', items: { ... } },
        },
        required: ['clientId', 'lignes'],
      },
    },
    // ... 19 autres tools
  ];

  const handlers = {
    creer_devis: async (input) => {
      // Appeler ton API/service
      return await ventesService.creerDevis(input);
    },
  };

  return {
    definitions,
    canHandle: (name) => name in handlers,
    execute: (name, input) => handlers[name](input),
  };
}
```

### 4. Brancher l'orchestrateur

```javascript
// Le flux complet
async function handleMessage(userMessage, conversationHistory) {
  const toolSet = buildOrchestratorToolSet({
    context: await buildContext(userId),
    activeCapsules: new Set(), // Rien au départ
  });

  const generator = runHarness({
    mode: 'chat',
    messages: [...conversationHistory, { role: 'user', content: userMessage }],
    context,
  });

  for await (const event of generator) {
    switch (event.type) {
      case 'message':
        // Streamer le texte vers le client (SSE, WebSocket, etc.)
        sendToClient({ type: 'text', content: event.text });
        break;
      case 'tool.start':
        sendToClient({ type: 'tool_start', name: event.name });
        break;
      case 'tool.end':
        sendToClient({ type: 'tool_end', name: event.name, result: event.result });
        break;
      case 'done':
        sendToClient({ type: 'done', usage: event.usage });
        break;
    }
  }
}
```

---

## Bonnes pratiques

### DO

- **18 primitives max** — au-delà, le LLM perd en précision
- **Capsules de 8-30 tools** — assez petit pour rester efficace
- **Descriptions claires dans `activate_capsule`** — le LLM doit comprendre quand l'utiliser
- **Pré-charger en mode spécialisé** — si l'utilisateur est dans la page "Ventes", charger la capsule ventes directement
- **Discovery pour les fonctions granulaires** — `search → details → execute` pour 100+ fonctions
- **Dédupliquer** — un tool ne doit jamais apparaître dans 2 capsules

### DON'T

- **Ne pas charger 2+ capsules par défaut** en mode chat
- **Ne pas mettre de fonctions métier dans les primitives** — elles polluent le contexte
- **Ne pas recréer le system prompt après activation** — les capsule instructions suffisent
- **Ne pas bloquer le LLM pendant l'activation** — c'est juste un push dans un tableau

---

## Flux d'une conversation type

```
User: "Crée-moi un devis pour le client Dupont avec 3 lignes"

─── Tour 1 ───
LLM voit : 18 primitives + activate_capsule
LLM pense : "J'ai besoin des outils de vente"
LLM appelle : activate_capsule({ capsule: "ventes" })
→ Résultat : { ok: true, newTools: ["creer_devis", "lister_clients", ...] }

─── Tour 2 ───
LLM voit : 18 primitives + activate_capsule + 20 tools ventes
LLM appelle : search_functions({ query: "client Dupont" })
→ Résultat : { results: [{ id: "cli_123", name: "Dupont SAS" }] }

─── Tour 3 ───
LLM appelle : creer_devis({
  clientId: "cli_123",
  lignes: [
    { produit: "...", quantite: 1, prix: 100 },
    { produit: "...", quantite: 2, prix: 50 },
    { produit: "...", quantite: 1, prix: 200 },
  ]
})
→ Résultat : { ok: true, devisId: "DEV-2026-042", total: 400 }

─── Tour 4 ───
LLM : "J'ai créé le devis DEV-2026-042 pour Dupont SAS avec 3 lignes, total 400€."
→ Fin (pas de tool call)
```

**Total** : 4 tours, 38 tools max chargés. Le LLM n'a jamais vu les 500+ fonctions métier.

---

## Schéma de base de données pour le registre de fonctions

Si tu veux stocker tes fonctions en DB (comme le `ToolIndex` de Homeport) :

```javascript
// Modèle MongoDB (ou équivalent)
const FunctionSchema = {
  key: String,           // Identifiant unique (ex: "crm_create_contact")
  name: String,          // Nom affiché (ex: "Créer un contact")
  title: String,         // Titre court
  description: String,   // Description pour la recherche
  category: String,      // Catégorie (ex: "crm", "stock")
  tags: [String],        // Tags pour la recherche
  enabled: Boolean,      // Actif ou non

  // Schéma des arguments (JSON Schema ou format custom)
  args: {
    fields: [{
      key: String,
      label: String,
      type: String,       // text, number, select, date, etc.
      required: Boolean,
      options: [{ label: String, value: String }],
    }],
  },

  // Schéma de sortie (pour que le LLM sache quoi attendre)
  outputSchema: Object,

  // Metadata
  providerKey: String,   // Service associé (ex: "odoo", "slack")
  createdAt: Date,
  updatedAt: Date,
};
```

---

## Résumé de l'architecture

```
╔══════════════════════════════════════════════════════════╗
║                   ARCHITECTURE CIBLE                     ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  ┌─────────────┐                                         ║
║  │ LLM Stream  │◄── tools = toolSet.definitions          ║
║  └──────┬──────┘    (mutable, grossit avec les capsules) ║
║         │                                                ║
║  ┌──────▼──────┐                                         ║
║  │ Orchestrator│  Boucle while(loopCount < MAX) {        ║
║  │  (Harness)  │    stream = llm.stream(conv, tools)     ║
║  └──────┬──────┘    for (tc of toolCalls) execute(tc)    ║
║         │           if (capsuleRequest) activate()       ║
║         │         }                                      ║
║  ┌──────▼──────┐                                         ║
║  │  Tool Set   │  { definitions[], executors[],          ║
║  │  (Mutable)  │    activateCapsule(), execute() }       ║
║  └──────┬──────┘                                         ║
║         │                                                ║
║  ┌──────▼──────────────────────────────────┐             ║
║  │ Primitives (18)  │ Capsules (0→N)       │             ║
║  │ - search_tools   │ - ventes (20 tools)  │             ║
║  │ - execute_tool   │ - achats (15 tools)  │             ║
║  │ - ask_user       │ - stock (12 tools)   │             ║
║  │ - activate_cap.  │ - ...                │             ║
║  │ - memory         │                      │             ║
║  │ - manual         │                      │             ║
║  └──────────────────┴──────────────────────┘             ║
║                                                          ║
║  ┌─────────────────────────────────────────┐             ║
║  │ Function Registry (DB)                  │             ║
║  │ 500+ fonctions indexées                 │             ║
║  │ Accès via search → details → execute    │             ║
║  └─────────────────────────────────────────┘             ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## Fichiers de référence dans Homeport

| Fichier | Rôle |
|---------|------|
| `API/src/ai/tool-groups.js` | Registre des primitives + capsules + tool set mutable |
| `API/src/ai/agent-harness.js` | Boucle orchestrateur avec activation dynamique |
| `API/src/ai/tools/meta-tools.js` | Définitions des primitives (search, execute, memory...) |
| `API/src/ai/tools/workflow-tools.js` | Capsule "workflow" (28 tools) |
| `API/src/ai/tools/form-tools.js` | Capsule "form" (14 tools) |
| `API/src/ai/tools/node-args-tools.js` | Capsule "node_args" (9 tools) |
| `API/src/ai/tools/tool-index.js` | Index in-memory pour search_tools |
| `API/src/ai/llm/anthropic.js` | Client Anthropic (format tools) |
| `API/src/ai/llm/openai.js` | Client OpenAI (format tools) |
| `API/src/ai/prompts/base.js` | System prompt (contexte) |
