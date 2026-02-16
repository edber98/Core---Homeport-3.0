AI Workflow v2 — Schéma des sorties, handles, autolayout

Résumé
- Standardise l’agent IA de création/modification de workflows avec:
  - Sorties par handles (v2): `template.outputHandles[]` avec `id`, `name`, `type`, `schema` (retour de fonction par handle)
  - Liens dynamiques: `template.linkedHandles[]` pour connexions typed (ex: routers)
  - Entrées typées: `template.inputHandles[]`
  - Layout ELK vertical/horizontal (défaut: vertical) via `orientation`

Arborescence Backend
- `src/ai/flow-agent.js`: agent existant (v1/v1.5)
- `src/ai/workflow-agent-v2/` (proposé):
  - `index.js`: orchestration SSE + outils
  - `tools/graph.js`: add_node, connect, connect_by_output_name, ensure_start
  - `tools/context.js`: get_node_args_schema, create_node_context, validate_node_params
  - `tools/layout.js`: auto_layout({ orientation }) → `utils/elk-layout`
  - `tools/templates.js`: get_templates (v2)

Modèle de données (v2)
- `NodeTemplate.outputHandles[]`: { id, name, type, multiple?, schema? }
- `NodeTemplate.inputHandles[]`: { id, name, type, multiple?, accepts?[] }
- `NodeTemplate.linkedHandles[]`: { id, name, type, accepts?[] } (pour liens contextuels)

Mise en page (ELK)
- Orientation: `vertical` (DOWN) ou `horizontal` (RIGHT)
- Détermination: `graph.settings.ui.portOrientation` → sinon `AI_FLOW_LAYOUT_ORIENTATION` → défaut vertical
- Ordre des ports:
  - Entrées: `inputHandles[].id`
  - Sorties: `computeOutputOrder(node, edges)` (v2: `outputHandles[]`, condition `context.items`, loop `each/after`, catch err)

Compatibilité Agent
- `get_templates()`: expose `outputHandles`, `inputHandles`, `linkedHandles`, `output` (legacy)
- `computeEdgeLabelFrom()`: privilégie `outputHandles[i].name` (plus d’usage de `output[]` legacy)
- `auto_layout()`: orientation pilotée; défaut vertical

Console AI (persistant)
- Threads/messages/context stockés côté backend
- Endpoints: `/api/flows/:flowId/ai/chats`, `/api/ai/chats/:threadId/messages`, `/api/flows/:flowId/ai/context`

Outils v2 (exemples et payloads)
- `get_output_options({ nodeId })` → `{ success, outputs: [{ handle, name, type }] }`
- `connect_by_output_name({ sourceId, targetId, outputName })` → résout le handle à partir du nom puis connecte
- `get_output_schema({ nodeId, handleId })` → `{ success, schema }` schema de retour pour ce handle (permet des suggestions d’injection)
- `propose_context_mapping({ sourceId, handleId, targetId })` → simule le msg entrant du nœud cible, retourne `{ previewMsg, mapping }` (ex: `{ subject: "{{ payload.title }}" }`)

Boucles (loop) — each/after
- `each`: branche d’itération, le msg inclut la valeur courante (ex: `msg.loop.item`) et accumulateurs si pertinents.
- `after`: exécuté après la boucle, le msg contient les résultats agrégés (ex: `msg.loop.results`) et le contexte précédent.
- En simulation, les chemins sont ordonnés pour que `loop` apparaisse juste après son owner dans `msg`, avec `_nodes.__loopOwner` pour les outils.

