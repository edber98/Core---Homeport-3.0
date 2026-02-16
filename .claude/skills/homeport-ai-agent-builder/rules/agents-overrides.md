# Agents custom + overrides

## Types d'agents

### 1. Agent par défaut (général)
Pas d'agent spécifique → utilise le prompt constitutionnel du mode directement.

### 2. System agents (`provider:xxx`)
Auto-générés pour chaque provider configuré. Injectent un fragment de prompt avec la liste complète des NodeTemplates du provider.

**Exemple** : Agent `provider:odoo`
- Prompt fragment : "Spécialiste Odoo" + liste de toutes les actions Odoo disponibles
- Le LLM connaît exactement les outils disponibles pour ce provider

### 3. Custom agents (`aia_xxx`)
Agents définis par l'utilisateur avec un prompt custom, des providers autorisés, et des overrides LLM.

---

## resolveAgentOverrides()

**Fichier** : `API/src/modules/db/ai.js` (route)

```javascript
async function resolveAgentOverrides(agentId, ctx) {
  if (!agentId || agentId === 'general') return null;

  // System agent: provider:xxx
  if (agentId.startsWith('provider:')) {
    const providerKey = agentId.slice(9);
    const provider = await Provider.findOne({ key: providerKey });
    if (!provider) return null;

    // Charger tous les templates du provider
    const templates = await NodeTemplate.find({ providerKey, enabled: { $ne: false } })
      .select('key title type description').lean();

    const toolList = templates.map(t =>
      `- ${t.key} (${t.type}) : ${t.title}${t.description ? ' — ' + t.description : ''}`
    ).join('\n');

    return {
      promptFragment: `Tu es un spécialiste ${provider.title || provider.name}.\n\n` +
        `### Outils ${provider.title || provider.name} disponibles\n${toolList}\n\n` +
        `Utilise UNIQUEMENT les outils ci-dessus. Pour les trouver : search_tools(provider="${providerKey}").`,
    };
  }

  // Custom agent: aia_xxx
  const AiAgent = require('../../db/models/ai-agent.model');
  const agent = await AiAgent.findOne({ id: agentId, workspaceId: ctx.workspaceId });
  if (!agent) return null;

  const overrides = {
    promptFragment: agent.systemPrompt || '',
    blockedTools: agent.blockedTools || [],
    maxToolLoops: agent.maxToolLoops || undefined,
    autonomyLevel: agent.autonomyLevel || null,
  };

  // LLM overrides
  if (agent.llmProvider) overrides.llmProvider = agent.llmProvider;
  if (agent.llmModel) overrides.llmModel = agent.llmModel;

  // Multi-provider access
  if (agent.allowedProviders?.length) {
    const providers = await Provider.find({ key: { $in: agent.allowedProviders } });
    const fragments = [];
    for (const p of providers) {
      const templates = await NodeTemplate.find({ providerKey: p.key, enabled: { $ne: false } })
        .select('key title type description').lean();
      const toolList = templates.map(t =>
        `- ${t.key} (${t.type}) : ${t.title}${t.description ? ' — ' + t.description : ''}`
      ).join('\n');
      fragments.push(`### Outils ${p.title || p.name}\n${toolList}`);
    }
    overrides.promptFragment += '\n\n' + fragments.join('\n\n');
  }

  return overrides;
}
```

## Injection dans le système

### 1. Prompt fragment

```javascript
// agent-runner.js → buildSystemPrompt()
if (ctx._agentPromptFragment) {
  prompt += '\n\n## Spécialisation agent\n' + ctx._agentPromptFragment;
}
```

Le fragment est injecté APRÈS le prompt du mode, AVANT la mémoire projet.

### 2. LLM overrides

```javascript
// agent-harness.js → runHarness()
if (agentOverrides?.llmProvider) {
  llmConfig.provider = agentOverrides.llmProvider;
  llmConfig.apiKey = (p === 'anthropic') ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;
}
if (agentOverrides?.llmModel) llmConfig.model = agentOverrides.llmModel;
```

### 3. Blocked tools

```javascript
// agent-harness.js → buildOrchestratorToolSet()
const toolSet = buildOrchestratorToolSet({
  blockedTools: agentOverrides?.blockedTools || [],
  // ...
});
```

### 4. Max loops

```javascript
const maxLoops = agentOverrides?.maxToolLoops || DEFAULT_MAX_LOOPS;
```

### 5. Autonomy level

```javascript
// ai.js route SSE — résolution par priorité :
context._autonomyLevel = thread.metadata?.autonomyLevel  // per-conversation override
  || resolvedAgent?.autonomyLevel                         // per-agent setting
  || 'autonomous';                                        // global default

