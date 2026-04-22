// OpenAI streaming client — native fetch, no LangChain
// Yields normalized events: text_delta, tool_use_start, tool_input_delta, tool_use_end, done

const { isDebug } = require('../util/debug');

async function* streamOpenAI(messages, tools, config) {
  const apiKey = config.apiKey;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const model = config.model || 'gpt-5.2';
  // GPT-5.2 with reasoning=none supports temperature; others don't
  const isReasoningModel = /^(gpt-5|o[1-9])/.test(model);
  const reasoningEffort = config.reasoningEffort || undefined;
  const noCustomTemp = isReasoningModel && reasoningEffort !== 'none';
  const body = {
    model,
    messages,
    stream: true,
  };
  if (!noCustomTemp) body.temperature = config.temperature ?? 0.7;
  // Reasoning effort for GPT-5.x via ChatCompletions
  if (isReasoningModel && reasoningEffort) {
    body.reasoning_effort = reasoningEffort;
  }
  // Newer OpenAI models use max_completion_tokens instead of max_tokens
  if (config.maxTokens) body.max_completion_tokens = config.maxTokens;
  if (tools && tools.length) {
    body.tools = tools;
    // Force sequential tool calls par défaut : évite que le LLM hallucine des
    // IDs / keys quand il a besoin du résultat d'un tool call précédent (ex:
    // search_tools → get_tool_details, spawn_subagent avec depends_on chaînés).
    // Override possible via AI_PARALLEL_TOOL_CALLS=1 pour les cas où la vraie
    // parallélisation (tool calls indépendants) est souhaitée.
    body.parallel_tool_calls = process.env.AI_PARALLEL_TOOL_CALLS === '1';
  }
  // Include usage in streaming response (otherwise totalUsage is always null)
  body.stream_options = { include_usage: true };

  console.log(`[llm-openai] request: model=${body.model}, tools=${body.tools?.length || 0}, messages=${body.messages?.length || 0}`);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[llm-openai] HTTP error ${res.status}: ${errText.slice(0, 500)}`);
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }
  console.log('[llm-openai] stream started');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  // Track tool call builders: index → { id, name, arguments }
  const toolBuilders = new Map();
  let totalUsage = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') {
        if (trimmed === 'data: [DONE]') {
          console.log(`[llm-openai] [DONE] → done (usage: ${JSON.stringify(totalUsage)})`);
          yield { type: 'done', usage: totalUsage };
          return;
        }
        continue;
      }
      if (!trimmed.startsWith('data: ')) continue;

      let chunk;
      try { chunk = JSON.parse(trimmed.slice(6)); } catch { continue; }

      // Usage info (if present)
      if (chunk.usage) {
        totalUsage = { input: chunk.usage.prompt_tokens || 0, output: chunk.usage.completion_tokens || 0 };
      }

      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta;
      if (!delta) continue;

      // Text content
      if (delta.content) {
        yield { type: 'text_delta', text: delta.content };
      }

      // Tool calls
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolBuilders.has(idx)) {
            toolBuilders.set(idx, { id: '', name: '', arguments: '' });
          }
          const b = toolBuilders.get(idx);

          if (tc.id) b.id = tc.id;
          if (tc.function?.name) {
            b.name = tc.function.name;
            yield { type: 'tool_use_start', index: idx, id: b.id, name: b.name };
          }
          if (tc.function?.arguments) {
            b.arguments += tc.function.arguments;
            if (isDebug()) console.log(`[llm-openai] input_delta: ${b.name} +${tc.function.arguments.length}chars`);
            yield { type: 'tool_input_delta', index: idx, id: b.id, name: b.name, text: tc.function.arguments };
          }
        }
      }

      // Finish reason
      if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
        // Emit tool_use_end for all pending builders
        for (const [idx, b] of toolBuilders) {
          let input = {};
          try { input = JSON.parse(b.arguments); } catch {}
          yield { type: 'tool_use_end', index: idx, id: b.id, name: b.name, input };
        }
        toolBuilders.clear();
        // Don't return on 'stop' — with stream_options, the usage chunk arrives
        // AFTER finish_reason. Let the loop continue to capture it, then [DONE] yields done.
      }
    }
  }

  // If stream ended without [DONE]
  for (const [idx, b] of toolBuilders) {
    let input = {};
    try { input = JSON.parse(b.arguments); } catch {}
    yield { type: 'tool_use_end', index: idx, id: b.id, name: b.name, input };
  }
  yield { type: 'done', usage: totalUsage };
}

// Format messages for OpenAI API
function formatMessages(messages) {
  return messages.map(m => {
    if (m.role === 'tool') {
      return { role: 'tool', tool_call_id: m.tool_call_id, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) };
    }
    if (m.role === 'assistant' && m.tool_calls) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.tool_calls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input || {}) },
        })),
      };
    }
    // Content arrays (multimodal) — convert to OpenAI Chat Completions format
    if (Array.isArray(m.content)) {
      const parts = m.content.map(b => {
        if (b.type === 'image') {
          const src = b.source || { data: b.data, media_type: b.media_type };
          return { type: 'image_url', image_url: { url: `data:${src.media_type};base64,${src.data}` } };
        }
        if (b.type === 'document') {
          // OpenAI Chat Completions supports input via "file" content part (type: 'file', file: {file_data})
          const src = b.source || { data: b.data, media_type: b.media_type || 'application/pdf' };
          return {
            type: 'file',
            file: {
              filename: b.name || 'document.pdf',
              file_data: `data:${src.media_type};base64,${src.data}`,
            },
          };
        }
        if (b.type === 'input_audio' || b.type === 'audio') {
          const src = b.source || { data: b.data, media_type: b.media_type || 'audio/mpeg' };
          return {
            type: 'input_audio',
            input_audio: { data: src.data, format: (src.media_type || '').split('/').pop() || 'mp3' },
          };
        }
        return { type: 'text', text: b.text || '' };
      });
      return { role: m.role, content: parts };
    }
    return { role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '') };
  });
}

// Format tools for OpenAI API
function formatTools(tools) {
  if (!tools || !tools.length) return undefined;
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description || '',
      parameters: t.parameters || { type: 'object', properties: {} },
    },
  }));
}

module.exports = { streamOpenAI, formatMessages, formatTools };
