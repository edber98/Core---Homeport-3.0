# Backend Flows & Dynamic Forms — Architecture, Modèles, API, Expressions

Ce document spécifie le backend pour le Flow Builder et le Dynamic Form:
- Modèles de données (flows, nœuds, arêtes, forms, validateurs)
- Règles d’intégrité (IDs stables, edges des conditions, precedence requiredIf)
- Moteur d’exécution des flows (erreurs, branche err, context)
- API REST (contrats, erreurs, versioning)
- Grammaire d’expressions (syntaxe, fonctions, variables contextuelles)
- Sécurité, multi‑tenant, migration et tests


## 1. Objectifs & Contraintes

- Cohérence end‑to‑end: le backend respecte les décisions UI/UX (ex. conservation des edges de conditions).
- Séparation claire: «définitions» (éditables) vs «versions publiées» (immutables) vs «exécutions» (runtime).
- TypeScript sur tout le stack pour alignement avec l’UI (Angular 20).
- Évaluations d’expressions sûres et déterministes (sandbox sans `eval`).
- Multi‑tenant (organisation/projet) et RBAC.
- Observabilité: logs structurés, corrélation d’exécution, métriques.


## 2. Choix Techniques (proposition)

- Langage: TypeScript (Node.js 20+)
- Framework: NestJS (modules, DI, pipes/validators, interceptors)
- ORM: Prisma (migrations, typage, Postgres `JSONB` pour schémas)
- DB: PostgreSQL 14+ (relations + `JSONB` pour définitions)
- Queue (optionnel exécution async): BullMQ (Redis)
- Validation: Zod (schémas de contrat) + class-validator pour DTO Nest
- Expressions: JSEP + interpréteur sécurisé (ou Jexl sandbox) avec librairie maison pour fonctions autorisées
- AuthN/AuthZ: JWT (opaque) ou OIDC, RBAC projet/scopes

Remarque: L’API reste agnostique; un autre stack (ex. .NET/Python) peut implémenter les mêmes contrats.


## 3. Modèle de Données

Terminologie:
- FlowDefinition: version éditable (brouillon) d’un flow (composée de nœuds/edges)
- FlowVersion: snapshot immuable publié (référence dans les exécutions)
- FlowExecution: instance d’exécution (historique), états des nœuds
- Node: élément du graph (trigger, function, condition, …)
- Edge: liaison dirigée entre `source(outputId)` et `target(inputId)`
- FunctionTemplate: contrat d’un nœud fonction (entrées/sorties paramétrables)
- FormDefinition / FormVersion: similarité avec flow pour versioning

### 3.1. Identifiants & Invariants

- `id`: UUID v4 pour ressources principales.
- `nodeId`/`edgeId`: UUID; pour condition-items, handles stables par index.
- Condition: items `outputs[i]._id` stables tant que l’item existe (renommage ne change pas l’ID). Les edges liés sont conservés; ils sont supprimés seulement si l’item est retiré.
- FunctionNode: expose toujours `ok`, et optionnellement `err` si `authorize_catch_error=true` et `catch_error=true` sur l’instance.
- Dynamic Form: `requiredIf` a priorité sur `required` statique, cf. §6.

### 3.2. Schémas (TypeScript / JSON)

Interfaces TypeScript simplifiées:

```ts
type UUID = string;

export interface FlowDefinition {
  id: UUID;
  orgId: UUID;
  projectId: UUID;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'archived';
}

export type FlowNode =
  | TriggerNode
  | FunctionNode
  | ConditionNode
  | MergeNode
  | DelayNode;

export interface BaseNode {
  id: UUID;
  kind: string; // 'trigger' | 'function' | 'condition' | ...
  name: string;
  position: { x: number; y: number };
  inputs?: string[]; // input handles ids
  outputs?: string[]; // output handles ids
}

export interface TriggerNode extends BaseNode {
  kind: 'trigger';
  config: {
    source: 'http' | 'schedule' | 'event';
    options: Record<string, unknown>;
  };
}

export interface FunctionNode extends BaseNode {
  kind: 'function';
  templateKey: string; // référence FunctionTemplate
  authorize_catch_error: boolean; // hérité du template, copié à la création
  params: Record<string, unknown>;
  settings?: {
    catch_error?: boolean; // affiche sortie 'err' si true && autorisé
    timeoutMs?: number;
    retry?: { count: number; backoffMs: number };
  };
}

export interface ConditionNode extends BaseNode {
  kind: 'condition';
  mode: 'firstMatch' | 'allMatches' | 'elseOnlyIfNoMatch';
  items: Array<{
    _id: string;      // handle stable par index
    label: string;    // nom affiché
    expression: string; // ex: $.input.total > 100 && $.ctx.user.isVip
  }>;
  else?: { _id: string; label?: string };
}

export interface MergeNode extends BaseNode {
  kind: 'merge';
  strategy: 'race' | 'join' | 'concat';
}

export interface DelayNode extends BaseNode {
  kind: 'delay';
  config: { ms?: number; isoDate?: string };
}

export interface FlowEdge {
  id: UUID;
  source: { nodeId: UUID; outputId: string };
  target: { nodeId: UUID; inputId: string };
}

export interface FunctionTemplate {
  key: string;             // unique
  name: string;
  authorize_catch_error: boolean; // toujours présent => UI toggle Paramétrage
  inputs: string[];        // ex.: ['in']
  outputs: string[];       // au moins ['ok'], UI peut afficher 'err' conditionnellement
  paramsSchema: unknown;   // Zod/JSON schema
}
```

