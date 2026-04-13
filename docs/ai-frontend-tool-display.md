# Frontend IA — Affichage des tools, arguments et raisonnement

> Comment l'assistant IA de Homeport affiche les tool calls en temps réel :
> statuts, arguments avec labels, raisonnement collapsé, animations.

---

## Vue d'ensemble du flux

```
Backend SSE                    AiService                    AiChatComponent (streaming)
─────────────                  ─────────                    ───────────────────────────
tool.start ──────────────────► StreamTool créé ──────────► Carte "building" (grise)
tool.input_delta ────────────► inputJson accumulé ───────► Args en live (fade-in)
tool.meta ───────────────────► displayTitle + argsSchema ► Label humain + mapping args
tool.building_done ──────────► status → "running" ───────► Carte bleue (spinner)
tool.end ────────────────────► status → success/error ──► Carte verte/rouge + durée


                                                           AiMessageComponent (historique)
                                                           ─────────────────────────────
                                                           Segments persistés en DB
                                                           Tools collapsés en résumé
                                                           Click → dialogue résultat
```

---

## Les 4 états visuels d'un tool call

### 1. Building (construction des arguments)

```
┌─────────────────────────────────────────┐
│ ⚙  Recherche d'outils                  │  ← gris #8c8c8c
│                                         │
│   Recherche : "envoyer email"           │  ← args en fade-in
│                                         │
└─────────────────────────────────────────┘
```

- **Couleur** : gris `#8c8c8c`
- **Icône** : `tool` (engrenage)
- **Classe CSS** : `tool-building`
- Le LLM stream le JSON des arguments en temps réel (`tool.input_delta`)
- Les arguments apparaissent un par un avec animation `fade-token`
- Les nouvelles clés ont un fond bleu clair (`.args-row-new`)

### 2. Running (exécution en cours)

```
┌─────────────────────────────────────────┐
│ 🔄 Envoyer un email                    │  ← bleu #1677ff + spin
│                                         │
│   Destinataire : john@example.com       │  ← args cliquable
│   Sujet : "Bonjour"                     │
│                                         │
└─────────────────────────────────────────┘
```

- **Couleur** : bleu `#1677ff`
- **Icône** : `loading` (spinner animé)
- **Classe CSS** : `tool-running`
- Cliquable pour déplier/replier les arguments
- Transition depuis building via l'event `tool.building_done`

### 3. Success (terminé avec succès)

```
┌─────────────────────────────────────────┐
│ ✅ Envoyer un email              120ms  │  ← vert #52c41a
└─────────────────────────────────────────┘
```

- **Couleur** : vert `#52c41a`
- **Icône** : `check-circle`
- **Classe CSS** : `tool-success`
- Affiche la durée en millisecondes
- Collapsé par défaut, cliquable pour voir les args

### 4. Error (échec)

```
┌─────────────────────────────────────────┐
│ ❌ Envoyer un email              350ms  │  ← rouge #ff4d4f
└─────────────────────────────────────────┘
```

- **Couleur** : rouge `#ff4d4f`
- **Icône** : `close-circle`
- **Classe CSS** : `tool-error`

---

## Système de segments : texte + tools + raisonnement

La conversation est découpée en **segments** qui alternent texte et groupes de tools :

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  "Je vais créer un workflow pour envoyer des emails..."  │  ← Segment texte
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Raisonnement ──────────────────────────────────┐     │
│  │ Je dois d'abord activer la capsule workflow     │     │  ← Gris, collapsé
│  │ pour avoir accès aux outils de construction.    │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  ✅ Activer capsule — workflow              45ms         │  ← Tool 1
│  ✅ Créer un workflow                       120ms        │  ← Tool 2
│  ✅ Ajouter un nœud — smtp_send_email       89ms         │  ← Tool 3
│  ✅ Connecter les nœuds                     34ms         │  ← Tool 4
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  "Le workflow est prêt ! Il envoie un email via SMTP."   │  ← Segment texte final
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Structure des segments

