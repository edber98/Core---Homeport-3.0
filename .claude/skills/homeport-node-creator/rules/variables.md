# Variables (Schemas reutilisables)

Les variables permettent de definir des schemas de sortie reutilisables dans un manifest, referencables via `$var:nom`.

## Declaration dans le manifest

```json
{
  "repo": { "name": "mon-plugin", "type": "local" },
  "variables": {
    "mon_schema": {
      "title": "Titre du schema",
      "ui": { "layout": "vertical", "labelsOnTop": true },
      "fields": [
        { "type": "text", "key": "name", "label": "Nom", "col": { "xs": 24 } },
        { "type": "number", "key": "count", "label": "Nombre", "col": { "xs": 24 } }
      ]
    }
  },
  "nodeTemplates": [ ... ]
}
```

## Utilisation dans les outputHandles

```json
"outputHandles": [
  { "id": "ok", "name": "Success", "type": "payload", "schema": "$var:mon_schema" }
]
```

L'importer resout `$var:mon_schema` et attache le schema complet au handle de sortie. Cela permet au frontend de connaitre la structure des donnees de sortie.

## Syntaxes de reference

```json
"schema": "$var:nom"           // Syntaxe courte (string)
"schema": { "$var": "nom" }    // Syntaxe objet
```

## Portee des variables

Les variables peuvent etre definies:
1. **Au niveau manifest** (`manifest.variables`) - accessibles a tous les nodeTemplates du manifest
2. **Au niveau node template** (`nodeTemplate.variables`) - priorite sur les variables manifest

```json
{
  "variables": {
    "global_schema": { ... }
  },
  "nodeTemplates": [
    {
      "key": "mon_node",
      "variables": {
        "local_schema": { ... }
      },
      "outputHandles": [
        { "id": "ok", "schema": "$var:local_schema" }
      ]
    }
  ]
}
```

## Exemples reels

### Schema reponse HTTP

```json
"http_response": {
  "title": "Reponse HTTP",
  "ui": { "layout": "vertical", "labelsOnTop": true },
  "fields": [
    { "type": "number", "key": "status", "label": "Status", "col": { "xs": 24 } },
    { "type": "textarea", "key": "headers", "label": "Headers (JSON)", "col": { "xs": 24 } },
    { "type": "textarea", "key": "body", "label": "Body (JSON)", "col": { "xs": 24 } }
  ]
}
```

### Schema reponse LLM

```json
"llm_text": {
  "title": "Reponse (texte)",
  "ui": { "layout": "vertical", "labelsOnTop": true },
  "fields": [
    { "type": "textarea", "key": "text", "label": "Texte", "description": "Texte genere par le modele.", "col": { "xs": 24 } }
  ]
}
```

### Schema memoire AI

```json
"ai_memory": {
  "title": "Memoire AI",
  "ui": { "layout": "vertical", "labelsOnTop": true },
  "fields": [
    { "type": "array", "key": "texts", "label": "Texts", "col": { "xs": 24 },
      "item": { "type": "text", "key": "_", "label": "Texte" } },
    { "type": "number", "key": "dimensions", "label": "Dimensions", "col": { "xs": 24 } },
    { "type": "number", "key": "vectorsCount", "label": "# Vectors", "col": { "xs": 24 } }
  ]
}
```

### Schema outil AI

```json
"ai_tool": {
  "title": "Outil (LangChain)",
  "ui": { "layout": "vertical", "labelsOnTop": true },
  "fields": [
    { "type": "text", "key": "name", "label": "Nom", "col": { "xs": 24 } },
    { "type": "textarea", "key": "description", "label": "Description", "col": { "xs": 24 } },
    { "type": "textarea", "key": "schema", "label": "Parametres (JSON Schema)", "col": { "xs": 24 } }
  ]
}
```

### Schema images generees

```json
"images": {
  "title": "Images generees",
  "ui": { "layout": "vertical", "labelsOnTop": true },
  "fields": [
    { "type": "array", "key": "images", "label": "Images", "col": { "xs": 24 },
      "item": {
        "type": "section", "key": "_", "fields": [
          { "type": "text", "key": "url", "label": "URL" },
          { "type": "textarea", "key": "b64", "label": "Base64" }
        ]
      }
    }
  ]
}
```

## Quand utiliser des variables

- Quand plusieurs nodes partagent le meme schema de sortie (ex: plusieurs nodes OpenAI retournent `llm_text`)
- Pour des schemas complexes qui encombreraient le nodeTemplate
- Pour documenter clairement la structure de sortie d'un node
