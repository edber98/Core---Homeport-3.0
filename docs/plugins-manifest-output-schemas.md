Spécification: Schémas de sortie par handle (v2)

Objectif: permettre à chaque `outputHandle` d’un template d’exposer un schéma de sortie éditable, et de factoriser ces schémas via des variables de manifest.

Concepts
- outputHandles[i].schema: schéma de formulaire (Dynamic Form) attaché à un handle de sortie (ex: `ok`, `memory`).
- variables: dictionnaire de schémas réutilisables au niveau du manifest de repo.
- Références: un schéma peut référencer une variable sous la forme "$var:nom" ou { "$var": "nom" }.

Manifest
{
  "variables": {
    "my_schema": { "title": "…", "ui": { }, "fields": [ ] }
  },
  "nodeTemplates": [
    {
      "outputHandles": [
        { "id": "ok", "name": "Success", "type": "payload", "schema": "$var:my_schema" }
      ]
    }
  ]
}

Import
- L’importeur résout schema par variable (merge manifest.variables et template.variables).
- schema est normalisé avec expressions activées (compat Form Builder).
- Le schéma est persisté dans outputHandles[i].schema.

Édition
- Éditeur Template: onglets par sortie, prévisualisation + JSON + bouton “Form Builder”.
- Le schéma est stocké dans le handle et sauvegardé avec le template.

Viewer
- Viewer Template: section repliable “Schémas de sortie”, onglets par handle, prévisualisation read-only.

Notes
- V1 outputSchemas global est obsolète. La v2 stocke par handle (source de vérité).
- Les types des handles ne définissent pas la forme; le schema l’exprime pour l’UI/validation out-of-band.
