# Homeport Skills Bundle

Scripts standalone exécutés par la sandbox (bubblewrap) pour générer des documents
(Word, PowerPoint, Excel, HTML, sites web multi-pages).

Ce bundle suit la convention **Anthropic skills** (voir
<https://github.com/anthropics/skills>) : chaque skill est un **répertoire**
contenant un `SKILL.md` (frontmatter YAML + instructions Markdown) + un ou
plusieurs scripts d'exécution.

## Format `SKILL.md`

```markdown
---
name: pptx-designed
description: Crée des présentations PowerPoint modernes via pptxgenjs.
runtime: node                    # node | python | shell
entrypoint: /app/skills-bundle/pptx/pptxgenjs.mjs
version: 1.0.0
license: MIT
mimeType: application/vnd.openxmlformats-officedocument.presentationml.presentation
outputExt: pptx
tools: [skill_execute]
tags: [pptx, presentation, design]
timeoutMs: 90000                  # optionnel (défaut 120s)
allowNetwork: false               # optionnel (défaut false)
requiresInput: false              # optionnel (défaut false)
---

# Titre du skill

## Quand utiliser
…

## Schéma d'entrée (stdin)
```json
{ … }
```

## Exemples
…

## Limitations
…

## Troubleshooting
…
```

### Champs du frontmatter

| Champ          | Obligatoire | Description                                              |
|----------------|-------------|----------------------------------------------------------|
| `name`         | oui         | identifiant unique (kebab-case).                         |
| `description`  | oui         | phrase décrivant le skill (utilisée dans `skill_list`).   |
| `runtime`      | oui         | `node` \| `python` \| `shell`.                           |
| `entrypoint`   | oui         | chemin absolu (sandbox) ou relatif au `SKILL.md`.        |
| `version`      | non         | semver (défaut `0.0.0`).                                 |
| `license`      | non         | texte libre.                                             |
| `mimeType`     | non         | MIME retourné après stockage du fichier produit.         |
| `outputExt`    | non         | extension du fichier produit.                            |
| `tags`         | non         | tableau de tags pour filtrage.                           |
| `timeoutMs`    | non         | timeout sandbox.                                         |
| `allowNetwork` | non         | autorise l'accès réseau depuis le script.                |
| `requiresInput`| non         | exige `files: [...]` pour l'exécution.                   |

## Convention d'exécution

Chaque script :

1. Lit **stdin** : une spec JSON complète (pas d'arguments CLI, pas d'interactif).
2. Lit éventuellement des fichiers d'entrée dans `/workspace/in/<nom>`.
3. Écrit le livrable dans `/workspace/out/<slug>.<ext>`.
4. Imprime sur **stdout** le chemin relatif (ex : `out/mon-doc.docx`).
5. En cas d'erreur : message lisible sur **stderr** + `exit(1)`.

Taille de sortie max : **50 MB**.

Variable d'env `HOMEPORT_WORKSPACE` pour override `/workspace`.

## Runtimes disponibles (Dockerfile Alpine)

- **Node 24** — `pptxgenjs`, `archiver`, `date-fns`, `cheerio`, `mammoth`,
  `turndown`, `undici`, `@mozilla/readability`, `jsdom`, `xlsx`.
- **Python 3** — `python-docx`, `python-pptx`, `openpyxl`, `pandas`, `numpy`,
  `Pillow`, `lxml`, `beautifulsoup4`, `pypdf`, `readability-lxml`, `matplotlib`,
  `seaborn`, `requests`.
- **Chromium** (Alpine `chromium` + Playwright env vars) pour les tâches headless.

## Skills actuels

| Nom              | Runtime | Sortie | Usage                                                      |
|------------------|---------|--------|------------------------------------------------------------|
| `docx-create`    | python  | .docx  | Document Word à partir d'une spec (paragraphes, tableaux). |
| `docx-edit`      | python  | .docx  | Édition d'un Word existant (replace, append, insert).      |
| `pptx-create`    | python  | .pptx  | Présentation sobre (python-pptx, layouts standards).       |
| `pptx-designed`  | node    | .pptx  | Présentation design (pptxgenjs, charts natifs, thèmes).    |
| `xlsx-create`    | python  | .xlsx  | Classeur Excel stylé (formules, charts bar/line/pie).      |
| `frontend-html`  | node    | .html  | Page HTML autonome ou mini site multi-pages (Tailwind CDN).|
| `webapp-bundle`  | node    | .zip   | Bundle web multi-pages avec assets, framework, zippé.      |

## Créer un nouveau skill

1. `mkdir API/skills-bundle/mon-skill/`
2. Écrire le script d'exécution (lit stdin JSON, écrit dans `/workspace/out/`).
3. Ajouter un `SKILL.md` avec frontmatter complet + corps Markdown pour l'agent.
4. (Optionnel) Ajouter les libs manquantes au `Dockerfile` et au `package.json`.
5. Redémarrer le serveur — `initSkills()` chargera automatiquement le nouveau
   SKILL.md et le rendra disponible via `skill_list` / `skill_get` / `skill_execute`.
6. Ajouter un test dans `API/src/ai/skills/__tests__/skills.test.js`.

## Codes d'erreur usuels

- `empty_stdin` / `invalid_json`
- `spec_must_be_object`
- `source_not_found`
- `unknown_action`
- `save_failed`
- `output_too_large`
- `output_missing`
- `zip_unavailable`
- `unhandled_error`
