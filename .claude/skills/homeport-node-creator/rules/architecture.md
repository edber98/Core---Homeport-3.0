# Architecture Plugin/Node de Homeport

## Vue d'ensemble

```
API/src/plugins/
├── local/              # Plugins integres (core, logic, events)
│   ├── core/           # wait_all, merge_race
│   ├── logic/          # condition, loop, delay
│   └── events/         # start, start_form
├── repos/              # Plugins externes (slack, http, openai, email, etc.)
│   ├── http/
│   ├── openai/
│   ├── email/
│   ├── slack/
│   └── ...
├── registry.js         # Charge et enregistre les handlers
├── importer.js         # Importe les manifests en base (Provider + NodeTemplate)
└── bootstrap.js        # Clone les repos git au demarrage
```

## Cycle de vie d'un plugin

1. **Demarrage**: `bootstrap.js` clone les repos git definis dans `PLUGIN_REPOS` env var
2. **Chargement**: `registry.js` scanne `local/` et `repos/`, pour chaque plugin:
   - Lit `manifest.json` → appelle `importer.js` pour creer/mettre a jour les Provider et NodeTemplate en MongoDB
   - Charge les fichiers `functions/*.js` → enregistre les handlers dans la registry en memoire
3. **Execution**: Quand un flow s'execute, `engine/index.js` resout le handler via `registry.resolve(templateKey)`

## Structure d'un plugin

```
mon-plugin/
├── manifest.json       # OBLIGATOIRE - definit providers + nodeTemplates
└── functions/          # OBLIGATOIRE - code JS des handlers
    └── mon-handler.js
```

## Communication API ↔ Frontend

| Frontend (Angular) | API Endpoint | But |
|---|---|---|
| `catalog.service.ts` | `GET /api/providers`, `GET /api/node-templates` | Catalogue des nodes |
| `flows-backend.service.ts` | `POST/GET /api/flows` | CRUD des flows |
| `runs-backend.service.ts` | `POST /api/flows/:id/runs` | Execution |
| `flow-run.service.ts` | `GET /runs/:runId/stream` (SSE) | Evenements temps reel |

## Variables d'environnement importantes

- `PLUGIN_IMPORT_ENABLED=1` : Active l'import des manifests en DB (REQUIS)
- `PLUGIN_REPOS` : Liste CSV/JSON des repos git a cloner
