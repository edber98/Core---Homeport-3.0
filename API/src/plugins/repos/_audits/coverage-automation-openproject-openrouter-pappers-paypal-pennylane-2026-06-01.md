# Audit couverture automation - openproject, openrouter, pappers, paypal, pennylane

## Perimetre retenu
- Endpoints metier utilises en automation: CRUD metier, list/search, transitions d etat, actions unitaires frequentes.
- Exclus: configuration globale, credentials/OAuth, administration compte/projet/workspace, billing purement technique.

## Coverage metier
- openproject: 11/11 (100%)
- openrouter: 19/19 (100%)
- pappers: 12/12 (100%)
- paypal: 10/10 (100%)
- pennylane: 26/26 (100%)

## Endpoints/noeuds ajoutes
- openproject
- `GET /projects/:id` -> `get_openproject_project`
- `GET /work_packages/:id` -> `get_openproject_task`
- `DELETE /work_packages/:id` -> `delete_openproject_task`
- openrouter
- `GET /credits` -> `openrouter_credit_get_getcredits`
- paypal
- `GET /v2/payments/captures/:capture_id` -> `paypal_capture_get`
- pennylane
- `GET /products/:id` -> `pl_product_get`
- `PUT /products/:id` -> `pl_product_update`

## Endpoints exclus
- openproject: administration membres/roles/projet, configuration systeme, endpoints techniques HAL non metier.
- openrouter: cles API, settings de compte, endpoints admin internes/facturation compte.
- pappers: gestion abonnement/cle API, webhooks et exports admin de plateforme.
- paypal: catalog products/plans/subscriptions payouts, reporting/settlement purement backoffice, webhooks de management.
- pennylane: parametrage organisation, gestion utilisateurs/permissions, endpoints admin de configuration comptable globale.

## Validation
- Parse JSON manifests: OK
- Chargement `require()` de tous les handlers: OK

## Gap residuel
- Aucun sur le perimetre metier retenu.
