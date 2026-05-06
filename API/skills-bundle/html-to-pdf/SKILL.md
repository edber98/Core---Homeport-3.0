---
name: html-to-pdf
description: Convertit du HTML (inline ou fichier .html) en PDF via Chromium headless.
runtime: node
entrypoint: /app/skills-bundle/html-to-pdf/convert.mjs
version: 1.0.0
license: MIT
mimeType: application/pdf
outputExt: pdf
tools: [skill_execute]
tags: [pdf, html, chromium, print]
timeoutMs: 90000
allowNetwork: true
---

# html-to-pdf — Convertir HTML en PDF

## Quand utiliser
Quand tu veux un PDF à partir d'un document HTML avec un rendu fidèle (polices web, CSS complet, emoji, Tailwind). Idéal pour : factures, contrats, rapports visuellement riches.

## Schéma d'entrée (stdin)
```json
{
  "html": "<html><body><h1>Hello</h1></body></html>",
  "source": "index.html",
  "format": "A4",
  "landscape": false,
  "margin": {"top": "20mm", "bottom": "20mm", "left": "15mm", "right": "15mm"},
  "printBackground": true,
  "outputName": "rapport"
}
```

Fournis **soit** `html` (contenu inline) **soit** `source` (fichier `.html` stagé dans `files`).

`format` : `A4` (défaut), `Letter`, `Legal`, `A3`, `A5`. `landscape` : booléen.

## Exemple — Depuis du HTML inline
```json
{
  "html": "<html><body style='font-family:sans-serif'><h1>Facture</h1><p>Montant : 1200 EUR</p></body></html>",
  "format": "A4",
  "outputName": "facture"
}
```

## Exemple — Depuis un fichier HTML (avec `files`)
```json
{
  "source": "release-notes.html",
  "format": "A4",
  "outputName": "notes"
}
```

## Limitations
- Rendu via Chromium système ; les polices web distantes requièrent accès réseau (autorisé par défaut sur ce skill).
- Pas d'exécution JS avec attente de rendu asynchrone > 10s.
- Taille sortie plafonnée à 50 MB.

## Troubleshooting
- `puppeteer not available` → utilise le chromium CLI fallback (voir script).
- `render_timeout` → le HTML a des scripts longs ; simplifie.
