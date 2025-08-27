# Débogage — Exécution de Flow (temps réel)

Ce document explique, étape par étape, le cheminement complet lorsqu’on lance une exécution depuis le frontend (bouton « Play ») jusqu’au backend (création du run, diffusion des événements SSE) avec des points d’observation, logs et erreurs fréquentes.

## Vue d’ensemble

- Frontend (Flow Builder):
  - Clique sur « Lancer » → `runFlow()`
  - Sauvegarde le flow si nécessaire → `CatalogService.saveFlow()`
  - Lance le run backend → `RunsBackendService.start(flowId, payload)` (POST `/api/flows/:flowId/runs`)
  - Redirige vers « Exécutions » pour écouter le flux SSE → `GET /api/runs/:runId/stream?token=...`

- Backend:
  - Route: `POST /api/flows/:flowId/runs`
    - Vérifie l’authentification (`auth/jwt.js`)
    - Charge le Flow + Workspace, vérifie l’appartenance de l’utilisateur
    - Vérifie `enabled !== false` (sinon `409 flow_disabled`)
    - Crée le Run en base (Mongo) ou mémoire
    - Exécute le moteur `engine/runFlow` et stocke/émet les événements
  - Route SSE: `GET /api/runs/:runId/stream` renvoie l’historique puis les nouveaux événements (avec `heartbeat`)

## Frontend — parcours détaillé

1. `FlowBuilderComponent.runFlow()`
   - Fichier: `src/app/features/flow/flow-builder.component.ts`
   - Actions:
     - Met à jour le graphe partagé (`FlowSharedStateService`)
     - Si `environment.useBackend` et un `currentFlowId` est présent:
       - Vérifie la présence d’un nœud « Start ». Sinon: message d’avertissement et run local (secours).
       - Sauvegarde si des modifications locales existent (`CatalogService.saveFlow`).
       - Lance le run: `RunsBackendService.start(flowId, payload)`.
       - Navigation vers `../executions?flow=:id`.
     - Sinon: lance un run local (mock) pour l’aperçu.

2. `RunsBackendService.start()`
   - Fichier: `src/app/services/runs-backend.service.ts`
   - Appelle `POST /api/flows/:flowId/runs` via `ApiClientService`.
   - En cas d’erreur, l’interceptor global `http-error.interceptor.ts` affiche un message (et relance l’erreur).

3. Écoute temps réel
   - Écran « Exécutions »: `FlowExecutionComponent`
   - Lors du démarrage depuis l’onglet Exécutions, on ouvre un `EventSource` via `RunsBackendService.stream(runId)`
   - Les événements `node.done`, `run.completed`, `run.failed`, `run.success`, `run.error`, `heartbeat` sont affichés.

## Backend — parcours détaillé (mémoire et Mongo)

Fichiers principaux:
- Mémoire: `backend/src/modules/runs.js`
- Mongo: `backend/src/modules/db/runs.js`
- Auth: `backend/src/auth/jwt.js` (supporte `?token=` pour SSE/WS)
- SSE/WS: `backend/src/realtime/ws.js`, `backend/src/realtime/socketio.js`
- Moteur: `backend/src/engine/index.js` (`runFlow`)

### 1) POST /api/flows/:flowId/runs

Étapes:
1. Authentification via JWT (`Authorization: Bearer ...`). Pour SSE, le token peut être passé en query `?token=`.
2. Chargement du Flow et vérification du Workspace/Company de l’utilisateur.
3. Vérification de l’état du flow:
   - Si `enabled === false` → `409 flow_disabled` avec détails `{ flowId, workspaceId, enabled }`.
4. Création du Run:
   - Mongo: document `Run` avec `status: 'running'`, `events: []`.
   - Mémoire: objet en Map `store.runs`.
5. Lancement du moteur `runFlow(flow.graph, ctx, initialMsg, emit)`.
   - À chaque événement `emit(ev)`, on push dans `run.events` et on diffuse via WS/Socket.IO.
   - Fin d’exécution → statut final `success` (ou `error` en cas d’exception).

Logs ajoutés (exemples):
```
[runs][db] start: flowId=66c... ws=66b... user=... reqId=...
[runs][db] created run: id=66d... flowId=66c... status=running reqId=...
[runs][db] event: runId=66d... type=node.done
[runs][db] completed: runId=66d... status=success
```

En cas de flow désactivé:
```
[runs][db] start: flow disabled flowId=66c... enabled=false ws=66b... user=... reqId=...
```

### 2) GET /api/runs/:runId/stream

Étapes:
1. Authentification (token possible en query: `?token=`).
2. Réponse `text/event-stream`, envoi de tous les événements déjà présents.
3. Boucle d’intervalle qui:
   - Push les nouveaux événements dès qu’ils apparaissent.
   - Envoie des `heartbeat` réguliers.
   - Termine sur `success` ou `error`.

Logs ajoutés:
```
[runs][db] stream open: runId=... events=3 reqId=...
[runs][db] stream closed: runId=... reqId=...
```

## Erreurs fréquentes et diagnostics

1) `flow_disabled` (409)
- Cause: le flow a `enabled === false`.
- Correction:
  - Dans le Builder, activez le flow (champ « Enabled/Activé ») et sauvegardez.
  - Via API: `PUT /api/flows/:id { enabled: true }`.
- Logs: `[runs][*] start: flow disabled ...`.

2) `run_not_found` (SSE)
- Cause: mauvais `runId` ou permissions.
- Vérifier `GET /api/runs/:runId` et l’appartenance au workspace.

3) Double message d’erreur dans le frontend
- Cause probable: l’interceptor HTTP affiche déjà un message; si le composant affiche également son propre message, vous en verrez deux.
- Mitigation: n’afficher le message que via l’interceptor (laisser le composant gérer seulement la navigation/état).

## Check-list de debug rapide

- [ ] Le flow contient un nœud « Start »
- [ ] `enabled === true` (dans la méta du flow), puis Sauvegarde
- [ ] POST `/api/flows/:id/runs` renvoie `201` avec `data.id`
- [ ] GET `/api/runs/:runId/stream?token=...` diffuse `node.done` puis `run.success|run.error`
- [ ] Logs backend cohérents avec l’enchaînement

## Annexes

- Environments: `src/environments/environment*.ts` → `apiBaseUrl`, `useBackend`
- Auth SSE: `backend/src/auth/jwt.js` accepte `?token=`
- Moteur: `backend/src/engine/index.js` (`runFlow`)

