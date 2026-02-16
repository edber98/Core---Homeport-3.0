# Checklist : créer une nouvelle capsule/mode

Cette checklist couvre toutes les étapes pour ajouter un nouveau mode IA avec sa capsule d'outils (ex: "dashboard", "analytics", "report").

---

## Étape 1 : Créer le fichier tools

**Fichier** : `API/src/ai/tools/xxx-tools.js`

```javascript
// XXX tools — mode-specific tools for [description]
// Used when agent mode === 'xxx' or via capsule activation

const XXX_TOOL_DEFINITIONS = [
  {
    name: 'get_xxx_state',
    description: 'Récupère l\'état actuel du [xxx].',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'update_xxx',
    description: 'Met à jour le [xxx] avec les paramètres fournis.',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: 'Description' },
      },
      required: ['param1'],
    },
  },
  // ... autres outils
];

/**
 * Create executor for xxx mode.
 * @param {object} metadata - { workspaceId, xxxId, ... }
 * @param {function} emit - Side event emitter
 */
function createXxxExecutor(metadata, emit) {
  let state = null;  // État mutable in-memory

  async function ensureState() {
    if (state) return state;
    // Charger depuis DB si xxxId existe
    if (metadata.xxxId) {
      const doc = await XxxModel.findById(metadata.xxxId).lean();
      if (doc) { state = doc; return state; }
    }
    state = { /* état par défaut */ };
    return state;
  }

  function emitUpdate() {
    emit({ type: 'xxx.update', state });
  }

  const tools = {
    async get_xxx_state() {
      const s = await ensureState();
      return { success: true, state: s };
    },

    async update_xxx(input) {
      const s = await ensureState();
      // ... modifier l'état ...
      emitUpdate();
      return { success: true };
    },

    // ... autres handlers ...
  };

  return {
    definitions: XXX_TOOL_DEFINITIONS,
    canHandle(name) { return name in tools; },
    async execute(name, input) {
      if (!(name in tools)) throw new Error(`Unknown xxx tool: ${name}`);
      return tools[name](input || {});
    },
    getState() { return state; },
    async cleanup() {
      // Auto-save si changements non sauvegardés
      if (state && metadata.xxxId) {
        await XxxModel.findByIdAndUpdate(metadata.xxxId, state);
      }
    },
  };
}

module.exports = { XXX_TOOL_DEFINITIONS, createXxxExecutor };
```

---

## Étape 2 : Enregistrer la capsule

**Fichier** : `API/src/ai/tool-groups.js`

### 2a. Ajouter dans CAPSULE_NAMES

```javascript
const CAPSULE_NAMES = ['workflow', 'form', 'node_args', 'xxx'];
```

### 2b. Ajouter dans CAPSULE_INFO

```javascript
const CAPSULE_INFO = {
  // ... existants ...
  xxx: {
    label: 'XXX builder',
    description: 'Outils de [description] : [liste courte des capacités]',
    toolCount: '~N outils',
  },
};
```

### 2c. Ajouter dans _createExecutor()

```javascript
const { createXxxExecutor } = require('./tools/xxx-tools');

function _createExecutor(name) {
  switch (name) {
    case 'workflow': return createWorkflowExecutor(metadata, emit);
    case 'form':     return createFormExecutor(metadata, emit);
    case 'node_args': return createNodeArgsExecutor(metadata, emit);
    case 'xxx':      return createXxxExecutor(metadata, emit);   // ← AJOUTER
    default: return null;
  }
}
```

---

## Étape 3 : Créer le prompt constitutionnel

**Fichier** : `API/src/ai/prompts/xxx-builder.js`

```javascript
// XXX builder constitution — critical rules only (~40 lines)
// Detailed reference is in manuals/xxx.md (loaded via search_manual)

function buildXxxPrompt() {
  return `
## Mode : XXX builder

Tu es en mode XXX builder. Tu travailles sur un [xxx] existant ou en création.

### Tes capacités
- [Capacité 1]
- [Capacité 2]
- [Capacité 3]

### Règles critiques
- TOUJOURS [règle 1]
- JAMAIS [règle 2]
- [Autre règle importante]

### Référence détaillée
Pour les détails → \`search_manual(query, "xxx")\` → \`get_manual_section(topic, "xxx")\`.`;
}

module.exports = { buildXxxPrompt };
```

---

## Étape 4 : Brancher dans buildSystemPrompt()

**Fichier** : `API/src/ai/agent-runner.js`

```javascript
const { buildXxxPrompt } = require('./prompts/xxx-builder');

function buildSystemPrompt(mode, ctx) {
  let prompt = buildBasePrompt(ctx);

  switch (mode) {
    case 'chat':      prompt += buildChatPrompt(); break;
    case 'workflow':  prompt += buildWorkflowPrompt(); break;
    case 'node_args': prompt += buildNodeArgsPrompt(); break;
    case 'form':      prompt += buildFormPrompt(); break;
    case 'onboarding': prompt += buildOnboardingPrompt(); break;
    case 'xxx':       prompt += buildXxxPrompt(); break;    // ← AJOUTER
  }

  // ... suite (agent overrides, project memory, custom instructions) ...
}
```

---

## Étape 5 : Créer le manuel

**Fichier** : `API/src/ai/manuals/xxx.md`

```markdown
<!-- @topic:overview -->
## Vue d'ensemble du mode XXX

[Description générale du mode, ses objectifs, ses capacités]

---

<!-- @topic:procedure -->
## Procédure standard

### Phase 1 : Analyse
[Étapes de la phase 1]

### Phase 2 : Construction
[Étapes de la phase 2]

### Phase 3 : Finalisation
[Étapes de la phase 3]

---

<!-- @topic:rules -->
## Règles détaillées

[Règles détaillées pour le mode]

---

<!-- @topic:examples -->
## Exemples

[Exemples d'utilisation]
```

Le fichier est automatiquement indexé par `manual-index.js` au prochain chargement. Les sections sont découpées par les markers `<!-- @topic:xxx -->`.

---

## Étape 6 : Initialisation capsule dans le harness

**Fichier** : `API/src/ai/agent-harness.js`

Ajouter le mode dans l'initialisation des capsules :

```javascript
const activeCapsules = new Set();
if (mode === 'workflow') activeCapsules.add('workflow');
if (mode === 'form') activeCapsules.add('form');
if (mode === 'node_args') activeCapsules.add('node_args');
if (mode === 'xxx') activeCapsules.add('xxx');   // ← AJOUTER
```

---

## Étape 7 : Frontend — mode detection

**Fichier** : `Homeport/src/app/features/ai/ai.service.ts`

Ajouter la détection du mode dans le service :

```typescript
// Dans la logique de détection du mode (pageContext)
if (pageContext.xxxId) {
  mode = 'xxx';
  metadata.xxxId = pageContext.xxxId;
}
```

---

## Étape 8 : Frontend — side events (si nécessaire)

**Fichier** : `Homeport/src/app/features/ai/ai-chat.component.ts`

Si la capsule émet des side events spécifiques, les forwarder :

```typescript
// Dans processStreamEvent()
if ((ev as any).type?.startsWith?.('xxx.')) {
  this.ai.emitSideEvent(ev);
}
```

---

## Vérification

1. En mode direct (xxxId dans pageContext) → la capsule est active au démarrage
2. En mode chat → `activate_capsule("xxx")` active la capsule dynamiquement
3. Les outils sont accessibles après activation
4. Les side events arrivent au frontend via `ai.sideEvents$`
5. `search_manual("xxx")` retourne les sections du manuel
6. `get_manual_section("procedure", "xxx")` retourne le contenu
