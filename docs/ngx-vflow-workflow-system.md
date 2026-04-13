# ngx-vflow — Système de workflow visuel complet

> Architecture technique du workflow builder de Homeport :
> modèle de données, rendu ngx-vflow, connexions, exécution moteur.
> Conçu pour être reproduit (ex: gestion documentaire, validation, approbation).

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Angular)                           │
│                                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐     │
│  │ flow-builder │──►│ <vflow>      │──►│ Rendu SVG + HTML     │     │
│  │ .component   │   │  nodes[]     │   │ Nœuds = cartes HTML  │     │
│  │              │   │  edges[]     │   │ Edges = paths SVG    │     │
│  └──────┬───────┘   └──────────────┘   └──────────────────────┘     │
│         │                                                           │
│  ┌──────▼───────┐   ┌──────────────┐   ┌──────────────────────┐     │
│  │ flow-graph   │   │ flow-builder │   │ edge-curves.ts       │     │
│  │ .service     │   │ -utils       │   │ backAwareCurve       │     │
│  │ (outputIds,  │   │ .service     │   │ (routage A* pour     │     │
│  │  labels)     │   │ (add/remove/ │   │  connexions arrière) │     │
│  └──────────────┘   │  connect)    │   └──────────────────────┘     │
│                     └──────────────┘                                │
├─────────────────────────────────────────────────────────────────────┤
│                        BACKEND (Express + MongoDB)                  │
│                                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐     │
│  │ Flow model   │   │ NodeTemplate │   │ Engine               │     │
│  │ .graph =     │   │ model        │   │ (exécution du graph  │     │
│  │ {nodes,edges}│   │ (type, args, │   │  nœud par nœud,      │     │
│  │              │   │  handles)    │   │  SSE events)         │     │
│  └──────────────┘   └──────────────┘   └──────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Modèle de données

### Flow (document MongoDB)

```javascript
{
  id: "flow_abc123",
  name: "Validation de document",
  workspaceId: ObjectId,
  description: "Workflow d'approbation en 3 étapes",
  status: "draft" | "test" | "production",
  enabled: true,

  // ⭐ Le graphe visuel — c'est CE QUI EST STOCKÉ
  graph: {
    nodes: [/* voir ci-dessous */],
    edges: [/* voir ci-dessous */],
  },

  // Paramètres UI
  settings: {
    portOrientation: "horizontal" | "vertical",
    alignmentHelper: true,
    snapGrid: { size: 20 },
  },

  // Déploiement
  deployedAt: Date,
  triggerType: "subscription" | "webhook" | "polling",
  triggerNodeId: "start_xxx",

  // Validation
  invalid: false,
  validationErrors: [],
  validationWarnings: [],
}
```

### Node (stocké dans `graph.nodes[]`)

```javascript
{
  id: "function_send_email_a3b2_x9k8",  // type_name_timestamp_random
  point: { x: 400, y: 200 },            // position sur le canvas
  type: "html-template",                 // type ngx-vflow (toujours celui-ci)

  data: {
    model: {
      id: "function_send_email_a3b2_x9k8",
      name: "Envoyer un email",
      template: "tpl_smtp_send_email",     // référence au NodeTemplate
      templateObj: { /* NodeTemplate complet embarqué */ },

      // ⭐ Configuration du nœud (remplie par l'utilisateur)
      context: {
        to: "{{ start_form.email }}",
        subject: "Document à valider",
        body: "Bonjour, {{ start_form.name }}...",
      },

      // Options
      description: "Notifie le validateur",
      catch_error: false,
      expand_description: false,
    },
  },
}
```

### NodeTemplate (définition d'un type de nœud)

