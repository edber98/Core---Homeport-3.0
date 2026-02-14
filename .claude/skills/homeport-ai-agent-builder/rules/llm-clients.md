# Clients LLM multi-provider

## Factory : `API/src/ai/llm/index.js`

```javascript
function createLlmClient(provider, config) {
  // config = { apiKey, model, temperature, maxTokens, useResponsesApi, reasoningEffort, verbosity }

  if (provider === 'anthropic' || provider === 'claude') {
    return { provider: 'anthropic', stream(messages, tools) { ... } };
  }

  // Auto-détection Responses API vs ChatCompletions
  const useResponses = !forceChatCompletions &&
    (config.useResponsesApi || /^(gpt-5|o[1-9])/.test(config.model));

  if (useResponses) {
    return { provider: 'openai-responses', stream(messages, tools) { ... } };
  }

  return { provider: 'openai', stream(messages, tools) { ... } };
}
```

### Logique de sélection

| Provider | API | Condition |
|----------|-----|-----------|
| `anthropic` / `claude` | Messages `/v1/messages` | Provider explicite |
| `openai` + model `gpt-5.*` ou `o[1-9]*` | Responses `/v1/responses` | Auto-détecté par regex |
| `openai` + `AI_FORCE_CHAT_COMPLETIONS=1` | ChatCompletions `/v1/chat/completions` | Override env |
| `openai` (autre model) | ChatCompletions `/v1/chat/completions` | Défaut |

## Events normalisés

Tous les clients yield les mêmes types d'events :

```typescript
{ type: 'text_delta', text: string }
{ type: 'tool_use_start', index: number, id: string, name: string }
{ type: 'tool_input_delta', index: number, id: string, name: string, text: string }
{ type: 'tool_use_end', index: number, id: string, name: string, input: object }
{ type: 'done', usage: { input: number, output: number } }
```

Le harness consomme ces events de manière identique quel que soit le provider.

---

## Client Anthropic (`API/src/ai/llm/anthropic.js`)

### Particularités

