const BASE_URLS = {
  siteExplorer: "https://api.ahrefs.com/v3/site-explorer",
  keywordsExplorer: "https://api.ahrefs.com/v3/keywords-explorer",
  subscriptionInfo: "https://api.ahrefs.com/v3/subscription-info"
};

async function readJsonResponse(res) {
  const text = res && typeof res.text === "function" ? await res.text() : "";
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function ahrefsRequest(opts, baseKey, path, query = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Clé API Ahrefs manquante." };

  const baseUrl = BASE_URLS[baseKey] || BASE_URLS.siteExplorer;
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  let res;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "authorization": `Bearer ${apiKey}`,
        "accept": "application/json"
      }
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const data = await readJsonResponse(res);
  if (!res.ok) {
    return {
      ok: false,
      error: (data && (data.error || data.message || data.title)) || `HTTP ${res.status}`,
      status: res.status,
      details: data
    };
  }
  return { ok: true, data };
}

function rows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data && data.rows)) return data.rows;
  if (Array.isArray(data && data.items)) return data.items;
  if (Array.isArray(data && data.data)) return data.data;
  return [];
}

function first(data) {
  const list = rows(data);
  return list[0] || (data && typeof data === "object" ? data : {});
}

function report(data) {
  const list = rows(data);
  return {
    totalCount: String((data && (data.total || data.total_count)) || list.length),
    rows: list.map((row) => ({ json: JSON.stringify(row) })),
    raw: JSON.stringify(data || {})
  };
}

module.exports = { utils: { ahrefsRequest, rows, first, report } };
