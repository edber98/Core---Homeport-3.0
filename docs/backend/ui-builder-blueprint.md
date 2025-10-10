# UI Builder — Domain, Types, Styles, API

Date: 2025-08-18

This blueprint documents the UI Builder feature: the editable UI tree, class/style management, breakpoints and states, and how to persist and serve designs from the backend.


## Concepts & Goals

- Visual composition of an HTML-like tree (nodes with tag/attrs/classes).
- Class Manager to define reusable styles (including combo classes) with state and breakpoint overrides.
- Preview with breakpoint selection and pseudo-state simulation (base/hover/active/focus).
- Export later to HTML/CSS; for now, styles are applied inline in preview.

References:
- Code: src/app/features/ui/*, src/app/features/ui/ui-model.service.ts, src/app/features/ui/services/ui-class-style.service.ts, src/app/features/ui/services/ui-breakpoints.service.ts
- Guide: docs/class-manager.md


## Frontend Types (source of truth)

- UiNode (tree element)
```ts
export type UiTag = string; // any HTML tag or '#text'
export interface UiNode {
  id: string;
  tag: UiTag;
  text?: string;
  classes?: string[];                       // assigned classes (tokens)
  attrs?: Record<string, string>;           // HTML attributes (id, role, aria-*)
  style?: Record<string, string>;           // inline CSS (base)
  styleBp?: Partial<Record<'xs'|'sm'|'md'|'lg'|'xl', Record<string, string>>>; // per-breakpoint overrides
  children?: UiNode[];
}
```

- UiClassDef (class manager)
```ts
export type UiState = 'base'|'hover'|'active'|'focus';
export interface UiClassDef {
  name: string;              // e.g. 'btn.primary.small' (combo class)
  parts: string[];           // ['btn','primary','small'] derived from name
  styles: {
    [state in UiState]?: {
      base?: Record<string, string>; // styles across all breakpoints
      bp?: Partial<Record<'xs'|'sm'|'md'|'lg'|'xl'|string, Record<string, string>>>; // per BP overrides
    }
  };
}
```

- UiBreakpointsService
```ts
export type UiBreakpoint = 'xs'|'sm'|'md'|'lg'|'xl';
export interface UiBreakpointDef { id: UiBreakpoint | string; label: string; min?: number; max?: number; }
// Tracks current breakpoint and whether cascade lock is enabled (future)
```


## Style Resolution (preview)

When rendering a node, effective styles are computed as:

1) Merge class styles in order of assigned `classes` for the current `state` and `breakpoint`.
2) Apply combo-class styles where all parts are present on the node (e.g., `btn.primary`).
3) Apply node styles: `node.style` (base) then override with `node.styleBp[currentBreakpoint]` if set.

This mirrors UiClassStyleService.effectiveForClasses + node.style/styleBp in the front-end.

## Algorithms & Behaviors (front parity)

1) Unicité des attributs `id` HTML
```
// Lors de l'ajout/mise à jour d'un node: garantir l'unicité des attrs.id dans l'arbre
function ensureUniqueAttrId(desired, selfNodeId, root) {
  const used = new Set()
  function collect(n) { if (n.id!==selfNodeId && n.attrs?.id) used.add(n.attrs.id); (n.children||[]).forEach(collect) }
  collect(root)
  let base = String(desired||'el').replace(/[^A-Za-z0-9\-_:.]/g,'-')
  let i = 1, candidate = base
  while (used.has(candidate)) candidate = `${base}-${i++}`
  return candidate
}
```

2) Déplacement (réordonnancement) d’un node
```
function moveSibling(arr, index, delta) {
  const j = index + delta
  if (index<0 || j<0 || j>=arr.length) return arr
  const copy = [...arr]; [copy[index], copy[j]] = [copy[j], copy[index]]; return copy
}
```

3) Résolution des styles effectifs
```
function effectiveStyles(classList, classesDefs, state, bp, nodeStyles, nodeStylesBp) {
  const out = {}
  const get = (name) => {
    const def = classesDefs.find(c => c.name===name)
    if (!def) return {}
    const s = def.styles?.[state] || {}
    return { ...(s.base||{}), ...(bp && s.bp?.[bp] || {}) }
  }
  // 1) Classes appliquées dans l'ordre
  for (const name of (classList||[])) Object.assign(out, get(name))
  // 2) Combo classes
  for (const def of classesDefs) {
    if (!def.parts || def.parts.length<=1) continue
    if (def.parts.every(p => (classList||[]).includes(p))) Object.assign(out, get(def.name))
  }
  // 3) Styles propres au node
  Object.assign(out, nodeStyles||{})
  if (bp && nodeStylesBp?.[bp]) Object.assign(out, nodeStylesBp[bp])
  return out
}
```

4) Breakpoints par défaut et validation
```
const defaultBps = [
  { id:'xs', label:'XS', max:575 },
  { id:'sm', label:'SM', min:576, max:767 },
  { id:'md', label:'MD', min:768, max:991 },
  { id:'lg', label:'LG', min:992, max:1279 },
  { id:'xl', label:'XL', min:1280 },
]
// Côté serveur, valider que tout styleBp utilise un id connu.
```


## Backend Domain & Persistence

Persist designs as two JSON blobs plus metadata:

- `ui_design` table/collection
  - `id: UUID`
  - `orgId: UUID`
  - `projectId: UUID`
  - `name: string`
  - `tree_json: UiNode`            // root node with full children tree
  - `classes_json: UiClassDef[]`   // class manager definitions
  - `createdAt`, `updatedAt`

Optional future fields:
- `tokens_json: Record<string,string>` (Design Tokens, cf. docs/class-manager.md)
- `breakpoints_json: UiBreakpointDef[]` (if customizable per project)


## API Design (REST)

Base: `/api/v1/ui/designs`

- `GET /` → list summaries `{ id, name, updatedAt }[]`
- `GET /:id` → `{ id, name, tree: UiNode, classes: UiClassDef[], tokens?: Record<string,string>, breakpoints?: UiBreakpointDef[] }`
- `POST /` → create or update design (idempotent upsert by id)
- `DELETE /:id` → remove design

DTOs must match the TS types above to let the Angular app load/save without adapters.


## Export / Import

For parity with existing app export (flows/forms/templates/apps), add UI to the export payload:

```json
{
  "kind": "homeport-catalog",
  "version": 1,
  "exportedAt": "...",
  "uiDesigns": [
    { "id": "ui_home", "name": "Home Page", "tree": { "id": "root", "tag": "div", "children": [] }, "classes": [] }
  ]
}
```

Endpoints:
- `GET /export` includes `uiDesigns`.
- `POST /import` accepts `uiDesigns` with `mode=replace|merge`.


## Editor Features Worth Mirroring Server-Side (optional)

- Unique HTML `id` enforcement: UiModelService ensures attribute `id` uniqueness. The server may validate collisions on save.
- Class rename propagation: If the server offers class rename operations, ensure atomic updates across nodes using those classes.
- Breakpoint validation: ensure breakpoint ids used in styles exist in the configured set.


## Example

Design payload (abbreviated):
```json
{
  "id": "ui_landing",
  "name": "Landing Page",
  "tree": {
    "id": "root",
    "tag": "div",
    "attrs": { "id": "root" },
    "classes": ["container"],
    "children": [
      { "id": "h1_abc", "tag": "h1", "text": "Welcome", "classes": ["title","primary"] },
      { "id": "p_abc", "tag": "p", "text": "Get started", "style": { "marginTop": "8px" } }
    ]
  },
  "classes": [
    { "name": "title", "parts": ["title"], "styles": { "base": { "base": { "fontWeight": "700" } } } },
    { "name": "primary", "parts": ["primary"], "styles": { "base": { "base": { "color": "#1677ff" } } } },
    { "name": "title.primary", "parts": ["title","primary"], "styles": { "base": { "base": { "letterSpacing": "-0.02em" } } } }
  ]
}
```


## Security & Tenancy

- Auth guard like other modules; scope designs by `orgId/projectId`.
- Consider per-design roles (viewer/editor) if collaboration is needed.


## Future: Export to static HTML/CSS

- Generate CSS from UiClassDef and inline node styles.
- Optionally emit design tokens as `:root { --token: value }`.
- Resolve combo classes into selectors like `.title.primary` and state pseudo-classes `:hover`, `:active`, `:focus`.
