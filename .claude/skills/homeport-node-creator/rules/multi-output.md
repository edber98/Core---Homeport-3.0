# Fonctions multi-output (routage explicite de sortie)

Le moteur supporte `_output` dans le retour de tout handler de type `function` pour choisir quelle sortie prendre.
Cela fonctionne avec des sorties statiques (`outputHandles`) ET dynamiques (`output_array_field`).

## Cas d'usage

- **Statique multi-output** : node HTTP avec `ok` + `redirect` + `not_found` en dur dans le manifest
- **Dynamique multi-output** : classificateur IA ou l'utilisateur definit des categories dans les args
- Routeur : l'utilisateur definit des routes, le handler analyse et choisit
- Switch/dispatcher : branchement selon le resultat d'un calcul

## Trois modes de sortie pour `type: "function"`

### Mode 1 : Standard (defaut)
Sorties statiques dans `outputHandles`. Le moteur prend TOUTES les sorties non-error quand `ok: true`.
Pas de `_output` dans le retour. C'est le comportement classique.

### Mode 2 : Multi-output statique avec routage explicite
Sorties statiques dans `outputHandles`, mais le handler retourne `_output` pour choisir laquelle prendre.

```json
{
  "type": "function",
  "outputHandles": [
    { "id": "ok", "name": "Succes", "type": "payload" },
    { "id": "redirect", "name": "Redirection", "type": "payload" },
    { "id": "not_found", "name": "Non trouve", "type": "payload" }
  ]
}
```

Handler :
```javascript
return { ok: true, _output: 'redirect', url: location, status: 302 };
// → route vers le handle 'redirect' uniquement
```

### Mode 3 : Multi-output dynamique (comme les conditions)
Active par `output_array_field` sur le template. Les sorties sont generees depuis un champ array des args.
Le handler retourne `_output` avec le `_id` de l'element choisi.

**PAS de `outputHandles`** dans ce mode — les handles viennent des args.

## Structure manifest

```json
{
  "key": "openai_classify",
  "name": "openai_classify",
  "schemaVersion": 2,
  "title": "Classifier un texte",
  "subtitle": "OpenAI",
  "type": "function",
  "nodeKind": "function",
  "category": "AI",
  "providerKey": "openai",
  "icon": "fa-solid fa-tags",
  "description": "Classifier un texte selon des categories configurees.",
  "output_array_field": "categories",
  "outputSchema": [
    { "key": "category", "type": "string", "label": "Categorie choisie" },
    { "key": "confidence", "type": "number", "label": "Score de confiance" },
    { "key": "explanation", "type": "string", "label": "Explication" }
  ],
  "inputHandles": [
    { "id": "in", "name": "In", "type": "any", "accepts": ["any", "payload"] }
  ],
  "authorize_catch_error": true,
  "args": {
    "title": "Classification",
    "ui": { "layout": "vertical", "labelsOnTop": true },
    "fields": [
      {
        "type": "text",
        "key": "text",
        "label": "Texte a classifier",
        "expression": { "allow": true },
        "col": { "xs": 24 }
      },
      {
        "type": "section",
        "key": "categories",
        "title": "Categories",
        "mode": "array",
        "array": {
          "initialItems": 2,
          "minItems": 1,
          "controls": {
            "add": { "kind": "text", "text": "Ajouter" },
            "remove": { "kind": "text", "text": "Supprimer" }
          }
        },
        "fields": [
          { "type": "text", "key": "name", "label": "Nom", "col": { "xs": 12 } },
          { "type": "text", "key": "description", "label": "Description", "col": { "xs": 12 } }
        ],
        "col": { "xs": 24 }
      }
    ]
  }
}
```

## Champs cles du template

### `output_array_field` (REQUIS pour multi-output)

Nom du champ array dans `args` dont chaque element genere un output handle.
Chaque element doit avoir un `_id` (genere automatiquement par le form builder) qui sert de `sourceHandle`.

```json
"output_array_field": "categories"
```

Le frontend lit `model.context[output_array_field]` et genere les handles :
- `categories[0]._id` → handle 0
- `categories[1]._id` → handle 1
- etc.

**PAS besoin de `outputHandles` quand `output_array_field` est defini.** Les handles sont dynamiques.

### `outputSchema` (RECOMMANDE pour multi-output)

