Node I/O Typing — v2 Spec

Goals
- Stable, explicit handles with types for inputs/outputs.
- Extensible node kinds (agent, tool_ai, memory, router/choice).
- Deterministic routing by handle ids (no label text matching).

Schema (NodeTemplate v2)
- schemaVersion: 2
- nodeKind: start | start_form | event | endpoint | function | condition | agent | tool_ai | memory | router | choice
- inputHandles: [{ id, name, type, multiple? }]
- outputHandles: [{ id, name, type, multiple?, arrayField? }]
- args: FormBuilder schema (unchanged)
- providerKey/appName/tags/category: unchanged

Types
- Base: any | json | text | binary | event | http | email | calendar
- AI: ai_tool | ai_agent | ai_memory | ai_context | ai_image | ai_vector
- Compatibility: allowed when source.type == target.type or target.accepts includes source.type; if no accepts provided, equality is required (any matches any).

Routing
- Edges carry handle ids: `sourceHandle` and `targetHandle`.
- Engine chooses next nodes strictly by `sourceHandle` id (no label routing).

Migration
- Importer auto-upgrades v1 templates at import (output -> outputHandles, default input handle, nodeKind from type).
- Flows must bind edges to handle ids; UI enforces this (validator).

Frontend
- Show named handles on nodes, color-coded by type.
- Enforce connection rules with `ConnectionSettings.validator`.

