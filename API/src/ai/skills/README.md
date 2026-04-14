# AI Skills runtime

## Vue d'ensemble

Le système de skills Homeport s'inspire du repo Anthropic [`skills`](https://github.com/anthropics/skills).
Chaque skill est un répertoire contenant :

- **`SKILL.md`** — frontmatter YAML + corps Markdown destiné à l'agent.
- **1 ou plusieurs scripts** (Python, Node ou shell) déclarés dans `entrypoint`.
- Éventuellement des templates, fixtures, ou sous-skills.

Au démarrage du serveur, `initSkills()` :

1. Scanne récursivement `API/skills-bundle/` (ou `SKILLS_BUNDLE_DIR`).
2. Parse tous les `SKILL.md` (frontmatter YAML via `js-yaml`).
3. Construit une `Map<name, SkillEntry>` en mémoire.
4. Vérifie la disponibilité des runtimes (Node ≥ 18, Python ≥ 3.10, `pptxgenjs`,
   `python-pptx`, etc.).

## Fichiers

| Fichier                | Rôle                                                               |
|------------------------|--------------------------------------------------------------------|
| `skill-loader.js`      | Scan + parse + validation des `SKILL.md`. Expose `getSkill`, `listSkills`, `reload`. |
| `skill-executor.js`    | Exécute un skill dans la sandbox (spec sur stdin, fichier dans `out/`). |
| `skill-runner.js`      | Ancien runner (registre hard-codé). Gardé pour rétrocompat.         |
| `bundle-index.js`      | Proxy qui merge l'ancien registre + les `SKILL.md` du loader.       |
| `init.js`              | `initSkills()` appelé par `server.js`.                              |

## Meta-tools

Les outils suivants sont disponibles pour l'agent IA (tier 1) :

- `skill_list({runtime?, query?})` — catalogue des skills disponibles.
- `skill_get({name})` — récupère le `SKILL.md` complet (frontmatter + body).
- `skill_execute({name, input, files?})` — exécute dans la sandbox.

Implémentation : `API/src/ai/tools/skill-meta-tools.js`, branchée dans
`meta-tools.js` via `SKILL_META_TOOL_NAMES`.

## Flux typique

```
User: "Génère un pptx design sur la roadmap 2026"
  ↓
Agent → skill_list({query: "pptx"})
Agent → skill_get({name: "pptx-designed"})          ← lit les instructions
Agent → skill_execute({
  name: "pptx-designed",
  input: { title: "Roadmap", theme: "brand", slides: [...] }
})
  ↓
Sandbox (bwrap) : node /app/skills-bundle/pptx/pptxgenjs.mjs < stdin.json
  ↓
Fichier /workspace/out/roadmap.pptx stocké via createFilesHelper()
  ↓
Retour {fileId, name, size, mimeType} à l'agent.
```

## Sandbox

Toutes les exécutions passent par `API/src/ai/sandbox/` :

- Backend `bwrap` (bubblewrap) avec user namespaces — prod.
- Backend `subprocess` (spawn classique, plus permissif) — dev local.
- Backend `none` (test uniquement).

Le choix se fait via `AI_SANDBOX_BACKEND` (défaut `auto`).

## Rechargement à chaud

`skill-loader.reload()` recharge tous les `SKILL.md`. Utile en dev :

```js
const { reload } = require('./ai/skills/skill-loader');
await reload();
```
