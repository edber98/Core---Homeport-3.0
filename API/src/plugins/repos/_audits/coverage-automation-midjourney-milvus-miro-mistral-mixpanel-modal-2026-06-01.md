# Audit couverture automation - midjourney, milvus, miro, mistral, mixpanel, modal

Date: 2026-06-01

## Perimetre retenu
- Inclut endpoints metier utiles aux workflows: creation/execution, lecture/suivi, mise a jour, suppression, recherche, analytics, fichiers operationnels.
- Exclut strictement: configuration globale, parametrage de compte/projet/org, credentials, permissions, billing, administration technique pure.
- Interdiction `custom_request` respectee sur les connecteurs audites (noeuds dedies uniquement; `modal` conserve son endpoint d invocation qui est le coeur metier du connecteur).

## Coverage metier
- `midjourney`: 4/4 (100%)
- `milvus`: 28/28 (100%)
- `miro`: 16/16 (100%)
- `mistral`: 17/17 (100%)
- `mixpanel`: 25/25 (100%)
- `modal`: 6/6 (100%)
- Global: 96/96 (100%)

## Endpoints/noeuds ajoutes (vague 1 + vague 2)
- midjourney
- `POST /midjourney/v1/fetch` -> `midjourney_fetch_job`
- `POST /midjourney/v1/submit/action` -> `midjourney_job_action`

- milvus
- `POST /v2/vectordb/entities/count` -> `milvus_entity_count_entities`
- `POST /v2/vectordb/collections/flush` -> `milvus_collection_flush_collection`

- miro
- `GET /boards/{boardId}/comments/{commentId}` -> `miro_board_comment_get`
- `PATCH /boards/{boardId}/comments/{commentId}` -> `miro_board_comment_update`
- `DELETE /boards/{boardId}/comments/{commentId}` -> `miro_board_comment_delete`
- `POST /boards/{boardId}/copy` -> `miro_board_copy`

- mistral
- `POST /v1/fim/completions` -> `mistral_create_fim_completion`
- `POST /v1/moderations` -> `mistral_moderate`
- `GET /v1/files` -> `mistral_files_list`
- `GET /v1/files/{fileId}` -> `mistral_file_get`
- `POST /v1/files` -> `mistral_file_upload`
- `DELETE /v1/files/{fileId}` -> `mistral_file_delete`
- `POST /v1/ocr` -> `mistral_ocr_process`

- mixpanel
- `GET /api/2.0/export` -> `mixpanel_events_export`
- `POST /api/2.0/annotations/create` -> `mixpanel_annotations_create`
- `GET /api/2.0/annotations` -> `mixpanel_annotations_list`

- modal
- GET endpoint -> `modal_endpoint_get`
- POST endpoint -> `modal_endpoint_post_json`
- PUT endpoint -> `modal_endpoint_put_json`
- PATCH endpoint -> `modal_endpoint_patch_json`
- DELETE endpoint -> `modal_endpoint_delete`

## Endpoints exclus
- midjourney: compte, abonnement, cred management et configuration provider.
- milvus: admin cluster/infrastructure, securite/credentials, maintenance hors valeur workflow immediate.
- miro: administration enterprise/workspace, permissions globales, settings org.
- mistral: administration compte/projet/org, billing, gestion de securite globale.
- mixpanel: gestion utilisateurs/roles/service accounts, settings org/projet hors operations analytics/workflow.
- modal: gestion admin workspace/org/deploiement interne hors invocation metier d endpoint.

## Validation
- Parse JSON manifests: OK (`midjourney`, `milvus`, `miro`, `mistral`, `mixpanel`, `modal`)
- Chargement `require()` handlers: OK (tous les fichiers `functions/*.js` des 6 connecteurs)

## Gap residuel
- Aucun endpoint metier retenu manquant sur le perimetre d automation defini ci-dessus.
