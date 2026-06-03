// OpenAI Responses API streaming client — /v1/responses (GPT-5.2, o-series)
// Yields normalized events: text_delta, tool_use_start, tool_input_delta, tool_use_end, done

const { isDebug } = require('../util/debug');

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
    // Désactive parallel_tool_calls : OpenAI peut émettre plusieurs tool calls
    // dans le même tour sans voir les résultats intermédiaires, ce qui casse les
    // chaînes depends_on (placeholder `{{tool_uses[0].jobId}}` littéral au lieu
    // du vrai ID). Override possible via AI_PARALLEL_TOOL_CALLS=1.
    body.parallel_tool_calls = process.env.AI_PARALLEL_TOOL_CALLS === '1';
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

  // Track active tool calls — indexed by BOTH call_id and item.id for reliable lookup
  const toolBuilders = new Map(); // call_id|item_id → builder { id, name, arguments, ended, itemId }
  let totalUsage = null;
  let toolIndex = 0;

  /** Find builder by any known ID (call_id, item_id, or fallback to first active) */
  function findBuilder(id1, id2) {
    if (id1 && toolBuilders.has(id1)) return toolBuilders.get(id1);
    if (id2 && toolBuilders.has(id2)) return toolBuilders.get(id2);
    // Fallback: find first non-ended builder
    for (const [, b] of toolBuilders) {
      if (!b.ended) return b;
    }
    return null;
  }

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
      // Logs désactivés par défaut : 50-200 events SSE par stream × N subagents
      // en parallèle × console.log synchrone = event loop saturé. Activable via
      // AI_DEBUG=1 pour investigation.
      if (isDebug() && (type?.includes('function_call') || type?.includes('output_item'))) {
        console.log(`[llm-openai-responses] SSE event: ${type}`, type.includes('delta') ? `delta=${(data.delta || '').length}chars` : '');
      }

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
            const itemId = data.item.id;
            const name = data.item.name || '';
            const args = data.item.arguments || '';
            const builder = { id: callId, name, arguments: args, ended: false, itemId };
            toolBuilders.set(callId, builder);
            // Also index by item.id if different — delta events use item_id which maps to item.id
            if (itemId && itemId !== callId) {
              toolBuilders.set(itemId, builder);
            }
            if (isDebug()) console.log(`[llm-openai-responses] output_item.added: callId=${callId}, itemId=${itemId}, name=${name}`);
            yield { type: 'tool_use_start', index: toolIndex, id: callId, name };
            toolIndex++;
          }
          break;
        }

        // ── Function call arguments streaming start ──
        case 'response.function_call_arguments.start': {
          // Ensure item_id and call_id are both mapped to the same builder
          const startCallId = data.call_id;
          const startItemId = data.item_id;
          if (isDebug()) console.log(`[llm-openai-responses] arguments.start: call_id=${startCallId}, item_id=${startItemId}`);
          if (startItemId && startCallId) {
            const b = toolBuilders.get(startCallId) || toolBuilders.get(startItemId);
            if (b) {
              if (!toolBuilders.has(startItemId)) toolBuilders.set(startItemId, b);
              if (!toolBuilders.has(startCallId)) toolBuilders.set(startCallId, b);
            }
          }
          break;
        }

        // ── Function call arguments delta ──
        case 'response.function_call_arguments.delta': {
          const builder = findBuilder(data.call_id, data.item_id);
          if (!builder) {
            console.log(`[llm-openai-responses] delta: NO builder found! call_id=${data.call_id}, item_id=${data.item_id}, keys=[${[...toolBuilders.keys()]}]`);
          }
          if (builder && data.delta) {
            builder.arguments += data.delta;
            yield { type: 'tool_input_delta', index: toolIndex - 1, id: builder.id, name: builder.name, text: data.delta };
          }
          break;
        }

        // ── Function call arguments done ──
        case 'response.function_call_arguments.done': {
          const builder = findBuilder(data.call_id, data.item_id);
          if (builder && !builder.ended) {
            if (data.arguments) builder.arguments = data.arguments;
            let input = {};
            try { input = JSON.parse(builder.arguments); } catch {}
            builder.ended = true;
            if (isDebug()) console.log(`[llm-openai-responses] arguments.done → tool_use_end: ${builder.name} (id=${builder.id})`);
            yield { type: 'tool_use_end', index: toolIndex - 1, id: builder.id, name: builder.name, input };
          }
          break;
        }

        // ── Output item done — CRITICAL: emit tool_use_end if not already done ──
        case 'response.output_item.done': {
          if (data.item?.type === 'function_call') {
            const callId = data.item.call_id || data.item.id;
            let builder = findBuilder(callId, data.item.id);

            // If we never saw output_item.added for this call, create it now
            if (!builder) {
              const name = data.item.name || '';
              builder = { id: callId, name, arguments: data.item.arguments || '', ended: false, itemId: data.item.id };
              toolBuilders.set(callId, builder);
              if (data.item.id && data.item.id !== callId) toolBuilders.set(data.item.id, builder);
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
              if (isDebug()) console.log(`[llm-openai-responses] output_item.done → tool_use_end: ${builder.name} (id=${builder.id})`);
              yield { type: 'tool_use_end', index: toolIndex - 1, id: builder.id, name: builder.name, input };
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
              if (isDebug()) console.log(`[llm-openai-responses] response.completed flush → tool_use_end: ${builder.name} (id=${callId})`);
              yield { type: 'tool_use_end', index: 0, id: callId, name: builder.name, input };
            }
          }

          if (data.response?.usage) {
            const u = data.response.usage;
            totalUsage = {
              input: u.input_tokens || 0,
              output: u.output_tokens || 0,
              reasoning: u.output_tokens_details?.reasoning_tokens || u.reasoning_tokens || 0,
              // Préserve les champs provider pour l'adapter.
              input_tokens: u.input_tokens || 0,
              output_tokens: u.output_tokens || 0,
              input_tokens_details: u.input_tokens_details || null,
              output_tokens_details: u.output_tokens_details || null,
            };
          }
          const stopReasonRaw = data.response?.status || 'completed';
          console.log(`[llm-openai-responses] response.completed → done (usage: ${JSON.stringify(totalUsage)}, stop: ${stopReasonRaw})`);
          yield { type: 'done', usage: totalUsage, stopReasonRaw };
          return;
        }

        // ── Error ──
        case 'error': {
          throw new Error(`OpenAI Responses stream error: ${data.message || JSON.stringify(data)}`);
        }

        // ── Unhandled events — log for debugging ──
        default: {
          if (isDebug()) {
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
      // Tool result multimodal : extrait les blocks image/document et les émet
      // comme message user séparé (Responses API ne supporte pas encore les
      // content parts non-texte dans function_call_output).
      if (Array.isArray(m.content)) {
        const textParts = m.content.filter(b => b.type === 'text' || typeof b === 'string')
          .map(b => typeof b === 'string' ? b : (b.text || ''));
        const mediaParts = m.content.filter(b => b && (b.type === 'image' || b.type === 'document'));
        items.push({
          type: 'function_call_output',
          call_id: m.tool_call_id,
          output: textParts.join('\n') || '[contenu multimodal ci-dessous]',
        });
        if (mediaParts.length) {
          const parts = [
            { type: 'input_text', text: `(Contenu retourné par le tool pour call ${m.tool_call_id})` },
          ];
          for (const b of mediaParts) {
            const src = b.source || { type: 'base64', media_type: b.media_type, data: b.data };
            if (b.type === 'image') {
              parts.push({ type: 'input_image', image_url: `data:${src.media_type};base64,${src.data}` });
            } else if (b.type === 'document') {
              // OpenAI Responses API : input_file avec file_data (base64)
              parts.push({
                type: 'input_file',
                filename: b.name || 'document.pdf',
                file_data: `data:${src.media_type || 'application/pdf'};base64,${src.data}`,
              });
            }
          }
          items.push({ type: 'message', role: 'user', content: parts });
        }
      } else {
        items.push({
          type: 'function_call_output',
          call_id: m.tool_call_id,
          output: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        });
      }
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

    // Content arrays (multimodal) — convert to Responses API format
    if (Array.isArray(m.content)) {
      const parts = m.content.map(b => {
        if (b.type === 'image') {
          const src = b.source || { data: b.data, media_type: b.media_type };
          return { type: 'input_image', image_url: `data:${src.media_type};base64,${src.data}` };
        }
        if (b.type === 'document') {
          const src = b.source || { data: b.data, media_type: b.media_type || 'application/pdf' };
          return {
            type: 'input_file',
            filename: b.name || 'document.pdf',
            file_data: `data:${src.media_type};base64,${src.data}`,
          };
        }
        if (b.type === 'input_audio' || b.type === 'audio') {
          const src = b.source || { data: b.data, media_type: b.media_type || 'audio/mpeg' };
          return {
            type: 'input_audio',
            input_audio: { data: src.data, format: (src.media_type || '').split('/').pop() || 'mp3' },
          };
        }
        return { type: 'input_text', text: b.text || '' };
      });
      items.push({ type: 'message', role: m.role === 'user' ? 'user' : 'assistant', content: parts });
    } else {
      items.push({
        type: 'message',
        role: m.role === 'user' ? 'user' : 'assistant',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
      });
    }
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
