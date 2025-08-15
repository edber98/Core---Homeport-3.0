# Flow Builder — Catalogue & Spécifications Techniques

Ce document détaille les types de nœuds, leurs entrées/sorties (handles), paramètres, schémas et conventions d’exécution pour le Flow Builder. Il complète `docs/backend/flows-and-forms-backend.md` en se concentrant exclusivement sur le Flow Builder.


## 1) Conventions Générales

- Identifiants: `node.id` et `edge.id` en UUID. Les handles d’entrée/sortie sont des chaînes stables par type de nœud.
- Sorties communes: la plupart des nœuds fonction exposent `ok`; l’erreur `err` est disponible si `authorize_catch_error=true` (template) et activée `settings.catch_error=true` (instance).
- Paramètres: valeurs statiques ou expressions. Représentation d’une expression sécurisée: `{ "$expr": "$.input.total > 100" }`.
- Merge de paramètres: quand applicable, `finalParam = deepMerge(input.payload, params, precedence='params')` (les params de l’instance l’emportent sur l’entrée).
- Contexte disponible dans les expressions: `$.input`, `$.ctx`, `$.node`, `$.env`, `$.now` (cf. grammaire dans le doc principal).


## 2) Types de Nœuds (catalogue de base)

### 2.1. Trigger — `trigger.http`

- Entrées: aucune
- Sorties: `ok`
- Paramètres (`config`):
  - `path: string` (ex: `/order`)
  - `methods?: string[]` (ex: `["POST"]`)
  - `auth?: { type: 'none'|'apiKey'|'bearer'; header?: string }`
  - `rateLimit?: { rpm: number }`
- Payload de sortie `ok`: `{ body: any, query: Record<string,string>, headers: Record<string,string>, pathParams?: Record<string,string> }`

### 2.2. Trigger — `trigger.schedule`

- Entrées: aucune
- Sorties: `ok`
- Paramètres (`config`):
  - `cron: string` (ex: `0 8 * * 1-5`)
  - `timezone?: string` (IANA)
  - `payload?: any` (statique ou `{ "$expr": "..." }` évalué à la planification)

### 2.3. Condition — `condition`

- Entrées: `in`
- Sorties: une par item `items[i]._id` + optionnelle `else._id`
- Paramètres:
  - `mode: 'firstMatch'|'allMatches'|'elseOnlyIfNoMatch'`
  - `items: Array<{ _id: string; label: string; expression: string }>`
  - `else?: { _id: string; label?: string }`
- Sémantique: voir §6 du doc principal; conservation des edges lorsque les items sont renommés/réordonnés; suppression uniquement si l’item est retiré.

### 2.4. Merge — `merge`

- Entrées: `in[]` (N entrées, logique interne)
- Sorties: `ok`
- Paramètres:
  - `strategy: 'race'|'join'|'concat'`
  - `join?: { keys?: string[]; mode?: 'array'|'object' }`
- Sémantique:
  - `race`: première entrée à produire un `ok` émet et annule les autres.
  - `join`: attend que toutes les entrées émettent, puis agrège.
  - `concat`: pousse chaque entrée au `ok` séquentiellement.

### 2.5. Delay — `delay`

- Entrées: `in`
- Sorties: `ok`
- Paramètres: `config: { ms?: number; isoDate?: string }` (un des deux requis)

### 2.6. Fonction — `http.request`

- Entrées: `in` (optionnelle, permet override)
- Sorties: `ok`, `err?`
- Paramètres (`params`):
  - `url: string | { "$expr": string }`
  - `method?: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'`
  - `headers?: Record<string,string|{ "$expr": string }>`
  - `query?: Record<string,string|number|boolean|{ "$expr": string }>`
  - `body?: any | { "$expr": string }`
  - `timeoutMs?: number` (défaut 10000)
- Settings (`settings`): `catch_error?: boolean`, `retry?: { count: number; backoffMs: number }`
- Sortie `ok`: `{ status: number, headers: Record<string,string>, body: any, elapsedMs: number }`
- Règles: fusion `final = deepMerge($.input, params, precedence='params')`; si `authorize_catch_error && settings.catch_error`, `err` reçoit `{ error, request }`.

### 2.7. Fonction — `data.transform`

- Entrées: `in`
- Sorties: `ok`, `err?`
- Paramètres:
  - `spec: object` — un objet de projection où chaque valeur peut être statique ou `{ "$expr": string }`.
  - `mode?: 'map'|'pick'|'assign'` (défaut `map`)
- Exemples:
  - `spec = { totalWithVat: {"$expr": "$.input.total * 1.2"}, id: {"$expr":"$.input.id"} }`
  - `mode='pick'` avec `spec={ fields: ['id','email'] }`

### 2.8. Fonction — `util.log`

- Entrées: `in`
- Sorties: `ok`, `err?`
- Paramètres:
  - `level?: 'debug'|'info'|'warn'|'error'` (défaut `info`)
  - `message?: string | { "$expr": string }`
  - `data?: any | { "$expr": string }`
- Effet: journalise côté backend, propage l’entrée en `ok`.

### 2.9. Fonction — `string.format`

- Entrées: `in`
- Sorties: `ok`, `err?`
- Paramètres: `template: string` avec placeholders `{expr: ...}` ou `{var: path}`
  - Option 1 (strict): `template` est `{ "$expr": "`"Bonjour ${$.input.name}`"" }`
  - Option 2 (simple): `{var: "$.input.name"}` pour une substitution unique
- Sortie `ok`: `string`

Remarque: ce catalogue est un point de départ. De nouveaux templates sont ajoutables sans modifier l’UI si le contrat reste stable.


## 3) Registre des Templates (format serveur)

