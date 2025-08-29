# AI Form Agent — Dynamic Form Generation (Design)

## Overview

Goal: Build an AI-assisted form generator that converts a natural-language request into a valid Dynamic Form schema (our Form Builder format) and streams its construction in real time to the frontend. The agent produces sections/steps, fields, options, validators, and conditional logic (visibleIf/requiredIf/disabledIf), with sensible UI layout and expression settings.

Key outcomes:
- Backend-only generation with real-time SSE updates so users see the form build up live.
- Deterministic, valid schemas matching our runtime (DynamicForm) and Builder expectations.
- Safety: no secrets in logs, bounded output, robust error handling.

## Quick Reference — Form Schema (target)

The agent outputs the existing Dynamic Form schema we already use. This section lists ALL options and edge-case semantics the agent must respect.

- `FormSchema` (root envelope):
  - `title?: string`
  - `ui?: FormUI`
  - `fields?: FieldConfig[]` (mutually exclusive with `steps`)
  - `steps?: StepConfig[]` (mutually exclusive with `fields`)
  - `summary?: SummaryConfig`

- `FormUI`:
  - `layout?: 'horizontal'|'vertical'|'inline'` (prefer vertical by default)
  - `labelsOnTop?: boolean` (true by default in vertical)
  - `labelAlign?: 'left'|'right'`
  - `labelCol?: { span?: number }` (1..24)
  - `controlCol?: { span?: number }` (1..24)
  - `widthPx?: number`
  - `containerStyle?: Record<string, any>` (CSS-like keys, px values recommended)
  - `actions?: { showReset?: boolean; showCancel?: boolean; submitText?: string; cancelText?: string; resetText?: string; actionsStyle?: Record<string,any>; buttonStyle?: Record<string,any>; submitBtn?: ButtonUI; cancelBtn?: ButtonUI; resetBtn?: ButtonUI }`

- `ButtonUI`: `{ text?: string; style?: Record<string, any>; enabled?: boolean; ariaLabel?: string }`

- `StepConfig`:
  - `title: string`
  - `visibleIf?: Rule`
  - `fields?: FieldConfig[]`
  - `prevText?: string; nextText?: string`
  - `prevBtn?: ButtonUI; nextBtn?: ButtonUI`

- `FieldConfig` — Inputs:
  - `type: 'text'|'textarea'|'number'|'select'|'radio'|'checkbox'|'date'`
  - `key: string` (unique within scope)
  - `label?: string`
  - `placeholder?: string`
  - `description?: string`
  - `options?: { label: string; value: any }[]` (for select/radio)
  - `default?: any`
  - `validators?: FieldValidator[]` where `FieldValidator` is one of:
    - `{ type: 'required' }`
    - `{ type: 'min', value: number }`
    - `{ type: 'max', value: number }`
    - `{ type: 'minLength', value: number }`
    - `{ type: 'maxLength', value: number }`
    - `{ type: 'pattern', value: string }`
  - `visibleIf?: Rule` — dynamic display
  - `requiredIf?: Rule` — dynamic required (has priority over static required)
  - `disabledIf?: Rule` — dynamic disabled (disables control and clears required)
  - `col?: { xs?:1..24, sm?, md?, lg?, xl? }` — responsive grid spans
  - `itemStyle?: Record<string, any>` — margins/paddings/styles
  - `secret?: boolean` — masks input and viewer display
  - `expression?: ExpressionOptions`

- `FieldConfig` — Sections:
  - `type: 'section'|'section_array'`
  - `title?: string; description?: string`
  - `mode?: 'normal'|'array'` (array implies managing `key` + subitems)
  - `key?: string` (required for `section_array`)
  - `array?: { initialItems?: number; minItems?: number; maxItems?: number; controls?: { add?: { kind?: 'icon'|'text'; text?: string }; remove?: { kind?: 'icon'|'text'; text?: string } } }`
  - `ui?: Partial<FormUI>` (overrides for contained fields)
  - `fields: FieldConfig[]`
  - `visibleIf?: Rule`
  - `col?: { xs..xl }`

- `SummaryConfig`: `{ enabled: boolean; title?: string; includeHidden?: boolean; dateFormat?: string }`

- `ExpressionOptions` (for inputs):
  - `allow?: boolean` — show Val/Expr toggle (strict; toggle only if true)
  - `defaultMode?: 'val'|'expr'` — initial mode
  - `showPreviewErrors?: boolean` — preview pane error details
  - `large?: boolean` — larger editor area
  - `showDialogAction?: boolean`, `dialogTitle?: string`, `dialogMode?: 'textarea'|'editor'`, `autoHeight?: boolean`
  - `groupBefore?: boolean`, `showFormulaAction?: boolean`
  - `suggestionPlacement?: 'auto'|'top'|'bottom'`
  - `errorMode?: boolean` — color code by validity
  - `showPreview?: boolean`, `inline?: boolean`

