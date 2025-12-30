# Flow Handles v2 — Typing, Manifests, Validation

This document defines the v2 I/O typing model used by the Flow Builder (Homeport) and the API.

## Node Kinds

- start: flow start (trigger)
- start_form: form-driven start (trigger)
- event: external trigger (webhook/message/etc.)
- endpoint: sink/source endpoints (HTTP/etc.)
- function: regular processing node (pure function/transform)
- condition: dynamic multi-branch routing based on expressions
- loop: iteration constructs (reserved)
- end: explicit termination (optional)
- flow: sub-flow (reserved)
- agent: AI agent node
- tool_ai: AI tool descriptor producer
- memory: AI memory producer/transform
- router/choice: reserved synonyms for future route nodes

## Overview

- Nodes expose three handle kinds:
  - Input handles: `inputHandles[]` — targets on top, accept typed payloads.
  - Output handles: `outputHandles[]` — sources at bottom, emit a single type per handle.
  - Linked handles: `linkedHandles[]` — extra targets on the right for typed links (e.g., Tools, Memory).

- Connections:
  - Default path is Output → Input.
  - Output → LinkedHandle is also allowed (e.g., connecting AI tools or memories to an Agent).

## Handle Schemas

- `inputHandles[]` items:
  - `id`: string (unique per node template)
  - `name`: string (display label)
  - `type`: string (display/informative)
  - `multiple?`: boolean
  - `accepts?`: string[] — TYPES that can connect to this input; when omitted, defaults to `any`.

- `outputHandles[]` items:
  - `id`, `name`, `type`, `multiple?`
  - No `accepts` here — output types do not whitelist targets.

- `linkedHandles[]` items:
  - `id`, `name`, `type`, `multiple?`
  - `accepts`: string[] — TYPES that can connect (same behavior as inputs).

## Types

Common types defined/used out of the box:

- `any`: special wildcard — connects to anything.
- `payload`: generic structured payload (common data type).
- `event`: trigger/event payload (start/webhook/etc.).
- `message`: messaging payload (chat/post/notification).
- `record`: generic DB-like record (row/object).
- `text`: plain text.
- `ai_tool`: a tool descriptor (e.g., LangChain tool).
- `ai_memory`: a memory container (e.g., texts, vectors, etc.).
- `ai_image`: image output from a generator.

You can introduce new types in your templates; they are simple strings.

## Validation Rules

Connection (sourceType = sType, target accepts = A):

- Allowed if:
  - `sType === 'any'`, or
  - `A.includes('any')`, or
  - `A.includes(sType)`.

- Target discovery precedence:
  1) Match `inputHandles[id].accepts` if present.
  2) Else match `linkedHandles[id].accepts` if present.
  3) Else, if handle id is `in` and no `inputHandles` are declared, treat as `accepts: ['any']`.

- Triggers (`type|nodeKind in: start, start_form, event, endpoint`) have no inputs and reject any connection to `in`.

## Golden Rule for Triggers

- Trigger nodes must never declare inputs and are the first node(s) of a run.
- They may emit outputs (e.g., `ok`) and may declare `linkedHandles` (typed targets on the right) but zero `inputHandles`.
- The UI hides inputs for triggers; the importer strips any legacy inputs.

## Conditions

- Outputs are dynamic from `model.context.items` (id is `_id` if present, else index).
- Engine computes `chosen` via expressions (firstMatch/allMatches) and routes edges by `sourceHandle` id.
- Else output (optional): standardized checkbox field in args named `else_enabled`.
  - When `else_enabled` is true, UI ensures `context.else` exists with a stable `_id` (default `else_<nodeId>`), and an additional "Else" output handle is rendered.
  - When false, Else is removed from context and the handle is hidden.

## Manifest Conventions (plugins/*/manifest.json)

- Always set `schemaVersion: 2` implicitly by declaring handles or `nodeKind`.
- For v2 nodes:
  - Declare real outputs under `outputHandles`.
  - Declare side-attachments under `linkedHandles` (with `accepts`).
  - If a node needs a typed input, declare `inputHandles` with `accepts`.
  - Do not put `accepts` in `outputHandles`.

Example (Agent):

```
{
  "key": "openai_agent",
  "nodeKind": "agent",
  "inputHandles": [ { "id": "in", "name": "In", "type": "any", "accepts": ["any", "payload"] } ],
  "outputHandles": [ { "id": "ok", "name": "Success", "type": "payload" } ],
  "linkedHandles": [
    { "id": "tools", "name": "Tools", "type": "ai_tool", "multiple": true, "accepts": ["ai_tool"] },
    { "id": "memory", "name": "Memory", "type": "ai_memory", "multiple": true, "accepts": ["ai_memory"] }
  ]
}
```

## Migration (v1 → v2)

- Importer auto-converts legacy templates:
  - `output[]` → `outputHandles[]` (type defaults to `any`).
  - Adds default `inputHandles: [{ id: 'in', type: 'any' }]`.
  - Moves any legacy link-like entries sitting in `outputHandles` (with `accepts` or `arrayField`) into `linkedHandles`.

- Frontend:
  - Inputs render on top; outputs bottom; linked handles on right.
  - Triggers (start/event) show no input.

## Backend Validation Endpoint

`POST /api/flows/:id/validate` → `{ ok: boolean, issues: Array<{ edgeId?, nodeId?, message }> }`

- Validates each edge by the rules above using the in-graph templates (`templateObj`).
- Marks trigger nodes as rejecting inputs.

## Node References (OpenAI repo)

- `openai_agent`: input any/payload; output payload; linked tools(ai_tool), memory(ai_memory).
- `openai_memory_static`: output ai_memory (from text).
- `openai_memory_merge`: input ai_memory → output ai_memory.
- `openai_tool_define`: output ai_tool (name/description/schema).

Version: v2 handles (input/output/linked) with explicit typing and validation.

## UI Notes

- During connection drag, targets show a halo color:
  - Green border when compatible (valid).
  - Red border when incompatible (invalid), plus a small “ban” overlay near the cursor.
  - Idle state keeps neutral borders; no “not-allowed” cursor on hover.