```typescript
interface StreamSegment {
  type: 'text' | 'tools';
  text?: string;              // Contenu texte (markdown)
  tools?: StreamTool[];       // Groupe de tools
  reasoning?: string;         // Texte AVANT les tools (gris, collapsé)
}
```

**Logique de regroupement** :
- Le texte émis **juste avant** un `tool.start` est capturé comme `reasoning`
- Le texte émis **après** le dernier tool.end devient un nouveau segment texte
- Plusieurs tools consécutifs sont regroupés dans le même segment `tools`

---

## Bloc de raisonnement (reasoning)

Le texte que le LLM écrit avant d'appeler un tool est affiché comme "raisonnement" :

```
┌─ Raisonnement ────────────────────────────────────────┐
│ Je vais d'abord chercher le template pour l'envoi     │
│ d'email, puis créer le nœud dans le workflow.         │
└───────────────────────────────────────────────────────┘
```

### Style CSS

```css
/* Bloc raisonnement — gris, discret */
.reasoning-block {
  background: #fafafa;
  border-left: 3px solid #d9d9d9;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  color: #8c8c8c;
  font-size: 13px;
  line-height: 1.5;
}

/* Animation pendant le streaming */
.reasoning-block.active {
  animation: pulse-reason 2s ease-in-out infinite;
}

@keyframes pulse-reason {
  0%, 100% { border-left-color: #d9d9d9; opacity: 0.9; }
  50%      { border-left-color: #722ed1; opacity: 0.75; }  /* violet */
}
```

- **En streaming** : bordure qui pulse gris → violet
- **Terminé** : bordure grise fixe, opacité réduite
- **Collapsé** dans les messages historiques (cliquable pour déplier)

---

## Mapping des labels d'arguments

Le système utilise **3 niveaux de priorité** pour afficher des labels humains au lieu des clés JSON brutes :

### Priorité 1 : `argsSchema` (depuis le backend via `tool.meta`)

Pour `execute_tool`, le backend cherche le `NodeTemplate` en DB et envoie un event `tool.meta` :

```
Backend → SSE event:
{
  type: "tool.meta",
  id: "tc_abc123",
  displayTitle: "Envoyer un email",
  argsSchema: [
    { key: "to", label: "Destinataire" },
    { key: "subject", label: "Sujet" },
    { key: "body", label: "Corps du message" },
    { key: "cc", label: "Copie carbone" }
  ]
}
```

Le frontend stocke ça dans une `Map<string, argsSchema>` par tool ID.

### Priorité 2 : `META_TOOL_ARG_LABELS` (mapping statique dans le frontend)

Pour les meta-tools (pas les NodeTemplates), le frontend a un dictionnaire statique :

```typescript
const META_TOOL_ARG_LABELS: Record<string, Record<string, string>> = {
  // Discovery
  search_tools:       { query: 'Recherche' },
  get_tool_details:   { key: 'Clé du nœud' },
  execute_tool:       { key: 'Template', credential_id: 'Identifiants' },
  list_providers:     {},

  // Workflow builder
  add_node:           { templateKey: 'Template', positionAfter: 'Après le nœud' },
  connect_nodes:      { sourceId: 'Source', targetId: 'Cible', sourceHandle: 'Sortie', targetHandle: 'Entrée' },
  set_node_args:      { nodeId: 'Nœud', args: 'Arguments' },
  remove_node:        { nodeId: 'Nœud' },
  replace_node:       { nodeId: 'Nœud', newTemplateKey: 'Nouveau template' },
  ensure_start:       { type: 'Type de déclencheur' },
  create_flow:        { name: 'Nom', description: 'Description' },
  save_flow:          {},
  validate_flow:      {},

  // Form builder
  add_field:          { key: 'Clé', label: 'Label', type: 'Type' },
  update_field:       { key: 'Clé', updates: 'Modifications' },
  remove_field:       { key: 'Clé' },
  add_section:        { key: 'Clé', label: 'Label' },

  // Node args
  set_node_args:      { nodeId: 'Nœud', args: 'Arguments' },
  list_predecessors:  { nodeId: 'Nœud' },

  // Memory
  save_memory:        { content: 'Contenu' },
  get_memory:         {},
  save_project_memory:{ memory: 'Mémoire' },

  // Capsule
  activate_capsule:   { capsule: 'Capsule', reason: 'Raison' },

  // Questions
  ask_user:           { question: 'Question', options: 'Options' },

  // Workflow execution
  run_workflow:       { flowId: 'Workflow' },
  search_workflows:   { query: 'Recherche' },
  deploy_flow:        { flowId: 'Workflow' },

  // Manual
  search_manual:      { query: 'Recherche' },
  get_manual_section: { topic: 'Sujet' },
};
```

