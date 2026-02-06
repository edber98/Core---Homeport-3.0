---
name: homeport-node-creator
description: Guide complet pour creer des nodes et plugins dans Homeport (API + Frontend)
metadata:
  tags: homeport, node, plugin, manifest, provider, workflow, flow
---

## When to use

Use this skill whenever you need to create a new node, plugin, or provider in the Homeport platform. This covers:
- Creating a new plugin with manifest.json
- Defining providers (with or without credentials)
- Defining node templates (function, event, condition, loop, agent, memory, tool_ai)
- Writing handler functions (the JS code that executes)
- Understanding the form system (args) for node configuration
- Understanding handles (input, output, linked) and data flow
- Understanding the engine execution model

## How to use

Read individual rule files for detailed explanations and code examples:

- [rules/architecture.md](rules/architecture.md) - Vue d'ensemble de l'architecture plugin/node
- [rules/manifest.md](rules/manifest.md) - Format complet du manifest.json (providers + nodeTemplates)
- [rules/provider.md](rules/provider.md) - Comment definir un provider et son formulaire de credentials
- [rules/node-template.md](rules/node-template.md) - Structure complete d'un node template (tous les types)
- [rules/handles.md](rules/handles.md) - inputHandles, outputHandles, linkedHandles et types de donnees
- [rules/form-args.md](rules/form-args.md) - Systeme de formulaires dynamiques (args) avec tous les types de champs
- [rules/handler-function.md](rules/handler-function.md) - Comment ecrire la fonction JS qui execute le node
- [rules/variables.md](rules/variables.md) - Systeme de variables reutilisables pour les schemas de sortie
- [rules/engine.md](rules/engine.md) - Comment le moteur execute les nodes et transmet les donnees
- [rules/checklist.md](rules/checklist.md) - Checklist complete pour creer un nouveau node de A a Z
- [rules/examples.md](rules/examples.md) - Exemples complets reels (HTTP, OpenAI, Email, Core)

## Key paths in the project

- **Manifests (local):** `API/src/plugins/local/{plugin-name}/manifest.json`
- **Manifests (repos):** `API/src/plugins/repos/{plugin-name}/manifest.json`
- **Handlers:** `API/src/plugins/{local|repos}/{plugin-name}/functions/*.js`
- **Registry:** `API/src/plugins/registry.js`
- **Importer:** `API/src/plugins/importer.js`
- **Engine:** `API/src/engine/index.js`
- **NodeTemplate model:** `API/src/db/models/node-template.model.js`
- **Provider model:** `API/src/db/models/provider.model.js`