```javascript
{
  key: "smtp_send_email",              // identifiant unique normalisé
  name: "send_email",
  title: "Envoyer un email",
  subtitle: "SMTP",
  icon: "fa-solid fa-envelope",
  description: "Envoie un email via SMTP",
  type: "function",                    // start | start_form | event | function |
                                       // condition | loop | end | agent | ...

  // ⭐ Formulaire de configuration (JSON Schema custom)
  args: {
    fields: [
      { key: "to", label: "Destinataire", type: "text", required: true },
      { key: "subject", label: "Sujet", type: "text", required: true },
      { key: "body", label: "Corps", type: "textarea" },
      { key: "cc", label: "Copie", type: "text" },
    ],
  },

  // ⭐ Ports d'entrée/sortie
  inputHandles: [
    { id: "in", name: "Entrée", type: "any", multiple: true },
  ],
  outputHandles: [
    { id: "out", name: "Succès", type: "any" },
  ],

  // Gestion d'erreur
  authorize_catch_error: true,   // → ajoute un port "err"
  authorize_skip_error: false,

  // Sorties dynamiques (condition, multi-output)
  output_array_field: null,      // ex: "items" pour condition
  outputSchema: null,            // schéma de sortie pour la simulation

  // Checksums pour la validation
  checksumArgs: "a1b2c3d4",
  checksumFeature: "e5f6g7h8",
}
```

### Edge (stocké dans `graph.edges[]`)

```javascript
{
  id: "nodeA->nodeB:out:in",           // source->target:sourceHandle:targetHandle
  type: "template",
  source: "function_send_email_a3b2",  // id du nœud source
  target: "function_notify_x9k8",      // id du nœud cible
  sourceHandle: "out",                 // port de sortie
  targetHandle: "in",                  // port d'entrée

  // Label affiché sur la connexion
  edgeLabelHtml: {
    center: {
      type: "html-template",
      data: { text: "Succès" },         // "Succès", "Erreur", "Sinon", nom de branche
    },
  },

  // Style
  data: {
    strokeWidth: 2,
    color: "#b1b1b7",                  // gris par défaut
    error: false,                      // true → rose #f759ab
  },

  // Flèche au bout
  markers: {
    end: { type: "arrow-closed", color: "#b1b1b7" },
  },
}
```

---

## 2. Intégration ngx-vflow

### Le composant `<vflow>`

```html
<vflow
  view="auto"
  [background]="{ type: 'dots' }"
  [nodes]="nodesView"
  [edges]="renderedEdges"
  [connection]="connectionSettings"
  [entitiesSelectable]="true"
  [minZoom]="0.05"
  [maxZoom]="3"
  [alignmentHelper]="true"
  [snapGrid]="{ size: 20 }"
  [keyboardShortcuts]="{ multiSelection: ['ShiftLeft', 'ShiftRight'] }"

  (onConnect)="onConnect($event)"
  (onComponentNodeEvent)="onComponentNodeEvent($event)"
  (onNodesChange.position.single)="onNodePositionChange($event)"
  (onNodesChange.position.many)="onNodesPositionMany($event)"
  (onNodesChange.remove.many)="onNodesRemoved($event)"
  (onEdgesChange.remove)="onEdgesRemoved($event)"
  (onEdgesChange.detached)="onEdgesDetached($event)"
  #flow>

  <!-- Template pour les connexions (preview pendant le drag) -->
  <ng-template let-ctx connection>
    <svg:path [attr.d]="ctx.path()" stroke="#1677ff" stroke-width="2"
              fill="none" stroke-dasharray="5,5" />
  </ng-template>

  <!-- Template pour les edges (connexions établies) -->
  <ng-template let-ctx edge>
    <svg:g customTemplateEdge>
      <svg:path [attr.d]="ctx.path()"
                [attr.stroke]="ctx.edge.data?.color || '#b1b1b7'"
                [attr.stroke-width]="ctx.edge.data?.strokeWidth || 2"
                fill="none" />
    </svg:g>
  </ng-template>

  <!-- Template pour les labels sur les edges -->
  <ng-template let-ctx edgeLabelHtml>
    <div class="edge-label">
      <span class="badge">{{ getEdgeLabel(ctx.edge) }}</span>
      <button class="delete-btn" (click)="onDeleteEdgeClick($event, ctx.edge)">
        <i class="fa-regular fa-circle-xmark"></i>
      </button>
    </div>
  </ng-template>

  <!-- ⭐ Template pour les nœuds (carte HTML custom) -->
  <ng-template let-ctx nodeHtml>
    <!-- Voir section 3 ci-dessous -->
  </ng-template>

</vflow>
```