### Priorité 3 : Clé brute (fallback)

Si aucun mapping n'existe, la clé JSON est affichée telle quelle.

### Implémentation

```typescript
getArgsFields(t: StreamTool): { key: string; label: string; value: any }[] {
  // Pour execute_tool, on affiche les args internes (pas key/credential_id)
  const data = (t.name === 'execute_tool' && t.args?.args)
    ? t.args.args
    : t.args;

  if (!data || typeof data !== 'object') return [];

  // Construire le mapping label
  const labelMap = new Map<string, string>();

  // Priorité 1 : argsSchema du backend (NodeTemplate)
  if (t.argsSchema) {
    for (const f of t.argsSchema) labelMap.set(f.key, f.label);
  }

  // Priorité 2 : META_TOOL_ARG_LABELS statique
  const metaLabels = META_TOOL_ARG_LABELS[t.name];
  if (metaLabels) {
    for (const [k, label] of Object.entries(metaLabels)) {
      if (!labelMap.has(k)) labelMap.set(k, label);
    }
  }

  // Construire les champs avec fallback sur la clé brute
  return Object.entries(data)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([key, value]) => ({
      key,
      label: labelMap.get(key) || key,  // ← Priorité 3 : clé brute
      value,
    }));
}
```

---

## Nom affiché du tool (displayTitle)

Le nom du tool passe par plusieurs transformations :

### Pour `execute_tool` (NodeTemplates)

```
Priorité 1 : displayTitle du tool.meta    → "Envoyer un email"
Priorité 2 : args.key (clé du template)   → "smtp_send_email"
Priorité 3 : regex sur inputJson partiel  → "smtp_send_email" (pendant building)
Priorité 4 : fallback                     → "Exécution..."
```

### Pour les meta-tools

Le frontend a un dictionnaire `TOOL_LABELS` :

```typescript
const TOOL_LABELS: Record<string, string> = {
  // Discovery
  search_tools:         'Recherche d\'outils',
  get_tool_details:     'Détails du template',
  execute_tool:         'Exécution',
  list_providers:       'Liste des services',
  list_credentials:     'Liste des identifiants',

  // Capsule
  activate_capsule:     'Activation capsule',

  // Workflow builder
  create_flow:          'Créer un workflow',
  add_node:             'Ajouter un nœud',
  connect_nodes:        'Connecter',
  disconnect_nodes:     'Déconnecter',
  remove_node:          'Supprimer un nœud',
  replace_node:         'Remplacer un nœud',
  set_node_args:        'Configurer le nœud',
  set_node_description: 'Description du nœud',
  set_node_credential:  'Identifiants du nœud',
  ensure_start:         'Déclencheur',
  validate_flow:        'Valider',
  save_flow:            'Sauvegarder',
  auto_layout:          'Réorganiser',
  get_output_options:   'Options de sortie',
  propose_context_mapping: 'Mapping contextuel',

  // Form builder
  create_form:          'Créer un formulaire',
  add_field:            'Ajouter un champ',
  update_field:         'Modifier un champ',
  remove_field:         'Supprimer un champ',
  add_section:          'Ajouter une section',
  set_form_schema:      'Schéma du formulaire',
  save_form:            'Sauvegarder',

  // Memory
  save_memory:          'Mémoriser',
  get_memory:           'Rappel mémoire',
  save_project_memory:  'Mémoire projet',
  get_project_memory:   'Rappel projet',

  // Execution
  run_workflow:         'Lancer le workflow',
  deploy_flow:          'Déployer',
  undeploy_flow:        'Retirer le déploiement',
  search_workflows:     'Recherche de workflows',

  // Manual
  search_manual:        'Recherche dans le manuel',
  get_manual_section:   'Section du manuel',

  // User interaction
  ask_user:             'Question',
  open_element:         'Ouvrir',
  open_credentials:     'Identifiants',

  // Thread
  compact_and_transfer: 'Transfert de conversation',
};
```

