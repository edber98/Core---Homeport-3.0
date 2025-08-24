# Start node — Injection depuis un flow parent

Objectif: exposer un paramètre d’activation pour permettre à un flow enfant de recevoir un input (payload) depuis un flow parent.

## UI

- Le template `start` inclut dans `args` une case à cocher:
  - Clé: `allowParentInput`
  - Libellé: "Autoriser l'injection depuis un flow parent"
  - Par défaut: `false`
- Présence dans:
  - La palette (Start) — l’éditeur affiche la case dans la boîte de dialogue du nœud.
  - Les seeds de templates (catalog) — `tmpl_start` inclut le schéma `args` ci-dessus.

## Sémantique runtime (proposée)

- Quand un flow est appelé comme sous-flow (via un nœud `flow` «Call Flow» ou équivalent), le runtime peut transmettre un `payload` initial.
- Si le premier nœud du flow enfant est de type `start` et `allowParentInput = true`, ce `payload` est injecté dans le `context` du nœud `start` (ex: `context.parent = payload`).
- Les nœuds suivants peuvent consommer ce `context.parent` (ex: via expressions ou mappages d’arguments).
- Si `allowParentInput = false`, le `payload` parent est ignoré pour ce flow, garantissant l’isolation.

## Considérations

- Valider que l’appelant et l’appelé partagent le même workspace/ACL.
- Éviter les collisions: stocker le payload parent dans un namespace (ex: `context.parent`).
- Suivre le même principe pour d’autres triggers start-like si nécessaire (event/endpoint) si un design similaire est souhaité.

