---
name: pdf-extract
description: Extrait le texte et les métadonnées d'un PDF en fichier .txt ou .json structuré.
runtime: python
entrypoint: /app/skills-bundle/pdf-extract/extract.py
version: 1.0.0
license: MIT
mimeType: application/json
outputExt: json
tools: [skill_execute]
tags: [pdf, extract, text, pdfplumber]
timeoutMs: 90000
requiresInput: true
---

# pdf-extract — Extraire texte et tableaux d'un PDF

## Quand utiliser
- Extraire le texte lisible d'un PDF (pages ou entier)
- Récupérer les tableaux détectés (format tabulaire)
- Obtenir les métadonnées (title, author, pages count)

Le fichier source doit être fourni dans `files:[{path, fileId}]`.

## Schéma d'entrée (stdin)
```json
{
  "source": "rapport.pdf",
  "pages": [1, 2, "5-8"],
  "includeTables": true,
  "outputName": "rapport-extract"
}
```

`pages` est optionnel — si absent, toutes les pages sont traitées.

## Format de sortie (JSON)
```json
{
  "metadata": {
    "title": "...",
    "author": "...",
    "pages": 42
  },
  "pages": [
    {"index": 1, "text": "..."},
    {"index": 2, "text": "...", "tables": [[["a", "b"], ["c", "d"]]]}
  ]
}
```

## Limitations
- Extraction de tableaux best-effort via pdfplumber (fonctionne mal sur layouts complexes ou scans).
- Pas d'OCR — pour les PDF scannés, le résultat sera vide.
- Taille sortie plafonnée à 50 MB.

## Troubleshooting
- `source_not_found` → fichier pas stagé dans `files`.
- `pdfplumber not installed` → vérifier Dockerfile.
