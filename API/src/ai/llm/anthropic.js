// Anthropic streaming client — native fetch, no SDK
// Yields normalized events: text_delta, tool_use_start, tool_input_delta, tool_use_end, done

const { isDebug } = require('../util/debug');

async function* streamAnthropic(messages, tools, config) {
  const apiKey = config.apiKey;
  if (!apiKey) throw new Error('Anthropic API key not configured');

  // Anthropic requires system as a top-level param, not in messages
  let system = '';
  const filtered = [];
  for (const m of messages) {
    if (m.role === 'system') {
      system += (system ? '\n\n' : '') + (typeof m.content === 'string' ? m.content : JSON.stringify(m.content));
    } else {
      filtered.push(m);
    }
  }

  const modelId = config.model || 'claude-sonnet-4-5-20250929';
  // Claude Opus 4.7+ et certains modèles récents ne supportent pas `temperature`.
  const supportsTemperature = !modelId.includes('opus-4-7') && !modelId.includes('opus-4-6');
  // Opus génère souvent du code/docx très long → bump le max_tokens par défaut
  // pour éviter coupure en plein milieu de string Python. 16384 = plafond large.
  const isOpus = modelId.includes('opus');
  const defaultMaxTokens = isOpus ? 16384 : 4096;
  const body = {
    model: modelId,
    max_tokens: config.maxTokens || defaultMaxTokens,
    messages: formatMessages(filtered),
    stream: true,
    ...(supportsTemperature ? { temperature: config.temperature ?? 0.7 } : {}),
  };
  if (system) body.system = system;
  if (tools && tools.length) body.tools = formatTools(tools);

  console.log(`[llm-anthropic] request: model=${body.model}, tools=${body.tools?.length || 0}, messages=${body.messages?.length || 0}`);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[llm-anthropic] HTTP error ${res.status}: ${errText.slice(0, 500)}`);
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }
  console.log('[llm-anthropic] stream started');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  // Track current content block
  let currentBlockIndex = -1;
  let currentToolId = '';
  let currentToolName = '';
  let currentToolArgs = '';
  let usage = null;
  let stopReasonRaw = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('event: ')) {
        // We handle data lines, event type is parsed from data
        continue;
      }

      if (!trimmed.startsWith('data: ')) continue;
      let data;
      try { data = JSON.parse(trimmed.slice(6)); } catch { continue; }

      switch (data.type) {
        case 'message_start':
          if (data.message?.usage) {
            // Préserve les champs provider (cache_creation, cache_read) pour l'adapter.
            usage = {
              input: data.message.usage.input_tokens || 0,
              output: 0,
              input_tokens: data.message.usage.input_tokens || 0,
              output_tokens: 0,
              cache_creation_input_tokens: data.message.usage.cache_creation_input_tokens || 0,
              cache_read_input_tokens: data.message.usage.cache_read_input_tokens || 0,
            };
          }
          break;

        case 'content_block_start':
          currentBlockIndex = data.index ?? (currentBlockIndex + 1);
          if (data.content_block?.type === 'tool_use') {
            currentToolId = data.content_block.id || '';
            currentToolName = data.content_block.name || '';
            currentToolArgs = '';
            yield { type: 'tool_use_start', index: currentBlockIndex, id: currentToolId, name: currentToolName };
          }
          break;

        case 'content_block_delta':
          if (data.delta?.type === 'text_delta' && data.delta.text) {
            yield { type: 'text_delta', text: data.delta.text };
          }
          if (data.delta?.type === 'input_json_delta' && data.delta.partial_json) {
            currentToolArgs += data.delta.partial_json;
            if (isDebug()) console.log(`[llm-anthropic] input_json_delta: ${currentToolName} +${data.delta.partial_json.length}chars`);
            yield { type: 'tool_input_delta', index: currentBlockIndex, id: currentToolId, name: currentToolName, text: data.delta.partial_json };
          }
          break;

        case 'content_block_stop': {
          if (currentToolName) {
            let input = {};
            try { input = JSON.parse(currentToolArgs); } catch {}
            yield { type: 'tool_use_end', index: currentBlockIndex, id: currentToolId, name: currentToolName, input };
            currentToolId = '';
            currentToolName = '';
            currentToolArgs = '';
          }
          break;
        }

        case 'message_delta':
          if (data.usage) {
            if (!usage) usage = { input: 0, output: 0 };
            usage.output = data.usage.output_tokens || 0;
            usage.output_tokens = data.usage.output_tokens || 0;
          }
          if (data.delta?.stop_reason) {
            stopReasonRaw = data.delta.stop_reason;
          }
          break;

        case 'message_stop':
          console.log(`[llm-anthropic] message_stop → done (usage: ${JSON.stringify(usage)}, stop: ${stopReasonRaw})`);
          yield { type: 'done', usage, stopReasonRaw };
          return;

        case 'error':
          throw new Error(`Anthropic stream error: ${data.error?.message || JSON.stringify(data.error)}`);
      }
    }
  }

  yield { type: 'done', usage, stopReasonRaw };
}

// Format messages for Anthropic API
function formatMessages(messages) {
  const out = [];
  for (const m of messages) {
    if (m.role === 'system') continue; // handled at top level

    if (m.role === 'tool') {
      const toolContent = [];
      // Support multimodal tool results (text + images + PDFs documents)
      if (Array.isArray(m.content)) {
        for (const b of m.content) {
          if (b.type === 'image') {
            const src = b.source || { type: 'base64', media_type: b.media_type, data: b.data };
            toolContent.push({ type: 'image', source: src });
          } else if (b.type === 'document') {
            // Anthropic supporte nativement les PDF via type:'document'
            const src = b.source || { type: 'base64', media_type: b.media_type || 'application/pdf', data: b.data };
            toolContent.push({ type: 'document', source: src });
          } else {
            toolContent.push({ type: 'text', text: b.text || '' });
          }
        }
      } else {
        toolContent.push({ type: 'text', text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) });
      }
      out.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: m.tool_call_id,
          content: toolContent,
        }],
      });
      continue;
    }

    if (m.role === 'assistant' && m.tool_calls) {
      const content = [];
      if (m.content) content.push({ type: 'text', text: m.content });
      for (const tc of m.tool_calls) {
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.input || {},
        });
      }
      out.push({ role: 'assistant', content });
      continue;
    }

    // Content arrays (multimodal) — convert to Anthropic format
    if (Array.isArray(m.content)) {
      const blocks = m.content.map(b => {
        if (b.type === 'image') {
          const src = b.source || { type: 'base64', media_type: b.media_type, data: b.data };
          return { type: 'image', source: src };
        }
        if (b.type === 'document') {
          const src = b.source || { type: 'base64', media_type: b.media_type || 'application/pdf', data: b.data };
          return { type: 'document', source: src };
        }
        return { type: 'text', text: b.text || '' };
      });
      out.push({ role: m.role === 'user' ? 'user' : 'assistant', content: blocks });
    } else {
      out.push({ role: m.role === 'user' ? 'user' : 'assistant', content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '') });
    }
  }

  // Anthropic requires alternating user/assistant — merge consecutive same-role
  const merged = [];
  for (const m of out) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      // Merge content — ensure both sides are arrays for proper concatenation
      const toArr = (c) => {
        if (Array.isArray(c)) return c;
        if (typeof c === 'string') return [{ type: 'text', text: c }];
        return [{ type: 'text', text: String(c || '') }];
      };
      last.content = [...toArr(last.content), ...toArr(m.content)];
    } else {
      merged.push({ ...m });
    }
  }
  // Defense in depth : Anthropic rejette "text content blocks must be non-empty".
  // Retire tout message dont le content est vide (ou tous ses text blocks vides).
  const cleaned = merged
    .map(m => {
      if (typeof m.content === 'string') {
        return m.content.trim() ? m : null;
      }
      if (Array.isArray(m.content)) {
        const filtered = m.content.filter(b => {
          if (b.type === 'text') return String(b.text || '').trim().length > 0;
          return true; // image, tool_use, tool_result : on garde
        });
        if (filtered.length === 0) return null;
        return { ...m, content: filtered };
      }
      return null;
    })
    .filter(Boolean);
  return cleaned;
}

// Format tools for Anthropic API
function formatTools(tools) {
  if (!tools || !tools.length) return undefined;
  return tools.map(t => ({
    name: t.name,
    description: t.description || '',
    input_schema: t.parameters || { type: 'object', properties: {} },
  }));
}

module.exports = { streamAnthropic, formatMessages, formatTools };
