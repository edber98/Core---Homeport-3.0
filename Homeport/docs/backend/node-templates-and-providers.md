# Node Templates, App Providers, Flow Builder — Relations, Algorithms & Usage

Date: 2025-08-18

This note explains how Node Templates power the Flow Builder, how they relate to App Providers, and how Dynamic Forms are used to configure node instances.


## Concepts

- Node Template (catalog entry)
  - Shape: `id`, `type: 'start'|'function'|'condition'|'loop'|'end'`, `name`, optional UI hints (`title`, `subtitle`, `icon`), `category`, `group`, `tags`, `authorize_catch_error`, `output: string[]`, `args`.
  - `args`: a Dynamic Form schema (see dynamic-forms-blueprint) or a plain object used by the Inspector to render inputs when a node is selected.
  - Purpose: define the contract and UI for a class of nodes; reused across flows.

- App Provider (integration/vendor)
  - Shape: `id`, `name`, optional `title`, `iconClass|iconUrl`, `color`, `tags`.
  - Purpose: group templates by application/integration (e.g., Slack, Gmail) for palette organization and runtime connector selection. Backend links providers to credentials and adapters.

- Flow Node (instance)
  - Created by dropping a template from the palette into the canvas.
  - Stores a reference to its template (`template`, `templateObj`) and its instance configuration in `context`.
  - Outputs/handles are derived from the template (`template.output`) and conditional logic (see FlowGraphService rules for `condition` and `err`).


## Relationships (data model)

- NodeTemplate.appId → AppProvider.id
- FlowNode.template → NodeTemplate.id (and a denormalized copy in `templateObj` for fast UI)
- FlowNode.context → data object conforming to NodeTemplate.args (Dynamic Form submission)


## Flow Builder lifecycle with Templates

1) Palette build
   - UI loads `NodeTemplate[]` from backend.
   - Groups by `appId` using `AppProvider` metadata (icon/color) for a branded palette.

2) Node creation
   - On drop/click, the Flow Builder creates a `FlowNode` with `{ id, name, template, templateObj, context: {} }`.
   - If multiple start-type nodes are prevented, UI enforces a single start node.

3) Configuration (Inspector)
   - When a node is selected, the Inspector renders a form from `templateObj.args` (Dynamic Form schema) and edits `node.context`.
   - `expression.allow` inside field configs enables the expression editor on specific fields.

4) Handles & edges
   - For `function` nodes, handle names come from `template.output` (numeric indices) and optional `'err'` when `authorize_catch_error && context.catch_error` is true.
   - For `condition`, handles come from `context[output_array_field]` item `_id`s; labels use `name`/`label`.
   - FlowGraphService keeps connected handles stable when items are reordered/renamed.

5) Execution (backend)
   - Backend loads the template by key to pick the correct adapter (e.g., Slack API client).
   - AppProvider determines which connector/credentials to use.
   - `node.context` is validated against the Dynamic Form schema (server-side mirror) before running.


## Why App Providers?

- UX: present a familiar, branded palette grouping (icons/colors).
- Routing: map node templates to the proper backend connector/SDK and project credentials.
- Governance: enable per-provider permissions, quotas, or availability.


## Dynamic Forms inside Node Templates

- NodeTemplate.args can embed a full `FormSchema`.
  - Example: HTTP Request template defines fields `{ url, method, body }`.
  - Example: Slack Post template defines `{ channel, text }`.

- UI uses this schema to render the node Inspector; the saved values become `FlowNode.context`.

- Backend options:
  - Trust UI and accept a generic `context: Record<string, any>` (faster, less guarantees).
  - Validate: mirror the Dynamic Form rules server-side (recommended). See dynamic-forms-blueprint for rule grammar and validators.


## Examples

- NodeTemplate (Slack Post)
```json
{
  "id": "tmpl_slack_post",
  "type": "function",
  "name": "Slack Post",
  "category": "Slack",
  "appId": "slack",
  "authorize_catch_error": true,
  "output": ["Success"],
  "args": {
    "title": "Slack Message",
    "fields": [
      { "type": "text", "key": "channel", "label": "Channel", "col": { "xs": 24 }, "default": "#general" },
      { "type": "text", "key": "text", "label": "Text", "col": { "xs": 24 }, "default": "Hello", "expression": { "allow": true } }
    ],
    "ui": { "layout": "vertical" }
  }
}
```

- FlowNode instance (created from the template)
```json
{
  "id": "n42",
  "name": "Slack",
  "template": "tmpl_slack_post",
  "templateObj": { "id": "tmpl_slack_post", "type": "function", "output": ["Success"] },
  "context": { "channel": "#ops", "text": "Deployment done" }
}
```

- AppProvider (Slack)
```json
{ "id": "slack", "name": "Slack", "iconClass": "fa-brands fa-slack", "color": "#611f69" }
```


