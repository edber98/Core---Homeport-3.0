# AI Workflow Generator — Documentation

## Overview

- Goal: From a natural-language prompt, the AI agent builds a complete workflow with frontend parity:
  - Correct node placement and edge labels/handles.
  - Strict, schema-driven context generation per Node Template (no backend autofill).
  - Single start-like node rule with auto-ensure.
  - Robust handling of multi-output functions and dynamic condition branches.
  - Clear logs for each action to diagnose issues quickly.
- Scope: Backend AI tools (LangChain), execution engine, plugins (Node Templates), layout (ELK), and frontend Builder integration.

## Key Files

- Backend agent (LangChain tools): `backend/src/ai/flow-agent.js`
- Backend SSE endpoint: `backend/src/modules/db/ai-flow.js`
- Execution engine (expressions, conditions): `backend/src/engine/index.js`
- Expression sandbox: `backend/src/engine/expression-sandbox.js`
- Plugins registry/importer: `backend/src/plugins/registry.js`, `backend/src/plugins/importer.js`, `backend/src/plugins/bootstrap.js`
- Plugins manifests (built-in repos + local): `backend/src/plugins/repos/*/manifest.json`, `backend/src/plugins/local/*/manifest.json`
- Frontend Flow Builder: `src/app/features/flow/*`
  - Core component: `src/app/features/flow/flow-builder.component.ts`
  - Centering/graph utils: `src/app/features/flow/flow-builder-utils.service.ts`, `src/app/features/flow/flow-graph.service.ts`
  - AI chat wrapper: `src/app/features/flow/components/ai-flow-chat.component.ts`
- Frontend services: `src/app/services/*`
  - Flow runner (local): `src/app/services/flow-run.service.ts`

## Agent Architecture (backend/src/ai/flow-agent.js)

- Tools-only agent (LangChain): uses a suite of tools to mutate an in-memory graph and emits live SSE patches/snapshots.
- System prompt (enforced):
  - For every non-start node with args → must call the context tools:
    - `has_node_args` → `get_node_context_inputs` → generate a complete JSON context → `create_node_context` (or `inject_node_context`/`apply_node_params`) → `validate_node_params` (loop until no missing required fields).
  - Connections must use the correct output handle: numeric index for function outputs; `_id` or index for condition items; `err` only if catch is authorized and enabled.
  - Do not modify `templateObj.output` — labels come from the canonical template (DB), not model mutations.
  - Placement is handled by ELK to keep a consistent layered layout.

### Tooling — Full List

- Graph/templating:
  - `get_templates()`: list Node Templates (type, args, output array, flags).
  - `list_graph()`: current graph { nodes, edges }.
  - `add_node({ templateKey, name?, nearNodeId? })`:
    - Creates node with hydrated `templateObj` (args/output/flags) and context skeleton from args.
    - Auto-attaches first workspace credential if `providerKey` matches.
    - Triggers ELK layout and snapshot.
- Context pipeline:
  - `has_node_args({ nodeId })`: returns args presence with key/required/type list.
  - `get_node_context_inputs({ nodeId })` (alias: `text_inputs`): bundle for context generation:
    - Template meta; full args schema (fields/steps with options/validators/defaults);
    - Outputs; instruction (user prompt) + recent history;
    - Predecessors (id/template/name/type/providerKey/context/sourceHandle);
    - Skeleton (neutral object from schema defaults/types).
  - `create_node_context({ nodeId, context })`:
    - Builds a runtime Zod schema from args, validates `context`, merges into `model.context`.
    - If `template.type === 'condition'`: stabilizes `_id` per item in `context.items` (reuse existing where possible, generate `cid_*` otherwise).
  - `apply_node_params({ nodeId, params })` / `inject_node_context`:
    - Equivalent to `create_node_context` (validate + merge + condition `_id` stabilization).
  - `validate_node_params({ nodeId })`: returns required missing keys derived from schema.
- Outputs/edges:
  - `get_node_outputs({ nodeId })`: outputs for the node (functions: static `template.output` array, conditions: names from `context.items`).
  - `get_output_options({ nodeId })`: returns `{ handle, label }` options, including `'err'` if catch is authorized and enabled.
  - `connect({ sourceId, targetId, sourceHandle?, targetHandle? })`:
    - Validates handle:
      - Function nodes: numeric index within canonical template outputs (DB) or `'err'` if catch enabled; otherwise errors (`invalid_output_index`, `invalid_output_handle`).
      - Condition nodes: if handle non-numeric, must match an existing item `_id`; else `invalid_condition_handle`.
    - Derives label: from canonical outputs (function) or item name (condition) or `'Error'` (err) or `'Succes'` (start-like).
    - Triggers ELK layout and snapshot.
  - `connect_by_output_name({ sourceId, targetId, outputName })`:
    - Resolves label → handle (index for functions, `_id`/index for conditions, `'err'` for error) and calls `connect`. 
