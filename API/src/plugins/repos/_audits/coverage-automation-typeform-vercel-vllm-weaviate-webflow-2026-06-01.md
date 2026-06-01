# Audit couverture automation - Typeform / Vercel / vLLM / Weaviate / Webflow

Date: 2026-06-01
Périmètre: endpoints métier utiles à l'automation (CRUD/list/search/exécution), hors configuration globale, credentials et administration plateforme.

## 1) Typeform

Coverage métier: 14/14 (100%)
Missing: 0

Covered:
- Forms: create/get/update/delete/list
- Responses: get/list/delete
- Images: upload/list
- Themes: list
- Workspaces: get/list
- webhook_event node

Exclus:
- org/team settings globaux, token management

## 2) Vercel

Coverage métier: 15/15 (100%)
Missing: 0

Covered:
- Projects: create/get/list/delete
- Project domains: add/remove/list
- Deployments: create/get/list/cancel
- Environment variables: create/list/update/delete

Exclus:
- team/account admin, billing/settings globaux

## 3) vLLM

Coverage métier: 15/15 (100%)
Missing: 0

Covered:
- Chat/completion/embedding
- Tokenizer: tokenize/detokenize
- Audio: transcribe/translate
- Rerank/score/pooling
- Models: get/list

Exclus:
- infra serving admin et config runtime serveur

## 4) Weaviate

Coverage métier: 10/10 (100%)
Missing: 0

Covered:
- Schema: create/get/list/delete
- Objects: create/get/update/delete
- Batch create objects
- GraphQL query

Exclus:
- cluster/admin ops, security/settings globaux

## 5) Webflow

Coverage métier: 45/45 (100%)
Missing: 0

Covered (familles):
- Sites/pages publish/update/get/list
- Collections/fields CRUD
- Items CMS (draft/live/bulk/publish/unpublish/delete)
- Assets CRUD/list
- Forms + submissions (get/list/update/delete)
- Custom domains list
- Webhooks create/get/list/delete

Exclus:
- workspace/team admin globale, billing/settings

## Validation technique

- Parse JSON manifests: OK
- Chargement handlers représentatifs: OK
