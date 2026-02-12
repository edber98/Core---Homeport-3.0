# Moteur d'execution (Engine)

Fichier: `API/src/engine/index.js`

## Vue d'ensemble

Le moteur parcourt le graphe du flow node par node, en commencant par le node `start`.

```
Start → Function A → Condition → [Branche 1] → Function B
                                → [Branche 2] → Function C
```

## Cycle d'execution d'un node

1. **buildGraph()** - Construit le graphe a partir du flow (nodes + edges)
2. **findStartNode()** - Trouve le node start
3. **runBranch()** - Execute recursivement chaque node:
   a. Identifie le type (`start`, `condition`, `loop`, `function`, `agent`, `memory`, `tool_ai`)
   b. Compile les args via `deepRender()` (resolution des expressions `{{ }}`)
   c. Appelle le handler via `registry.resolve(templateKey)`
   d. Stocke le resultat dans `msg[nodeId]` et `msg.payload`
   e. Emet les evenements SSE (`node.started`, `node.done`, `edge.taken`)
   f. Route vers les nodes suivants selon les outputHandles

## Context d'evaluation

```javascript
// buildEvalContext(initialContext, msg) cree:
{
  ...initialContext,    // Variables globales du run
  msg: msg,             // Message complet
  payload: msg.payload, // Raccourci vers le payload
  _nodes: msg._nodes,   // Historique des nodes
  // + chaque resultat de node expose: {{ nodeId.champ }}
}
```

### Expressions supportees dans les champs

```
{{ msg.payload.email }}              // Acces au payload courant
{{ start_form_abc123.email }}        // Resultat d'un node par son ID
{{ payload.items[0].name }}          // Acces indexe
{{ loop.item.name }}                 // Element courant dans une boucle
{{ loop.index }}                     // Index courant dans une boucle
```

### Expressions speciales

```javascript
// Objet $expr pour evaluation JavaScript
{ "$expr": "inputs.count * 2" }
```

## Execution par type de node

### start / start_form
- Prend `msg.payload` comme resultat
- Expose sous `msg[nodeId]`
- Route vers tous les edges sortants

### function / agent / tool_ai / memory
- Compile les args: `deepRender(node.model.context, evalCtx)`
- Resolve le handler: `registry.resolve(templateKey)`
- Injecte les credentials via `initialContext.getCredentials(node)`
- Collecte les donnees entrantes par handle: `opts.incoming.byHandle`
- Appelle: `fn({ id, model }, msg, compiledInputs, opts)`
- Stocke resultat: `msg[nodeId] = result; msg.payload = result;`
- **Gestion d'erreur**:
  - Si `result.ok === false` ou `result.error`:
    - `skip_error` → return (ignore)
    - `catch_error` → route vers handle `err`/`error`
    - Sinon → throw Error
  - Si succes:
    - Si `result._output` est defini → route vers le handle `sourceHandle === _output` uniquement
    - Si `forceBranches[nodeId]` est defini (simulation) → route vers ce handle uniquement
    - Sinon → route vers tous les handles != `err`/`error` (comportement standard)

### condition
- Evalue chaque branche (`items`) via `evaluateCondition()`
- Supporte `firstMatch` (defaut) ou `allMatches`
- Route via `sourceHandle` = `_id` ou `name` de la branche
- Si aucune branche → route vers `else` (si active)
- Pas de handler JS, le moteur gere la logique

### loop
- Resolve la collection d'items (handle `items`, expression, path, payload)
- Pour chaque element:
  - Clone le message
  - Set `msgClone.loop = { item, index, length }`
  - Si `perItemPayload`: `msgClone.payload = item`
  - Execute la branche `each`
- Apres la boucle: route vers `after`
- `resultMode`: `collect` (array de tous les payloads) ou `last` (dernier payload)

## Flux de donnees entre nodes

```
Node A retourne: { ok: true, name: "John", age: 30 }
  ↓
msg.payload = { ok: true, name: "John", age: 30 }
msg[nodeA_id] = { ok: true, name: "John", age: 30 }
  ↓
Node B peut acceder via:
  - inputs (ses propres args compiles)
  - {{ nodeA_id.name }} → "John"
  - {{ payload.age }} → 30
  - opts.incoming.byHandle['in'][0] → { ok: true, name: "John", age: 30 }
```

## Evenements SSE emis

| Evenement | Quand | Donnees |
|-----------|-------|---------|
| `run.started` | Debut du flow | `startedAt` |
| `node.started` | Debut d'un node | `nodeId, argsPre, argsPost, msgIn` |
| `node.done` | Fin d'un node | `nodeId, result, durationMs, msgIn, msgOut` |
| `node.skipped` | Node ignore | `nodeId` |
| `edge.taken` | Edge traversee | `sourceId, targetId` |
| `run.completed` | Fin du flow | `payload` |
| `run.cancelled` | Flow annule | `reason` |

## Normalisation des cles

Le moteur et le registry normalisent les cles de template:
- Supprime les prefixes: `tmpl_`, `template_`, `fn_`, `node_`
- Minuscules
- Remplace les caracteres speciaux par `_`

Donc `openai_chat_completion`, `openaiChatCompletion`, `OpenAI_Chat_Completion` resolvent tous vers le meme handler.
