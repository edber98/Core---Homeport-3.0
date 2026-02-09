# Handles (Entrees / Sorties / Liens)

Les handles definissent les points de connexion d'un node dans le graphe de flow.

## inputHandles - Entrees

Points d'entree des donnees. Les **triggers** (start, start_form, event) n'ont PAS d'inputHandles.

```json
"inputHandles": [
  {
    "id": "in",                    // REQUIS - identifiant unique dans le node
    "name": "In",                  // REQUIS - label affiche
    "type": "any",                 // Type de donnee attendu
    "accepts": ["any", "payload"], // Types de connexion acceptes
    "multiple": false              // Peut recevoir plusieurs connexions?
  }
]
```

### Patterns courants d'input

**Standard (un seul input):**
```json
[{ "id": "in", "name": "In", "type": "any", "accepts": ["any", "payload"] }]
```

**Avec input specifique (ex: texte):**
```json
[{ "id": "in", "name": "Text", "type": "text", "accepts": ["text"] }]
```

**Multiples inputs (ex: loop):**
```json
[
  { "id": "in", "name": "In", "type": "payload", "accepts": ["payload", "any"] },
  { "id": "items", "name": "Items", "type": "payload", "multiple": true, "accepts": ["payload", "any"] }
]
```

**Input memoire AI:**
```json
[{ "id": "in", "name": "Memory", "type": "ai_memory", "accepts": ["ai_memory"] }]
```

## outputHandles - Sorties

Points de sortie des resultats.

```json
"outputHandles": [
  {
    "id": "ok",                    // REQUIS - identifiant (utilise pour le routage)
    "name": "Success",             // REQUIS - label affiche
    "type": "payload",             // Type de donnee produit
    "schema": "$var:schema_name"   // OBLIGATOIRE - reference a un schema de variable
  }
]
```

### Patterns courants d'output

**IMPORTANT: Chaque outputHandle DOIT toujours avoir un `schema` decrivant la structure exacte de la reponse retournee par le handler.** Le schema permet au frontend d'afficher les champs disponibles et aux utilisateurs de glisser-deposer les chemins dans les expressions.

**Standard (avec schema obligatoire):**
```json
[{ "id": "ok", "name": "Success", "type": "payload", "schema": "$var:mon_schema" }]
```

**Succes + Erreur (quand authorize_catch_error: true):**
Le handle `err`/`error` est gere automatiquement par le moteur quand le node retourne `{ ok: false, error: "..." }`.
Les edges connectees a un sourceHandle `err` ou `error` recoivent le flux en cas d'erreur.

**Type memoire AI:**
```json
[{ "id": "memory", "name": "Memory", "type": "ai_memory", "schema": "$var:ai_memory" }]
```

**Type outil AI:**
```json
[{ "id": "tool", "name": "Tool", "type": "ai_tool", "schema": "$var:ai_tool" }]
```

**Loop (deux sorties):**
```json
[
  { "id": "after", "name": "After", "type": "payload" },
  { "id": "each", "name": "Each", "type": "payload" }
]
```

## linkedHandles - Liens speciaux

Pour les nodes de type `agent` qui consomment des outils et de la memoire via des connexions laterales.

```json
"linkedHandles": [
  {
    "id": "tools",                 // REQUIS
    "name": "Tools",               // REQUIS
    "type": "ai_tool",            // Type attendu
    "multiple": true,              // Accepte plusieurs connexions
    "accepts": ["ai_tool"]         // Types acceptes
  },
  {
    "id": "memory",
    "name": "Memory",
    "type": "ai_memory",
    "multiple": true,
    "accepts": ["ai_memory"]
  }
]
```

## Types de donnees supportes

| Type | Description | Usage |
|------|-------------|-------|
| `any` | Tout type | Input generique |
| `payload` | Donnees structurees | Type par defaut |
| `text` | Texte brut | Entree textuelle |
| `file` | Fichier | Upload/download |
| `ai_memory` | Memoire AI | Embeddings/texte |
| `ai_tool` | Outil AI | Definition d'outil LangChain |
| `ai_vector` | Vecteurs embeddings | Resultats d'embedding |
| `ai_image` | Image generee | Sortie de generation d'image |
| `error` | Erreur | Branche d'erreur |

## Routage par le moteur

Le moteur utilise les `sourceHandle` des edges pour router:
- Handle `ok` / `success` → flux normal
- Handle `err` / `error` → flux d'erreur (si `authorize_catch_error: true`)
- Handle `after` / `each` → sorties de boucle
- Handle correspondant au nom de branche → sortie de condition (via `output_array_field`)

### Comment le moteur accede aux donnees entrantes dans un handler

Dans le handler, les donnees entrantes sont accessibles via `opts.incoming`:

```javascript
async function myHandler(node, msg, inputs, opts) {
  // Donnees groupees par handle id
  const incoming = opts?.incoming?.byHandle || {};

  // Exemples:
  const fromIn = incoming['in'];       // Array de resultats des nodes connectes au handle "in"
  const tools = incoming['tools'];     // Array de tool definitions (linkedHandle)
  const memory = incoming['memory'];   // Array de memoires (linkedHandle)

  // Chaque element est le resultat du node source
}
```
