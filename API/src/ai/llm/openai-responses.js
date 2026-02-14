// OpenAI Responses API streaming client — /v1/responses (GPT-5.2, o-series)
// Yields normalized events: text_delta, tool_use_start, tool_input_delta, tool_use_end, done

/**
 * Stream from OpenAI's Responses API.
 * @param {Array} messages - Normalized messages [{role, content, tool_calls?}]
 * @param {Array} tools - Tool definitions
 * @param {object} config - { apiKey, model, reasoningEffort, verbosity, maxTokens }
 */
async function* streamOpenAIResponses(messages, tools, config) {
  const apiKey = config.apiKey;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const model = config.model || 'gpt-5.2';

  const body = {
    model,
    input: formatInputItems(messages),
    stream: true,
  };

  // Reasoning effort (GPT-5.2: none | low | medium | high | xhigh)
  if (config.reasoningEffort) {
    body.reasoning = { effort: config.reasoningEffort };
  }

  // Verbosity (GPT-5.2: low | medium | high)
  if (config.verbosity) {
    body.text = { verbosity: config.verbosity };
  }

  // Tools
  if (tools?.length) {
    body.tools = formatResponsesTools(tools);
  }

  // Max output tokens
  if (config.maxTokens) {
    body.max_output_tokens = config.maxTokens;
  }

  // Temperature only valid with reasoning=none
  if (config.reasoningEffort === 'none' && config.temperature != null) {
    body.temperature = config.temperature;
  }

  console.log(`[llm-openai-responses] request: model=${body.model}, tools=${body.tools?.length || 0}, input=${body.input?.length || 0}, reasoning=${config.reasoningEffort || 'default'}, verbosity=${config.verbosity || 'default'}`);

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[llm-openai-responses] HTTP error ${res.status}: ${errText.slice(0, 500)}`);
    throw new Error(`OpenAI Responses API error ${res.status}: ${errText}`);
  }
  console.log('[llm-openai-responses] stream started');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Track active tool calls
  const toolBuilders = new Map(); // call_id → { id, name, arguments, ended }
  let totalUsage = null;
  let toolIndex = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      // Handle event: lines
      if (trimmed.startsWith('event: ')) continue;

      if (!trimmed.startsWith('data: ')) continue;
      let data;
      try { data = JSON.parse(trimmed.slice(6)); } catch { continue; }

      // Responses API event types
      const type = data.type;

      switch (type) {
        // ── Text streaming ──
        case 'response.output_text.delta': {
          if (data.delta) {
            yield { type: 'text_delta', text: data.delta };
          }
          break;
        }

        // ── Text done (full text available) ──
        case 'response.output_text.done':
          // Already streamed via deltas — no action needed
          break;

        // ── Content part added ──
        case 'response.content_part.added':
        case 'response.content_part.done':
          // Informational — handled via text deltas
          break;

        // ── Function call start (via output_item.added) ──
        case 'response.output_item.added': {
          if (data.item?.type === 'function_call') {
            const callId = data.item.call_id || data.item.id || `call_${toolIndex}`;
            const name = data.item.name || '';
            const args = data.item.arguments || '';
            toolBuilders.set(callId, { id: callId, name, arguments: args, ended: false });
            yield { type: 'tool_use_start', index: toolIndex, id: callId, name };
            toolIndex++;
          }
          break;
        }

        // ── Function call arguments streaming start ──
        case 'response.function_call_arguments.start': {
          // Tool was already registered by output_item.added — nothing extra needed
          break;
        }

        // ── Function call arguments delta ──
        case 'response.function_call_arguments.delta': {
          const callId = data.call_id || data.item_id;
          const builder = toolBuilders.get(callId);
          if (builder && data.delta) {
            builder.arguments += data.delta;
            yield { type: 'tool_input_delta', index: toolIndex - 1, id: callId, name: builder.name, text: data.delta };
          }
          break;
        }

        // ── Function call arguments done ──
        case 'response.function_call_arguments.done': {
          const callId = data.call_id || data.item_id;
          const builder = toolBuilders.get(callId);
          if (builder && !builder.ended) {
            if (data.arguments) builder.arguments = data.arguments;
            let input = {};
            try { input = JSON.parse(builder.arguments); } catch {}
            builder.ended = true;
            yield { type: 'tool_use_end', index: toolIndex - 1, id: callId, name: builder.name, input };
          }
          break;
        }

        // ── Output item done — CRITICAL: emit tool_use_end if not already done ──
        case 'response.output_item.done': {
          if (data.item?.type === 'function_call') {
            const callId = data.item.call_id || data.item.id;
            let builder = toolBuilders.get(callId);

            // If we never saw output_item.added for this call, create it now
            if (!builder) {
              const name = data.item.name || '';
              builder = { id: callId, name, arguments: data.item.arguments || '', ended: false };
              toolBuilders.set(callId, builder);
              yield { type: 'tool_use_start', index: toolIndex, id: callId, name };
              toolIndex++;
            }

            // Update arguments from the complete item
            if (data.item.arguments) {
              builder.arguments = data.item.arguments;
            }

            // Emit tool_use_end if not already emitted by arguments.done
            if (!builder.ended) {
              let input = {};
              try { input = JSON.parse(builder.arguments); } catch {}
              builder.ended = true;
              console.log(`[llm-openai-responses] output_item.done → tool_use_end: ${builder.name} (id=${callId})`);
              yield { type: 'tool_use_end', index: toolIndex - 1, id: callId, name: builder.name, input };
            }
          }
          break;
        }

        // ── Response completed ──
        case 'response.completed': {
          // Safety net: emit tool_use_end for any pending builders
          for (const [callId, builder] of toolBuilders) {
            if (!builder.ended) {
              let input = {};
              try { input = JSON.parse(builder.arguments); } catch {}
              builder.ended = true;
              console.log(`[llm-openai-responses] response.completed flush → tool_use_end: ${builder.name} (id=${callId})`);
              yield { type: 'tool_use_end', index: 0, id: callId, name: builder.name, input };
            }
          }

          if (data.response?.usage) {
            const u = data.response.usage;
            totalUsage = {
              input: u.input_tokens || 0,
              output: u.output_tokens || 0,
              reasoning: u.reasoning_tokens || 0,
            };
          }
          console.log(`[llm-openai-responses] response.completed → done (usage: ${JSON.stringify(totalUsage)})`);
          yield { type: 'done', usage: totalUsage };
          return;
        }

        // ── Error ──
        case 'error': {
          throw new Error(`OpenAI Responses stream error: ${data.message || JSON.stringify(data)}`);
        }

        // ── Unhandled events — log for debugging ──
        default: {
          if (process.env.AI_DEBUG) {
            console.log(`[llm-openai-responses] unhandled event: ${type}`);
          }
          break;
        }
      }
    }
  }

  // Stream ended without response.completed — flush pending tools
  for (const [callId, builder] of toolBuilders) {
    if (!builder.ended) {
      let input = {};
      try { input = JSON.parse(builder.arguments); } catch {}
      builder.ended = true;
      yield { type: 'tool_use_end', index: 0, id: callId, name: builder.name, input };
    }
  }
  yield { type: 'done', usage: totalUsage };
}

/**
 * Format normalized messages → Responses API input items.
 */
function formatInputItems(messages) {
  const items = [];
  for (const m of messages) {
    if (m.role === 'system') {
      items.push({ type: 'message', role: 'developer', content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) });
      continue;
    }

    if (m.role === 'tool') {
      items.push({
        type: 'function_call_output',
        call_id: m.tool_call_id,
        output: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      });
      continue;
    }

    if (m.role === 'assistant' && m.tool_calls) {
      if (m.content) {
        items.push({ type: 'message', role: 'assistant', content: m.content });
      }
      for (const tc of m.tool_calls) {
        items.push({
          type: 'function_call',
          call_id: tc.id,
          name: tc.name,
          arguments: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input || {}),
        });
      }
      continue;
    }

    items.push({
      type: 'message',
      role: m.role === 'user' ? 'user' : 'assistant',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
    });
  }
  return items;
}

/**
 * Format tools for Responses API.
 */
function formatResponsesTools(tools) {
  if (!tools?.length) return undefined;
  return tools.map(t => ({
    type: 'function',
    name: t.name,
    description: t.description || '',
    parameters: t.parameters || { type: 'object', properties: {} },
  }));
}

module.exports = { streamOpenAIResponses, formatInputItems, formatResponsesTools };
