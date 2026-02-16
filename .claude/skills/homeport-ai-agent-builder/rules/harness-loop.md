# Boucle orchestrateur (agent-harness.js)

## Fichier : `API/src/ai/agent-harness.js`

Le harness est la boucle orchestrateur principale. Il remplace l'ancien `agent-runner.js` (qui reste pour le mode onboarding uniquement).

## Cycle complet d'une itération

```
1. llm.stream(conversation, toolSet.definitions) → AsyncIterator
2. nextWithTimeout(iterator, 120_000ms) → event par event
3. switch(event.type):
   - text_delta → yield { type: 'message', text }
   - tool_use_start → yield { type: 'tool.start', id, name }
   - tool_input_delta → yield { type: 'tool.input_delta', id, name, text }
   - tool_use_end → pendingToolCalls.push({ id, name, input })
   - done → totalUsage accumulate
4. Si pendingToolCalls.length === 0 → cleanup + yield done → return
5. Pour chaque tool call:
   a. toolSet.execute(name, input)
   b. Si result._capsuleRequest → activateCapsule + yield tool.end
   c. Sinon → yield tool.end + drain sideEvents
   d. Si erreur → yield tool.end status='error' + drain sideEvents
6. Si ask_user trouvé → cleanup + yield question + yield done → return
7. Ajouter assistant message + tool results à conversation
8. Boucler (max 40 itérations)
```

## Initialisation

```javascript
async function* runHarness({ mode, messages, context, metadata, agentOverrides }) {
  // Onboarding → fallback au runAgent legacy
  if (mode === 'onboarding') { yield* runAgent(...); return; }

  // Side events queue
  const sideEvents = [];
  const emit = (ev) => sideEvents.push(ev);

  // Capsules initiales selon le mode
  const activeCapsules = new Set();
  if (mode === 'workflow') activeCapsules.add('workflow');
  if (mode === 'form') activeCapsules.add('form');
  if (mode === 'node_args') activeCapsules.add('node_args');
  // chat mode: AUCUNE capsule au départ — le LLM les active à la demande

  // MCP tools pour le workspace
  let mcpTools = [];
  if (metadata?.workspaceId) {
    mcpTools = await mcpRegistry.getTools(metadata.workspaceId);
  }

  // Toolset mutable
  const toolSet = buildOrchestratorToolSet({
    context, metadata, emit, activeCapsules, blockedTools, mcpTools
  });

  // System prompt + capsule instructions (chat mode uniquement)
  let systemPrompt = buildSystemPrompt(mode, context);
  if (mode === 'chat') {
    systemPrompt += buildCapsuleInstructions(activeCapsules);
  }

  // LLM client avec agent overrides
  const llm = createLlmClient(llmConfig.provider, llmConfig);
}
```

## Per-event timeout

Le harness utilise un timeout par événement (pas par stream entier) pour détecter les streams bloqués :

```javascript
const STREAM_TIMEOUT_MS = 120_000; // 2 minutes

function nextWithTimeout(iterator, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Stream timeout')), timeoutMs);
    iterator.next().then(
      result => { clearTimeout(timer); resolve(result); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

// Utilisation dans la boucle
const it = stream[Symbol.asyncIterator]();
while (true) {
  const { done, value: event } = await nextWithTimeout(it, STREAM_TIMEOUT_MS);
  if (done) break;
  // process event...
}
```

## Capsule activation flow

```
1. LLM envoie tool_call: activate_capsule({ capsule: "workflow", reason: "..." })
2. toolSet.execute("activate_capsule", input)
   → Retourne { _capsuleRequest: true, capsule: "workflow", reason: "..." }
3. Harness détecte result._capsuleRequest:
   a. toolSet.activateCapsule("workflow")
      → activeCapsules.add("workflow")
      → _addCapsule("workflow")
         → createWorkflowExecutor(metadata, emit)
         → Ajoute definitions au tableau mutable (in-place)
      → Retourne { activated: true, newTools: ["create_flow", "add_node", ...] }
   b. Si alreadyActive → { ok: true, message: "déjà active" }
4. Yield tool.end avec message de confirmation
5. Au prochain loop, llm.stream() reçoit les nouvelles definitions
```

## Side events queue

Les side events sont émis par les capsule executors (workflow patches, form updates, node args) et drainés après chaque exécution d'outil :

```javascript
const sideEvents = [];
const emit = (ev) => sideEvents.push(ev);

// Après chaque tool execution:
for (const ev of sideEvents) yield ev;
sideEvents.length = 0;  // Reset
```

Types de side events :
- `{ type: 'patch', nodes, edges }` — Mise à jour partielle du graph
- `{ type: 'snapshot', graph }` — Graph complet
- `{ type: 'args', nodeId, args }` — Arguments d'un node
- `{ type: 'desc', nodeId, text }` — Description d'un node
- `{ type: 'form.update', schema }` — Mise à jour du formulaire
- `{ type: 'form.created', form }` — Nouveau formulaire créé
- `{ type: 'flow.created', flow }` — Nouveau workflow créé
- `{ type: 'thread.link', mode, flowId/formId }` — Lier le thread à un élément

## Ask user pause

Quand le LLM appelle `ask_user`, le harness pause et attend la réponse :

```javascript
const askUserCall = pendingToolCalls.find(tc => tc.name === 'ask_user');
if (askUserCall) {
  await toolSet.cleanup();  // Auto-save pending changes
  const askResult = toolResults.find(r => r.id === askUserCall.id);
  if (askResult?.result) {
    const qEvent = { type: 'question', ...askResult.result };
    if (askResult.result.questions) qEvent.questions = askResult.result.questions;
    yield qEvent;
  }
  yield { type: 'done', usage: totalUsage };
  return;  // Le frontend reprendra avec la réponse de l'utilisateur
}
```

## Usage tracking

Les tokens sont accumulés à travers les itérations :

```javascript
let totalUsage = { input: 0, output: 0 };

// À chaque 'done' event du stream:
if (event.usage) {
  totalUsage.input += event.usage.input || 0;
  totalUsage.output += event.usage.output || 0;
}

// Yield final:
yield { type: 'done', usage: totalUsage };
```

## Error recovery

```javascript
try {
  while (true) {
    const { done, value: event } = await nextWithTimeout(it, STREAM_TIMEOUT_MS);
    if (done) break;
    // process events...
  }
} catch (streamErr) {
  // Si on a du texte et pas de tool calls → yield ce qu'on a
  if (assistantText && pendingToolCalls.length === 0) {
    await toolSet.cleanup();
    yield { type: 'done', usage: totalUsage };
    return;
  }
  throw streamErr;  // Sinon, propager l'erreur
}
```

## Configuration

| Variable | Défaut | Description |
|----------|--------|-------------|
| `DEFAULT_MAX_LOOPS` | 40 | Max itérations de la boucle |
| `STREAM_TIMEOUT_MS` | 120000 | Timeout par événement (2 min) |
| `agentOverrides.maxToolLoops` | — | Override du max loops par agent |
