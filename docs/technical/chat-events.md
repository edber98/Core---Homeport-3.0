Chat Events Standard (AI FORM / FLOW)

Overview
- Frontend chat UIs consume SSE events and render them as unified chat streams with paragraphs and tool/info lines.
- Both AI Flow and AI Form follow the same patterns so we can reuse UI pieces and parsing logic.

Backends
- AI Form SSE (GET `/api/ai/form/build/stream`):
  - `message`: `{ type:'message', role?: 'assistant'|'user', text: string }`
  - `patch`: `{ type:'patch', ops: RFC6902[] }` (applied server-side and used to show compact info lines)
  - `snapshot`: `{ type:'snapshot', schema: object }`
  - `tool.start`: `{ type:'tool.start', name: string, args?: any }`
  - `tool.end`: `{ type:'tool.end', name: string, ok?: boolean }`
  - `final`: `{ type:'final', schema: object }`
  - `warning` / `error` / `done`
- AI Flow SSE (GET `/api/ai/flow/build/stream`):
  - `message`: Free text mixed logs; the Flow agent also forwards structured events:
    - `ai-form.message`, `ai-form.patch`, `ai-form.snapshot`, `ai-form.attach`, `ai-form.final`, `ai-form.error`
    - `ai-form.tool.start`, `ai-form.tool.end`
    - `flow.tool.start`, `flow.tool.end`

Frontend Services
- `AiFormAgentService`: subscribes to AI Form SSE and exposes an `events$` stream of `AgentEvent` including `tool.start` / `tool.end`.
- `AiFlowAgentService`: exposes `FlowAgentEvent` union with `ai-form.*` and `flow.tool.*` events, plus generic `message/snapshot/final`.

Rendering Rules
- Messages: render as Markdown (marked + DOMPurify). Keep default font/size; suppress <p> margins.
- Tools/Info lines: render as plain text (no Markdown). Deduplicate rapid repeats.
- Badges:
  - `AI FORM`: for AI Form tool/info lines and assistant paragraph label "Assistant formulaire:".
  - `FLOW`: for Flow/tool lines in Flow chat.
- Merging:
  - AI Form messages: merge into a single paragraph labeled "Assistant formulaire:" within the current streamed bubble.
  - FLOW messages: in Flow chat, merge "[ai-flow][msg] …" as "Assistant workflow:".

Reusable Components
- `ChatRendererComponent`: renders `RichPart[]` (tools/logs/messages) consistently across chats.
- `chat-types.ts`: shared `RichPart` type and `mergeText()` utility for anti-duplication.

Integration Notes
- Replace `ngx-markdown` with `marked` + `dompurify` to avoid Angular 20 peer conflicts.
- Keep change detection simple: push to arrays, call `detectChanges()` then auto-scroll.
- When stopping or on error, flush the current `streamingParts` into the transcript to preserve context.

