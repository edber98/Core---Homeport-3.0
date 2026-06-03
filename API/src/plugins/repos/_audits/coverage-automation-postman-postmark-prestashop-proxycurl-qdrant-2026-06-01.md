# Audit couverture automation - postman, postmark, prestashop, proxycurl, qdrant

## Perimetre retenu
- Endpoints/noeuds metier utilisables en workflow: CRUD ressources, search/list/get, execution/action, tracking.
- Exclusions: configuration globale admin, credentials/OAuth, billing, parametres techniques d'organisation.

## Coverage metier
- postman: 22/22 (100%)
- postmark: 44/44 (100%)
- prestashop: 25/25 (100%)
- proxycurl: 23/23 (100%)
- qdrant: 10/10 (100%)

## Endpoints/noeuds ajoutes
- postman
- `POST /monitors` -> `postman_monitor_create`
- `PUT /monitors/{id}` -> `postman_monitor_update`
- `DELETE /monitors/{id}` -> `postman_monitor_delete`

- prestashop
- `PUT /customers/{id}` -> `ps_customer_update`
- `DELETE /customers/{id}` -> `ps_customer_delete`
- `DELETE /products/{id}` -> `ps_product_delete`

- qdrant
- `PUT /collections/{collection}/points` (update ciblé point) -> `qdrant_points_update`

- postmark
- health node exposé: `postmark_health_ping`

- proxycurl
- health node exposé: `proxycurl_health_ping`

## Endpoints exclus
- postman: gestion team/org/admin, API keys, gouvernance compte.
- postmark: administration serveur globale/billing/identite domaine hors flux email transactionnel.
- prestashop: configuration boutique, employes/permissions, modules/settings admin.
- proxycurl: administration de compte/quotas et parametres internes.
- qdrant: gestion cluster infra et securite operationnelle globale.

## Validation
- Parse JSON manifests: OK
- Chargement `require()` handlers: OK

## Gap residuel
- Aucun sur le perimetre metier retenu.
