# Node Templates

Un node template definit un type de node utilisable dans les flows. Il est lie a un provider et contient la definition des handles, des args (formulaire) et du type de node.

## Structure complete

```json
{
  "key": "unique_key",                    // REQUIS - doit matcher le handler JS
  "name": "camelCaseName",                // REQUIS - nom interne camelCase
  "schemaVersion": 2,                     // Toujours 2 pour les nouveaux nodes
  "title": "Titre Affiche",              // Titre dans l'UI
  "subtitle": "Sous-titre",              // Sous le titre dans le node
  "type": "function",                     // Type du node (voir ci-dessous)
  "nodeKind": "function",                 // Meme valeur que type (v2)
  "category": "Category",                 // Categorie dans le catalogue
  "providerKey": "mon_provider",          // Lien vers le provider
  "icon": "fa-solid fa-icon",             // Icone FontAwesome
  "description": "Description complete",  // Description dans le catalogue
  "inputHandles": [ ... ],               // Entrees (voir handles.md)
  "outputHandles": [ ... ],              // Sorties (voir handles.md)
  "linkedHandles": [ ... ],              // Liens speciaux (voir handles.md)
  "args": { ... },                        // Formulaire de config (voir form-args.md)
  "output_array_field": "items",          // Champ array qui genere les branches (condition ET function multi-output)
  "outputSchema": [ ... ],               // Schema du resultat (pour function multi-output, voir multi-output.md)
  "authorize_catch_error": true,          // Peut attraper les erreurs (ajoute handle "err")
  "authorize_skip_error": false,          // Peut ignorer les erreurs
  "allowWithoutCredentials": false         // Peut fonctionner sans credentials
}
```

## Types de nodes

### `function` - Node d'operation standard
Le type le plus courant. Recoit des donnees, execute une logique, retourne un resultat.

```json
{
  "type": "function",
  "nodeKind": "function",
  "inputHandles": [{ "id": "in", "name": "In", "type": "any", "accepts": ["any", "payload"] }],
  "outputHandles": [{ "id": "ok", "name": "Success", "type": "payload" }]
}
```

Si `authorize_catch_error: true`, le moteur route vers le handle `err`/`error` en cas d'erreur.

### `function` avec multi-output (sorties dynamiques)
Variante de function ou les sorties sont generees depuis un champ array des args.
Le handler retourne `_output` pour choisir la branche. Voir **multi-output.md** pour les details complets.

```json
{
  "type": "function",
  "nodeKind": "function",
  "output_array_field": "categories",
  "outputSchema": [
    { "key": "category", "type": "string" },
    { "key": "confidence", "type": "number" }
  ],
  "inputHandles": [{ "id": "in", "name": "In", "type": "any", "accepts": ["any", "payload"] }],
  "args": {
    "fields": [
      { "type": "section", "key": "categories", "mode": "array", "fields": [
        { "type": "text", "key": "name", "label": "Nom" },
        { "type": "text", "key": "description", "label": "Description" }
      ]}
    ]
  }
}
```

### `event` - Node declencheur / webhook
Pas d'input handle. Declenche le flow quand un evenement externe arrive.

```json
{
  "type": "event",
  "outputHandles": [{ "id": "ok", "name": "Success", "type": "payload", "schema": "$var:http_incoming" }],
  "args": { "fields": [{ "type": "text", "key": "path", "label": "Chemin webhook" }] }
}
```

### `start` - Point d'entree du flow
Noeud de demarrage simple. Pas d'input.

```json
{
  "type": "start",
  "outputHandles": [{ "id": "ok", "name": "Success", "type": "payload" }],
  "args": { "fields": [] }
}
```

### `start_form` - Demarrage par formulaire
Demarre le flow via un formulaire rempli par l'utilisateur.

```json
{
  "type": "start_form",
  "outputHandles": [{ "id": "ok", "name": "Success", "type": "payload" }]
}
```

### `condition` - Branchement conditionnel
Node special avec `output_array_field` qui genere dynamiquement les branches de sortie.

```json
{
  "type": "condition",
  "output_array_field": "items",
  "args": {
    "fields": [{
      "type": "section", "key": "items", "mode": "array",
      "fields": [
        { "type": "text", "key": "name", "label": "Nom de branche" },
        { "type": "text", "key": "condition", "label": "Condition", "expression": { "allow": true } }
      ]
    }]
  }
}
```

Le moteur evalue chaque condition et route vers la branche correspondante via `sourceHandle`.

### `loop` - Boucle for-each
Itere sur une collection et execute une branche pour chaque element.

```json
{
  "type": "loop",
  "inputHandles": [
    { "id": "in", "name": "In", "type": "payload", "accepts": ["payload", "any"] },
    { "id": "items", "name": "Items", "type": "payload", "multiple": true, "accepts": ["payload", "any"] }
  ],
  "outputHandles": [
    { "id": "after", "name": "After", "type": "payload" },
    { "id": "each", "name": "Each", "type": "payload" }
  ]
}
```

### `agent` - Agent IA avec outils et memoire
Supporte les `linkedHandles` pour recevoir outils et memoire.

```json
{
  "type": "agent",
  "nodeKind": "agent",
  "inputHandles": [{ "id": "in", "name": "In", "type": "any", "accepts": ["any", "payload"] }],
  "outputHandles": [{ "id": "ok", "name": "Success", "type": "payload", "schema": "$var:llm_text" }],
  "linkedHandles": [
    { "id": "tools", "name": "Tools", "type": "ai_tool", "multiple": true, "accepts": ["ai_tool"] },
    { "id": "memory", "name": "Memory", "type": "ai_memory", "multiple": true, "accepts": ["ai_memory"] }
  ]
}
```

### `memory` - Noeud memoire IA
Produit une sortie de type `ai_memory`.

```json
{
  "type": "memory",
  "nodeKind": "memory",
  "outputHandles": [{ "id": "memory", "name": "Memory", "type": "ai_memory", "schema": "$var:ai_memory" }]
}
```

### `tool_ai` - Definition d'outil LangChain
Produit un outil consommable par un agent.

```json
{
  "type": "tool_ai",
  "nodeKind": "tool_ai",
  "outputHandles": [{ "id": "tool", "name": "Tool", "type": "ai_tool", "schema": "$var:ai_tool" }]
}
```

## Modele Mongoose (NodeTemplate)

```javascript
{
  schemaVersion: Number,        // default: 1, nouveau: 2
  key: String,                  // unique, indexed - DOIT matcher le handler
  name: String,
  title: String,
  subtitle: String,
  icon: String,
  description: String,
  tags: [String],
  group: String,
  enabled: Boolean,
  type: String,                 // enum: start, start_form, event, endpoint, function,
                                //        condition, loop, end, flow, agent, tool_ai,
                                //        memory, router, choice
  nodeKind: String,             // meme enum que type
  category: String,
  providerKey: String,
  appName: String,
  args: Mixed,                  // Schema de formulaire
  inputHandles: [Mixed],
  outputHandles: [Mixed],
  linkedHandles: [Mixed],
  authorize_catch_error: Boolean,
  authorize_skip_error: Boolean,
  allowWithoutCredentials: Boolean,
  checksumArgs: String,
  checksumFeature: String,
  repoId: ObjectId,
  repoName: String
}
```