- Placement/layout:
  - ELK layout integration (layered, DOWN; Brandes–Köpf; orthogonal routing):
    - Node size: 250×100.
    - Desired top-left gaps: default `gapX=260`, `gapY=160` (configurable via tool args/env); ELK’s border-to-border spacing is adjusted and followed by vertical normalization:
      - `y = layerIndex × gapY` to ensure exact frontend-like top-left vertical spacing.
    - Tools:
      - `auto_layout({ gapX?, gapY? })`: global layout via ELK; logs `[layout.elk]` and `[layout.elk][normalize]`.
      - `auto_place({ nodeId, gapX?, gapY? })`: delegated to ELK for consistency.
    - ELK is run after: `add_node`, `connect`, `ensure_start`, `auto_place`, `auto_layout`.
- Credentials:
  - `list_credentials({ providerKey? })`, `attach_credential({ nodeId, credentialId?, name?, providerKey? })`.
- Start node management:
  - `ensure_start({ prefer?: 'form'|'trigger'|'start', name? })`: ensures a start-like node exists; ELK after creation.

### Logs & Diagnostics

- Context:
  - `[schema] nodeId=… fields=… keys=… prompt="…"`, `[context.inputs] nodeId=… fields=… preds=…`, `[context][create] nodeId=… keys=…`, `[condition.ids] nodeId=… items=…`.
- Outputs/edges:
  - `[outputs] …`, `[outputs.options] …`, `[edge][resolve_by_name] …`, `[edge][label] …`.
  - Handle errors: `[edge][invalid_output_handle]`, `[edge][invalid_output_index]`, `[edge][invalid_condition_handle]`, `[edge][error_output_disabled]`.
  - Template mismatch safeguard: `[template.output_mismatch]` if model.templateObj.output differs from canonical DB template.
- Layout:
  - `[layout.elk] nodes=… edges=…`, `[layout.elk][normalize] gapY=…`, plus operation tags `[layout.elk][add_node|connect|ensure_start|auto_place]`.

## Conditions — Multi-Output Logic

- Template schema (plugins) defines dynamic outputs via an array section field, e.g. `output_array_field: 'items'` with items containing at least `{ name, condition }`.
- Frontend (`FlowGraphService`):
  - `outputIds(model, edges)`: builds handles from `context.items` → `_id` per item or numeric fallback.
  - `getOutputName(model, handle)`: returns item name or label for handle; supports `_id`.
- Backend agent:
  - Context generation expects `context.items` (array). `create_node_context`/`apply_node_params` stabilize `_id`s to keep edge handles consistent across edits.
  - `get_output_options` returns `{ handle, label }` for each item; `connect_by_output_name` resolves a label to its handle.
  - `connect` validates handle (numeric index or correct `_id`).
- Execution (`backend/src/engine/index.js`):
  - `evaluateCondition(node, initialContext, msg)`: for each item:
    - Evaluates `item.condition` (JS expression or `{{ }}` templating) in sandbox.
    - Supports modes (default first-match; placeholder for allMatches).
    - Returns chosen branch id(s); engine routes by matching edge label text.
  - Leaves `payload` unchanged and stores decision under `msg[nodeId]` for traceability.

## Function Nodes — Outputs & Try/Catch

- Function outputs:
  - Labels come from the canonical template `output` array (DB). Index → label mapping strictly enforced.
  - `connect` requires a numeric handle within bounds; else `invalid_output_index`.
- Try/Catch (Error branch):
  - Template may enable `authorize_catch_error`/`authorize_skip_error`.
  - To use the error branch: `set_node_flags({ catch_error: true })` then `connect` with `sourceHandle: 'err'`. Otherwise `error_output_disabled`.

## Context Generation — Rules

- Skeleton initialization from args:
  - `fields`/`steps` default values applied.
  - Types → neutral defaults: text/textarea/select/radio → `''`, number → `0`, boolean → `false`, multiselect/tags → `[]`, json/code/object → `{}`.
  - Section arrays (e.g. Condition `items`) → `[]` (no guess).
- Generation flow (per node):
  - `get_node_context_inputs` provides schema + prompt + predecessors + skeleton.
  - LLM produces a full JSON context (no backend autofill), validated via Zod.
  - Applied via `create_node_context`/`inject_node_context` (with condition `_id` stabilization).
  - Validate required with `validate_node_params` and loop if needed.

## Placement — ELK Layered Layout

- ELK via `elkjs`:
  - Algorithm: layered (Sugiyama), direction DOWN, Brandes–Köpf node placement, orthogonal edge routing.
  - Node size used for layout: 250×100.
  - Gaps:
    - Desired top-left spacing: gapX=260, gapY=160 (configurable).
    - ELK border gaps computed accordingly; then post-process normalization enforces Y = level × gapY for consistent top-left spacing.
