# Flow Builder — Domain, Graph Operations, Algorithms, APIs

Date: 2025-08-18

This blueprint details the Flow Builder beyond the catalog: types, graph operations, palette grouping, connection rules, error propagation, condition outputs stability, viewport/zoom, persistence, and APIs.


## Scope & Concepts

- Graph composed of nodes and directed edges with labeled output handles.
- Nodes are instances of Node Templates (function/condition/start/loop/end).
- Palette built from Node Templates, grouped by App Providers.
- Editor supports DnD from palette, connection creation, deletion, history, and inspector editing via Dynamic Forms.

References:
- src/app/features/flow/* (builder component, services)
- docs/backend/flow-builder-catalog.md (template contracts)
- docs/backend/node-templates-and-providers.md (relations)
- docs/backend/flows-and-forms-backend.md (execution semantics)


## Types (UI-facing)

```ts
export type FlowDoc = { id: string; name: string; nodes: any[]; edges: any[]; meta?: any; description?: string };
export type Edge = { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string; data?: any };
// Node model (UI):
// { id, name, template, templateObj, context, point, type: 'html-template' }
```

For backend DTOs, see flows-and-forms-backend.md.


## Invariants & Validation

- Single start-like node per flow (UI prevents adding a second start).
- Edges must connect existing nodes and valid handles.
- Condition outputs preserve their handle ids across label/reorder edits; edges to removed outputs are pruned on save.
- Error branch: when connecting from `'err'`, downstream nodes are tagged as error-branch candidates.


## Palette Grouping (by AppProvider)

Algorithm (src/app/features/flow/flow-palette.service.ts):
```
function buildGroups(items, query, appsMap) {
  const q = (query||'').toLowerCase().trim()
  const byApp = new Map()
  for (const it of (items||[])) {
    const tpl = it?.template||{}
    const appId = String(tpl.appId || tpl.app?._id || '').trim()
    const app = appId ? appsMap.get(appId) : undefined
    if (q) {
      const tags = ((tpl?.tags)||[]).join(' ')
      const hay = `${it?.label||''} ${tpl?.title||''} ${tpl?.subtitle||''} ${tpl?.category||''} ${app?.name||''} ${app?.title||''} ${appId} ${tags}`.toLowerCase()
      if (!hay.includes(q)) continue
    }
    const key = appId || ''
    if (!byApp.has(key)) byApp.set(key, [])
    byApp.get(key).push(it)
  }
  return Array.from(byApp.keys()).sort().map(key => ({ title: key ? (appsMap.get(key)?.title || appsMap.get(key)?.name || key) : 'Sans App', items: byApp.get(key)||[], appId: key }))
}
```


## Output Handles & Labels

Parity with FlowGraphService:
```
function outputIds(model, edges) {
  const tmpl = model?.templateObj||{}
  switch (tmpl.type) {
    case 'end': return []
    case 'start': return ['out']
    case 'loop': return ['loop_start','loop_end','end']
    case 'condition': {
      const field = tmpl.output_array_field || 'items'
      const arr = Array.isArray(model?.context?.[field]) ? model.context[field] : []
      const ids = arr.map((it,i)=> (it && typeof it==='object' && it._id) ? String(it._id) : String(i))
      const connected = (edges||[]).filter(e => String(e.source)===String(model.id)).map(e => String(e.sourceHandle||'')).filter(Boolean)
      return Array.from(new Set([...ids, ...connected]))
    }
    default: {
      const outs = Array.isArray(tmpl.output) ? tmpl.output : undefined
      const base = Array.from({ length: (outs?.length||1) }, (_,i)=> String(i))
      const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error
      return enableCatch ? ['err', ...base] : base
    }
  }
}

function getOutputName(model, idxOrId) {
  const tmpl = model?.templateObj||{}
  const outs = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Succes']
  if (idxOrId==='err') return 'Error'
  if (tmpl.type==='start' && String(idxOrId)==='out') return 'Succes'
  if (tmpl.type==='condition') {
    const field = tmpl.output_array_field || 'items'
    const arr = Array.isArray(model?.context?.[field]) ? model.context[field] : []
    const idx = (typeof idxOrId==='string' && /^\d+$/.test(idxOrId)) ? parseInt(idxOrId,10) : (typeof idxOrId==='number' ? idxOrId : NaN)
    if (Number.isFinite(idx)) {
      const it = arr[idx]
      return typeof it==='object' ? (it?.name||'') : (typeof it==='string' ? it : '')
    }
    const it = arr.find(x => x && typeof x==='object' && String(x._id)===String(idxOrId))
    return it ? (it.name||'') : ''
  }
  const idx = (typeof idxOrId==='string' && /^\d+$/.test(idxOrId)) ? parseInt(idxOrId,10) : (typeof idxOrId==='number' ? idxOrId : NaN)
  return Number.isFinite(idx) && idx>=0 && idx<outs.length ? outs[idx] : (outs.length===1 ? outs[0] : '')
}
```


## Connections, Edges, and Deletion

- On connect:
  - Create an edge with `{ id: `${source}->${target}:${sourceHandle}:${targetHandle}` }`.
  - Label the edge using `getOutputName` for readability.
  - If handle is `'err'`, mark downstream node id in `errorNodes` set.
- On delete:
  - Remove by `edge.id`; then recompute error propagation.

Error propagation helper:
```
function recomputeErrorPropagation(edges) {
  const errorNodes = new Set()
  const bySrc = new Map()
  edges.forEach(e => { const a = bySrc.get(e.source)||[]; a.push(e); bySrc.set(e.source,a) })
  function dfs(nodeId, fromErr=false) {
    for (const e of (bySrc.get(nodeId)||[])) {
      const nextErr = fromErr || e.sourceHandle==='err'
      if (nextErr && !errorNodes.has(e.target)) { errorNodes.add(e.target); dfs(e.target, true) }
    }
  }
  edges.forEach(e => { if (e.sourceHandle==='err') dfs(e.source, true) })
  return errorNodes
}
```


## DnD and Drop Point Computation

- External drop from palette to canvas computes viewport-aware point:
```
function computeDropPoint(mouse, hostRect, viewport) {
  const relX = mouse.clientX - hostRect.left
  const relY = mouse.clientY - hostRect.top
  const scale = viewport.zoom
  const offsetX = viewport.x
  const offsetY = viewport.y
  return { x: ((relX - offsetX) / scale) - 125, y: ((relY - offsetY) / scale) - 50 }
}
```
- Mobile: DnD is disabled (guard) to avoid instability.


## Viewport & Zoom

Maintain the world point under the screen center stable during zoom:
```
function applyZoomPercent(flow, hostEl, pct) {
  const vs = flow?.viewportService
  if (!vs || !hostEl) return
  const vp = vs.readableViewport()
  const newZoom = Math.max(0.05, Math.min(3, pct/100))
  const rect = hostEl.getBoundingClientRect()
  const cx = rect.width/2, cy = rect.height/2
  const wx = (cx - vp.x) / (vp.zoom||1)
  const wy = (cy - vp.y) / (vp.zoom||1)
  const x = cx - (wx * newZoom)
  const y = cy - (wy * newZoom)
  vs.writableViewport.set({ changeType:'absolute', state:{ zoom:newZoom, x, y }, duration:80 })
  vs.triggerViewportChangeEvent?.('end')
}
```


## Persistence & APIs

- Flow definitions are persisted as `FlowDoc` drafts; publish creates `FlowVersion` (see main backend blueprint).
- REST (project scoped):
  - `GET /flows` → summaries
  - `GET /flows/:id` → draft
  - `POST /flows` → create
  - `PUT /flows/:id` → update (apply condition edges reconciliation)
  - `DELETE /flows/:id`
  - `POST /flows/:id/publish` → create version
  - `POST /flows/:id/run` → trigger execution


## Execution Notes

- Function nodes may expose `'err'` when template authorizes and instance enables `catch_error`.
- Condition nodes output handles are the stable `_id`s of `context[output_array_field]` items; backend must reconcile edges on update.
- Edge labels in execution UI should mirror `getOutputName` behavior for clarity.

