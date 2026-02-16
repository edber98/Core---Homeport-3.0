# Architecture du système IA Homeport

## Vue d'ensemble

```
Frontend (Angular)              Backend (Express + MongoDB)
════════════════════            ═══════════════════════════
ai.service.ts                   POST /api/ai/threads/:id/messages
  ↓ fetch POST (SSE)              ↓
ai-chat.component.ts            ai.js (route)
  segments[] (text/tools)          ├─ buildContext(companyId, workspaceId, userId)
  reasoning blocks                 ├─ resolveAgentOverrides(agentId, ctx)
  tool tags + popovers             ↓
                                 agent-harness.js (orchestrator)
                                   ├─ buildSystemPrompt(mode, ctx)
                                   ├─ buildCapsuleInstructions(activeCapsules)
                                   ├─ buildOrchestratorToolSet(opts)
                                   ├─ createLlmClient(provider, config)
                                   └─ while (loopCount < maxLoops):
                                       ├─ llm.stream(conversation, definitions)
                                       ├─ nextWithTimeout(iterator, 120s)
                                       ├─ collect: text_delta, tool_use_start/end
                                       ├─ execute tools via toolSet.execute()
                                       │   ├─ activate_capsule → mutation in-place
                                       │   ├─ capsule executors (workflow/form/node_args)
                                       │   ├─ MCP tools (mcp_{prefix}_{name})
                                       │   └─ meta-tools (search, execute, memory...)
                                       ├─ drain sideEvents → yield to SSE
                                       ├─ ask_user → yield question → done
                                       └─ append assistant + tool results to conversation
```

## Composants et responsabilités

### Backend (`API/src/ai/`)

| Fichier | Responsabilité |
|---------|---------------|
| `agent-harness.js` | Boucle orchestrateur unique avec capsules dynamiques |
| `agent-runner.js` | Agent runner legacy (utilisé par onboarding uniquement) |
| `tool-groups.js` | Registry des groupes primitifs + capsules + MCP |
| `tools/meta-tools.js` | 18 outils primitifs (search, execute, memory, manual...) |
| `tools/workflow-tools.js` | ~28 outils builder workflow (graph in-memory, patches) |
| `tools/form-tools.js` | ~14 outils builder formulaire (schema in-memory) |
| `tools/node-args-tools.js` | ~9 outils config node (simulation, mapping) |
| `llm/index.js` | Factory LLM : auto-détection provider + API |
| `llm/anthropic.js` | Client Anthropic Messages API (`/v1/messages`) |
| `llm/openai.js` | Client OpenAI ChatCompletions (`/v1/chat/completions`) |
| `llm/openai-responses.js` | Client OpenAI Responses API (`/v1/responses`) |
| `prompts/base.js` | Prompt de base : contexte company + workspace + user + autonomie |
| `prompts/autonomy.js` | Niveaux d'autonomie (prudent/balanced/autonomous) |
| `prompts/chat.js` | Prompt mode chat (~50 lignes) |
| `prompts/workflow-builder.js` | Prompt mode workflow builder |
| `prompts/form-builder.js` | Prompt mode form builder |
| `prompts/node-args.js` | Prompt mode node args |
| `prompts/onboarding.js` | Prompt mode onboarding |
| `manuals/*.md` | Fichiers référence détaillée avec `@topic:` tags |
| `manuals/manual-index.js` | Index + search : parseSections(), searchManual(), getManualSection() |
| `context/context-builder.js` | Construction du contexte (3 niveaux + flows + forms + providers) |
| `context/memory-manager.js` | Gestion mémoire globale + projet + tracking outils |
| `mcp/mcp-client.js` | Client MCP : connect, listTools, callTool (stdio/SSE) |
| `mcp/mcp-registry.js` | Singleton registry : connections Map, workspace-scoped |

### Frontend (`Homeport/src/app/features/ai/`)

