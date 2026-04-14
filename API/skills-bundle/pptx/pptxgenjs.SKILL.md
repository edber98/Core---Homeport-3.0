---
name: pptx-designed
description: Crée des présentations PowerPoint au design moderne via pptxgenjs (Node) — charts natifs, thèmes, master slides, layouts personnalisés.
runtime: node
entrypoint: /app/skills-bundle/pptx/pptxgenjs.mjs
version: 1.0.0
license: MIT
mimeType: application/vnd.openxmlformats-officedocument.presentationml.presentation
outputExt: pptx
tools: [skill_execute]
tags: [pptx, presentation, design, charts, pptxgenjs]
timeoutMs: 90000
---

# pptx-designed — Présentations modernes (pptxgenjs)

## Quand utiliser
Préférer ce skill quand l'utilisateur veut :
- un **design moderne** (palette de couleurs cohérente, typographie soignée)
- des **charts natifs** dans le fichier pptx (bar, line, pie, doughnut, area, radar)
- un **master slide** / **layout custom** (logo, bandeau)
- des **formes / gradients**

Pour une présentation purement textuelle avec les layouts PowerPoint standards, `pptx-create` (python-pptx) suffit et est plus léger.

## Schéma d'entrée
```json
{
  "title": "Roadmap 2026",
  "author": "Homeport",
  "theme": "brand",             // "light" | "dark" | "brand" | object {primary, text, bg}
  "masterSlide": {
    "title": "HP_MASTER",
    "background": "#0f172a",
    "objects": [
      {"rect":  {"x": 0, "y": 0, "w": 10, "h": 0.4, "fill": "#6366f1"}},
      {"text":  {"text": "Homeport", "options": {"x": 0.3, "y": 0.05, "fontSize": 12, "color": "FFFFFF"}}}
    ]
  },
  "slides": [
    {
      "layout": "title",
      "title": "Roadmap 2026",
      "subtitle": "Vision produit",
      "background": "#0f172a"
    },
    {
      "layout": "content",
      "title": "Priorités",
      "bullets": [
        {"text": "Simplifier l'onboarding", "level": 0},
        {"text": "< 5 min de setup", "level": 1},
        {"text": "Accélérer l'IA", "level": 0}
      ]
    },
    {
      "layout": "blank",
      "title": "KPI",
      "charts": [{
        "type": "bar",
        "data": [
          {"name": "Revenu", "labels": ["Q1","Q2","Q3","Q4"], "values": [12, 18, 24, 33]}
        ],
        "options": {"x": 1, "y": 1.5, "w": 8, "h": 4, "barDir": "col"}
      }]
    },
    {
      "layout": "blank",
      "images": [{"path": "diagram.png", "x": 1, "y": 1, "w": 6, "h": 4}],
      "shapes": [{"type": "roundRect", "x": 0.5, "y": 5.5, "w": 9, "h": 1, "fill": "#6366f1"}],
      "notes": "Parler 30 sec de l'archi."
    }
  ]
}
```

## Charts supportés
`bar`, `line`, `pie`, `doughnut`, `area`, `radar`.

Format data (multi-séries) :
```json
{
  "type": "line",
  "data": [
    {"name": "2025", "labels": ["Jan","Fév","Mar"], "values": [10, 15, 13]},
    {"name": "2026", "labels": ["Jan","Fév","Mar"], "values": [14, 22, 19]}
  ],
  "options": {"x": 1, "y": 1, "w": 8, "h": 4, "showLegend": true}
}
```

## Thèmes
- `light` — fond clair, texte sombre.
- `dark` — fond sombre, texte clair.
- `brand` — palette Homeport (indigo #6366f1 / navy #0f172a).
- objet custom `{primary, text, bg}` — couleurs hex sans `#` accepté aussi.

## Exemples

### Pitch deck 3 slides (thème brand)
```json
{
  "title": "Pitch",
  "theme": "brand",
  "slides": [
    {"layout": "title", "title": "Homeport", "subtitle": "No-code platform"},
    {"layout": "content", "title": "Problème", "bullets": [{"text": "Les outils actuels…"}]},
    {"layout": "content", "title": "Solution", "bullets": [{"text": "Homeport automatise…"}]}
  ]
}
```

### Rapport trimestriel avec chart
```json
{
  "title": "Revue Q1",
  "theme": "light",
  "slides": [
    {"layout": "title", "title": "Revue Q1 2026"},
    {"layout": "blank", "title": "Chiffre d'affaires",
      "charts": [{
        "type": "bar",
        "data": [{"name": "CA (k€)", "labels": ["Jan","Fév","Mar"], "values": [120, 135, 148]}],
        "options": {"x": 1, "y": 1.2, "w": 8, "h": 4.5}
      }]
    }
  ]
}
```

## Limitations
- La taille du pptx est limitée à 50 MB.
- Pas de transitions (fade/push) ni d'animations complexes.
- Les polices exotiques ne seront pas embarquées — utiliser celles installées sur la machine cible.

## Troubleshooting
- `pptxgenjs not found` → `npm install -g pptxgenjs` dans le Dockerfile.
- `invalid_chart_type` → se limiter aux types listés ci-dessus.
- `image_not_found:path` → stager via `files: [{path, fileId}]`.
