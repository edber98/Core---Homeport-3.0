# Audit couverture automation - people_data_labs, perplexity, pinecone, pipedrive, plaid

## Perimetre retenu
- Endpoints metier utiles aux workflows: enrich/search/list/get/create/update/delete, sync/refresh, actions recurrentes.
- Exclusion stricte: credentials, oauth setup, parametrage global workspace/compte, administration technique.

## Coverage metier
- people_data_labs: 15/15 (100%)
- perplexity: 5/5 (100%)
- pinecone: 7/7 (100%)
- pipedrive: 32/32 (100%)
- plaid: 18/18 (100%)

## Endpoints/noeuds ajoutes
- people_data_labs
- `POST /v5/person/bulk` -> `people_data_labs_person_bulk_enrich`
- `POST /v5/company/bulk` -> `people_data_labs_company_bulk_enrich`

- perplexity
- `GET /models` -> `perplexity_models_list`

- pipedrive
- `GET /notes/{id}` -> `pipedrive_note_get`
- `PUT /notes/{id}` -> `pipedrive_note_update`
- `DELETE /notes/{id}` -> `pipedrive_note_delete`

- plaid
- `POST /liabilities/get` -> `plaid_liabilities_get`
- `POST /investments/holdings/get` -> `plaid_investments_holdings_get`
- `POST /investments/transactions/get` -> `plaid_investments_transactions_get`
- `POST /transactions/recurring/get` -> `plaid_transactions_recurring_get`

## Endpoints exclus
- people_data_labs: gestion compte API key, quotas, administration projet.
- perplexity: billing/usage admin, gestion organisation/cle API.
- pinecone: control-plane admin (creation/suppression index/projet), IAM/organization settings.
- pipedrive: role/permission admin, parametres entreprise, webhooks management admin.
- plaid: produits CRA/identity verification admin, transfer/payment initiation setup, Link/OAuth config avancee.

## Validation
- Parse JSON manifests: OK
- Chargement `require()` handlers: OK

## Gap residuel
- Aucun sur le perimetre metier retenu.