| Fichier | Responsabilité |
|---------|---------------|
| `ai.service.ts` | Service principal : threads, messages, streaming, mode detection |
| `ai-chat.component.ts` | Composant chat : segments, tools rendering, side events |
| `ai-panel.component.ts` | Panneau latéral (drawer) |
| `ai-fullpage.component.ts` | Vue pleine page `/ai` (sidebar + chat) |
| `ai-message.component.ts` | Rendu des messages historiques |
| `ai-question.component.ts` | Rendu des questions `ask_user` |
| `ai-settings.component.ts` | Settings IA (provider, model, agents) |

## Flux de données complet

### 1. Requête utilisateur
```
Frontend: ai.service.quickSend(text)
  → POST /api/ai/threads/:threadId/messages
  → Body: { content, pageContext: { mode, flowId, formId, nodeId, graph, schema } }
```

### 2. Construction du contexte
```
Route ai.js:
  1. buildContext({ companyId, workspaceId, userId })
     → Charge en parallèle : company, workspace, user, recentFlows, recentForms
     → Auto-détecte providers depuis credentials
     → Compte tools par provider via aggregation
  2. resolveAgentOverrides(agentId, ctx)
     → Si provider:xxx → génère prompt fragment avec NodeTemplate list
     → Si aia_xxx → charge custom agent (systemPrompt, allowedProviders, overrides)
     → Returns: { promptFragment, llmProvider, llmModel, blockedTools, maxToolLoops }
  3. ctx._agentPromptFragment = overrides.promptFragment
  4. ctx._projectMemory = loaded from AiProjectMemory
```

### 3. Orchestrateur (harness)
```
agent-harness.js: runHarness({ mode, messages, context, metadata, agentOverrides })
  1. Determine initial capsules from mode
  2. Load MCP tools for workspace
  3. buildOrchestratorToolSet({ context, metadata, emit, activeCapsules, blockedTools, mcpTools })
  4. buildSystemPrompt(mode, context) + capsule instructions
  5. createLlmClient(provider, config)
  6. Loop: stream → events → tools → conversation → repeat
```

### 4. Streaming SSE vers le frontend
```
Route yields events → res.write(`data: ${JSON.stringify(event)}\n\n`)
Frontend fetch → TextDecoder → buffer → parse lines → processStreamEvent()
  → Segments: text → tools (with reasoning absorption) → text → ...
  → Side events: forwarded to ai.sideEvents$ → builders
```

## État mutable vs immutable

| Donnée | Mutabilité | Scope |
|--------|-----------|-------|
| `toolSet.definitions[]` | **Mutable** (capsule activation ajoute in-place) | Per-request |
| `activeCapsules` Set | **Mutable** (harness ajoute via activateCapsule) | Per-request |
| `conversation[]` | **Mutable** (assistant + tool results ajoutés) | Per-request |
| `sideEvents[]` | **Mutable** (drained après chaque tool) | Per-request |
| `executors[]` | **Mutable** (capsule activation crée de nouveaux) | Per-request |
| Context (company, user...) | **Immutable** | Per-request |
| System prompt | **Immutable** après construction | Per-request |
| Capsule executor state (graph, schema) | **Mutable** (in-memory pendant la session) | Per-executor |

## Patterns d'exécution

### Capsule activation (chat mode)
```
1. LLM appelle activate_capsule({ capsule: "workflow" })
2. toolSet.execute() retourne { _capsuleRequest: true, capsule: "workflow" }
3. Harness détecte _capsuleRequest → toolSet.activateCapsule("workflow")
4. activateCapsule() → _addCapsule() → crée executor, ajoute definitions in-place
5. Harness yield tool.end avec message de confirmation
6. LLM voit les nouveaux outils dans le prochain appel stream()
```

### Tool routing (ordre de priorité)
```
toolSet.execute(name, input):
  1. activate_capsule → return _capsuleRequest marker
  2. Capsule executors → executor.execute(name, input)
  3. MCP tools → mcpRegistry.callTool(serverId, originalName, input)
  4. Meta-tools → executeMetaTool(name, input, context)
  5. Aucun match → { error: "Outil inconnu" }
```

### Error handling
```
- Stream init error → throw (harness catches)
- Stream timeout (120s per event) → throw StreamTimeoutError
- Stream error with accumulated text → yield done gracefully
- Tool execution error → yield tool.end with status='error' → continue loop
- Max loops (40) → yield warning message → yield done
```
