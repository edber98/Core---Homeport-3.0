---
name: frontend-html
description: Génère une page (ou un mini site multi-pages) HTML autonome avec Tailwind et thème configurable.
runtime: node
entrypoint: /app/skills-bundle/frontend-design/build.mjs
version: 1.0.0
license: MIT
mimeType: text/html
outputExt: html
tools: [skill_execute]
tags: [html, tailwind, landing, artifact]
timeoutMs: 30000
---

# frontend-html — Page HTML autonome

## Quand utiliser
Quand l'utilisateur demande :
- une **landing page**, un **artifact** visuel unique,
- un **mini site** de quelques pages navigables entre elles (utiliser `pages:`),
- un rendu rapide sans backend.

Pour un vrai bundle multi-page zipé (avec assets, framework, shared JS/CSS), utilise plutôt `webapp-bundle`.

## Schéma d'entrée

### Single page
```json
{
  "title": "Landing",
  "theme": "light",
  "html": "<section class='p-8'><h1 class='text-3xl font-bold'>Hello</h1></section>",
  "css":  ".accent { color: var(--hp-primary); }",
  "js":   "console.log('ready');"
}
```

### Multi-page
```json
{
  "title": "Site",
  "theme": "dark",
  "pages": [
    {"path": "index.html", "title": "Accueil", "label": "Accueil", "html": "<h1>Accueil</h1>"},
    {"path": "about.html", "title": "À propos", "label": "À propos", "html": "<p>Équipe</p>"}
  ]
}
```

## Thèmes
`light` | `dark` | `brand`.

Variables CSS exposées : `--hp-bg`, `--hp-text`, `--hp-primary`, `--hp-secondary`.

## Sorties
- Single page → `out/<slug>.html`
- Multi-page  → `out/<slug>/index.html` (+ sous-pages et navigation auto).

## Exemples

### Landing produit
```json
{
  "title": "Homeport",
  "theme": "brand",
  "html": "<main class='min-h-screen flex items-center justify-center p-8'><div class='max-w-2xl text-center'><h1 class='text-5xl font-black mb-4'>Homeport</h1><p class='text-xl opacity-80'>La plateforme no-code pour équipes produit.</p><a href='#' class='mt-8 inline-block px-6 py-3 bg-[var(--hp-primary)] text-white rounded-xl'>Démarrer</a></div></main>"
}
```

## Limitations
- Tailwind est injecté via CDN — pas de purge, pas de plugins custom.
- Le JS est exécuté en inline `<script>` : pas d'imports ESM sophistiqués (pour ça, utiliser `webapp-bundle` avec `framework: react-cdn`).
- Taille plafonnée à 50 MB.

## Troubleshooting
- `invalid_page_path` → les `path` doivent rester relatifs et sans `..`.
- `theme_unknown` → se limiter aux presets ou fournir `theme: {primary, bg, text}`.
