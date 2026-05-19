function credentials(opts) {
  const creds = (opts && opts.credentials) || {};
  if (!creds.apiKey) return { ok: false, error: "Missing OpenAI apiKey in credentials" };
  return {
    ok: true,
    apiKey: creds.apiKey,
    baseUrl: String(creds.baseUrl || "https://api.openai.com/v1").replace(/\/$/, ""),
    organization: creds.organization ? String(creds.organization) : "",
    defaultModel: creds.defaultModel || "gpt-4o-mini"
  };
}

async function openaiRequest(opts, path, body) {
  const creds = credentials(opts);
  if (!creds.ok) return creds;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${creds.apiKey}`
  };
  if (creds.organization) headers["OpenAI-Organization"] = creds.organization;

  let res;
  try {
    res = await fetch(`${creds.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body || {})
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}`, status: res.status, details: data };
  return { ok: true, data };
}

function contentText(data) {
  const choice = (data && data.choices && data.choices[0]) || {};
  const message = choice.message || {};
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content.map((part) => part.text || part.content || "").filter(Boolean).join("");
  }
  return "";
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = { utils: { credentials, openaiRequest, contentText, parseJson } };
