# Manifest Patterns

## Root Order

Use this order:

```json
{
  "repo": { "name": "provider", "type": "local", "label": "Provider" },
  "variables": {},
  "providers": [],
  "nodeTemplates": []
}
```

## Provider

```json
{
  "key": "provider",
  "name": "Provider",
  "title": "Provider",
  "iconClass": "fa-solid fa-puzzle-piece",
  "iconUrl": "https://cdn.simpleicons.org/provider",
  "color": "#6366f1",
  "tags": ["provider", "automation"],
  "categories": ["Productivité"],
  "hasCredentials": true,
  "credentialsForm": {
    "title": "Identifiants Provider",
    "ui": { "layout": "vertical", "labelsOnTop": true },
    "fields": [
      {
        "type": "text",
        "key": "apiKey",
        "label": "Clé API",
        "description": "Clé API Provider.",
        "col": { "xs": 24 },
        "secret": true,
        "validators": [{ "type": "required" }]
      }
    ],
    "displayTitle": false,
    "displayDescription": false
  }
}
```

If the API supports self-hosting or regional base URLs, include a `baseUrl` credential with a safe default.

## Variables

Every payload output must reference a schema in `variables`.

```json
"provider_item": {
  "title": "Élément Provider",
  "ui": { "layout": "vertical", "labelsOnTop": true },
  "fields": [
    { "type": "text", "key": "id", "label": "ID", "col": { "xs": 24 } },
    { "type": "text", "key": "name", "label": "Nom", "col": { "xs": 24 } },
    { "type": "text", "key": "url", "label": "URL", "col": { "xs": 24 } },
    { "type": "date", "key": "created_at", "label": "Date de création", "col": { "xs": 24 } },
    { "type": "date", "key": "updated_at", "label": "Date de modification", "col": { "xs": 24 } }
  ]
}
```

For lists:

```json
"provider_items": {
  "title": "Éléments Provider",
  "ui": { "layout": "vertical", "labelsOnTop": true },
  "fields": [
    { "type": "number", "key": "totalCount", "label": "Nombre total", "col": { "xs": 24 } },
    {
      "type": "section",
      "title": "Éléments",
      "key": "items",
      "mode": "array",
      "array": { "initialItems": 0, "minItems": 0 },
      "fields": [
        { "type": "text", "key": "id", "label": "ID", "col": { "xs": 24 } },
        { "type": "text", "key": "name", "label": "Nom", "col": { "xs": 24 } }
      ],
      "col": { "xs": 24 }
    }
  ]
}
```

## Node Template

```json
{
  "key": "provider_item_get",
  "name": "providerItemGet",
  "schemaVersion": 2,
  "title": "Récupérer un élément",
  "subtitle": "Éléments",
  "icon": "fa-solid fa-eye",
  "type": "function",
  "nodeKind": "function",
  "category": "Provider",
  "providerKey": "provider",
  "tags": ["lecture", "provider"],
  "inputHandles": [
    { "id": "in", "name": "In", "type": "any", "accepts": ["any", "payload"] }
  ],
  "outputHandles": [
    { "id": "ok", "name": "Success", "type": "payload", "schema": "$var:provider_item" }
  ],
  "authorize_catch_error": true,
  "description": "Récupère les détails d'un élément Provider.",
  "args": {
    "title": "Récupérer un élément",
    "ui": { "layout": "vertical", "labelsOnTop": true },
    "fields": [
      {
        "type": "text",
        "key": "itemId",
        "label": "ID de l'élément",
        "description": "Identifiant de l'élément.",
        "col": { "xs": 24 },
        "validators": [{ "type": "required" }]
      }
    ],
    "displayTitle": false,
    "displayDescription": false
  },
  "group": "Éléments"
}
```

## French UI Rules

- Use accents: `Créer`, `Récupérer`, `Supprimer`, `Événement`, `Clé API`, `Données`.
- Sentence case: `Créer un contact`, not `Créer Un Contact`.
- Keep descriptions factual and short.
- Keep `nodeTemplates[].title` and `nodeTemplates[].args.title` in French.
- For one `providerKey`, every node `name` and every node `title` must be unique.
