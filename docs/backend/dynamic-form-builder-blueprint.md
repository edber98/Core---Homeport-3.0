# Dynamic Form Builder — UX, Tree Operations, Algorithms, APIs

Date: 2025-08-18

This blueprint focuses on the editor (builder) aspect of Dynamic Forms: tree addressing, drag & drop rules, validation helpers, factory defaults, and preview.


## Scope & References

- src/app/features/dynamic-form/services/* (builder-tree, issues, factory, state)
- src/app/features/dynamic-form/dynamic-form-builder.component.* (view)
- src/app/modules/dynamic-form/dynamic-form.service.ts (render/validation engine & types)


## Tree Addressing (stable keys)

Keys encode a path into steps/fields/sections for nz-tree selection, expansion and DnD:

- Root: `root`
- Step: `step:{si}`
- Field under step: `step:{si}:field:{i}`
- Field at root (no steps): `field:{i}`
- Field inside a section-at-root: `field:{i}:field:{j}` (marker `:field` before indexes at root level)

Algorithms (src BuilderTreeService):
```
function keyForObject(schema, obj) {
  if (obj===schema) return 'root'
  function searchFields(base, fields) {
    for (let i=0;i<(fields||[]).length;i++) {
      const f = fields[i]
      const isStepBase = base.startsWith('step:')
      const key = isStepBase ? `${base}:field:${i}` : `${base}:${i}`
      if (f===obj) return key
      if (isSection(f)) {
        const childBase = isStepBase ? key : `${key}:field`
        const sub = searchFields(childBase, f.fields||[])
        if (sub) return sub
      }
    }
    return null
  }
  if (schema.steps) for (let si=0; si<schema.steps.length; si++) {
    const st = schema.steps[si]
    if (obj===st) return `step:${si}`
    const sub = searchFields(`step:${si}`, st.fields||[])
    if (sub) return sub
  }
  return searchFields('field', schema.fields||[])
}

function ctxFromKey(schema, key) {
  if (key==='root') return { obj: schema }
  const parts = key.split(':')
  const n = (s)=>Number(s)
  function drill(arr, chain, start) {
    let curArr = arr, curObj=null, parent, idx
    for (let i=start;i<chain.length;i+=2) {
      if (chain[i] !== 'field') return null
      const fi = n(chain[i+1])
      parent = curArr; idx = fi; curObj = curArr?.[fi]
      if (!curObj) return null
      curArr = curObj?.fields
    }
    return { obj: curObj, parentArr: parent, index: idx }
  }
  if (parts[0]==='step') { const si=n(parts[1]); const step=schema.steps?.[si]; if (!step) return null; return parts.length===2 ? { obj: step } : drill(step.fields||[], parts, 2) }
  if (parts[0]==='field') return drill(schema.fields||[], parts, 0)
  return null
}
```


## Drag & Drop Rules

Goals: allow rearranging fields/sections across levels while preventing illegal moves (e.g., moving a section into itself or cross-root mismatches in steps mode).

Insertion cases:
- Drop inside step/root: append into its `fields`.
- Drop inside section: append into section `fields` (guard: cannot drop section into its own subtree).
- Drop to gap: insert before/after target within the parent array.

Guards:
- In steps mode, cannot drop directly under `schema.fields` (must be inside a step).
- Prevent dropping an element into itself or its descendants.
- For gap insertions, disallow crossing into arrays belonging to the source subtree (except simple reorder in same parent).

Algorithm (simplified):
```
function handleDrop(schema, e) {
  const dragKey = String(e?.dragNode?.key||''), dropKey = String(e?.node?.key||'')
  const dropToGap = !!e?.event?.dropToGap
  const rawPos = e?.dropPosition; let pos = typeof rawPos==='number' ? rawPos : (dropToGap ? 1 : 0)
  const src = ctxFromKey(schema, dragKey); const dst = ctxFromKey(schema, dropKey)
  if (!src?.obj || !dst) return null
  const isSection = (o)=> !!o && (o.type==='section' || o.type==='section_array')

  let targetArr, insertIndex=0
  const stepsMode = !!schema.steps?.length
  const dropIsStep = dropKey.startsWith('step:') && dropKey.split(':').length===2
  const dropIsRoot = dropKey==='root'

  // Empty section → insert inside
  const dstIsEmptySection = (dst.obj?.type==='section') && (!Array.isArray(dst.obj.fields) || dst.obj.fields.length===0)
  if (dstIsEmptySection && !dropIsStep && !dropIsRoot) { targetArr = (dst.obj.fields = dst.obj.fields || []); insertIndex = 0 }
  else if (pos===0 && !dropToGap) {
    if (dropIsStep) { if (!stepsMode) return null; const si=Number(dropKey.split(':')[1]); const step=schema.steps?.[si]; step.fields=step.fields||[]; targetArr=step.fields; insertIndex=targetArr.length }
    else if (dropIsRoot) { if (stepsMode) return null; schema.fields=schema.fields||[]; targetArr=schema.fields; insertIndex=targetArr.length }
    else if (isSection(dst.obj)) { if (containsObj(src.obj, dst.obj)) return null; targetArr = (dst.obj.fields = dst.obj.fields || []); insertIndex = targetArr.length }
    else return null
  } else {
    if (dropIsStep) return null
    if (dst.parentArr) { targetArr = dst.parentArr; const base = dst.index??0; insertIndex = base + (pos>0 ? 1 : 0); if (containsArrayInSubtree(src.obj, targetArr) && targetArr !== src.parentArr) return null }
    else return null
  }
  if (!targetArr) return null
  if (stepsMode && targetArr===schema.fields) return null
  const [moved] = src.parentArr.splice(src.index,1)
  if (!moved) return null
  if (targetArr===src.parentArr && insertIndex>src.index) insertIndex -= 1
  targetArr.splice(Math.max(0, Math.min(insertIndex, targetArr.length)), 0, moved)
  return keyForObject(schema, moved)
}
```

Containment helpers:
```
function containsObj(root, candidate) { if (!root) return false; if (root===candidate) return true; const visit = (arr)=>{ for (const f of (arr||[])) { if (f===candidate) return true; if (f?.type==='section' && visit(f.fields)) return true } return false }; if (root?.type==='section') return visit(root.fields); if (root?.fields) return visit(root.fields); return false }
function containsArrayInSubtree(root, targetArr) { const arrays=[]; const collect=(arr)=>{ if (!arr) return; arrays.push(arr); for (const f of arr) if (f?.type==='section') collect(f.fields) }; if (root?.type==='section') collect(root.fields); else if (root?.fields) collect(root.fields); return arrays.includes(targetArr) }
```


## Builder Issues & Validation Aids

- Duplicate field keys: scan all non-section fields; report keys with >1 occurrence.
- Invalid rule references: parse `visibleIf`/`requiredIf`/`disabledIf` and list variables not present among field keys.

```
function allFieldKeys(schema) { const keys=new Set(); const walk=(arr)=>{ for (const f of (arr||[])) { if (f.type==='section' || f.type==='section_array') walk(f.fields); else if (f.key) keys.add(f.key) } }; if (schema.steps?.length) schema.steps.forEach(s => walk(s.fields)); else walk(schema.fields); return Array.from(keys) }
function collectRuleVars(rule, acc=new Set()) { if (!rule) return acc; if (Array.isArray(rule)) { rule.forEach(r=>collectRuleVars(r,acc)); return acc } if (typeof rule==='object') { for (const [k,v] of Object.entries(rule)) { if (k==='var' && typeof v==='string') acc.add(v); else collectRuleVars(v, acc) } } return acc }
function findInvalidConditionRefs(schema) { const all=new Set(allFieldKeys(schema)); const props=['visibleIf','requiredIf','disabledIf']; const out=[]; forEachEntity(schema, ent => { for (const p of props) { const rule=ent.obj?.[p]; if (!rule) continue; const used=Array.from(collectRuleVars(rule)); const missing = used.filter(k=>!all.has(k)); if (missing.length) out.push({ kind: ent.kind, obj: ent.obj, title: ent.title, prop: p, missing }) } }); return out }
```

Helper to iterate entities (steps/sections/fields) is analogous to BuilderIssuesService.


## Factory Defaults & State

- newStep: `{ title: 'Step', fields: [] }`
- newSection: `{ type: 'section', title: 'Section', fields: [], col: { xs:24, sm:24, md:24, lg:24, xl:24 } }`
- newArraySection: same as above with `mode:'array'`, `key:'items'`, `array:{ initialItems:1, minItems:0 }`
- newField: key auto-générée, label par type, cols par défaut, options pour select/radio, defaults par type

BuilderState retains current selection and mirrors `selectedField` for preview.


## Preview & Render Engine

The builder uses the DynamicFormService to:
- Build a FormGroup with validators from the current schema.
- Apply rules reactively on valueChanges (visibility/disabled/requiredIf precedence).
- Provide utilities for column spans and summary model.

Server must mirror the rule/validator semantics when validating submissions (see dynamic-forms-blueprint.md).


## Persistence & APIs

Form definitions are saved via CatalogService in the current app (localStorage mock). Backend endpoints per blueprint:
  - `GET /forms` → summaries
  - `GET /forms/:id` → definition
  - `POST /forms` → create/update
  - `DELETE /forms/:id`
  - `POST /forms/:id/publish` → versioning snapshot