Un template de fonction publié par le backend (exposé via `GET /function-templates`) suit ce schéma JSON:

```json
{
  "key": "http.request",
  "name": "HTTP Request",
  "category": "http",
  "authorize_catch_error": true,
  "inputs": ["in"],
  "outputs": ["ok"],
  "paramsSchema": {
    "type": "object",
    "properties": {
      "url": {"oneOf": [{"type": "string"}, {"$ref": "#/definitions/expr"}]},
      "method": {"enum": ["GET","POST","PUT","PATCH","DELETE"]},
      "headers": {"type": "object", "additionalProperties": {"oneOf": [{"type":"string"}, {"$ref":"#/definitions/expr"}]}},
      "query": {"type": "object", "additionalProperties": {"oneOf": [{"type":["string","number","boolean"]}, {"$ref":"#/definitions/expr"}]}},
      "body": {"oneOf": [{"type": ["object","array","string","number","boolean","null"]}, {"$ref":"#/definitions/expr"}]},
      "timeoutMs": {"type": "integer", "minimum": 1}
    },
    "required": ["url"],
    "additionalProperties": false,
    "definitions": {
      "expr": {"type": "object", "properties": {"$expr": {"type": "string"}}, "required": ["$expr"], "additionalProperties": false}
    }
  }
}
```

Le backend peut fournir plusieurs templates regroupés par `category` (http, data, util, storage, …).


## 4) Paramétrage d’Instance (settings)

Disponible pour tout nœud fonction:
- `catch_error?: boolean` — active la branche `err` si autorisée par le template
- `timeoutMs?: number` — limite dure d’exécution handler
- `retry?: { count: number; backoffMs: number }` — retries en cas d’erreur (avant émission `err`)
- `concurrencyKey?: string | { "$expr": string }` — sérialisation des exécutions partageant la même clé
- `idempotencyKey?: string | { "$expr": string }` — déduplication d’appels


## 5) Conventions d’Entrées/Sorties

- `in` reçoit un objet arbitraire (payload) ou `void`.
- `ok` émet le résultat principal du nœud fonction; si le handler renvoie `{ data, meta }`, `ok` porte cet objet.
- `err` émet `{ error: SerializedError, input?: any, params?: any, meta?: any }`.
- Condition: les sorties émettent le même `input` (ou un sous-ensemble) selon les règles d’évaluation; elles peuvent aussi ajouter `{ matchedItemId }` en meta.


## 6) Signatures d’Exécution (backend)

Handlers de fonction (niveau runtime serveur):

```ts
export interface RuntimeContext {
  flowId: string;
  flowVersionId: string;
  executionId: string;
  nodeId: string;
  now: string; // ISO
  env: Record<string, string>;
  ctx: any; // contexte applicatif
  logger: { debug(a:any):void; info(a:any):void; warn(a:any):void; error(a:any):void };
  abortSignal: AbortSignal;
}

export type Handler = (input: any, params: any, context: RuntimeContext) => Promise<any>;
```

- En cas d’exception, si `catch_error` est actif: route vers `err`; sinon l’exécution échoue.
- `timeoutMs` est appliqué via `AbortController`; les handlers compatibles doivent l’honorer.


## 7) Exemples Concrets

### 7.1. HTTP Request minimal

Nœud:
```json
{
  "id":"n1","kind":"function","templateKey":"http.request","name":"Appel API",
  "position": {"x": 600, "y": 0},
  "authorize_catch_error": true,
  "params": { "url": "https://api.example.com/users", "method": "GET" },
  "settings": { "catch_error": true, "timeoutMs": 5000 }
}
```

Sorties:
- `ok`: `{ status, headers, body }`
- `err`: `{ error, request }`

### 7.2. Transform avec expressions

```json
{
  "id":"n2","kind":"function","templateKey":"data.transform","name":"Map données",
  "position": {"x": 900, "y": 0},
  "authorize_catch_error": true,
  "params": {
    "spec": {
      "userId": {"$expr": "$.input.body.id"},
      "fullName": {"$expr": "$.input.body.first + ' ' + $.input.body.last"},
      "vip": {"$expr": "$.ctx.user.isVip ?? false"}
    }
  }
}
```

### 7.3. Condition multi-branches

```json
{
  "id": "n-cond", "kind":"condition","name":"Segmentation",
  "items": [
    {"_id":"c-0","label":"VIP","expression":"$.input.total > 1000 && $.ctx.user.isVip"},
    {"_id":"c-1","label":"Standard","expression":"$.input.total <= 1000"}
  ],
  "else": {"_id":"c-else","label":"Autres"}
}
```


## 8) Validation côté serveur (Flow Builder spécifique)

- `templateKey` doit exister dans le registre de templates.
- `params` doivent respecter `paramsSchema` du template, avec support `{ "$expr": string }`.
- Si `settings.catch_error=true` alors `template.authorize_catch_error` doit être `true`.
- Condition: `items[i]._id` uniques; `expression` parseable; `else` unique.
- Edges: `source.outputId` doit exister sur le nœud (pour condition: item `_id` ou `else._id`).


## 9) Extension du Catalogue

- Ajouter un template = publier un objet JSON conforme à §3 et fournir un handler serveur portant la même clé (`templateKey`).
- Les clients (UI) découvrent dynamiquement les templates via `GET /function-templates` et affichent le formulaire selon `paramsSchema`.
- Catégories suggérées: `http`, `data`, `util`, `storage`, `ai`, `message`.


---

Ce document est une base de référence détaillant les nœuds du Flow Builder, leurs arguments et comportements d’exécution. Il est conçu pour évoluer avec de nouveaux templates sans casser les contrats existants.