### Extra contextuel

Certains tools ajoutent un contexte après le label :

```typescript
toolExtra(t: StreamTool): string | null {
  // search_tools → "Recherche d'outils — envoyer email"
  if (t.name === 'search_tools') return t.args?.query;

  // get_tool_details → "Détails template — smtp_send_email"
  if (t.name === 'get_tool_details') return t.args?.key;

  // connect_nodes → "Connecter — abc123 → def456"
  if (t.name === 'connect_nodes' && t.args?.sourceId && t.args?.targetId) {
    return `${t.args.sourceId.slice(-8)} → ${t.args.targetId.slice(-8)}`;
  }

  // activate_capsule → "Activation capsule — workflow"
  if (t.name === 'activate_capsule') return t.args?.capsule;

  return null;
}
```

Résultat affiché : `"Recherche d'outils — envoyer email"`

---

## Tool Rotator (streaming en temps réel)

Pendant le streaming, un seul tool est affiché en détail à la fois. Les tools terminés se collapsent au-dessus :

```
┌──────────────────────────────────────────────┐
│ ✅ Recherche d'outils — email        45ms    │  ← collapsé
│ ✅ Détails template — smtp_send      12ms    │  ← collapsé
│                                              │
│ 🔄 Envoyer un email                         │  ← EN DÉTAIL (rotator)
│                                              │
│   Destinataire : john@example.com            │
│   Sujet : "Rapport mensuel"                  │
│   Corps : "Bonjour, veuillez trouver..."     │
│                                              │
└──────────────────────────────────────────────┘
```

### Mécanique du rotator

```typescript
// Le tool actif est le dernier non-terminé, ou le dernier terminé
latestToolArray(): StreamTool[] {
  const lastSeg = this.segments.findLast(s => s.type === 'tools');
  if (!lastSeg?.tools?.length) return [];

  // Chercher le tool en cours (building ou running)
  const active = lastSeg.tools.findLast(
    t => t.status === 'building' || t.status === 'running'
  );
  return active ? [active] : [lastSeg.tools[lastSeg.tools.length - 1]];
}
```

**Temps minimum d'affichage** : 400ms — empêche le clignotement si un tool est très rapide.

**Animations** :
- Entrée : slide-up depuis le bas (300ms cubic-bezier)
- Sortie : slide-up vers le haut (200ms ease-in)

```typescript
trigger('toolRotate', [
  transition(':enter', [
    style({ transform: 'translateY(100%)', opacity: 0 }),
    animate('300ms cubic-bezier(0.16, 1, 0.3, 1)',
      style({ transform: 'translateY(0)', opacity: 1 })),
  ]),
  transition(':leave', [
    style({ position: 'absolute', width: '100%' }),
    animate('200ms ease-in',
      style({ transform: 'translateY(-100%)', opacity: 0 })),
  ]),
])
```

---

## Affichage des arguments en temps réel

Pendant le streaming (`tool.input_delta`), les arguments JSON arrivent par morceaux :

```
Delta 1 : {"query": "en
Delta 2 : voyer em
Delta 3 : ail"}
```

### Réparation du JSON partiel

