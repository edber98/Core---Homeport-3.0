async function notionRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const integrationToken = credentials.integrationToken;
  if (!integrationToken) return { ok: false, error: "Missing Notion integration token." };

  const url = new URL(`https://api.notion.com/v1${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Authorization": `Bearer ${integrationToken}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
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

module.exports = { utils: { notionRequest } };
