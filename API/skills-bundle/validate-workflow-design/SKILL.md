---
name: validate-workflow-design
description: |
  Audit un workflow Kinn et signale les patterns problématiques de conception :
  convergence N→1 sans barrier, classifiers avec branches non-connectées,
  nodes orphelins, args requis manquants, expressions cassées (référence à
  des nodes inexistants). À appeler AVANT de finaliser un workflow pour
  éviter les bugs runtime (appels LLM dupliqués, runs cassés).
runtime: node
entrypoint: /app/skills-bundle/validate-workflow-design/validate.mjs
version: 1.0.0
license: MIT
tools: [skill_execute]
tags: [workflow, validation, planning, design-review]
timeoutMs: 15000
allowNetwork: false
---

# validate-workflow-design — Audit de conception workflow

## Quand utiliser

**Avant de dire "le workflow est prêt"** — toujours :
1. Tu viens de construire/modifier un workflow (`create_flow`, `add_node`, `connect_nodes`, etc.)
2. Tu veux vérifier qu'il n'a pas de pattern bugué (N→1 sans barrier, refs cassées)
3. Tu prépares un audit visible pour l'utilisateur ("voici ce que j'ai construit, voici les warnings")

Le skill est **non destructif** — il ne modifie rien, retourne juste un rapport.

## Schéma d'entrée (stdin)

```json
{
  "graph": {
    "nodes": [
      { "id": "n1", "data": { "model": { "templateObj": { "type": "start" } } } },
      { "id": "n2", "data": { "model": { "template": "http_request", "context": {...}, "templateObj": { "type": "function", "args": {...} } } } }
    ],
    "edges": [
      { "source": "n1", "target": "n2" }
    ]
  }
}
```

## Schéma de sortie (stdout)

```json
{
  "passed": false,
  "issueCount": 3,
  "criticalCount": 1,
  "warnCount": 2,
  "infoCount": 0,
  "issues": [
    {
      "severity": "critical",
      "code": "convergence_without_barrier",
      "nodeId": "ai_call_xyz",
      "message": "Le node 'ai_call_xyz' a 6 connexions entrantes mais n'est pas de type barrier/race/loop. Sans core_barrier en amont, l'agent peut être déclenché 6 fois → 6 appels LLM redondants.",
      "fix": "Insère un core_barrier entre les 6 nodes source et 'ai_call_xyz'."
    },
    {
      "severity": "warn",
      "code": "classifier_unconnected_branch",
      "nodeId": "classify_intent_abc",
      "branch": "support",
      "message": "Le classifier a une catégorie 'support' sans node connecté à sa sortie."
    },
    {
      "severity": "info",
      "code": "orphan_node",
      "nodeId": "old_node_xyz",
      "message": "Node sans connexion entrante ni sortante — sera ignoré au runtime."
    }
  ]
}
```

## Codes de problème

| Code | Sévérité | Cause |
|---|---|---|
| `convergence_without_barrier` | critical | ≥2 edges vers un node non-barrier/race → appels LLM dupliqués possibles |
| `classifier_unconnected_branch` | warn | Branche d'un classifier sans node aval |
| `condition_without_branches` | warn | Condition sans items[] configuré |
| `orphan_node` | info | Node isolé (no in, no out) — sera ignoré |
| `no_trigger` | critical | Aucun node start/start_form/event → le flow ne peut pas démarrer |
| `multi_trigger` | warn | Plusieurs triggers détectés — comportement ambigu |
| `expression_dangling_ref` | warn | `{{ nodeId.x }}` référence un node qui n'existe pas |
| `expression_self_ref` | critical | Un node se réfère à lui-même → cycle |
| `missing_required_arg` | critical | Champ marqué required vide dans node.context |
| `cycle_detected` | critical | Cycle dans le graph (sans node loop) |

## Exemples

### Exemple 1 : pattern 6 capteurs → 1 IA (le cas du user)

Entrée :
```json
{
  "graph": {
    "nodes": [
      { "id": "cron", "data": { "model": { "templateObj": { "type": "event", "id": "cron_schedule" } } } },
      { "id": "s1", "data": { "model": { "templateObj": { "type": "function" } } } },
      { "id": "s2", "data": { "model": { "templateObj": { "type": "function" } } } },
      { "id": "ai", "data": { "model": { "templateObj": { "type": "function", "id": "openai_chat" } } } }
    ],
    "edges": [
      { "source": "cron", "target": "s1" },
      { "source": "cron", "target": "s2" },
      { "source": "s1", "target": "ai" },
      { "source": "s2", "target": "ai" }
    ]
  }
}
```

Sortie :
```json
{
  "passed": false,
  "issueCount": 1,
  "criticalCount": 1,
  "issues": [
    {
      "severity": "critical",
      "code": "convergence_without_barrier",
      "nodeId": "ai",
      "message": "Le node 'ai' a 2 connexions entrantes mais n'est pas de type barrier/race. Sans core_barrier en amont, le node peut être exécuté 2 fois.",
      "fix": "Insère un core_barrier entre [s1, s2] et 'ai'."
    }
  ]
}
```

## Notes d'implémentation

- Le skill ne touche PAS la DB
- Pas d'appel réseau
- Timeout 15s max (un graph de 200 nodes prend ~50ms)
- Retourne `passed: true` si aucun issue critique
