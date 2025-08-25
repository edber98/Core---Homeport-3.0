# Intégration Backend ⇄ Frontend — Progression

Date: 2025-08-25

## Résumé

- Environnements frontend ajoutés (`apiBaseUrl`, `apiDocsUrl`, `useBackend`).
- Intercepteurs HTTP: Authorization (Bearer), gestion d’erreurs 401 + toasts, indicateur de chargement global.
- Client API unifié: désempaquetage `{ success, data }` + `page/limit/q/sort`.
- Services reliés backend: workspaces, providers, node-templates, credentials, flows, runs, notifications.
- Synchronisation workspaces en backend; supprime les données de démo (localStorage) en backend.
- Flow Builder: sauvegarde du graph + status/enabled (PUT `/api/flows/{id}`).
- Exécutions: lancement backend + historique (flow/workspace) + annulation.
- Notifications: popover header (liste, ack, suppression), page dédiée avec filtres.
- Back-end tolérant: résout `:wsId` en ObjectId ou par champ `id` string; évite les casts invalides.

## Points corrigés

- Cast ObjectId côté backend pour `workspaceId` et `:wsId` (flows, runs, credentials, notifications) avec fallback `findOne({ id })` ou ignore filtre si invalide.
- Frontend: n’envoie `workspaceId` qu’en ObjectId valide pour les notifications.
- ACL UI: en mode backend, l’UI ne bloque pas; l’API reste l’autorité (membership + roles).

## Étapes restantes

- Runs: vue “Historique workspace” — enrichir navigation vers le détail/par flow, filtres supplémentaires et pagination.
- Flows: exposer status/enabled dans la liste (édition rapide); validation UI des changements.
- Notifications: page dédiée — ajout de navigation par `link` et filtres supplémentaires (pagination).
- Prod: budgets Angular — relevés; option d’optimisation CSS ciblée.
- SSE runs: brancher `/api/runs/{id}/stream` dans l’UI (optionnel).

## Liens

- Docs backend (Swagger UI): http://localhost:5055/api-docs
- JSON/YAML: http://localhost:5055/api-docs.json · http://localhost:5055/api-docs.yaml