Semantics & Interactions:
- `requiredIf` has priority over static `required`; when `disabledIf` is true or field is not visible, required must not apply.
- Hidden or disabled fields are not validated for required and should not block submit.
- Array sections (repeaters) produce a collection; nested sections inside array items are currently summarized differently (see summary builder).

## Rule Language for Conditions (visibleIf/requiredIf/disabledIf)

visibleIf/requiredIf/disabledIf accept a compact JSON logic we already evaluate:
- Literals and booleans are allowed.
- Operators: `all`, `any`, `not`, comparison operators `==`, `!=`, `>`, `>=`, `<`, `<=`.
- Variable reference: `{ "var": "fieldKey" }`.
Truthiness: A rule is considered true if it evaluates to a truthy JS value. Recommended patterns:
Examples:
- requiredIf email when subscribe: `{ "==": [ {"var":"subscribe"}, true ] }`
- visibleIf mode=='cron': `{ "==": [ {"var":"mode"}, "cron" ] }`
- disabledIf when advanced=false: `{ "not": { "var": "advanced" } }`
- combine: `{ "all": [ {"==":[{"var":"mode"},"cron"]}, {">=":[{"var":"retries"},1]} ] }`

## Backend Architecture

Components:
- AI Orchestrator (new): Drives the LLM, maintains a session state with the in-progress schema, and emits streaming events (SSE) to the client.
- LLM Provider Abstraction: Pluggable (e.g., OpenAI), hides vendor specifics; supports streaming tokens and function-like structured outputs.
- Session Store: Keeps current schema, transcript, and progressive patches. TTL-based, in-memory or Redis.

Endpoints:
- `POST /api/ai/form/build (SSE)`
  - Body: `{ prompt: string; workspaceId?: string; seedSchema?: FormSchema; options?: { layout?: 'horizontal'|'vertical'|'inline'; steps?: boolean; maxFields?: number } }`
  - SSE events (event: data JSON):
    - `{ type: 'message', role: 'assistant'|'system', text: string }`
    - `{ type: 'patch', ops: JsonPatchOp[], cursor?: string }`  // RFC 6902 operations
    - `{ type: 'snapshot', schema: FormSchema }`                 // occasionally send full schema for resync
    - `{ type: 'warning', code: string, message: string }`
    - `{ type: 'error', code: string, message: string }`
    - `{ type: 'done' }`

Flow (high-level):
1) Orchestrator builds a first-pass plan (fields/sections/steps) from the prompt.
2) Emit patches incrementally (create sections, add fields, set options, attach validators, add conditions, adjust UI).
3) Optionally request clarifications (emit `message`), then continue.
4) Final snapshot and `done`.

Security & Limits:
- Enforce a maximum number of fields and patch size per session.
- Sanitize text (strip HTML unless type is `textblock`), no secret inference.
- Reject unsafe operators/unknown field types.
- Prevent cyclical or self-referential rules (e.g., a field’s `requiredIf` depending on itself).
- For expressions in arguments (node templates), treat `{{ ... }}` as literal if expressions are disallowed; otherwise validate syntax islands and cap preview evaluation time.

Error Handling:
- Validate every patch against a JSON Schema for `FormSchema`; reject and re-ask the model for a correction.
- If validation fails repeatedly, fall back to a minimal form with a warning.

## Real-time Construction (Streaming)

Why patches: Frontend can apply them live to the Builder preview without blocking. If a patch fails validation locally, frontend requests a snapshot.

Patch format:
- RFC 6902 ops `[ { op: 'add'|'replace'|'remove', path: '/fields/0', value: ... } ]` where the target path maps to our schema structure. The Orchestrator keeps a canonical JSON Pointer map while composing.

Example SSE Sequence:
- `message`: "Je vais créer deux sections…"
- `patch`: add form `title`, set `ui` (vertical)
- `patch`: add first section and fields
- `patch`: add conditions (`visibleIf`, `requiredIf`, `disabledIf`) and validators
- `snapshot`: full schema sent for resync
- `patch`: tweaks to labels/cols
- `done`

## Library Examples (Backend)

1) Rules evaluation (compatible with frontend DynamicFormService.evalRule):