Dynamic Form (extraits pertinents):

```ts
export interface FormDefinition {
  id: UUID;
  orgId: UUID;
  projectId: UUID;
  name: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'archived';
}

export interface FormFieldBase {
  id: UUID;
  key: string;                  // chemin dans le modèle
  label: string;
  type: 'text'|'textarea'|'number'|'date'|'select'|'checkbox'|'radio';
  validators?: ValidatorSpec[]; // générés par lUI graphique
  required?: boolean;           // statique
  requiredIf?: string;          // expression logique
}

export type ValidatorSpec =
  | { type: 'required' }
  | { type: 'minLength'; value: number }
  | { type: 'maxLength'; value: number }
  | { type: 'pattern'; value: string }
  | { type: 'min'; value: number }
  | { type: 'max'; value: number }
  | { type: 'integer' }
  | { type: 'dateMin'; value: string }
  | { type: 'dateMax'; value: string };
```


## 4. Intégrité & Règles Backend

### 4.1. Condition items et conservation des edges

- Lors d’un `PUT /flows/:id` (mise à jour du graph):
  - Maintenir `items[i]._id` stables si l’item persiste (même position logique ou migration par label/index).
  - Ne supprimer des edges que si leur `outputId` n’existe plus (item supprimé) ou si le target n’existe plus.
  - Si un item est réordonné/renommé, ses edges gardent `outputId` => inchangés.

Algorithme (pseudo):

```ts
function reconcileEdgesForConditionNode(prev: ConditionNode, next: ConditionNode, edges: FlowEdge[]): FlowEdge[] {
  const nextOutputs = new Set([...(next.items?.map(i => i._id) ?? []), next.else?._id].filter(Boolean));
  return edges.filter(e => {
    if (e.source.nodeId !== next.id) return true;
    return nextOutputs.has(e.source.outputId); // conserve si handle encore présent
  });
}
```

### 4.2. Function nodes et `catch_error`

- Tous les `FunctionTemplate` ont `authorize_catch_error: true|false`.
- Si `authorize_catch_error=true` et que l’instance `settings.catch_error=true`, le moteur expose la branche `err` et route les exceptions dessus.
- Sinon, une exception non interceptée stoppe l’exécution (status = failed).

### 4.3. Dynamic Form — `requiredIf` > `required`

- Le backend valide les définitions et peut fournir un «plan d’évaluation».
- À l’exécution (ou rendu), si `requiredIf` est défini pour un champ:
  - Ignorer `required` statique;
  - `required` est vrai si et seulement si l’expression `requiredIf` est vraie dans le contexte courant.


## 5. API REST (contrats)

Base: `/api/v1` — toutes les réponses en JSON. ETag/If-Match pour mises à jour optimistes.

### 5.1. Flows

- `POST /flows`
  - Body: `FlowDefinition` minimal (sans `id/dates`, générés par le serveur)
  - 201 → `FlowDefinition`

- `GET /flows/:id`
  - 200 → `FlowDefinition`

- `PUT /flows/:id`
  - Body: `FlowDefinition` (brouillon)
  - 200 → `FlowDefinition` mis à jour (edges reconciliés)

- `POST /flows/:id/validate`
  - Body: `{}`
  - 200 → `{ valid: boolean; errors: ValidationIssue[] }`

- `POST /flows/:id/publish`
  - Body: `{ note?: string }`
  - 201 → `FlowVersion` (snapshot immuable)

- `GET /flows/:id/versions`
  - 200 → `FlowVersion[]`

- `POST /flows/:id/simulate`
  - Body: `{ input: any; context?: any; breakpoints?: UUID[] }`
  - 200 → `{ trace: ExecutionTrace; result?: any }`

- `POST /executions`
  - Body: `{ flowVersionId: UUID; input: any; context?: any }`
  - 202 → `{ executionId: UUID }`

- `GET /executions/:id`
  - 200 → `{ status: 'running'|'succeeded'|'failed'; currentNode?: UUID; logs?: LogLine[]; outputs?: any }`

