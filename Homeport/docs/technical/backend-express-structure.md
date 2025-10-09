# Architecture Express — Arborescence, Conventions, Bootstrap

Objectif: fournir une structure claire et pérenne en Express pur (JavaScript, sans TypeScript) pour implémenter toutes les specs (auth, multi‑tenant, flows/engine, webhooks) sans NestJS.

## Arborescence proposée
```
backend-js/
  src/
    app.js                 # création de l'app Express, middlewares globaux, routes
    server.js              # démarrage HTTP/HTTPS + workers
    config/
      env.js               # lecture ENV, defaults (SEED_*, crypto keys, db uri, ports)
      logger.js
    db/
      mongo.js             # connexion + init + indices
      models/              # Mongoose (ou ODM équivalent)
        company.model.js
        user.model.js
        workspace.model.js
        provider.model.js
        node-template.model.js
        credential.model.js
        flow.model.js
        run.model.js
        run-attempt.model.js
        webhook-endpoint.model.js
        event-queue.model.js
    auth/
      jwt.js               # sign/verify, middlewares
      guards.js            # requireAuth, requireCompanyScope, requireAdmin
      controllers.js       # /auth/login, /auth/forgot, /auth/reset, /auth/change
    middlewares/
      error-handler.js
      rate-limit.js
      company-scope.js     # extrait companyId/token, attache au req
    modules/
      companies/           # GET/PUT /api/company
      users/               # GET/POST/PUT /api/users (scopé company)
      workspaces/          # GET/POST/PUT /api/workspaces (+ templates-allowed)
      providers/           # GET /api/providers
      apps/                # GET/POST /api/apps (optionnel)
      node-templates/      # GET/POST /api/node-templates (admin)
      credentials/         # GET/POST/GET /api/workspaces/:ws/credentials
      flows/               # GET/POST/GET/PUT /api/workspaces/:ws/flows (validations graph)
      forms/               # (optionnel) GET/POST/PUT /api/workspaces/:ws/forms
      runs/                # POST /flows/:id/runs, GET /runs/:id, cancel, stream
      admin/               # POST /api/admin/reset (reset multi-tenant)
      webhooks/            # POST /webhooks/:workspace/:path
    engine/
      index.js             # orchestrateur: planification DAG, retries, cancel
      handlers/            # résolution des handlers à partir des plugins
      queue.js             # BullMQ/Agenda, reprise au démarrage
      wait-merge.js        # wait.all / merge.race semantics
    plugins/
      README.md            # conventions pour écrire des plugins de fonctions
      local/               # plugins embarqués
      registry/            # cache des plugins téléchargés
    utils/
      crypto.js            # AES-GCM, KMS wrappers
      schema.js            # validate JSON schemas (Ajv)
      ids.js               # idempotence keys, correlation
  package.json
  .env.example
```

## Conventions
- Express + Mongoose (recommandé) avec ObjectId et `populate` en lecture.
- Middlewares: `requireAuth`, `requireCompanyScope` (vérifie que workspace/company appartiennent au token.companyId), `requireAdmin`.
- Controllers minces, Services riches (validation, sécurité, logique métier), Repositories (DB I/O).
- Validations: Ajv pour JSON Schema (credentials, args), class-validator pour DTO simples.
- Logs: JSON, corrélation `runId`/`nodeId` dans engine.

## Bootstrap via ENV
- Si DB vide: créer company/admin/workspaces à partir des variables SEED_* (voir backend-spec-detailed.md §1).
- Indices créés au boot.
- Démarrer workers (queue) après connexion DB.

## Streaming & Workers
- SSE/WebSocket pour `/runs/:id/stream`.
- Queue pour exécutions (BullMQ par exemple); reprise au démarrage: replanifier `running`.

## Test & Qualité
- Tests unitaires (services/utilitaires), intégration (routes clés), E2E minimal (multi-tenant, interdictions cross-company).

Voir aussi:
- `backend-plan.md` (ordre des phases), `backend-implementation.md` (sémantique moteur), `plugins-and-templates.md` (plugins de fonctions pour templates de nœuds).
