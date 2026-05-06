---
name: webapp-bundle
description: Construit un mini site web multi-pages avec assets et l'emballe dans un .zip téléchargeable.
runtime: node
entrypoint: /app/skills-bundle/web-artifacts-builder/build.mjs
version: 1.0.0
license: MIT
mimeType: application/zip
outputExt: zip
tools: [skill_execute]
tags: [webapp, bundle, zip, react, multi-page]
timeoutMs: 60000
---

# webapp-bundle — Site web zipé

## Quand utiliser
Quand l'utilisateur veut un **livrable zippé** : pages HTML + CSS/JS partagés + assets (textes, images). Idéal pour :
- un **starter kit** envoyé par mail,
- un **prototype** à déposer dans une review,
- un **artifact interactif React** servi via CDN (`framework: "react-cdn"`).

Pour une seule page HTML, préfère `frontend-html`.

## Schéma d'entrée
```json
{
  "title": "App",
  "framework": "vanilla",            // ou "react-cdn"
  "theme": "brand",                  // light | dark | brand
  "shared": { "css": "/* global */", "js": "/* global */" },
  "pages": [
    {"path": "index.html",         "spec": {"title": "Accueil", "html": "<h1>Bienvenue</h1>"}},
    {"path": "docs/quickstart.html","spec": {"title": "Doc",    "html": "<p>Guide</p>"}}
  ],
  "assets": [
    {"path": "assets/notes.txt", "content": "hello", "encoding": "utf8"}
  ]
}
```

`framework: "react-cdn"` injecte un `<script type="importmap">` vers React 18 (esm.sh) pour pouvoir écrire du JSX-light côté client sans bundler.

## Sortie
`out/<slug>.zip` — décompressible et ouvrable dans un navigateur via `index.html`.

## Exemples

### Starter kit docs vanilla
```json
{
  "title": "Docs",
  "framework": "vanilla",
  "theme": "light",
  "pages": [
    {"path": "index.html",        "spec": {"title": "Docs", "html": "<h1>Bienvenue</h1>"}},
    {"path": "getting-started.html","spec": {"title": "Démarrer", "html": "<h2>Installation</h2>"}}
  ],
  "shared": {
    "css": "body { font-family: system-ui; max-width: 720px; margin: auto; padding: 2rem; }"
  }
}
```

### Artifact React CDN
```json
{
  "title": "Demo",
  "framework": "react-cdn",
  "theme": "dark",
  "pages": [
    {"path": "index.html", "spec": {
      "title": "Demo",
      "html": "<div id='root'></div>",
      "js": "import {createRoot} from 'react-dom/client'; createRoot(document.getElementById('root')).render('hello');"
    }}
  ]
}
```

## Limitations
- Pas de bundler : les imports doivent pointer vers des ESM CDN (esm.sh, jspm).
- Les `assets` doivent être en `utf8` ou `base64` — pas de streaming.
- Plafond 50 MB pour le zip final.

## Troubleshooting
- `zip_unavailable` → vérifier que `archiver` (npm) ou `zip` (apk) est installé.
- `duplicate_path:X` → deux `pages` ou `assets` visent le même chemin.