```typescript
parsePartialArgs(inputJson: string): Record<string, any> | null {
  try {
    // jsonrepair corrige le JSON incomplet
    // {"query": "foo  →  {"query": "foo"}
    const repaired = jsonrepair(inputJson);
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}
```

### Détection des nouvelles clés (animation)

```typescript
// Quand un nouveau champ apparaît dans le JSON partiel
if (parsedArgs) {
  const prevKeys = new Set(Object.keys(tool.parsedArgs || {}));
  const newKeys = new Set<string>();
  for (const k of Object.keys(parsedArgs)) {
    if (!prevKeys.has(k)) newKeys.add(k);  // ← nouvelle clé
  }
  tool.parsedArgs = parsedArgs;
  tool.changedKeys = newKeys;
}
```

**CSS pour les nouvelles clés** :
```css
.args-row-new {
  background: rgba(22, 119, 255, 0.06);  /* bleu très clair */
  transition: background 600ms ease-out;
}

/* Fade-in du texte des arguments */
.fade-token {
  animation: tokenFadeIn 400ms ease-out;
}
@keyframes tokenFadeIn {
  0%   { opacity: 0.3; color: #1677ff; }   /* bleu */
  100% { opacity: 1;   color: #333; }       /* normal */
}
```

---

## Arbre d'arguments (template du composant)

```html
<!-- Streaming : args en live -->
<div class="args-tree" *ngIf="hasVisibleArgs(t)" [@argsExpand]>
  <div *ngFor="let field of getArgsFields(t)"
       class="args-row"
       [class.args-row-new]="t.changedKeys?.has(field.key)">

    <!-- Label (mapping prioritaire) -->
    <span class="args-label">{{ field.label }}</span>

    <!-- Valeur -->
    <span class="args-value" *ngIf="isSimple(field.value)">
      {{ field.value }}
    </span>

    <!-- Valeur complexe (objet/tableau) → JSON formaté -->
    <pre class="args-value-json" *ngIf="!isSimple(field.value)">
      {{ field.value | json }}
    </pre>

    <!-- Troncature pour les longues valeurs -->
    <span *ngIf="isTruncated(field.value)" class="args-more"
          (click)="expandArg(field)">
      voir plus
    </span>
  </div>
</div>
```

**Animation d'expansion** :
```typescript
trigger('argsExpand', [
  transition(':enter', [
    style({ height: 0, opacity: 0, overflow: 'hidden' }),
    animate('250ms cubic-bezier(0.16, 1, 0.3, 1)',
      style({ height: '*', opacity: 1 })),
  ]),
  transition(':leave', [
    style({ overflow: 'hidden' }),
    animate('200ms ease-in',
      style({ height: 0, opacity: 0 })),
  ]),
])
```

---

## Résumé collapsé (messages historiques)

Après le streaming, les tools sont persistés et affichés en mode résumé :

```
┌──────────────────────────────────────────────────────────┐
│ 4 outil(s) exécuté(s)                          ▼        │
├──────────────────────────────────────────────────────────┤
│ ✅ Activer capsule — workflow              45ms    🔍   │
│ ✅ Créer un workflow                      120ms    🔍   │
│ ✅ Ajouter un nœud — smtp_send_email       89ms    🔍   │
│ ✅ Connecter les nœuds                     34ms    🔍   │
└──────────────────────────────────────────────────────────┘
```

- **Collapsé par défaut** : juste "N outil(s) exécuté(s)"
- **Déplié** : chaque tool avec icône + nom + durée
- **🔍** : cliquer ouvre le dialogue de résultat détaillé
- **Args** : visibles au clic sur le tool (même mapping de labels)

---

## Cas spécial : `execute_tool` (NodeTemplates)

`execute_tool` est le tool le plus complexe côté affichage car il exécute un NodeTemplate :

### Détection précoce du titre (pendant le building)

Le backend détecte la clé du template dans le JSON partiel **pendant le streaming** :