### Ce que fait ngx-vflow

| Fonctionnalité | Description |
|----------------|-------------|
| **Rendu des nœuds** | Positionne des divs HTML aux coordonnées `node.point` |
| **Rendu des edges** | Dessine des paths SVG entre les handles |
| **Drag & drop** | Déplace les nœuds (met à jour `node.point`) |
| **Zoom & pan** | Molette + clic milieu, viewport state |
| **Sélection** | Clic/Shift+clic/rectangle de sélection |
| **Connexion** | Drag depuis un handle source vers un handle target |
| **Handles** | Points d'accroche (entrée/sortie) sur les nœuds |
| **Snap grid** | Alignement automatique sur grille |
| **Minimap** | Vue miniature du graphe |

### Ce que ngx-vflow NE fait PAS (géré par Homeport)

| Fonctionnalité | Géré par |
|----------------|----------|
| Validation des connexions | `validateConnection()` dans flow-builder |
| Routage des edges arrière | `backAwareCurve` dans edge-curves.ts |
| Labels sur les edges | Templates custom + `computeEdgeLabel()` |
| Formulaire de configuration | `node-settings-v2-dialog` |
| Exécution du workflow | `API/src/engine/index.js` |
| Undo/redo | `FlowHistoryService` |

---

## 3. Rendu d'un nœud (carte custom)

Chaque nœud est une carte HTML avec header, description, et handles :

```
┌─────────────────────────────────────────┐
│  📧  Envoyer un email                  │  ← header (icône + titre)
│  SMTP                                  │  ← subtitle (provider)
│                                         │
│  Notifie le validateur                  │  ← description (optionnelle)
│                                         │
●─ in                              out ─● │  ← handles (entrée/sortie)
│                                  err ─● │  ← handle erreur (optionnel)
│                                         │
│                                    ✅ 3 │  ← badge d'exécution
└─────────────────────────────────────────┘
```

### Template HTML simplifié

```html
<ng-template let-ctx nodeHtml>
  <div class="node-card"
       [class.selected]="isSelected(ctx.node)"
       [class.error-node]="isInErrorBranch(ctx.node.id)"
       [class.invalid]="hasValidationError(ctx.node.id)"
       (dblclick)="openNodeSettings(ctx.node)">

    <!-- Header -->
    <div class="node-header">
      <i [class]="ctx.node.data.model.templateObj?.icon"></i>
      <span class="title">{{ ctx.node.data.model.templateObj?.title }}</span>
    </div>

    <!-- Subtitle (provider) -->
    <div class="node-subtitle" *ngIf="ctx.node.data.model.templateObj?.subtitle">
      {{ ctx.node.data.model.templateObj.subtitle }}
    </div>

    <!-- Description -->
    <div class="node-desc" *ngIf="ctx.node.data.model.description">
      {{ ctx.node.data.model.description }}
    </div>

    <!-- Handles d'entrée (gauche en horizontal, haut en vertical) -->
    <div class="inputs">
      <div *ngFor="let ih of ctx.node.data.model.templateObj?.inputHandles">
        <handle
          [position]="portOrientation === 'horizontal' ? 'left' : 'top'"
          type="target"
          [id]="ih.id"
          [template]="inputHandleTpl">
        </handle>
        <span class="handle-label">{{ ih.name }}</span>
      </div>
    </div>

    <!-- Handles de sortie (droite en horizontal, bas en vertical) -->
    <div class="outputs">
      <div *ngFor="let out of outputIds(ctx.node.data.model)">
        <handle
          [position]="portOrientation === 'horizontal' ? 'right' : 'bottom'"
          type="source"
          [id]="out"
          [template]="outputHandleTpl">
        </handle>
        <span class="handle-label">{{ getOutputName(ctx.node.data.model, out) }}</span>

        <!-- ⭐ Bouton "+" sur les handles non connectés -->
        <button *ngIf="!isOutputConnected(ctx.node.id, out)"
                class="add-node-btn"
                (click)="openAddNodeFromHandle(ctx.node.id, out, $event)">
          +
        </button>
      </div>
    </div>

    <!-- Badge d'exécution -->
    <div class="exec-badge" *ngIf="nodeExecStatus(ctx.node.id) as st">
      <i class="fa-solid" [class.fa-circle-check]="st.ok" [class.fa-circle-xmark]="!st.ok"></i>
      <span>{{ st.count }}</span>
    </div>
  </div>
</ng-template>
```

