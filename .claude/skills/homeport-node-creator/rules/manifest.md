# Format du manifest.json

Le manifest.json est le fichier central d'un plugin. Il definit les providers et les node templates.

## Structure racine

```json
{
  "repo": {
    "name": "mon-plugin",          // Nom unique du plugin
    "type": "local",               // "local" ou "external"
    "label": "Mon Plugin"          // Label affiche
  },
  "variables": {                   // OPTIONNEL - schemas reutilisables (voir variables.md)
    "schema_name": { ... }
  },
  "providers": [ ... ],            // Liste des providers (voir provider.md)
  "nodeTemplates": [ ... ]         // Liste des node templates (voir node-template.md)
}
```

## Regles de nommage

- **repo.name**: snake_case ou kebab-case, unique globalement
- **provider.key**: snake_case, unique globalement (ex: `openai`, `slack`, `http`)
- **nodeTemplate.key**: snake_case, prefixe par le provider (ex: `openai_chat_completion`, `http`, `email_send`)
- **nodeTemplate.name**: camelCase (ex: `openaiChatCompletion`, `httpRequest`)

## Import automatique

L'importer (`importer.js`) fait automatiquement:
1. Active les expressions sur tous les champs de formulaire (`expression.allow = true`, `expression.defaultMode = 'expr'`)
2. Convertit les v1 en v2 si `inputHandles`/`outputHandles` ne sont pas presents
3. Resout les references `$var:nom` dans les schemas
4. Genere un checksum pour detecter les changements
5. Cree/met a jour les Provider et NodeTemplate en MongoDB
6. Auto-cree un Provider si `providerKey` est declare mais le provider n'existe pas

## Exemple minimal complet

```json
{
  "repo": { "name": "mon-plugin", "type": "local", "label": "Mon Plugin" },
  "providers": [
    {
      "key": "mon_provider",
      "name": "Mon Provider",
      "title": "Mon Provider",
      "iconClass": "fa-solid fa-puzzle-piece",
      "color": "#6366f1",
      "tags": ["custom"],
      "hasCredentials": false
    }
  ],
  "nodeTemplates": [
    {
      "key": "mon_action",
      "name": "monAction",
      "schemaVersion": 2,
      "title": "Mon Action",
      "subtitle": "Description courte",
      "type": "function",
      "nodeKind": "function",
      "category": "Custom",
      "providerKey": "mon_provider",
      "icon": "fa-solid fa-bolt",
      "description": "Description complete de ce que fait le node",
      "inputHandles": [
        { "id": "in", "name": "In", "type": "any", "accepts": ["any", "payload"] }
      ],
      "outputHandles": [
        { "id": "ok", "name": "Success", "type": "payload" }
      ],
      "args": {
        "title": "Mon Action",
        "ui": { "layout": "vertical", "labelsOnTop": true },
        "fields": [
          {
            "type": "text",
            "key": "message",
            "label": "Message",
            "description": "Le message a traiter",
            "col": { "xs": 24 },
            "validators": [{ "type": "required" }]
          }
        ]
      }
    }
  ]
}
```
