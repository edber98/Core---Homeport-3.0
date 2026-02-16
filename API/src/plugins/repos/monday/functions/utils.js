async function mondayRequest(opts, query, variables = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiToken = credentials.apiToken;
  if (!apiToken) return { ok: false, error: "Missing Monday.com API token." };

  const url = "https://api.monday.com/v2";
  const headers = {
    "Authorization": apiToken,
    "Content-Type": "application/json",
    "API-Version": "2024-10"
  };

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables })
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    return { ok: false, error: data?.error_message || `HTTP ${res.status}`, status: res.status, details: data };
  }
  if (data && data.errors && data.errors.length > 0) {
    return { ok: false, error: data.errors[0].message, details: data.errors };
  }
  return { ok: true, data: data?.data || data };
}

module.exports = { utils: { mondayRequest } };
