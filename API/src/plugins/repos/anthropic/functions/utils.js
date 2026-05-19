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
    ...(options.headers || {})
  };
  if (!options.rawBody) headers["Content-Type"] = headers["Content-Type"] || "application/json";
  if (options.beta) headers["anthropic-beta"] = options.beta;
  const method = options.method || "GET";
  const body = options.rawBody !== undefined ? options.rawBody : (options.body ? JSON.stringify(options.body) : undefined);

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
  return { ok: true, status: res.status, data, headers: res.headers };
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

  if (!res.body || typeof res.body.getReader !== "function") {
    const rawText = await res.text();
    let data = null;
    if (rawText) {
      try { data = JSON.parse(rawText); } catch { data = rawText; }
    }
    return { ok: true, data: normalizeMessageResponse(data) };
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

function parseJsonInput(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((block) => block && block.type === "text")
    .map((block) => block.text || "")
    .join("");
}

function normalizeMessageResponse(data) {
  const r = data && typeof data === "object" ? data : {};
  const content = Array.isArray(r.content) ? r.content : [];
  const toolCalls = content
    .filter((block) => block && block.type === "tool_use")
    .map((block) => ({ id: block.id, name: block.name, input: block.input || {} }));
  return {
    id: r.id,
    model: r.model,
    role: r.role,
    text: textFromContent(content),
    toolCalls,
    stopReason: r.stop_reason,
    inputTokens: r.usage && r.usage.input_tokens,
    outputTokens: r.usage && r.usage.output_tokens
  };
}

function mapBatch(batch) {
  const b = batch || {};
  const counts = b.request_counts || {};
  return {
    id: b.id || "",
    type: b.type || "",
    processingStatus: b.processing_status || "",
    createdAt: b.created_at || "",
    endedAt: b.ended_at || "",
    expiresAt: b.expires_at || "",
    cancelInitiatedAt: b.cancel_initiated_at || "",
    resultsUrl: b.results_url || "",
    processingCount: counts.processing || 0,
    succeededCount: counts.succeeded || 0,
    erroredCount: counts.errored || 0,
    canceledCount: counts.canceled || 0,
    expiredCount: counts.expired || 0
  };
}

function mapFile(file) {
  const f = file || {};
  return {
    id: f.id || "",
    type: f.type || "",
    filename: f.filename || "",
    mimeType: f.mime_type || "",
    sizeBytes: f.size_bytes || 0,
    createdAt: f.created_at || "",
    downloadable: Boolean(f.downloadable)
  };
}

function parseJsonLines(value) {
  const text = typeof value === "string" ? value : "";
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return { raw: line }; }
    });
}

async function resolveFileBuffer(value, opts) {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value && typeof value === "object" && (value._type === "fileRef" || value.fileId)) {
    if (!opts || !opts.files) throw new Error("Service de fichiers indisponible.");
    return opts.files.resolveAsBuffer(value);
  }
  if (typeof value === "string" && /^https?:\/\//i.test(value) && opts && opts.files) {
    return opts.files.resolveAsBuffer(value);
  }
  if (typeof value === "string" && value.startsWith("data:")) {
    return Buffer.from(value.split(",")[1] || "", "base64");
  }
  if (typeof value === "string" && /^[A-Za-z0-9+/=\s]+$/.test(value) && value.replace(/\s+/g, "").length > 100) {
    return Buffer.from(value.replace(/\s+/g, ""), "base64");
  }
  return Buffer.from(String(value));
}

function multipartFileBody({ fieldName, filename, mimeType, buffer }) {
  const boundary = `----homeport-anthropic-${Date.now().toString(16)}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
    "utf8"
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return { boundary, body: Buffer.concat([head, buffer, tail]) };
}

module.exports = {
  utils: {
    anthropicRequest,
    anthropicRequestStream,
    parseJsonInput,
    normalizeMessageResponse,
    mapBatch,
    mapFile,
    parseJsonLines,
    resolveFileBuffer,
    multipartFileBody
  }
};