Erreurs communes: `400` (validation), `404`, `409` (conflit de version), `422` (flow invalide non publiable).

### 5.2. Function Templates

- `GET /function-templates`
  - 200 → `FunctionTemplate[]`

- `GET /function-templates/:key`
  - 200 → `FunctionTemplate`

### 5.3. Dynamic Forms

- `POST /forms` / `GET /forms/:id` / `PUT /forms/:id` / `POST /forms/:id/publish`
- `POST /forms/:id/validate`
  - 200 → `{ valid: boolean; errors: ValidationIssue[] }`

- `POST /forms/:id/resolve`
  - Body: `{ model?: any; context?: any }`
  - 200 → `{ resolved: ResolvedForm }`

`ResolvedForm` inclut pour chaque champ l’état `required` final (après `requiredIf`).

### 5.4. Exemples d’erreurs

```json
{
  "error": "ValidationError",
  "message": "Edge source.outputId not found on node",
  "path": ["edges", 3, "source", "outputId"]
}
```


## 6. Évaluation des Expressions

### 6.1. Syntaxe

- Opérateurs logiques: `&&`, `||`, `!`
- Comparaisons: `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `contains`
- Nullish: `??`, coalescence `a ?? b`, `a ?: b` (alias optionnel)
- Accès: `$.input.total`, `$.ctx.user.role`, `$.form.fields['x'].value`
- Littéraux: nombres, chaînes, booléens, `null`/`undefined`

EBNF simplifiée:

```
expression  := orExpr
orExpr      := andExpr ("||" andExpr)*
andExpr     := notExpr ("&&" notExpr)*
notExpr     := ("!" notExpr) | compare
compare     := add (compOp add)?
compOp      := "=="|"!="|">"|">="|"<"|"<="|" in "|" contains "
add         := mul (("+"|"-") mul)*
mul         := unary (("*"|"/") unary)*
unary       := primary | ("-" unary)
primary     := literal | identifier | call | group
group       := "(" expression ")"
```

### 6.2. Contexte & Mots‑clés

Variables réservées (racine `$`):
- `$.input`: payload d’entrée du flow/exécution courante
- `$.ctx`: contexte d’exécution (utilisateur, environnement, paramètres globaux)
- `$.node`: données du nœud courant (sorties précédentes, params)
- `$.env`: variables d’environnement exposées
- `$.now`: date/heure courante (ISO) — immuable durant une évaluation
- `$.form`: modèle courant d’un formulaire (pour `requiredIf`)

Fonctions autorisées (exemples):
- `isEmpty(x)`, `len(x)`, `lower(x)`, `upper(x)`
- `startsWith(x, y)`, `endsWith(x, y)`, `includes(x, y)`
- `regex(x, pattern) -> bool`
- `date(x)`, `before(x, y)`, `after(x, y)`, `addDays(x, n)`

Sécurité:
- Pas d’accès global (`globalThis`, `process`, etc.)
- Quotas (profondeur AST, temps max 10ms par expression)

### 6.3. `requiredIf` — résolution

Pseudo-code:

```ts
function isRequired(field: FormFieldBase, model: any, ctx: any): boolean {
  if (field.requiredIf) {
    return evaluate(field.requiredIf, { form: model, ctx });
  }
  return !!field.required;
}
```


## 7. Moteur d’Exécution des Flows

États: `idle`, `running`, `succeeded`, `failed`.

### 7.1. Algorithme (synchronisé pour simplicité)

```ts
async function run(flow: FlowVersion, input: any, ctx: any): Promise<ExecutionTrace> {
  const state = new Map<UUID, NodeState>();
  const outputs = new Map<string, any>();
  const queue: UUID[] = [findTrigger(flow).id];

  while (queue.length) {
    const nodeId = queue.shift()!;
    const node = getNode(flow, nodeId);
    try {
      const out = await executeNode(node, collectInputs(nodeId, outputs), ctx);
      outputs.set(nodeId, out);

      const nextEdges = selectEdges(flow, node, out);
      for (const e of nextEdges) queue.push(e.target.nodeId);
      state.set(nodeId, { status: 'ok' });
    } catch (err) {
      if (isFunctionNode(node) && node.settings?.catch_error && node.authorize_catch_error) {
        const errEdges = edgesFrom(flow, nodeId, 'err');
        for (const e of errEdges) queue.push(e.target.nodeId);
        state.set(nodeId, { status: 'error', error: serialize(err) });
      } else {
        state.set(nodeId, { status: 'failed', error: serialize(err) });
        break;
      }
    }
  }
  return { state: Object.fromEntries(state), outputs: Object.fromEntries(outputs) };
}
```

`selectEdges` pour ConditionNode:

```ts
function selectEdges(flow: FlowVersion, node: FlowNode, out: any): FlowEdge[] {
  if (node.kind !== 'condition') return edgesFrom(flow, node.id, 'ok'); // par défaut
  const matches = node.items.filter(it => evaluate(it.expression, out));
  if (node.mode === 'firstMatch') {
    const first = matches[0];
    return first ? edgesFrom(flow, node.id, first._id) : edgesFrom(flow, node.id, node.else?._id);
  }
  if (node.mode === 'allMatches') {
    const ids = matches.map(m => m._id);
    return edgesFromMany(flow, node.id, ids.length ? ids : [node.else?._id].filter(Boolean));
  }
  // elseOnlyIfNoMatch
  return matches.length ? [] : edgesFrom(flow, node.id, node.else?._id);
}
```


## 8. Validation Serveur

Règles minimales au `POST/PUT`:
- Unicité `node.id`, `edge.id`.
- `edge.source.nodeId` et `edge.target.nodeId` existent.
- `edge.source.outputId` existe sur le nœud source (pour condition: `items._id` ou `else._id`).
- Absence de cycles si non supportés; sinon limites sur profondeur.
- Pour `FunctionNode`: si `settings.catch_error=true` mais template non autorisé → 400.
- Dynamic Form: `requiredIf` parseable; validateurs supportés; valeurs dans bornes.


## 9. Sécurité & Multi‑tenant

- Clé de partition: `orgId`, optionnellement `projectId`.
- RBAC: rôles `viewer`, `editor`, `publisher`, `runner`.
- Contrôle d’accès sur toutes les routes (`orgId` issu du token).


## 10. Versioning & Migration

- `FlowDefinition`/`FormDefinition`: statuts `draft|archived`.
- Publication crée un `FlowVersion`/`FormVersion` immuable (copie profonde), avec `schemaVersion`.
- Migration: scripts Prisma, bump de `schemaVersion`, adaptateurs de lecture (backward‑compat).


## 11. Observabilité

- Logs JSON (pino): `executionId`, `nodeId`, `templateKey`, latence.
- Traces (OpenTelemetry) optionnel.
- Métriques: temps moyen par template, taux d’erreur, files d’attente.


## 12. Tests

- Unitaires: parse/évaluation d’expressions, sélection d’edges, requiredIf.
- Intégration: API contracts (Zod), publication/validation, exécution happy‑path et erreurs catchées.
- E2E: scénarios builder → publish → simulate → run.


## 13. Annexes

### 13.1. Exemple FlowDefinition (extrait)

```json
{
  "id": "6a7acb5e-b2bc-4c25-9b12-372b2a7d4d86",
  "orgId": "org-1",
  "projectId": "proj-1",
  "name": "Validation de commande",
  "nodes": [
    { "id": "n-trigger", "kind": "trigger", "name": "HTTP", "position": {"x":0,"y":0}, "config": {"source": "http", "options": {"path":"/order"}} },
    { "id": "n-cond", "kind": "condition", "name": "Segmentation", "position": {"x":300,"y":0},
      "items": [
        {"_id":"c-0","label":"VIP","expression":"$.input.total > 1000 && $.ctx.user.isVip"},
        {"_id":"c-1","label":"Standard","expression":"$.input.total <= 1000"}
      ],
      "else": {"_id":"c-else","label":"Autres"}
    },
    { "id": "n-fn", "kind": "function", "name": "Notifier", "position": {"x":600,"y":0},
      "templateKey": "sendEmail", "authorize_catch_error": true, "params": {"to":"support@acme.com"},
      "settings": {"catch_error": true} }
  ],
  "edges": [
    {"id":"e1","source":{"nodeId":"n-trigger","outputId":"ok"},"target":{"nodeId":"n-cond","inputId":"in"}},
    {"id":"e2","source":{"nodeId":"n-cond","outputId":"c-0"},"target":{"nodeId":"n-fn","inputId":"in"}}
  ],
  "status": "draft",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

### 13.2. Exemple FormDefinition (extrait)

```json
{
  "id": "form-1",
  "name": "Client",
  "fields": [
    {
      "id": "f1",
      "key": "email",
      "label": "Email",
      "type": "text",
      "validators": [ {"type":"pattern","value":"^.+@.+$"} ],
      "requiredIf": "!isEmpty($.form['newsletter']) && $.form['newsletter'] == true"
    }
  ],
  "status": "draft"
}
```

---

Prochaines étapes proposées:
1) Scaffolder un service NestJS (`apps/api`) avec Prisma/Postgres et endpoints ci‑dessus
2) Implémenter la validation/conciliation des edges de conditions au `PUT /flows/:id`
3) Ajouter moteur d’exécution minimal (synchronisé), simulation et traces
4) Implémenter l’interpréteur d’expressions sandbox + jeux de tests
5) Brancher l’UI Angular aux routes `validate/publish/simulate`

