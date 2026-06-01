# Audit couverture automation - firebase / fireblocks / firecrawl / footstep / freshdesk
Date: 2026-06-01

## firebase
Coverage metier: 12/12 (100%)

Endpoints couverts:
- GET `/v1/projects/{project}/databases/{db}/documents/{documentPath}` (document get)
- GET `/v1/projects/{project}/databases/{db}/documents/{collectionPath}` (documents list)
- POST `/v1/projects/{project}/databases/{db}/documents/{collectionPath}` (document create)
- PATCH `/v1/projects/{project}/databases/{db}/documents/{documentPath}` (document update)
- DELETE `/v1/projects/{project}/databases/{db}/documents/{documentPath}` (document delete)
- POST `/v1/projects/{project}/databases/{db}/documents/{parentPath}:runQuery` (query)
- POST `/v1/projects/{project}/messages:send` (FCM send)
- GET `/{path}.json` (RTDB get)
- PUT `/{path}.json` (RTDB set)
- PATCH `/{path}.json` (RTDB update)
- POST `/{path}.json` (RTDB push)
- DELETE `/{path}.json` (RTDB delete)

Endpoints exclus:
- Indexes, operations, field configuration: admin/configuration
- Security rules and IAM bindings: configuration
- Project-level setup and service usage endpoints: administration globale

Gap residuel: aucun endpoint metier retenu manquant.

## fireblocks
Coverage metier: 10/10 (100%)

Endpoints couverts:
- GET `/vault/accounts_paged`
- GET `/vault/accounts/{vaultAccountId}`
- POST `/vault/accounts`
- PUT `/vault/accounts/{vaultAccountId}`
- POST `/vault/accounts/{vaultAccountId}/{assetId}/activate`
- GET `/vault/accounts/{vaultAccountId}/{assetId}`
- GET `/transactions`
- GET `/transactions/{txId}`
- POST `/transactions`
- POST `/transactions/{txId}/cancel`

Endpoints exclus:
- Workspace users/roles/policies: administration
- API co-signers, network links, NCW/device management: configuration technique
- Webhooks management and callbacks setup: configuration

Gap residuel: aucun endpoint metier retenu manquant.

## firecrawl
Coverage metier: 10/10 (100%)

Endpoints couverts:
- POST `/v2/scrape`
- POST `/v2/extract`
- POST `/v2/search`
- POST `/v2/map`
- POST `/v2/crawl`
- GET `/v2/crawl/{id}`
- DELETE `/v2/crawl/{id}`
- POST `/v2/batch/scrape`
- GET `/v2/batch/scrape/{id}`
- DELETE `/v2/batch/scrape/{id}`

Endpoints exclus:
- Team billing/quota and organization settings
- API key and workspace administration

Gap residuel: aucun endpoint metier retenu manquant.

## footstep
Coverage metier: 13/13 (100%)

Endpoints couverts:
- POST `/v1/geocoding/search`
- POST `/v1/geocoding/reverse`
- POST `/v1/geocoding/places`
- POST `/v1/geocoding/batch`
- POST `/v1/address/parse`
- POST `/v1/routing/route`
- POST `/v1/routing/find-and-route`
- POST `/v1/routing/optimize`
- POST `/v1/routing/matrix`
- POST `/v1/routing/compare`
- POST `/v1/routing/isochrone`
- POST `/v1/routing/elevation`
- POST `/v1/ai/query`

Endpoints exclus:
- Gestion tenant/organisation/plan
- Parametrage console et administration de compte

Gap residuel: aucun endpoint metier retenu manquant.

## freshdesk
Coverage metier: 27/27 (100%)

Endpoints couverts:
- GET `/api/v2/tickets`
- GET `/api/v2/tickets/{id}`
- GET `/api/v2/search/tickets`
- POST `/api/v2/tickets`
- PUT `/api/v2/tickets/{id}`
- DELETE `/api/v2/tickets/{id}`
- POST `/api/v2/tickets/{id}/reply`
- GET `/api/v2/contacts`
- GET `/api/v2/contacts/{id}`
- POST `/api/v2/contacts`
- PUT `/api/v2/contacts/{id}`
- DELETE `/api/v2/contacts/{id}`
- GET `/api/v2/companies`
- GET `/api/v2/companies/{id}`
- POST `/api/v2/companies`
- PUT `/api/v2/companies/{id}`
- DELETE `/api/v2/companies/{id}`
- GET `/api/v2/agents`
- GET `/api/v2/agents/{id}`
- GET `/api/v2/groups`
- GET `/api/v2/groups/{id}`
- GET `/api/v2/tickets/{id}/notes`
- POST `/api/v2/tickets/{id}/notes`
- GET `/api/v2/tickets/{id}/time_entries`
- POST `/api/v2/tickets/{id}/time_entries`
- GET `/api/v2/surveys/satisfaction_ratings`
- (event) webhook incoming node existant

Endpoints exclus:
- Scenarios/automations rules management
- Agent permissions/admin roles
- Email config, channels config, SLA policy administration

Gap residuel: aucun endpoint metier retenu manquant.

## Validation technique
- Manifest parse: OK (`firebase`, `fireblocks`, `firecrawl`, `footstep`, `freshdesk`)
- Handlers chargement: OK pour tous les noeuds ajoutes
- Point preexistant detecte: `freshdesk` contient un node `fd_webhook_event` reference sans fichier `functions/fd-webhook-event.js`.