### Template des handles (points d'accroche)

```html
<!-- Handle = cercle SVG interactif -->
<ng-template #outputHandleTpl let-hctx>
  <svg:circle
    [attr.r]="hctx.state() === 'valid' ? 6 : 4"
    [attr.fill]="hctx.state() === 'valid' ? '#1677ff' : '#fff'"
    [attr.stroke]="out === 'err' ? '#f759ab' : '#b1b1b7'"
    stroke-width="2"
    (pointerdown)="onConnectStartFrom(ctx.node.id, out)">
  </svg:circle>

  <!-- Ligne d'assistance (apparaît au hover si pas connecté) -->
  <svg:line *ngIf="!isOutputConnected(ctx.node.id, out) && isAssistReady()"
            x1="0" y1="0" x2="60" y2="0"
            [attr.stroke]="out === 'err' ? '#f759ab' : '#000'"
            stroke-dasharray="4,4" />

  <!-- Bouton + au bout de la ligne d'assistance -->
  <svg:circle *ngIf="showAssist" r="8" cx="60" cy="0"
              fill="#1677ff" stroke="white"
              (click)="openAddNodeFromHandle(ctx.node.id, out, $event)" />
</ng-template>
```

**État du handle pendant le drag** :
- `idle` : cercle petit (r=4), blanc
- `valid` : cercle grand (r=6), bleu — connexion possible
- `invalid` : cercle petit, rouge — connexion interdite

---

## 4. Handles dynamiques (sorties multiples)

Les nœuds de type **condition**, **loop**, et **function multi-output** ont des sorties dynamiques.

### Condition (branches)

```javascript
// NodeTemplate
{
  type: "condition",
  output_array_field: "items",   // ← les branches sont dans context.items
}

// Context du nœud (configuré par l'utilisateur)
{
  items: [
    { _id: "cid_abc", name: "Approuvé", condition: "{{ msg.status === 'approved' }}" },
    { _id: "cid_def", name: "Rejeté", condition: "{{ msg.status === 'rejected' }}" },
  ],
  else_enabled: true,
  else: { _id: "cid_else" },
}
```

Résultat visuel :
```
                              Approuvé ─●
┌──────────────────────┐      Rejeté ──●
│  ❓ Vérifier statut  │      Sinon ───●
●─ in                  │
└──────────────────────┘
```

### Loop (boucle)

```
                              Chaque ──●  (exécuté pour chaque item)
┌──────────────────────┐      Après ───●  (exécuté une fois à la fin)
│  🔄 Pour chaque doc  │
●─ in                  │
└──────────────────────┘
```

Handles fixes : `each` + `after`

### Function multi-output

```javascript
// NodeTemplate
{
  type: "function",
  output_array_field: "categories",  // ← sorties dynamiques
}

// Context
{
  categories: [
    { _id: "cat_ok", name: "Validé" },
    { _id: "cat_ko", name: "Invalidé" },
  ]
}

// Le handler retourne : { _output: "cat_ok", data: {...} }
// → Le moteur route vers l'edge avec sourceHandle="cat_ok"
```

### Calcul des IDs de sortie

```typescript
// flow-graph.service.ts
outputIds(model, edges?): string[] {
  const tpl = model.templateObj;
  const ids: string[] = [];

  // 1. Handle d'erreur (si autorisé et activé)
  if (tpl.authorize_catch_error && model.catch_error) {
    ids.push('err');
  }

  // 2. Handles statiques définis sur le template
  if (tpl.outputHandles?.length) {
    for (const oh of tpl.outputHandles) ids.push(oh.id);
  }

  // 3. Handles dynamiques (condition, multi-output function)
  if (tpl.output_array_field) {
    const items = model.context?.[tpl.output_array_field] || [];
    for (const item of items) {
      ids.push(item._id || `idx_${items.indexOf(item)}`);
    }
    // Handle "sinon" pour les conditions
    if (model.context?.else_enabled && model.context?.else?._id) {
      ids.push(model.context.else._id);
    }
  }

  // 4. Fallback : un seul handle "out"
  if (ids.length === 0 || (ids.length === 1 && ids[0] === 'err')) {
    ids.push('out');
  }

  return ids;
}
```

