# Audit couverture automation - TimescaleDB / Together AI / Trello / Twilio / Twitter

Date: 2026-06-01
Périmètre: endpoints métier utiles à l'automation (CRUD/list/search/exécution), hors config globale, credentials et administration plateforme.

## 1) TimescaleDB

Coverage métier: 9/9 (100%)
Missing: 0

Covered:
- query_execute
- transaction_execute
- tables_list, table_describe
- records_select, record_insert, record_upsert, records_update, records_delete

Exclus:
- admin DB instance, rôles globaux, tuning infra

## 2) Together AI

Coverage métier: 37/37 (100%)
Missing: 0

Covered (familles):
- Models/checkpoints
- Completions & chat completions
- Embeddings & rerank
- Image generation, speech, transcription, translation, video
- Fine-tuning jobs (create/get/list/cancel/delete)
- Batch jobs (create/get/list/cancel)
- Files (upload/list/get/content/delete)
- Jobs/queue metrics & status
- Sessions, TCI execute

Exclus:
- paramètres de compte, gestion d’organisation, admin sécurité

## 3) Trello

Coverage métier: 54/54 (100%)
Missing: 0

Covered (familles):
- Boards/lists/cards/checklists/labels/actions
- Members/organizations
- Search/search members
- Webhooks (create/get/update/delete)
- Actions relationnelles sur cartes (labels, members, comments, attachments, moves)

Exclus:
- settings admin Atlassian org/workspace hors usage workflow direct

## 4) Twilio

Coverage métier: 14/14 (100%)
Missing: 0

Covered:
- SMS: send/list/get/delete
- Calls: create/list/get
- Verify: create verify service, create verification, check verification
- Phone numbers: lookup + owned numbers list/get
- webhook_event node

Exclus:
- account/subaccount admin avancé, billing/settings globaux

## 5) Twitter

Coverage métier: 15/15 (100%)
Missing: 0

Covered:
- Tweets: create/get/delete/list/search
- User graph: get user, followers, following, follow/unfollow
- Mentions, bookmarks
- Authenticated user (`get_me`)

Exclus:
- app/project admin settings, token/key lifecycle

## Validation technique

- Parse JSON manifests: OK
- Chargement handlers représentatifs: OK