```ts
// backend/src/ai/rules.ts (example)
export type Rule = any;

export function evalRule(rule: Rule, ctx: Record<string, any>): any {
  if (rule == null) return undefined;
  if (typeof rule !== 'object') return rule;
  const [op] = Object.keys(rule);
  const args: any = (rule as any)[op];
  const getByVar = (src: any, path: string) => path?.split('.')?.reduce((acc, k) => (acc==null? undefined : acc[k]), src);
  const val = (x: any) => (x && typeof x === 'object' && 'var' in x) ? getByVar(ctx, x.var) : (typeof x === 'object' ? evalRule(x, ctx) : x);
  switch (op) {
    case 'var': return getByVar(ctx, args);
    case 'not': return !val(args);
    case 'all': return (args as any[]).every(a => !!val(a));
    case 'any': return (args as any[]).some(a => !!val(a));
    case '==': return val(args[0]) === val(args[1]);
    case '!=': return val(args[0]) !== val(args[1]);
    case '>': return val(args[0]) > val(args[1]);
    case '>=': return val(args[0]) >= val(args[1]);
    case '<': return val(args[0]) < val(args[1]);
    case '<=': return val(args[0]) <= val(args[1]);
    default: return true;
  }
}
```

2) JSON Patch validation & apply:

```ts
// backend/src/ai/patch.ts (example)
import { applyPatch, Operation } from 'fast-json-patch';
import Ajv from 'ajv';

export function validatePatch(schema: any, ops: Operation[], jsonSchema: object): boolean {
  try { const tmp = JSON.parse(JSON.stringify(schema)); applyPatch(tmp, ops, /*validate*/ false); return validateSchema(tmp, jsonSchema); } catch { return false; }
}

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(/* JSON Schema for FormSchema (outlined below) */);
export function validateSchema(data: any, _jsonSchema?: object) { return validate(data) as boolean; }
```

3) Normalization helpers (safety):

```ts
export function clampCols(col: any){
  const span = (n?: any) => Math.max(1, Math.min(24, Number(n) || 24));
  if (!col) return undefined;
  return { xs: span(col.xs), sm: span(col.sm ?? col.xs), md: span(col.md ?? col.sm ?? col.xs), lg: span(col.lg ?? col.md ?? col.sm ?? col.xs), xl: span(col.xl ?? col.lg ?? col.md ?? col.sm ?? col.xs) };
}
```

4) Expressions in arguments (node templates):

Guidelines:
- Only treat strings containing `{{ ... }}` as expressions if `expression.allow === true` for the field.
- Use a sandbox to parse/evaluate islands; timebox evaluation and catch errors.
- Context: `{ $json, $env, $node, $now }`; never allow arbitrary global access.
- On backend logging and events, never emit secrets or raw evaluated results if they include sensitive data.

## JSON Schema (outline)

Use AJV to validate a subset (outline):

```json
{
  "$id": "FormSchema",
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "ui": { "type": "object" },
    "fields": { "type": "array" },
    "steps": { "type": "array" },
    "summary": { "type": "object" }
  },
  "oneOf": [ { "required": ["fields"] }, { "required": ["steps"] } ]
}
```

Additional sub-schemas should enforce field types, options array shapes, and forbid unknown keys for safety.

## Pitfalls & Edge Cases

- Duplicate field keys → use a de-duplication strategy (append index suffix) and warn.
- `requiredIf` + `disabledIf`: ensure that disabled overrides required; avoid rules that reference the same field.
- Hidden fields should not block submit; ensure validators are attached only for visible+enabled.
- Arrays: Do not nest sections arbitrarily within section_array items (summary currently flattens differently). Keep array depth at 1 for MVP.
- Options: Limit to ~50 items; label/value must be serializable and stable.
- Dates: Prefer ISO `YYYY-MM-DD` and format with `summary.dateFormat`.
- Expressions: Do not force expressions on every field; only where useful (IDs, templates). For credentials or secrets, default to `allow: false` unless explicitly needed.

## Prompting Strategy (expanded)

- Capture intent, topics, and constraints. Decide between flat/sections/steps based on complexity.
- Identify required fields from phrases like “obligatoire”, “requis”, “doit fournir”.
- Derive validators (min/max/minLength/pattern) from phrases (e.g., “au moins 20 caractères”, “entre 1 et 10”).
- Map conditions from “si … alors …” to rules (visibleIf/requiredIf/disabledIf).
- Suggest layout: vertical, labels on top, responsive cols; group by semantics.

Example NL → JSON Patches (expanded)

1) Request: "Formulaire RH pour candidature: identité (nom, email obligatoire, téléphone), expérience (années: number min 0), CV (textarea, min 50), et si 'expérience > 5' afficher 'poste senior' (checkbox), sinon 'poste junior'."

- Patches outline:
  - add title, ui (vertical)
  - add section Identité: fields name (required), email (required + pattern), phone
  - add section Expérience: years number (min 0), senior (checkbox, visibleIf years>=6), junior (checkbox, visibleIf years<6)
  - add section CV: textarea minLength 50
  - snapshot, done


## Prompting Strategy

