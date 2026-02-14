# Prompts constitutionnels + manuels searchable

## Architecture 2 niveaux

Le système IA utilise 2 niveaux de documentation pour le LLM :

### Niveau 1 : Constitution (prompt, ~40-60 lignes)
- **Chargé toujours** dans le system prompt
- Contient les **règles critiques** et la **structure obligatoire**
- Court et direct — le LLM doit connaître ces règles par cœur
- Un fichier par mode : `prompts/chat.js`, `prompts/workflow-builder.js`, etc.

### Niveau 2 : Manuel (fichier .md, searchable on-demand)
- **Chargé à la demande** via `search_manual` / `get_manual_section`
- Contient la **référence détaillée** : procédures complètes, exemples, patterns
- Un fichier par mode : `manuals/chat.md`, `manuals/workflow.md`, etc.
- Découpé en sections par markers `<!-- @topic:xxx -->`

**Pourquoi ?** Le LLM a un budget token limité. Charger 600 lignes de procédure dans chaque system prompt gaspille des tokens. À la place, les 40 lignes de constitution rappellent les règles essentielles, et le LLM consulte le manuel quand il a besoin de détails.

---

## Prompts constitutionnels

### Structure

```
API/src/ai/prompts/
├── base.js               ← Contexte partagé (company, workspace, user, rules)
├── chat.js               ← Mode chat (~50 lignes)
├── workflow-builder.js   ← Mode workflow builder
├── form-builder.js       ← Mode form builder
├── node-args.js          ← Mode node args
├── onboarding.js         ← Mode onboarding
├── router.js             ← (legacy)
└── execution.js          ← (legacy)
```

### buildBasePrompt(ctx)

Fichier : `API/src/ai/prompts/base.js`

Injecte dans le system prompt :
1. Rôle : "Tu es l'assistant IA de la plateforme Homeport"
2. **Entreprise** : description, secteur (si disponible)
3. **Services connectés** : nom + nombre d'actions par provider
4. **Workspace** : description, instructions custom
5. **Mémoire et préférences** : user memory + preferences + outils fréquents
6. **Instructions entreprise** : system prompt admin (si défini)
7. **Workflows existants** : 20 derniers (nom, status, nodeCount, providers)
8. **Formulaires existants** : 20 derniers (nom, status, fieldCount)
9. **Règles** : credentials, confirmation destructive, ask_user, langue, capitalisation
10. **Planification** : réfléchir, vérifier, admettre les échecs
11. **Transfert** : compact_and_transfer pour changer d'élément
12. **Mémoire** : 2 niveaux (globale save_memory + projet save_project_memory)

### buildSystemPrompt(mode, ctx)

Fichier : `API/src/ai/agent-runner.js`

```javascript
function buildSystemPrompt(mode, ctx) {
  let prompt = buildBasePrompt(ctx);          // Base commune

  switch (mode) {                              // Prompt mode-spécifique
    case 'chat':      prompt += buildChatPrompt(); break;
    case 'workflow':  prompt += buildWorkflowPrompt(); break;
    case 'node_args': prompt += buildNodeArgsPrompt(); break;
    case 'form':      prompt += buildFormPrompt(); break;
    case 'onboarding': prompt += buildOnboardingPrompt(); break;
  }

  // Agent specialization (dynamic provider or custom agent)
  if (ctx._agentPromptFragment) {
    prompt += '\n\n## Spécialisation agent\n' + ctx._agentPromptFragment;
  }

  // Project memory (flow/form specific)
  if (ctx._projectMemory && Object.keys(ctx._projectMemory).length) {
    const lines = Object.entries(ctx._projectMemory)
      .map(([k, v]) => `- ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
    prompt += '\n\n## Mémoire du projet\n' + lines.join('\n');
  }

  // Custom user instructions
  if (ctx.user?.preferences?.customInstructions?.trim()) {
    prompt += '\n\n## Instructions utilisateur\n' + ctx.user.preferences.customInstructions;
  }

  return prompt;
}
```

### Ordre d'injection dans le prompt final

```
1. buildBasePrompt(ctx)           ← Contexte + règles de base
2. buildXxxPrompt()               ← Constitution du mode
3. buildCapsuleInstructions()     ← Capsules disponibles (chat mode uniquement)
4. ctx._agentPromptFragment       ← Spécialisation agent (si agent custom/provider)
5. ctx._projectMemory             ← Mémoire du projet (si flow/form lié)
6. ctx.user.preferences.customInstructions  ← Instructions personnelles
```

---

## Manuels searchable

### Structure

```
API/src/ai/manuals/
├── manual-index.js   ← Parser + index + search
├── chat.md           ← Référence mode chat
├── workflow.md       ← Référence mode workflow (~600 lignes)
├── form.md           ← Référence mode form
└── node-args.md      ← Référence mode node-args
```

### Format des sections

Les manuels utilisent des markers HTML comments pour délimiter les topics :

```markdown
<!-- @topic:overview -->
## Vue d'ensemble

