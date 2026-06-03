# Audit couverture automation - e2b, elasticsearch, elevenlabs, fal_ai, figma

Date: 2026-06-01

## Perimetre retenu
- Inclut uniquement les endpoints metier utiles en workflow automation: lire/lister, creer/lancer, mettre a jour, supprimer/annuler, suivi d execution/resultat.
- Exclut explicitement: configuration globale, administration workspace/org, credentials, billing, permissions et maintenance purement technique.
- Interdiction `custom_request` respectee: noeuds dedies uniquement.

## Coverage metier
- `e2b`: 17/17 (100%)
- `elasticsearch`: 22/22 (100%)
- `elevenlabs`: 12/12 (100%)
- `fal_ai`: 8/8 (100%)
- `figma`: 15/15 (100%)
- Global: 74/74 (100%)

## Endpoints/noeuds ajoutes (dedies)
- e2b
- `GET /` -> `e2bHealthPing`
- elevenlabs
- `GET /v1/history` -> `elevenlabsHistoryList`
- `GET /v1/history/{history_item_id}` -> `elevenlabsHistoryGet`
- `DELETE /v1/history/{history_item_id}` -> `elevenlabsHistoryDelete`
- `POST /v1/audio-isolation` -> `elevenlabsAudioIsolation`
- figma
- `GET /v1/teams/{team_id}/projects` -> `figmaTeamProjectsList`
- `GET /v1/projects/{project_id}/files` -> `figmaProjectFilesList`

## Endpoints exclus
- e2b
- gestion organisation/projet, quotas, facturation, credentials et routes admin internes.
- elasticsearch
- endpoints cluster/admin bas niveau (`_cluster/*`, `_nodes/*`, `_security/*`, snapshots repository admin) hors usage metier direct.
- elevenlabs
- endpoints de gestion de compte, admin workspace, webhooks admin, facturation.
- fal_ai
- endpoints de configuration provider/credentials et administration hors execution de jobs.
- figma
- endpoints purement admin org/workspace, gestion permissions globales, activity logs d administration.

## Validation
- Parse JSON manifests: OK (`e2b`, `elasticsearch`, `elevenlabs`, `fal_ai`, `figma`)
- Chargement `require()` handlers: OK (tous les fichiers `functions/*.js` des 5 connecteurs)

## Gap residuel
- Aucun endpoint metier retenu manquant sur le perimetre d automation defini ci-dessus.
