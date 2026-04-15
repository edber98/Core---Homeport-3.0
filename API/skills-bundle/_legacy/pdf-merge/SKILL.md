---
name: pdf-merge
description: Fusionne, scinde ou réorganise des fichiers PDF (merge, split, extract pages, rotate).
runtime: python
entrypoint: /app/skills-bundle/pdf-merge/merge.py
version: 1.0.0
license: MIT
mimeType: application/pdf
outputExt: pdf
tools: [skill_execute]
tags: [pdf, merge, split, pypdf]
timeoutMs: 60000
requiresInput: true
---

# pdf-merge — Fusionner / scinder / extraire des pages d'un PDF

## Quand utiliser
- Fusionner plusieurs PDF en un seul
- Extraire un sous-ensemble de pages d'un PDF
- Faire pivoter des pages
- Réorganiser l'ordre des pages

Les fichiers source doivent être fournis dans `files:[{path, fileId}]` (copiés dans `/workspace/in/`).

## Schéma d'entrée (stdin)
```json
{
  "action": "merge",
  "sources": ["doc1.pdf", "doc2.pdf", "doc3.pdf"],
  "outputName": "fusionne"
}
```

Action `extract` :
```json
{
  "action": "extract",
  "source": "rapport.pdf",
  "pages": [1, 2, 5, "10-15"],
  "outputName": "extract"
}
```

Action `rotate` :
```json
{
  "action": "rotate",
  "source": "doc.pdf",
  "rotations": [{"page": 1, "degrees": 90}, {"page": 2, "degrees": 180}],
  "outputName": "rotated"
}
```

## Limitations
- Ne décrypte PAS les PDF protégés par mot de passe.
- `degrees` doit être un multiple de 90.
- Taille sortie plafonnée à 50 MB.

## Troubleshooting
- `source_not_found:X` → fichier pas stagé dans `files`.
- `invalid_action` → seules `merge`, `extract`, `rotate` sont reconnues.
- `invalid_page_range` → format attendu : entier ou `"a-b"`.