## Dynamic Form linkage outside the Flow Builder

## Algorithms & Guards (détails)

1) Préservation des handles de condition (UI → backend)
```
// Lors d'un PUT flow, pour chaque ConditionNode:
function reconcileConditionEdges(prevNode, nextNode, edges) {
  const nextOutputs = new Set([...(nextNode.items||[]).map(i => String(i._id)), nextNode.else?._id].filter(Boolean))
  return edges.filter(e => {
    if (String(e.source) !== String(nextNode.id)) return true
    // Conserver l'edge si son handle existe encore côté next
    return nextOutputs.has(String(e.sourceHandle))
  })
}
```

2) Sorties des nœuds (UI parity)
```
function outputIds(model, edges) {
  const tmpl = model?.templateObj || {}
  switch (tmpl.type) {
    case 'end': return []
    case 'start': return ['out']
    case 'loop': return ['loop_start','loop_end','end']
    case 'condition': {
      const field = tmpl.output_array_field || 'items'
      const arr = Array.isArray(model?.context?.[field]) ? model.context[field] : []
      const ids = arr.map((it, i) => (it && typeof it==='object' && it._id) ? String(it._id) : String(i))
      // Préserver handles connectés pour éviter cassures temporaires
      const connected = (edges||[]).filter(e => String(e.source)===String(model.id)).map(e => String(e.sourceHandle||'')).filter(Boolean)
      return Array.from(new Set([...ids, ...connected]))
    }
    default: {
      const n = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output.length : 1
      const base = Array.from({length:n}, (_,i)=> String(i))
      const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error
      return enableCatch ? ['err', ...base] : base
    }
  }
}
```

3) Étiquetage des handles (lisibilité)
```
function outputName(model, idxOrId) {
  const tmpl = model?.templateObj || {}
  const outs = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Succes']
  if (idxOrId === 'err') return 'Error'
  if (tmpl.type==='start' && String(idxOrId)==='out') return 'Succes'
  if (tmpl.type==='condition') {
    const field = tmpl.output_array_field || 'items'
    const arr = Array.isArray(model?.context?.[field]) ? model.context[field] : []
    const num = (typeof idxOrId==='string' && /^\d+$/.test(idxOrId)) ? parseInt(String(idxOrId),10) : (Number.isFinite(idxOrId)? idxOrId : NaN)
    if (Number.isFinite(num)) {
      const it = arr[num]
      if (typeof it==='string') return it
      if (it && typeof it==='object') return it.name ?? ''
      return ''
    }
    const it = arr.find(x => x && typeof x==='object' && String(x._id)===String(idxOrId))
    return it ? (it.name ?? '') : ''
  }
  const idx = (typeof idxOrId==='string' && /^\d+$/.test(idxOrId)) ? parseInt(String(idxOrId),10) : (typeof idxOrId==='number' ? idxOrId : NaN)
  return Number.isFinite(idx) && idx>=0 && idx<outs.length ? outs[idx] : (outs.length===1 ? outs[0] : '')
}
```

4) Propagation de la branche d’erreur
```
// Marque les ids des nœuds atteignables exclusivement via 'err' ou depuis un nœud invalide
function recomputeErrorPropagation(edges) {
  const errorNodes = new Set()
  const bySrc = new Map()
  edges.forEach(e => {
    const list = bySrc.get(e.source) || []
    list.push(e)
    bySrc.set(e.source, list)
  })
  function dfs(nodeId, fromErr=false) {
    const list = bySrc.get(nodeId) || []
    for (const e of list) {
      const nextErr = fromErr || e.sourceHandle === 'err'
      if (nextErr && !errorNodes.has(e.target)) {
        errorNodes.add(e.target)
        dfs(e.target, true)
      }
    }
  }
  // Démarrer depuis toutes les arêtes 'err'
  edges.forEach(e => { if (e.sourceHandle==='err') dfs(e.source, true) })
  return errorNodes
}
```

- The Dynamic Form module is reusable for standalone pages (e.g., data entry) and inside Flow Builder node configuration UIs.
- A flow node may reference a FormDefinition by id (advanced pattern) instead of embedding a schema in `args`. In that case, the backend should dereference, fetch the schema, and use it to render/validate `context`.


## References
- src/app/features/flow/flow-graph.service.ts — handle computation logic
- src/app/features/flow/flow-palette.service.ts — grouping by AppProvider
- src/app/features/flow/node-template-editor.component.ts — template editing UX (args/output/appId)
- src/app/services/catalog.service.ts — NodeTemplate and AppProvider types
- docs/backend/dynamic-forms-blueprint.md — Dynamic Form schema and validation
- docs/backend/flows-and-forms-backend.md — execution and API
