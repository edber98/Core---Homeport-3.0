async function anthropicRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Missing Anthropic API key." };

  const baseUrl = (credentials.baseUrl || "https://api.anthropic.com/v1").replace(/\/$/, "");
  const url = new URL(`${baseUrl}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const method = options.method || "GET";
  const body = options.body ? JSON.stringify(options.body) : undefined;

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

/**
 * Streaming variant: sends request with stream:true and reads SSE tokens.
 * Calls onToken(accumulatedText) for each content_block_delta.
 * Returns { ok, data: { text, id, model, role, stopReason, inputTokens, outputTokens } }
 */
async function anthropicRequestStream(opts, path, options = {}, onToken) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Missing Anthropic API key." };

  const baseUrl = (credentials.baseUrl || "https://api.anthropic.com/v1").replace(/\/$/, "");
  const url = new URL(`${baseUrl}${path}`);
  const headers = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const body = options.body ? { ...options.body, stream: true } : { stream: true };

  let res;
  try {
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  } catch (e) {
    return { ok: false, error: e.message };
  }
  if (!res.ok) {
    const errText = await res.text();
    let errData; try { errData = JSON.parse(errText); } catch { errData = errText; }
    return { ok: false, error: errData?.error?.message || `HTTP ${res.status}`, status: res.status, details: errData };
  }

  let text = '';
  let meta = {};
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const ev = JSON.parse(raw);
        if (ev.type === 'content_block_delta' && ev.delta?.text) {
          text += ev.delta.text;
          if (onToken) onToken(text);
        }
        if (ev.type === 'message_start' && ev.message) {
          meta.id = ev.message.id;
          meta.model = ev.message.model;
          meta.role = ev.message.role;
          if (ev.message.usage) meta.inputTokens = ev.message.usage.input_tokens;
        }
        if (ev.type === 'message_delta' && ev.delta) {
          meta.stopReason = ev.delta.stop_reason;
          if (ev.usage) meta.outputTokens = ev.usage.output_tokens;
        }
      } catch {}
    }
  }

  return { ok: true, data: { text, ...meta } };
}

module.exports = { utils: { anthropicRequest, anthropicRequestStream } };