Decrit la forme du resultat retourne par le handler (`msg[nodeId]`).
Utilise par :
- La simulation pour generer des donnees factices
- Le preview pour afficher les champs dans le panneau settings
- Les nodes en aval pour voir les champs disponibles

```json
"outputSchema": [
  { "key": "category", "type": "string", "label": "Categorie choisie" },
  { "key": "confidence", "type": "number", "label": "Score de confiance" }
]
```

Types supportes : `string`, `number`, `boolean`, `object`, `array`, `fileRef`

**Ne pas confondre avec `outputHandles`** :
- `outputHandles` = points de connexion (les cercles)
- `outputSchema` = forme des donnees retournees (`msg[nodeId]`)

## Handler JS

### Retour avec `_output`

Le handler DOIT retourner `_output` avec le `_id` de l'element choisi :

```javascript
module.exports = {
  async openai_classify(node, msg, inputs, opts) {
    const creds = (opts && opts.credentials) || {};
    const categories = node.model.context.categories || [];
    const text = String(inputs.text || '').trim();
    if (!text) return { ok: false, error: 'Texte requis' };

    // Construire le prompt avec les categories
    const catList = categories.map(c =>
      `- ${c.name}: ${c.description || ''}`
    ).join('\n');

    // Appel API OpenAI pour classification
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: inputs.model || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `Classifie le texte dans une des categories:\n${catList}\nReponds en JSON: {"category":"nom","confidence":0.0-1.0,"explanation":"..."}` },
          { role: 'user', content: text }
        ]
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Trouver la categorie correspondante
    const chosen = categories.find(c =>
      c.name.toLowerCase() === String(result.category).toLowerCase()
    );
    if (!chosen) return { ok: false, error: `Categorie inconnue: ${result.category}` };

    // _output = _id de la categorie → le moteur route vers ce handle
    return {
      ok: true,
      _output: chosen._id,
      category: chosen.name,
      confidence: result.confidence,
      explanation: result.explanation
    };
  }
};
```

### Comment `_output` fonctionne

1. Le handler retourne `{ ok: true, _output: 'id_du_handle', ...data }`
2. Le moteur lit `result._output`
3. Au lieu de prendre TOUTES les sorties non-error, il filtre sur `sourceHandle === _output`
4. Seule la branche correspondante est executee

### Si `_output` n'est pas defini

Le comportement est le meme qu'une fonction standard : TOUTES les sorties non-error sont prises en parallele.

## Simulation

### Scenarios multiples automatiques

La simulation detecte automatiquement les nodes avec plusieurs sorties connectees et genere un scenario par branche.

Exemple: 3 categories configurees, 3 edges connectees → 3 scenarios dans le panneau settings.

### `outputSchema` pour le preview

Quand le handler ne retourne rien d'utile en simulation (pas de credentials, API inaccessible), le systeme utilise `outputSchema` pour generer un apercu :

```
category (string)
confidence (number)
explanation (string)
```

### `forceBranches` en simulation

Le moteur utilise `forceBranches` pour forcer une branche specifique pendant la simulation. Cela fonctionne pour `condition` ET pour les fonctions avec `output_array_field`.

## Else branch (optionnel)

Comme les conditions, un node multi-output peut supporter une branche Else :

```json
"args": {
  "fields": [
    { "type": "section", "key": "categories", "mode": "array", ... },
    { "type": "checkbox", "key": "else_enabled", "label": "Activer Else", "default": false }
  ]
}
```

Le handler retourne `_output` = `elseId` (ou ne retourne pas `_output`) pour tomber dans Else.

## Checklist mode 2 (statique multi-output)

- [ ] Template a `outputHandles` avec plusieurs sorties non-error definies
- [ ] Template a `outputSchema` decrivant les champs du resultat (recommande pour simulation)
- [ ] Handler retourne `_output` = `id` d'un des outputHandles
- [ ] `authorize_catch_error: true` si gestion d'erreur

## Checklist mode 3 (dynamique multi-output)

- [ ] Template a `output_array_field` pointant vers le bon champ array
- [ ] Template a `outputSchema` decrivant les champs du resultat
- [ ] `outputHandles` N'EST PAS defini (les handles sont dynamiques)
- [ ] Section array dans `args` avec au minimum `name` comme champ enfant
- [ ] Handler retourne `_output` avec le `_id` de l'element choisi
- [ ] Handler retourne les champs decrits dans `outputSchema`
- [ ] `authorize_catch_error: true` pour gerer les erreurs
