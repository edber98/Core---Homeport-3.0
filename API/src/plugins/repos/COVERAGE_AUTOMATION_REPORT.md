# Coverage Automation Report (hors parametrage)

Date: 2026-06-01

Connecteurs appliques avec le skill `kinn-endpoint-coverage-auditor`:

- amplitude_api
- anthropic
- apify
- apollo

## Resultat courant (etat repo)

- amplitude_api: covered=35, missing=0, excluded=0, custom_request=true
- anthropic: covered=23, missing=0, excluded=0, custom_request=true
- apify: covered=23, missing=0, excluded=0, custom_request=true
- apollo: covered=22, missing=0, excluded=0, custom_request=true

## Fichiers de matrice generes

- `API/src/plugins/repos/amplitude_api/coverage-template.json`
- `API/src/plugins/repos/anthropic/coverage-template.json`
- `API/src/plugins/repos/apify/coverage-template.json`
- `API/src/plugins/repos/apollo/coverage-template.json`

## Note methodologique

La matrice actuelle part des noeuds existants et sert de base de revue endpoint-par-endpoint.
Le noeud `custom_request` present sur les 4 connecteurs couvre les endpoints operationnels restants sans ajouter de noeud dedie.
