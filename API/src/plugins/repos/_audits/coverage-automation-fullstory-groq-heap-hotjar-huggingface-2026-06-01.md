# Audit couverture automation - fullstory, groq, heap, hotjar, huggingface
Date: 2026-06-01

## fullstory
- Coverage metier: 23/23 (100%)
- Endpoints ajoutes:
  - GET `/api/v1/export/userEvents` -> `fullstory_user_events_export`
  - GET `/api/v1/export/userPages` -> `fullstory_user_pages_export`
- Endpoints exclus:
  - Operations API (`/operations/v1/*`) : suivi technique asynchrone (admin/maintenance)
  - Settings API (`/settings/*`) : parametrage global
  - Segments/Search export administration : pilotage analytique admin, hors action workflow directe
- Gap residuel: aucun

## groq
- Coverage metier: 16/16 (100%)
- Endpoints ajoutes:
  - POST `/embeddings` -> `groq_embeddings_create`
  - POST `/responses` -> `groq_response_create`
  - GET `/responses/{response_id}` -> `groq_response_get`
  - DELETE `/responses/{response_id}` -> `groq_response_delete`
- Endpoints exclus:
  - Projects/Keys/Permissions: administration securite
  - Spend/Billing: financier admin
- Gap residuel: aucun

## heap
- Coverage metier: 6/6 (100%)
- Endpoints deja couverts:
  - Track, Bulk Track, Identify, Add User Properties, Add Account Properties
- Endpoints exclus:
  - Configuration de tracking/snippets/projet
- Gap residuel: aucun

## hotjar
- Coverage metier: 5/5 (100%)
- Endpoints deja couverts:
  - Auth Token, Survey List/Get, Survey Responses List, User Lookup
- Endpoints exclus:
  - Parametrage site/workspace et administration
- Gap residuel: aucun

## huggingface
- Coverage metier: 9/9 (100%)
- Endpoints ajoutes:
  - GET `/api/spaces` -> `huggingface_spaces_list`
  - GET `/api/spaces/{repoId}` -> `huggingface_space_get`
  - GET `/api/datasets/{repoId}` -> `huggingface_dataset_get`
- Endpoints exclus:
  - Creation/suppression repo (`/api/repos/create`, `/api/repos/delete`) : operations de gouvernance du hub
  - Webhooks/OAuth/permissions: configuration et securite
- Gap residuel: aucun

## Validation technique
- JSON manifests: parse OK
- Chargement handlers JS: OK
