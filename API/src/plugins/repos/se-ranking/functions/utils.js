const BASE_URL = "https://api.seranking.com";

async function readJsonResponse(res) {
  const text = res && typeof res.text === "function" ? await res.text() : "";
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function seRankingRequest(opts, method, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Clé API SE Ranking manquante." };

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers = {
    "authorization": `Token ${apiKey}`,
    "accept": "application/json"
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;
  if (body) headers["content-type"] = "application/json";

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const data = await readJsonResponse(res);
  if (!res.ok || (data && data.error)) {
    return {
      ok: false,
      error: (data && (data.message || data.error)) || `HTTP ${res.status}`,
      status: res.status,
      details: data
    };
  }
  return { ok: true, data };
}

function rows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data && data.data)) return data.data;
  if (Array.isArray(data && data.items)) return data.items;
  if (Array.isArray(data && data.results)) return data.results;
  return [];
}

function report(data) {
  const list = rows(data);
  return {
    totalCount: String((data && (data.total || data.total_count || data.count)) || list.length),
    rows: list.map((row) => ({ json: JSON.stringify(row) })),
    raw: JSON.stringify(data || {})
  };
}

module.exports = { utils: { seRankingRequest, rows, report } };