### Stabilité des IDs (CRITIQUE)

Quand l'utilisateur modifie les branches d'une condition, les `_id` doivent rester stables pour ne pas casser les edges existants :

```typescript
// flow-builder-utils.service.ts
ensureStableConditionIds(oldModel, newModel): model {
  const oldItems = oldModel?.context?.items || [];
  const newItems = newModel?.context?.items || [];

  for (const item of newItems) {
    if (item._id) continue;  // déjà un ID → garder

    // Chercher par nom dans l'ancien modèle
    const match = oldItems.find(o => o.name === item.name);
    if (match) {
      item._id = match._id;  // réutiliser l'ancien ID
    } else {
      item._id = generateUUID();  // nouveau ID
    }
  }

  return newModel;
}
```

---

## 5. Validation des connexions

Quand l'utilisateur drag une connexion d'un handle source vers un handle target :

```typescript
// flow-builder.component.ts
connectionSettings = {
  type: 'template',
  curve: backAwareCurve,
  validator: (connection) => this.validateConnection(connection),
};

validateConnection(c: Connection): boolean {
  const sourceNode = this.getNode(c.source);
  const targetNode = this.getNode(c.target);

  // Règle 1 : les triggers n'acceptent pas d'entrées
  const targetType = targetNode.data.model.templateObj?.type;
  if (['start', 'start_form', 'event', 'endpoint'].includes(targetType)) {
    return false;
  }

  // Règle 2 : vérifier la compatibilité de type
  const sourceHandle = this.getOutputHandle(sourceNode, c.sourceHandle);
  const targetHandle = this.getInputHandle(targetNode, c.targetHandle);

  const sourceType = sourceHandle?.type || 'any';
  const targetAccepts = targetHandle?.accepts || ['any'];

  if (sourceType !== 'any' && !targetAccepts.includes('any') &&
      !targetAccepts.includes(sourceType)) {
    return false;  // types incompatibles
  }

  // Règle 3 : multiplicité
  // Source : si multiple=false, max 1 edge sortant de ce handle
  if (sourceHandle?.multiple === false) {
    const existing = this.edges.filter(
      e => e.source === c.source && e.sourceHandle === c.sourceHandle
    );
    if (existing.length > 0) return false;
  }

  // Target : si multiple=false, max 1 edge entrant sur ce handle
  if (targetHandle?.multiple === false) {
    const existing = this.edges.filter(
      e => e.target === c.target && e.targetHandle === c.targetHandle
    );
    if (existing.length > 0) return false;
  }

  return true;
}
```

---

## 6. Routage des edges (backAwareCurve)

Les connexions normales (gauche → droite) utilisent une courbe bézier simple.
Les connexions **arrière** (droite → gauche, boucles) utilisent un algorithme A* :

```
Connexion normale (forward) :
  Source ●────────────────────● Target

Connexion arrière (backward) :
  Target ●                    ● Source
         │                    │
         │    ┌───────────┐   │
         └────┤           ├───┘
              └───────────┘
```

```typescript
// edge-curves.ts

const BACKWARD_ACTIVATE_OFFSET = 24; // px avant d'activer le mode arrière

function backAwareCurve(source, target, orientation): string {
  const dx = target.x - source.x;

  // Forward : simple bézier
  if (dx > BACKWARD_ACTIVATE_OFFSET) {
    return simpleBezier(source, target);
  }

  // Backward : routage orthogonal A*
  // 1. Gonfler les rectangles des nœuds (padding)
  // 2. Créer une grille sparse
  // 3. A* avec coût manhattan + pénalité de changement de direction
  // 4. Arrondir les coins avec des courbes quadratiques
  return aStarOrthogonal(source, target, obstacles);
}
```