[Contenu de la section overview]

---

<!-- @topic:procedure -->
## Procédure de construction

[Contenu détaillé de la procédure]

---

<!-- @topic:patterns -->
## Détection des patterns

[Détails sur la détection des patterns]
```

### Parsing (`manual-index.js`)

```javascript
function parseSections(raw) {
  const sections = {};
  const parts = raw.split(/<!-- @topic:(\w+) -->/);
  // parts[0] = avant premier tag (ignoré)
  // parts[1] = topic, parts[2] = content, parts[3] = topic, parts[4] = content...
  for (let i = 1; i < parts.length; i += 2) {
    const topic = parts[i];
    const content = (parts[i + 1] || '').trim();
    const title = content.match(/^##?\s+(.+)/m)?.[1] || topic;
    const summary = lines.slice(0, 3).join(' ').slice(0, 250);
    sections[topic] = { title, content, summary };
  }
  return sections;
}
```

### API de recherche

```javascript
// Recherche par mots-clés (retourne max 8 résultats)
searchManual(query, namespace?)
→ { results: [{ namespace, topic, title, summary, score }], totalSections }

// Score = nombre de mots de la query trouvés dans topic + title + summary
// Bonus x3 pour match exact sur le topic name

// Récupérer une section complète
getManualSection(topic, namespace?)
→ { namespace, topic, title, content }
```

### Cache

Les manuels sont cachés en mémoire au premier chargement. Appeler `invalidateCache()` pour recharger (dev hot reload).

---

## Template : créer un nouveau prompt constitutionnel

```javascript
// API/src/ai/prompts/xxx-builder.js

function buildXxxPrompt() {
  return `
## Mode : XXX builder

Tu es en mode XXX. Tu travailles sur [description].

### Tes capacités
- [Cap 1] via \`outil_1\`
- [Cap 2] via \`outil_2\`

### Règle 1 — [Nom]
[Description courte de la règle critique]

### Règle 2 — [Nom]
[Description courte]

### Référence détaillée
Pour les détails → \`search_manual(query, "xxx")\` → \`get_manual_section(topic, "xxx")\`.`;
}

module.exports = { buildXxxPrompt };
```

**Principes** :
- Max ~60 lignes (au-delà, mettre dans le manuel)
- Uniquement les règles CRITIQUES (ce que le LLM doit toujours respecter)
- Référencer le manuel pour les détails
- Utiliser des backticks pour les noms d'outils
- Écrire en français

## Template : créer un nouveau manuel

```markdown
<!-- Fichier: API/src/ai/manuals/xxx.md -->

<!-- @topic:overview -->
## Vue d'ensemble du mode XXX

[Description générale, objectifs, flux principal]

---

<!-- @topic:procedure -->
## Procédure standard

### Phase 1 : [Nom]
1. [Étape 1]
2. [Étape 2]

### Phase 2 : [Nom]
1. [Étape 1]
2. [Étape 2]

---

<!-- @topic:rules -->
## Règles détaillées

### TOUJOURS
- [Règle 1]
- [Règle 2]

### JAMAIS
- [Règle 1]
- [Règle 2]

---

<!-- @topic:examples -->
## Exemples

### Exemple 1 : [Cas simple]
[Description + séquence d'appels d'outils]

### Exemple 2 : [Cas complexe]
[Description + séquence d'appels d'outils]
```

**Principes** :
- Chaque section doit avoir un `<!-- @topic:xxx -->` unique
- Le topic name est un identifiant court en snake_case (lettres, chiffres, underscores)
- La première ligne `## Titre` après le tag devient le titre de la section
- Les 3 premières lignes non-vides deviennent le résumé (250 chars max)
- Pas de limite de taille — le manuel est chargé à la demande
