---
name: pptx-create
description: Crée une présentation PowerPoint (.pptx) classique via python-pptx (layouts standards, tableaux, images, notes).
runtime: python
entrypoint: /app/skills-bundle/pptx/create.py
version: 1.0.0
license: MIT
mimeType: application/vnd.openxmlformats-officedocument.presentationml.presentation
outputExt: pptx
tools: [skill_execute]
tags: [pptx, presentation, slides]
timeoutMs: 90000
---

# pptx-create — Créer une présentation (python-pptx)

## Quand utiliser
Pour des présentations **sobres** utilisant les layouts standards PowerPoint (`title`, `content`, `two_content`, etc.). Pour un design moderne avec charts avancés, gradients, formes personnalisées : utilise plutôt `pptx-designed` (pptxgenjs).

## Schéma d'entrée
```json
{
  "title": "Pitch produit",
  "author": "Homeport",
  "slides": [
    {"layout": "title", "title": "Mon produit", "subtitle": "Proposition de valeur"},
    {
      "layout": "content",
      "title": "Features",
      "body": [
        {"text": "Rapide",    "level": 0},
        {"text": "Détail",    "level": 1}
      ],
      "notes": "Parler 2 minutes sur la perf"
    },
    {
      "layout": "two_content",
      "title": "Comparaison",
      "body":  [{"text": "Avant"}],
      "body2": [{"text": "Après"}]
    },
    {
      "layout": "blank",
      "images": [{"path": "diagram.png", "position": {"x": 1, "y": 1, "w": 6, "h": 4}}],
      "tables": [{"headers": ["A", "B"], "rows": [["1", "2"]], "position": {"x": 0.5, "y": 5, "w": 9, "h": 1}}]
    }
  ]
}
```

Layouts : `title`, `content`, `section`, `two_content`, `comparison`, `title_only`, `blank`.

## Exemples

### Exemple 1 — Pitch minimal 3 slides
```json
{
  "title": "Pitch",
  "slides": [
    {"layout": "title",   "title": "Homeport", "subtitle": "Plateforme no-code"},
    {"layout": "content", "title": "Problème", "body": [{"text": "Les outils actuels…"}]},
    {"layout": "content", "title": "Solution", "body": [{"text": "Homeport apporte…"}]}
  ]
}
```

### Exemple 2 — Support de réunion avec notes
```json
{
  "title": "Comité hebdo",
  "slides": [
    {"layout": "title_only", "title": "Revue S15"},
    {"layout": "content", "title": "Décisions", "body": [{"text": "Lancer la v2", "level": 0}],
     "notes": "Validation par la direction en amont."}
  ]
}
```

## Limitations
- Pas de charts natifs (utiliser des images PNG pré-calculées).
- Pas de transitions ni animations.
- Position en pouces (`inches`), origine haut-gauche.

## Troubleshooting
- `python-pptx not installed` → vérifier le Dockerfile.
- `unknown_layout` → vérifier l'orthographe (minuscules + underscore).