---

## 7. Moteur d'exécution (backend)

Le moteur exécute le graphe nœud par nœud en suivant les edges :

### Flux d'exécution

```
1. Charger le Flow depuis MongoDB
2. Construire le graphe (adjacency lists)
3. Trouver le nœud de démarrage (start/event)
4. Exécuter runBranch(startNodeId, msg, seen)

runBranch(nodeId, msg, seen):
  node = getNode(nodeId)
  switch (node.type):
    case 'start':
      result = msg.payload

    case 'function':
      handler = registry.get(node.templateObj.key)
      compiledArgs = deepRender(node.context, msg)  // {{ expressions }}
      result = await handler(node, msg, compiledArgs, opts)

    case 'condition':
      for (branch of node.context.items):
        if (evaluate(branch.condition, msg)):
          runBranch(nextNode(branch._id), msg, seen)
          break

    case 'loop':
      items = resolveItems(node.context, msg)
      for (item of items):
        clonedMsg = deepClone(msg)
        clonedMsg.payload = item
        runBranch(nextNode('each'), clonedMsg, seen)
      runBranch(nextNode('after'), msg, seen)

  // Stocker le résultat pour les nœuds suivants
  msg[nodeId] = result
  msg._nodes[nodeId] = { result, duration, args }

  // Suivre les edges sortants
  for (edge of outEdges(nodeId)):
    if (shouldTake(edge, result)):
      emit('edge.taken', { source: nodeId, target: edge.target })
      runBranch(edge.target, msg, seen)
```

### Événements SSE émis pendant l'exécution

| Événement | Données | Usage frontend |
|-----------|---------|----------------|
| `run.started` | `{ runId }` | Afficher la barre de progression |
| `node.started` | `{ nodeId, branchId, argsPre }` | Animer le nœud (pulsing) |
| `node.done` | `{ nodeId, result, durationMs }` | Badge vert/rouge + durée |
| `node.log` | `{ nodeId, text }` | Logs en temps réel |
| `edge.taken` | `{ source, target }` | Animer l'edge (highlight) |
| `run.done` | `{ runId, success, error }` | Résumé final |
| `run.cancelled` | `{ runId }` | Annulation |

### Accès aux données entre nœuds

Le `msg` est un objet partagé qui accumule les résultats :

```javascript
// Nœud "start_form" retourne les données du formulaire
msg['start_form_abc'] = { email: "john@test.com", name: "John" }

// Nœud "function" peut référencer via expressions dans ses args
context: {
  to: "{{ start_form_abc.email }}",        // → "john@test.com"
  subject: "Bonjour {{ start_form_abc.name }}", // → "Bonjour John"
}

// deepRender() compile les {{ expressions }} avant exécution
compiledArgs = deepRender(context, msg)
// → { to: "john@test.com", subject: "Bonjour John" }
```

---

## 8. Gestion du graphe (add/remove/connect)

### Ajouter un nœud

```typescript
addNode(template: NodeTemplate, position: {x, y}): Node {
  const id = generateNodeId(template);  // "function_send_email_a3b2_x9k8"

  const node = {
    id,
    point: position,
    type: 'html-template',
    data: {
      model: {
        id,
        name: template.title,
        template: template._id,
        templateObj: template,
        context: {},              // vide, à configurer
        catch_error: false,
      },
    },
  };

  this.nodes = [...this.nodes, node];
  this.pushHistory();
  return node;
}
```

### Connecter deux nœuds

```typescript
onConnect(event: ConnectionEvent): void {
  const edge = {
    id: `${event.source}->${event.target}:${event.sourceHandle}:${event.targetHandle}`,
    type: 'template',
    source: event.source,
    target: event.target,
    sourceHandle: event.sourceHandle,
    targetHandle: event.targetHandle,
    curve: backAwareCurve,
    data: {
      strokeWidth: 2,
      color: this.isErrorHandle(event.sourceHandle) ? '#f759ab' : '#b1b1b7',
      error: this.isErrorHandle(event.sourceHandle),
    },
    edgeLabelHtml: {
      center: {
        type: 'html-template',
        data: { text: computeEdgeLabel(event.source, event.sourceHandle) },
      },
    },
    markers: {
      end: { type: 'arrow-closed', color: '#b1b1b7' },
    },
  };

  this.edges = [...this.edges, edge];
  this.recomputeErrorPropagation();
  this.pushHistory();
}
```

