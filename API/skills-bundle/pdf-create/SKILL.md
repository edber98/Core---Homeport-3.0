---
name: pdf-create
description: Crée un document PDF depuis une spec JSON (titres, paragraphes, tableaux, sauts de page, images).
runtime: python
entrypoint: /app/skills-bundle/pdf-create/create.py
version: 1.0.0
license: MIT
mimeType: application/pdf
outputExt: pdf
tools: [skill_execute]
tags: [pdf, document, report, reportlab]
timeoutMs: 60000
---

# pdf-create — Créer un PDF

## Quand utiliser
Quand l'utilisateur demande un livrable PDF à générer depuis zéro : rapport, facture, bon de commande, certificat, note.

Si le contenu existe déjà dans un `.docx`, privilégie `docx-create` puis convertis en PDF via `html-to-pdf` si besoin.

## Schéma d'entrée (stdin)
```json
{
  "title": "Rapport Q1",
  "author": "Homeport",
  "pageSize": "A4",
  "margins": {"top": 20, "bottom": 20, "left": 20, "right": 20},
  "blocks": [
    {"type": "heading", "level": 1, "text": "Titre principal"},
    {"type": "paragraph", "text": "Texte du paragraphe."},
    {"type": "spacer", "height": 12},
    {"type": "table", "headers": ["Colonne A", "Colonne B"], "rows": [["1", "2"]]},
    {"type": "image", "path": "logo.png", "widthInches": 2.0},
    {"type": "pageBreak"}
  ]
}
```

Types de blocs : `heading` (levels 1-3), `paragraph`, `spacer`, `table`, `image`, `pageBreak`.

## Exemple — Facture simple
```json
{
  "title": "Facture F2026-0042",
  "blocks": [
    {"type": "heading", "level": 1, "text": "Facture F2026-0042"},
    {"type": "paragraph", "text": "Date : 14 avril 2026"},
    {"type": "spacer", "height": 12},
    {"type": "table",
     "headers": ["Designation", "Qté", "PU", "Total"],
     "rows": [
       ["Consulting", "10", "120 EUR", "1200 EUR"],
       ["Support",    "5",  "80 EUR",  "400 EUR"]
     ]},
    {"type": "spacer", "height": 20},
    {"type": "paragraph", "text": "Total HT : 1600 EUR"}
  ]
}
```

## Limitations
- Polices limitées aux polices par défaut de reportlab (Helvetica, Times, Courier).
- Pas de support Unicode étendu hors ASCII/Latin-1 — si tu veux des glyphes spéciaux (emoji), passe par `html-to-pdf`.
- Taille sortie plafonnée à 50 MB.

## Troubleshooting
- `reportlab not installed` → vérifier le Dockerfile.
- `source_not_found:path` → l'image référencée n'est pas stagée en entrée.
- `invalid_table` → `headers` et `rows` doivent être des listes.