- Applied after `add_node`, `connect`, `ensure_start`, `auto_place`, `auto_layout`.

## Plugins (Node Templates)

- Importer: `backend/src/plugins/importer.js` enables `expression.allow=true` by default for args fields.
- Manifests:
  - Example condition template (local demo): `backend/src/plugins/local/demo/manifest.json`
    - `key: "condition"`, `type: "condition"`, `output_array_field: "items"`, `description: "Branche selon une condition"`, `icon: "fa-solid fa-code-branch"`.
    - Args: section array `items` with fields `name` (required) and `condition` (required), UI vertical, gutter 16, labelsOnTop true.

## Frontend (Builder)

- File: `src/app/features/flow/flow-builder.component.ts`
  - Loads AI graph via `applyAiGraph(g)`.
  - Centers viewport after AI load: calls `centerFlow()` with a short timeout to let DOM render sizes.
- Graph services:
  - `src/app/features/flow/flow-graph.service.ts`
    - `outputIds()`, `getOutputName()` and `computeEdgeLabel()` coordinate labels/handles consistent with backend rules.
- Flow Runner (local): `src/app/services/flow-run.service.ts`
  - Treats condition nodes distinctly and returns a chosen branch (mock; engine handles real eval).

## API & Execution Flow

1) Frontend `FlowAiChatComponent` → starts SSE: `GET /api/ai/flow/build/stream?prompt=...` (`backend/src/modules/db/ai-flow.js`).
2) Agent initializes tools and streams messages/events.
3) Typical sequence:
   - `get_templates` → `add_node`(start) → `add_node`(function/condition) → `get_node_context_inputs` → `create_node_context` (+ validate) → `connect` (using correct handle) → implicit ELK layout → `emit_snapshot`.
4) Frontend receives patches/snapshots and updates canvas; on final, user can “Charger dans l’éditeur” (recenters automatically).

## Troubleshooting (By Logs)

- Context missing/invalid:
  - Check `[schema]`, `[context.inputs]`, `[context][create]`, `validate_node_params`.
- Wrong output/label on edge:
  - Watch `[outputs]`, `[outputs.options]`, `[edge][resolve_by_name]`, `[edge][label]`.
  - Errors: `[edge][invalid_output_handle]`, `[edge][invalid_output_index]`, `[edge][invalid_condition_handle]`, `[edge][error_output_disabled]`.
- Layout looks off:
  - Ensure `[layout.elk]` and `[layout.elk][normalize]` appear. Verify gapY in logs.
- Condition routing incorrect:
  - Confirm items `_id` stability via `[condition.ids]` and that labels on edges match item names.

## Configuration & Defaults

- ELK enabled by default. Env overrides:
  - `AI_FLOW_USE_ELK=1`
  - `AI_FLOW_NODE_WIDTH=250`, `AI_FLOW_NODE_HEIGHT=100`
- Layout gaps (top-left spacing): defaults `gapX=260`, `gapY=160` (passed to layout tool; normalization enforces exact vertical spacing).

## Design Principles

- Do not autofill context on backend — the LLM must generate it from prompt + schema.
- Keep outputs canonical (from templates DB), never from mutated `templateObj.output`.
- Stable IDs for condition items ensure edge handles don’t break.
- Single start-like node (start/start_form/trigger); `ensure_start` available.
- Rich logs on every step for transparent debugging.

## Quick Pointers

- Agent tools: `backend/src/ai/flow-agent.js` (search for tool names like `get_node_context_inputs`, `create_node_context`, `connect_by_output_name`).
- Condition items: stabilization logic inside `create_node_context`/`apply_node_params` in the same file.
- Execution sandbox: `backend/src/engine/expression-sandbox.js` and usage in `backend/src/engine/index.js` (`evaluateCondition`).
- Plugins manifest example: `backend/src/plugins/local/demo/manifest.json` (Condition template with args+icon+output_array_field).
- Frontend centering after AI load: `flow-builder.component.ts` → `applyAiGraph()` → `centerFlow()`.

## Example: Email Read → Condition → Send Email

- Add: start → `email_read` (attach cred) → `condition` with items `[ {name:"has_urgent", condition:"payload.subject.includes('URGENT')"}, {name:"else", condition:"false"} ]` → `email_send` nodes.
- Context:
  - `create_node_context` for each node with full JSON (e.g., `email_send` → {to, subject, text, from}, respecting schema).
- Connect:
  - `connect_by_output_name({ outputName: 'has_urgent' })` for the matching branch.
- Placement: ELK arranges the layout; frontend centers after load.

