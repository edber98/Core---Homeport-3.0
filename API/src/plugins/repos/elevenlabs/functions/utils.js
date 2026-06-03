async function elevenlabsRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Clé API manquante." };
  const baseUrl = String(credentials.baseUrl || "https://api.elevenlabs.io/v1").replace(/\/+$/, "");
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
    "xi-api-key": `${apiKey}`,
    "Content-Type": "application/json",
    
    ...(options.headers || {})
  };
  let body;
  if (options.formData) {
    body = options.formData;
    delete headers["Content-Type"];
  } else if (options.rawBody !== undefined) body = options.rawBody;
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
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const message = data?.error?.message || data?.message || data?.error || `HTTP ${res.status}`;
    return { ok: false, error: message, status: res.status, details: data };
  }
  return { ok: true, status: res.status, data, headers: res.headers };
}

function parseJsonInput(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { throw new Error(`JSON invalide dans ${label}.`); }
}

function compactJson(value) {
  if (value === undefined || value === null) return "";
  try { return JSON.stringify(value); } catch { return String(value); }
}

function firstTextFromChoices(data) {
  const choice = Array.isArray(data?.choices) ? data.choices[0] : null;
  return choice?.message?.content || choice?.text || "";
}

module.exports = { utils: { elevenlabsRequest, parseJsonInput, compactJson, firstTextFromChoices } };
