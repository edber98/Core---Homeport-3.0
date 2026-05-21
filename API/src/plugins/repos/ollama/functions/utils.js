function parseJsonInput(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function compactJson(value) {
  if (value === undefined || value === null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseBoolean(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const v = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "oui", "on"].includes(v)) return true;
  if (["false", "0", "no", "non", "off"].includes(v)) return false;
  return undefined;
}

function parseKeepAlive(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

function parseNdjson(text) {
  const lines = String(text || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return null;
  const events = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch {
      return null;
    }
  }
  if (!events.length) return null;
  return { events, last: events[events.length - 1] };
}

async function ollamaRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const baseUrl = String(credentials.baseUrl || "http://localhost:11434").replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, error: "URL de base Ollama manquante." };

  const url = new URL(path.startsWith("http") ? path : `${baseUrl}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null && item !== "") url.searchParams.append(key, String(item));
        }
      } else if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (credentials.apiKey) headers.Authorization = `Bearer ${credentials.apiKey}`;

  let body;
  if (options.rawBody !== undefined) body = options.rawBody;
  else if (options.body !== undefined) body = JSON.stringify(options.body);

  let res;
  try {
    res = await fetch(url, { method: options.method || "GET", headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const responseType = options.responseType || "json";
  if (responseType === "arrayBuffer") {
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!res.ok) return { ok: false, error: buffer.toString("utf8") || `HTTP ${res.status}`, status: res.status };
    return { ok: true, status: res.status, data: buffer, headers: res.headers };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = parseNdjson(text) || text;
    }
  }

  if (!res.ok) {
    const ref = data && data.last ? data.last : data;
    const message = ref?.error || ref?.message || `HTTP ${res.status}`;
    return { ok: false, error: message, status: res.status, details: data };
  }

  return { ok: true, status: res.status, data, headers: res.headers };
}

function normalizeListItem(item) {
  const row = item || {};
  const name = row.name || row.model || "";
  const modelRef = row.model || name;
  const family = row.details?.family || row.details?.parameter_size || "";
  return {
    id: row.digest || modelRef || name,
    name: name || modelRef,
    status: family || "",
    url: name ? `https://ollama.com/library/${encodeURIComponent(String(name).split(":")[0])}` : "",
    size: Number(row.size || row.size_vram || 0) || 0,
    modified_at: row.modified_at || row.expires_at || "",
    result_json: compactJson(row)
  };
}

module.exports = {
  utils: {
    parseJsonInput,
    compactJson,
    parseBoolean,
    parseKeepAlive,
    ollamaRequest,
    normalizeListItem
  }
};
