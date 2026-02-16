Flow Viewer — Orientation & Template Enrichment

Context
- The `flow-viewer` component renders node handles (inputs/outputs/linked) based on the node template (model.templateObj) and the port orientation (horizontal/vertical).
- In read-only contexts (Executions, AI Console), orientation typically comes from the flow document meta: `meta.ui.portOrientation`.

Key Rules
- Orientation source:
  - Prefer `meta.ui.portOrientation` (or `meta.viewer.portOrientation`) in read-only viewers.
  - Do not override an explicit `@Input() portOrientation` provided by a parent (Executions may still pass it).
- Template enrichment:
  - The viewer expects `model.templateObj` to be present to classify nodes (start/condition/loop…).
  - In AI Console, nodes may only have a template id → preload templates and enrich nodes before rendering.

Implementation Notes
- In `flow-viewer.component.ts` (ngOnChanges):
  - Apply orientation from meta only when there is no explicit input from parent.
  - After changing orientation, trigger a lightweight relayout:
    - Re-clone `vNodes`/`vEdges`, call `detectChanges()`, then nudge viewport with `triggerViewportChangeEvent('end')`.
    - This prevents stale handle anchors (notably on Safari/WebKit).
- In `flow-ai-console.component.ts`:
  - Preload templates via `CatalogService.listNodeTemplates()` and map them by id.
  - Enrich nodes on flow load and again when templates arrive (race-safe).

Common Symptoms & Fixes
- Handles not aligned in vertical mode in AI Console, but OK in Executions:
  - Ensure nodes are enriched with `templateObj` (Console AI enrichment path).
  - Ensure meta-driven orientation is applied and relayout is triggered (viewer detects meta change and calls detectChanges + nudge viewport).
- Badges appearing in AI Console:
  - Use `@Input() showExecBadges` (default false). Executions passes `true`.

Debug Checklist
- Does the flow meta contain `ui.portOrientation`? (vertical/horizontal)
- Do nodes have `data.model.templateObj`? (check a few nodes in the console)
- Did `flow-viewer` log an orientation change? (console log present on input/meta changes)
- If still off, compare a problematic node’s template between AI Console and Executions (outputHandles, linkedHandles).

