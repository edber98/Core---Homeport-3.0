async function linearQuery(opts, query, variables = {}) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = credentials.apiKey;
  if (!apiKey) return { ok: false, error: "Missing Linear API key." };

  const headers = {
    "Authorization": apiKey,
    "Content-Type": "application/json"
  };

  let res;
  try {
    res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables })
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let json = null;
  if (text) {
    try { json = JSON.parse(text); } catch { json = text; }
  }

  if (!res.ok) {
    const errMsg = (json && json.errors && json.errors[0]) ? json.errors[0].message : `HTTP ${res.status}`;
    return { ok: false, error: errMsg, status: res.status, details: json };
  }

  if (json && json.errors && json.errors.length > 0) {
    return { ok: false, error: json.errors[0].message, details: json.errors };
  }

  return { ok: true, data: json ? json.data : null };
}

module.exports = { utils: { linearQuery } };
