---
name: markdown-to-html
description: Convertit du Markdown en page HTML autonome et stylée (GitHub-like ou Tailwind CDN).
runtime: node
entrypoint: /app/skills-bundle/markdown-to-html/convert.mjs
version: 1.0.0
license: MIT
mimeType: text/html
outputExt: html
tools: [skill_execute]
tags: [markdown, html, convert, documentation]
timeoutMs: 30000
---

# markdown-to-html — Convertir Markdown → HTML stylé

## Quand utiliser
Quand l'utilisateur a du Markdown et veut une page HTML publiable (documentation, note de version, article). Supporte titres, listes, tableaux, code blocks, images, liens.

## Schéma d'entrée (stdin)
```json
{
  "title": "Note de version 1.2",
  "markdown": "# Titre\n\nParagraphe avec **gras**.\n\n- item 1\n- item 2",
  "theme": "github" | "tailwind",
  "outputName": "release-notes"
}
```

- `theme: "github"` (défaut) — style GitHub-like avec CSS inline.
- `theme: "tailwind"` — utilise Tailwind via CDN (prose classes), plus moderne.

## Exemple
```json
{
  "title": "Plan d'action Q2",
  "markdown": "# Plan Q2\n\n## Objectifs\n\n1. Lancer la v2\n2. Recruter 3 ingenieurs\n\n## Tableau\n\n| Equipe | Budget |\n|--------|--------|\n| Backend | 50k |\n| Frontend | 40k |",
  "theme": "tailwind"
}
```

## Limitations
- Pas d'exécution JS : le HTML généré est statique.
- Les images référencées en URL externe doivent être accessibles publiquement.
- Code blocks sans coloration syntaxique avancée (prism/highlight.js non inclus).

## Troubleshooting
- `marked not installed` → vérifier Dockerfile Node.
- `empty_markdown` → passer au moins une chaine non vide.