### Supprimer un nœud

```typescript
removeNode(nodeId: string): void {
  // 1. Supprimer le nœud
  this.nodes = this.nodes.filter(n => n.id !== nodeId);

  // 2. Supprimer toutes les edges liées
  this.edges = this.edges.filter(
    e => e.source !== nodeId && e.target !== nodeId
  );

  // 3. Recalculer la propagation d'erreur
  this.recomputeErrorPropagation();
  this.pushHistory();
}
```

### Propagation d'erreur (BFS)

Tous les nœuds atteignables via un handle `err` sont marqués comme "branche d'erreur" :

```typescript
recomputeErrorPropagation(): void {
  // 1. Trouver tous les edges partant d'un handle "err"
  const errorEdges = this.edges.filter(e => e.sourceHandle === 'err');

  // 2. BFS depuis les targets de ces edges
  const errorNodes = new Set<string>();
  const queue = errorEdges.map(e => e.target);

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (errorNodes.has(nodeId)) continue;
    errorNodes.add(nodeId);

    // Ajouter tous les successeurs
    for (const edge of this.edges.filter(e => e.source === nodeId)) {
      queue.push(edge.target);
    }
  }

  // 3. Mettre à jour le style des edges dans la branche erreur
  for (const edge of this.edges) {
    if (errorNodes.has(edge.source) || edge.sourceHandle === 'err') {
      edge.data.color = '#f759ab';   // rose
      edge.data.error = true;
    }
  }
}
```

---

## 9. Persistance et undo/redo

### Sauvegarde locale (draft)

```typescript
// Chaque modification push dans l'historique
pushHistory(): void {
  this.history.push({
    nodes: structuredClone(this.nodes),
    edges: structuredClone(this.edges),
  });

  // Sauvegarde locale immédiate
  localStorage.setItem(
    `flow.draft.${this.flowId}`,
    JSON.stringify({ nodes: this.nodes, edges: this.edges })
  );
}
```

### Sauvegarde backend

```typescript
async saveFlow(): Promise<void> {
  await this.http.put(`/api/flows/${this.flowId}`, {
    name: this.name,
    description: this.description,
    graph: {
      nodes: this.nodes,
      edges: this.edges,
    },
    settings: {
      portOrientation: this.portOrientation,
      alignmentHelper: this.alignmentHelper,
      snapGrid: this.snapGrid,
    },
  });
}
```

---

## 10. Exemple complet : workflow de validation documentaire

Voici comment reproduire un workflow de validation en 3 étapes :

### Le graphe

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│ 📋 Formulaire│────►│ 📧 Notifier  │────►│ ❓ Décision    │
│ de soumission│     │ le validateur│     │                │
│ (start_form) │     │ (function)   │     │ (condition)    │
└─────────────┘     └──────────────┘     └───┬───────┬────┘
                                             │       │
                                         Approuvé  Rejeté
                                             │       │
                                             ▼       ▼
                                     ┌──────────┐ ┌──────────┐
                                     │ ✅ Publier│ │ 📧 Rejeter│
                                     │ le doc    │ │ notification
                                     │(function) │ │(function) │
                                     └──────────┘ └──────────┘