System prompt (outline):
- You are a Form Schema designer. Output only JSON patches or instructive messages; produce Dynamic Form schemas compatible with the provided specification. Prefer vertical layout for long forms. Group logically into sections; use steps for long multi-topic forms. Use our rule language for conditions.

Assistant tools (virtual functions) for the model:
- `emit_patch(ops: JsonPatchOp[])`: apply RFC 6902 patches to current schema.
- `emit_message(text: string)`: send short commentary.
- `emit_snapshot()`: send the entire schema (sanity checkpoint).

Content constraints:
- Field types: one of the allowed inputs.
- Options (select/radio): produce `{ label, value }[]` with concise labels.
- Validators: favor `required`, lengths for text, and min/max for numeric/date when obviously needed.
- Conditions: use only the JSON rule operators we support.
- UI layout: default to `vertical` with `labelsOnTop: true`, columns set using `col.xs=24` and adjust MD/LG when appropriate.
- Expression: set `{ allow: true, defaultMode: 'expr' }` for text/textarea in advanced cases; otherwise omit or set `allow: false` for simple inputs.

Example prompt-to-patch flow:
1) Intent: "Un formulaire de contact avec nom, email (requis), téléphone optionnel, message (min 20), et si l'utilisateur coche 'newsletter', afficher fréquence (Hebdo/Mensuel)."
2) Patches:
   - Create schema title and UI.
   - Add section "Coordonnées" with fields: name (text, required), email (text, required, pattern email), phone (text).
   - Add section "Message" with message (textarea, minLength 20), newsletter (checkbox), frequency (select) with `visibleIf: { "==": [{"var":"newsletter"}, true] }`.
   - Snapshot and done.

## Real-time Construction (Streaming)

Why patches: Frontend can apply them live to the Builder preview without blocking. If a patch fails validation locally, frontend requests a snapshot.

Patch format:
- RFC 6902 ops `[ { op: 'add'|'replace'|'remove', path: '/fields/0', value: ... } ]` where the target path maps to our schema structure. The Orchestrator keeps a canonical JSON Pointer map while composing.

## Frontend Integration

UI (Builder route `dynamic-form`):
- Right pane: "AI Assistant" chat panel with a single input.
- Stream area: displays assistant messages and applies incoming `patch` events to the in-memory schema (with an undo stack).
- Controls: "Undo last AI change", "Apply/Discard session", "Export JSON".
- Safety: blocks navigation when unsaved.

SSE Client:
- `POST /api/ai/form/build` → open EventSource (or fetch with ReadableStream).
- On `patch`: validate and apply; if conflict, request `snapshot`.
- On `done`: keep transcript; let user save schema to persistent store.

## Provider Abstraction

Module: `backend/src/ai/provider.ts` (plan)
- `generateStream({ prompt, seedSchema, constraints }): AsyncGenerator<AgentEvent>`
- Implementation `openai-provider.ts` uses Chat Completions with function-like patterns; in local dev we can stub a heuristic generator.

## Orchestrator Pseudocode

```
onPOST /api/ai/form/build(sse):
  session := { schema: seed || defaultSchema(), ops: [], streamId }
  emit(message: 'Démarrage…')
  llm = provider.generateStream({ prompt, seedSchema: session.schema, constraints })
  for await (evt of llm):
    if evt.type === 'patch':
      if validatePatch(evt.ops, session.schema):
        applyPatch(session.schema, evt.ops)
        emit({ type:'patch', ops: evt.ops })
      else:
        emit({ type:'warning', code:'invalid_patch', message:'Recalcul en cours' })
        continue
    if evt.type === 'message': emit(evt)
    if shouldSnapshot(): emit({ type:'snapshot', schema: session.schema })
  emit({ type:'done' })
```

## Validation & Guardrails

- JSON Schema for our FormSchema to validate server-side.
- Clamp field count, section depth, and option list lengths.
- Strip unknown keys; normalize `col` spans to [1..24].
- Email patterns: prefer a simple pattern over complex regex.

## Testing Plan

- Unit: patch validator, rule evaluator compatibility, schema normalizer.
- Integration: sample prompts → streamed patches; idempotence of applyPatch; snapshot recovery.
- UI: live preview stability, undo/redo, and conflict resolution.

## Roadmap

1) MVP
   - Backend orchestrator + OpenAI provider
   - SSE endpoint + basic UI panel in Builder
   - JSON Patch validator + snapshot fallback
2) V2
   - Multi-turn refinement (user says "ajoute X", "renomme Y")
   - Step/section auto-balancing heuristics
   - Presets per use-case (credentials, address forms, surveys)
3) V3
   - Learn from accepted edits to improve future layouts
   - Team templates, style guides enforcement

## Notes

- Keep secrets out of transcripts. Never request or echo sensitive data.
- Prefer `vertical` layout by default for clarity; switch to step-based only when the intent covers multiple distinct topics.