// base.js — injection dans le prompt :
const { buildAutonomyPrompt } = require('./autonomy');
parts.push(buildAutonomyPrompt(ctx._autonomyLevel));
```

Niveaux : `prudent` (confirme écritures) → `balanced` (confirme destructives) → `autonomous` (agit directement, défaut).
Module : `API/src/ai/prompts/autonomy.js`.

---

## Modèle agent (AiAgent)

```javascript
{
  id: String,                    // Identifiant court (ex: "aia_comptable")
  workspaceId: ObjectId,
  name: String,                  // Nom affiché (ex: "Comptable")
  description: String,           // Description pour le select
  systemPrompt: String,          // Prompt custom injecté
  mode: String,                  // Mode par défaut ('chat')
  allowedProviders: [String],    // Providers accessibles (ex: ['odoo', 'quickbooks'])
  llmProvider: String,           // Override provider (ex: 'anthropic')
  llmModel: String,              // Override model (ex: 'claude-sonnet-4-5-20250929')
  blockedTools: [String],        // Outils bloqués (ex: ['create_flow'])
  maxToolLoops: Number,          // Max itérations
  routerBehavior: String,        // 'auto' | 'skip' | 'force'
  autonomyLevel: String,         // 'prudent' | 'balanced' | 'autonomous' (default)
  icon: String,                  // Icône pour le select
  enabled: Boolean,
}
```

---

## API agents

### Liste des agents disponibles

```
GET /api/ai/agents/available
→ Retourne la liste unifiée :
  [
    { id: 'general', name: 'Général', type: 'system' },
    { id: 'provider:odoo', name: 'Spécialiste Odoo', type: 'system' },
    { id: 'provider:slack', name: 'Spécialiste Slack', type: 'system' },
    { id: 'aia_comptable', name: 'Comptable', type: 'custom' },
    // ...
  ]
```

Les system agents sont générés dynamiquement depuis les providers avec credentials configurés.

---

## Checklist : créer un nouvel agent custom

### Via l'API

```
POST /api/ai/agents
{
  "name": "Mon agent",
  "description": "Description pour le select",
  "systemPrompt": "Tu es un expert en [domaine]. ...",
  "allowedProviders": ["odoo", "slack"],
  "llmProvider": "anthropic",
  "llmModel": "claude-sonnet-4-5-20250929",
  "blockedTools": [],
  "maxToolLoops": 20,
  "autonomyLevel": "autonomous"
}
```

### Via le code (seed)

```javascript
await AiAgent.create({
  id: 'aia_mon_agent',
  workspaceId: wsId,
  name: 'Mon agent',
  systemPrompt: 'Tu es un expert en...',
  allowedProviders: ['odoo'],
  enabled: true,
});
```

### Bonnes pratiques

- Le `systemPrompt` doit être court et précis (~10-20 lignes)
- Utiliser `allowedProviders` pour limiter le scope (le fragment injecte automatiquement la liste des outils)
- `blockedTools` pour empêcher certaines actions (ex: `['create_flow', 'save_flow']` pour un agent read-only)
- `maxToolLoops` pour limiter le coût des boucles longues
- L'agent hérite du mode de la page (workflow builder → mode workflow, etc.)
