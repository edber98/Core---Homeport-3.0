---
name: docx-create
description: Crée un document Word (.docx) à partir d'une spec JSON (paragraphes, titres, tableaux, images, sauts de page).
runtime: python
entrypoint: /app/skills-bundle/docx/create.py
version: 1.0.0
license: MIT
mimeType: application/vnd.openxmlformats-officedocument.wordprocessingml.document
outputExt: docx
tools: [skill_execute]
tags: [docx, word, document, report]
timeoutMs: 60000
---

# docx-create — Créer un document Word

## Quand utiliser
Quand l'utilisateur demande un livrable Word : rapport, note, mémo, lettre, compte-rendu. Si le contenu existe déjà dans un `.docx` et doit seulement être modifié, utilise `docx-edit` à la place.

## Schéma d'entrée (stdin)
```json
{
  "title": "Rapport Q1",
  "author": "Homeport",
  "margins": {"top": 1, "bottom": 1, "left": 1, "right": 1},
  "paragraphs": [
    {"text": "Introduction", "style": "Heading 1"},
    {"text": "Texte normal", "bold": false, "italic": false, "align": "justify"}
  ],
  "headings": [{"level": 2, "text": "Section A"}],
  "tables":   [{"headers": ["Nom", "Valeur"], "rows": [["A", "1"]]}],
  "images":   [{"path": "logo.png", "widthInches": 2}],
  "pageBreak": false
}
```

Alternative déclarative (ordre préservé) :
```json
{
  "title": "Exemple",
  "blocks": [
    {"type": "heading",   "level": 1, "text": "Titre"},
    {"type": "paragraph", "text": "Un paragraphe"},
    {"type": "table",     "headers": ["Col"], "rows": [["val"]]},
    {"type": "pageBreak"}
  ]
}
```

## Exemples

### Exemple 1 — Note de service simple
```json
{
  "title": "Note du 12 avril",
  "blocks": [
    {"type": "heading", "level": 1, "text": "Note de service"},
    {"type": "paragraph", "text": "Chers collaborateurs,"},
    {"type": "paragraph", "text": "Veuillez noter que les bureaux seront fermés…"}
  ]
}
```

### Exemple 2 — Rapport avec tableau
```json
{
  "title": "Rapport ventes",
  "paragraphs": [{"text": "Résumé exécutif.", "style": "Normal"}],
  "tables": [{"headers": ["Produit", "CA"], "rows": [["A", "10k"], ["B", "8k"]]}]
}
```

## Limitations
- Pas de styles customisés (utilise les styles Word par défaut : `Normal`, `Heading 1..9`).
- Les images doivent être présentes dans `/workspace/in/` (stagées via `files`).
- Taille de sortie plafonnée à 50 MB.

## Troubleshooting
- `python-docx not installed` → vérifier le Dockerfile.
- `output_too_large` → réduire nombre d'images ou de pages.
- `source_not_found:path` → l'image référencée n'a pas été stagée en entrée.