```

### Les nœuds en JSON

```javascript
graph: {
  nodes: [
    {
      id: "start_form_submit_a1b2",
      point: { x: 100, y: 200 },
      type: "html-template",
      data: {
        model: {
          id: "start_form_submit_a1b2",
          templateObj: {
            type: "start_form",
            title: "Soumission de document",
            inputHandles: [],
            outputHandles: [{ id: "out", name: "Soumis" }],
          },
          context: {},
          startFormSchema: {
            fields: [
              { key: "title", label: "Titre du document", type: "text", required: true },
              { key: "file", label: "Fichier", type: "file", required: true },
              { key: "urgency", label: "Urgence", type: "select",
                options: [
                  { label: "Normale", value: "normal" },
                  { label: "Urgente", value: "urgent" },
                ] },
            ],
          },
        },
      },
    },
    {
      id: "function_notify_c3d4",
      point: { x: 400, y: 200 },
      type: "html-template",
      data: {
        model: {
          templateObj: {
            type: "function",
            key: "smtp_send_email",
            title: "Notifier le validateur",
            inputHandles: [{ id: "in", name: "Entrée", type: "any" }],
            outputHandles: [{ id: "out", name: "Envoyé" }],
          },
          context: {
            to: "validateur@entreprise.com",
            subject: "Document à valider : {{ start_form_submit_a1b2.title }}",
            body: "Un nouveau document a été soumis. Urgence: {{ start_form_submit_a1b2.urgency }}",
          },
        },
      },
    },
    {
      id: "condition_decision_e5f6",
      point: { x: 700, y: 200 },
      type: "html-template",
      data: {
        model: {
          templateObj: {
            type: "condition",
            title: "Décision",
            output_array_field: "items",
            inputHandles: [{ id: "in", name: "Entrée", type: "any" }],
          },
          context: {
            items: [
              { _id: "br_approved", name: "Approuvé", condition: "{{ msg.payload.decision === 'approved' }}" },
              { _id: "br_rejected", name: "Rejeté", condition: "{{ msg.payload.decision === 'rejected' }}" },
            ],
            else_enabled: false,
          },
        },
      },
    },
    // ... nœuds Publier et Rejeter (similaires à Notifier)
  ],

  edges: [
    {
      id: "start_form_submit_a1b2->function_notify_c3d4:out:in",
      source: "start_form_submit_a1b2",
      target: "function_notify_c3d4",
      sourceHandle: "out",
      targetHandle: "in",
      edgeLabelHtml: { center: { data: { text: "Soumis" } } },
    },
    {
      id: "function_notify_c3d4->condition_decision_e5f6:out:in",
      source: "function_notify_c3d4",
      target: "condition_decision_e5f6",
      sourceHandle: "out",
      targetHandle: "in",
      edgeLabelHtml: { center: { data: { text: "Envoyé" } } },
    },
    {
      id: "condition_decision_e5f6->function_publish_g7h8:br_approved:in",
      source: "condition_decision_e5f6",
      target: "function_publish_g7h8",
      sourceHandle: "br_approved",     // ← ID de la branche
      targetHandle: "in",
      edgeLabelHtml: { center: { data: { text: "Approuvé" } } },
      data: { color: "#52c41a" },      // vert
    },
    {
      id: "condition_decision_e5f6->function_reject_i9j0:br_rejected:in",
      source: "condition_decision_e5f6",
      target: "function_reject_i9j0",
      sourceHandle: "br_rejected",
      targetHandle: "in",
      edgeLabelHtml: { center: { data: { text: "Rejeté" } } },
      data: { color: "#ff4d4f" },      // rouge
    },
  ],
}
```

---

## 11. Fichiers de référence

| Fichier | Rôle |
|---------|------|
| `Homeport/src/app/features/flow/flow-builder.component.ts` | Composant principal du builder |
| `Homeport/src/app/features/flow/flow-builder.component.html` | Template avec `<vflow>` |
| `Homeport/src/app/features/flow/flow-graph.service.ts` | Conversion modèle → handles, labels |
| `Homeport/src/app/features/flow/flow-builder-utils.service.ts` | Add/remove/connect, IDs stables, checksums |
| `Homeport/src/app/features/flow/edge-curves.ts` | Routage A* pour les edges arrière |
| `Homeport/src/app/features/flow/flow-viewer.component.ts` | Vue lecture seule du flow |
| `Homeport/src/app/features/flow/node-settings-v2-dialog.component.ts` | Dialogue de config d'un nœud |
| `API/src/db/models/flow.model.js` | Schéma MongoDB du Flow |
| `API/src/db/models/node-template.model.js` | Schéma MongoDB du NodeTemplate |
| `API/src/engine/index.js` | Moteur d'exécution du graphe |
| `API/src/modules/db/flows.js` | Routes REST (CRUD flows) |
