async function mistralRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Missing Mistral API key." };

  const baseUrl = (credentials.baseUrl || "https://api.mistral.ai/v1").replace(/\/$/, "");
  const url = new URL(`${baseUrl}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
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
    return { ok: false, error: data?.message || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

/**
 * Streaming variant: sends request with stream:true and reads SSE tokens.
 * Calls onToken(accumulatedText) for each delta chunk.
 */
async function mistralRequestStream(opts, path, options = {}, onToken) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Missing Mistral API key." };

  const baseUrl = (credentials.baseUrl || "https://api.mistral.ai/v1").replace(/\/$/, "");
  const url = new URL(`${baseUrl}${path}`);
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
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
    return { ok: false, error: errData?.message || `HTTP ${res.status}`, status: res.status, details: errData };
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
        const choice = (ev.choices || [])[0] || {};
        const delta = choice.delta || {};
        if (delta.content) {
          text += delta.content;
          if (onToken) onToken(text);
        }
        if (ev.id) meta.id = ev.id;
        if (ev.model) meta.model = ev.model;
        if (choice.finish_reason) meta.finishReason = choice.finish_reason;
        if (ev.usage) {
          meta.promptTokens = ev.usage.prompt_tokens;
          meta.completionTokens = ev.usage.completion_tokens;
          meta.totalTokens = ev.usage.total_tokens;
        }
      } catch {}
    }
  }

  return { ok: true, data: { text, ...meta } };
}

module.exports = { utils: { mistralRequest, mistralRequestStream } };