- **System extraction** : Le message `role: 'system'` est extrait et passé en paramètre top-level `system` (requis par l'API Anthropic)
- **Alternating roles** : Les messages consécutifs du même rôle sont fusionnés (Anthropic exige l'alternance user/assistant)
- **Tool results** : Convertis en `role: 'user'` avec `content: [{ type: 'tool_result', tool_use_id, content }]`
- **Tool calls** : Convertis en `role: 'assistant'` avec `content: [{ type: 'text' }, { type: 'tool_use' }]`
- **Input JSON delta** : L'argument est accumulé comme string puis parsé à `content_block_stop`

### Stream events mapping

| Anthropic SSE | → Event normalisé |
|---------------|-------------------|
| `content_block_start` (type=tool_use) | `tool_use_start` |
| `content_block_delta` (type=text_delta) | `text_delta` |
| `content_block_delta` (type=input_json_delta) | `tool_input_delta` |
| `content_block_stop` (si tool) | `tool_use_end` |
| `message_start` | usage.input capture |
| `message_delta` | usage.output capture |
| `message_stop` | `done` |

### Format tools Anthropic

```javascript
{ name, description, input_schema: parameters }
```

---

## Client OpenAI ChatCompletions (`API/src/ai/llm/openai.js`)

### Particularités

- **parallel_tool_calls=false** : Force les tool calls séquentiels (évite les hallucinations de clés)
- **stream_options: { include_usage: true }** : Active le reporting d'usage en streaming
- **Tool calls by index** : Les deltas arrivent avec un `tc.index`, accumulés dans `toolBuilders Map`
- **Finish reason** : `tool_calls` ou `stop` → flush tous les pending builders
- **Usage arrives AFTER finish_reason** : Le loop continue après `stop` pour capturer le chunk usage avant `[DONE]`
- **max_completion_tokens** : Utilisé au lieu de `max_tokens` pour les modèles récents

### Stream events mapping

| OpenAI SSE | → Event normalisé |
|------------|-------------------|
| `delta.content` | `text_delta` |
| `delta.tool_calls[].function.name` (new) | `tool_use_start` |
| `delta.tool_calls[].function.arguments` | `tool_input_delta` |
| `finish_reason=tool_calls\|stop` | `tool_use_end` (flush all builders) |
| `chunk.usage` | usage capture |
| `data: [DONE]` | `done` |

### Format tools OpenAI

```javascript
{ type: 'function', function: { name, description, parameters } }
```

---

## Client OpenAI Responses API (`API/src/ai/llm/openai-responses.js`)

### Particularités

- **Items format** : Messages formatés comme `input` items (pas `messages`)
- **System → developer** : `role: 'system'` converti en `type: 'message', role: 'developer'`
- **Tool calls** : `type: 'function_call'` avec `call_id`, `name`, `arguments` (string)
- **Tool results** : `type: 'function_call_output'` avec `call_id`, `output`
- **reasoning.effort** : `none | low | medium | high | xhigh` (GPT-5.x)
- **text.verbosity** : `low | medium | high` (GPT-5.x)
- **Temperature** : Uniquement supporté avec `reasoning.effort=none`
- **Safety net** : `output_item.done` émet `tool_use_end` si `arguments.done` a été raté
- **response.completed** : Flush final de tous les pending builders

### Stream events mapping

| Responses API SSE | → Event normalisé |
|-------------------|-------------------|
| `response.output_text.delta` | `text_delta` |
| `response.output_item.added` (function_call) | `tool_use_start` |
| `response.function_call_arguments.delta` | `tool_input_delta` |
| `response.function_call_arguments.done` | `tool_use_end` |
| `response.output_item.done` (function_call) | `tool_use_end` (safety net) |
| `response.completed` | `done` + flush pending |

### Format tools Responses API

```javascript
{ type: 'function', name, description, parameters }
```

---

## Configuration environnement

| Variable | Exemple | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `openai` / `anthropic` | Provider par défaut |
| `AI_MODEL` | `gpt-5.2` / `claude-sonnet-4-5-20250929` | Modèle par défaut |
| `AI_API_KEY` | — | Clé API (auto-routed par provider) |
| `ANTHROPIC_API_KEY` | — | Clé API Anthropic (override) |
| `OPENAI_API_KEY` | — | Clé API OpenAI (override) |
| `AI_REASONING_EFFORT` | `medium` | Effort de raisonnement (Responses API) |
| `AI_VERBOSITY` | `medium` | Verbosité de la réponse (Responses API) |
| `AI_FORCE_CHAT_COMPLETIONS` | `1` | Force ChatCompletions au lieu de Responses |
| `AI_TEMPERATURE` | `0.7` | Température (pas supporté avec reasoning) |
| `AI_MAX_TOKENS` | `4096` | Max tokens de sortie |
| `AI_DEBUG` | `1` | Active les logs de debug détaillés |

---

## Template : ajouter un nouveau provider LLM

### 1. Créer le fichier client

`API/src/ai/llm/nouveau-provider.js` :

```javascript
async function* streamNouveauProvider(messages, tools, config) {
  const apiKey = config.apiKey;
  if (!apiKey) throw new Error('API key not configured');

  // 1. Formater les messages pour l'API
  const body = { model: config.model, messages: formatMessages(messages), stream: true };
  if (tools?.length) body.tools = formatTools(tools);

  // 2. Appel HTTP streaming
  const res = await fetch('https://api.nouveau-provider.com/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);

  // 3. Parser le stream SSE
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE lines → yield normalized events
    // MUST yield: text_delta, tool_use_start, tool_input_delta, tool_use_end, done
  }

  yield { type: 'done', usage: null };
}
```

### 2. Brancher dans la factory

`API/src/ai/llm/index.js` :

```javascript
const { streamNouveauProvider } = require('./nouveau-provider');

function createLlmClient(provider, config) {
  if (provider === 'nouveau') {
    return {
      provider: 'nouveau',
      stream(messages, tools) {
        return streamNouveauProvider(messages, tools, config);
      },
    };
  }
  // ... reste de la factory ...
}
```

### 3. Ajouter la clé API dans env

`API/src/config/env.js` : ajouter `NOUVEAU_API_KEY`

### 4. Router la clé dans le harness

`API/src/ai/agent-harness.js` ligne ~146 :

```javascript
if (agentOverrides?.llmProvider) {
  const p = agentOverrides.llmProvider.toLowerCase();
  if (p === 'nouveau') llmConfig.apiKey = env.NOUVEAU_API_KEY;
  // ...
}
```
