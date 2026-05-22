# Endpoint Selection

Objectif: **inclure automatiquement tous les endpoints stables utiles à l’automation**, sans livrer de connecteur “starter”.

## Règle obligatoire

- Utiliser en priorité la génération depuis OpenAPI (`generate-spec-from-openapi.js` + `mass-create-connectors.js`).
- Le mode strict (`strictAutomation`) est **activé par défaut** et doit rester actif.
- Un connecteur est bloquant si une ressource n’a pas au moins:
  - une action de lecture (`list`, `search`, `get`);
  - une action d’écriture/exécution (`create`, `update`, `delete`, `publish`, `trigger`, `run`, etc.).

## Processus recommandé (rapide)

1. Fournir un `openapiFile` dans l’inventaire.
2. Laisser le sélecteur inclure tous les endpoints utiles automatiquement.
3. Affiner uniquement via:
   - `excludePatterns` pour retirer surfaces non automation;
   - `includePatterns` pour forcer des endpoints utiles atypiques.
4. Générer les handlers et le manifest en une passe.
5. Vérifier avec `check-connector.js`.

## Inclus par défaut

- Cycle de vie des objets centraux (list/search/get/create/update/delete).
- Actions métier utiles: publish/unpublish, assign, comment, tag, move, send, trigger, run, deploy, cancel.
- Webhooks/events utilisables pour démarrer des workflows.
- Endpoints de statut/observabilité actionnables.

## Exclusions par défaut

- Billing, subscription, invoice, payouts.
- Surfaces admin/gouvernance/sécurité/politiques.
- Gestion de clés/tokens/permissions.
- Endpoints internes non exploitables dans un workflow.
- Endpoints dépréciés (sauf override explicite).

## Anti-régression couverture

- Interdiction des connecteurs “minces” (2-3 nodes uniquement) quand l’API expose plus d’actions workflow.
- Si un endpoint utile est exclu, une raison explicite doit exister (pattern d’exclusion documenté).
- Les variantes d’actions doivent être conservées (`update_live`, `update_staged`, etc.) au lieu d’écraser les doublons.
