async function calendlyRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const accessToken = credentials.personalAccessToken;
  if (!accessToken) return { ok: false, error: "Missing Calendly personal access token." };

  const url = new URL(`https://api.calendly.com${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    "Authorization": `Bearer ${accessToken}`,
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

async function getMyUserUri(opts) {
  const res = await calendlyRequest(opts, "/users/me");
  if (!res.ok) return null;
  return res.data?.resource?.uri || null;
}

function buildBodyFromFields(rows) {
  const body = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(row && row.fieldKey || '').trim();
    if (!key) continue;
    let value = row.fieldValue;
    switch (row.fieldType || 'string') {
      case 'number': value = Number(value); if (Number.isNaN(value)) return { ok: false, error: `Nombre invalide pour ${key}.` }; break;
      case 'boolean': value = value === true || String(value).toLowerCase() === 'true'; break;
      case 'json': try { value = JSON.parse(String(value || 'null')); } catch { return { ok: false, error: `JSON invalide pour ${key}.` }; } break;
      case 'null': value = null; break;
      default: value = value == null ? '' : String(value);
    }
    body[key] = value;
  }
  return { ok: true, body: Object.keys(body).length ? body : undefined };
}

module.exports = { utils: { calendlyRequest, getMyUserUri, buildBodyFromFields } };