```javascript
// agent-harness.js — early key detection
if (event.name === 'execute_tool' && !toolMetaResolved.has(event.id)) {
  const keyMatch = buf.match(/"key"\s*:\s*"([^"]+)"/);
  if (keyMatch) {
    // Chercher le NodeTemplate en DB
    const tpl = await NodeTemplate.findOne({ key: templateKey });
    // Envoyer le titre + schéma d'args au frontend
    yield {
      type: 'tool.meta',
      id: event.id,
      displayTitle: tpl.title,            // "Envoyer un email"
      argsSchema: fields.map(f => ({
        key: f.key,
        label: f.label || f.key,          // "Destinataire", "Sujet", etc.
      })),
    };
  }
}
```

### Affichage des args internes

Pour `execute_tool`, les arguments visibles sont les **args internes** (pas `key` ni `credential_id`) :

```typescript
// L'objet envoyé au LLM :
{
  key: "smtp_send_email",           // ← pas affiché
  credential_id: "cred_abc",       // ← pas affiché
  args: {                          // ← CE QU'ON AFFICHE
    to: "john@example.com",
    subject: "Rapport mensuel",
    body: "Bonjour...",
  }
}

// getArgsFields extrait t.args.args pour execute_tool
const data = (t.name === 'execute_tool' && t.args?.args)
  ? t.args.args    // ← args internes
  : t.args;        // ← args directs pour les autres tools
```

---

## Diagramme de séquence complet

```
User envoie "Envoie un email à john@example.com"
│
├─── LLM pense : "Je dois chercher l'outil email"
│    ↓
│    SEGMENT REASONING (gris, collapsé)
│    "Je vais utiliser search_tools pour trouver..."
│
├─── tool.start → search_tools
│    ↓ tool-building (⚙ gris)
│    ↓ tool.input_delta → {"query": "email"}
│    ↓ parsedArgs → { query: "email" }
│    ↓ label mapping → { label: "Recherche", value: "email" }
│    ↓ tool.building_done → tool-running (🔄 bleu)
│    ↓ tool.end (success, 45ms) → tool-success (✅ vert)
│    ↓ COLLAPSE → "✅ Recherche d'outils — email  45ms"
│
├─── tool.start → execute_tool
│    ↓ tool-building (⚙ gris, titre: "Exécution...")
│    ↓ tool.input_delta → {"key": "smtp_s...
│    ↓ tool.meta → { displayTitle: "Envoyer un email",
│    │               argsSchema: [{key:"to", label:"Destinataire"}, ...] }
│    ↓ titre mis à jour → "Envoyer un email"
│    ↓ tool.input_delta → ..."to": "john@example.com"...
│    ↓ parsedArgs → { to: "john@example.com" }
│    ↓ label mapping → { label: "Destinataire", value: "john@example.com" }
│    ↓ ANIMATION fade-token sur "john@example.com"
│    ↓ tool.building_done → tool-running (🔄 bleu)
│    ↓ tool.end (success, 120ms) → tool-success (✅ vert)
│
├─── LLM répond :
│    SEGMENT TEXTE
│    "L'email a bien été envoyé à john@example.com."
│
└─── done
```

---

## Fichiers de référence

| Fichier | Rôle | Lignes clés |
|---------|------|-------------|
| `Homeport/src/app/features/ai/ai.service.ts` | SSE streaming, parsing events, gestion `argsSchemaMap` + `displayTitleMap` | L297-477 (streamPost), L26-35 (AiToolCall interface) |
| `Homeport/src/app/features/ai/ai-chat.component.ts` | Affichage temps réel : rotator, segments, animations | L98-106 (StreamTool), L922-1123 (processStreamEvent), L1229-1305 (display/labels) |
| `Homeport/src/app/features/ai/ai-message.component.ts` | Affichage historique : segments persistés, résumé collapsé | L117-164 (getProcessedSegments), L485-506 (argsSchema) |
| `API/src/ai/agent-harness.js` | Backend : émission tool.meta avec displayTitle + argsSchema | L232-258 (early key detection), L264-282 (tool.meta + building_done) |
