function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function parseJsonInput(value, label) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function toPositiveInt(value, fallback, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return max ? Math.min(n, max) : n;
}

function mapState(state) {
  const s = state || {};
  return {
    entity_id: s.entity_id || "",
    state: s.state,
    last_changed: s.last_changed || "",
    last_updated: s.last_updated || "",
    attributes: s.attributes || {},
    context: s.context || {}
  };
}

function flattenHistory(data, limit) {
  const rows = Array.isArray(data) ? data : [];
  const changes = [];
  for (const series of rows) {
    const states = Array.isArray(series) ? series : [];
    for (const state of states) {
      changes.push(mapState(state));
      if (limit && changes.length >= limit) return changes;
    }
  }
  return changes;
}

function flattenServices(data, domainFilter) {
  const services = [];
  const domains = Array.isArray(data) ? data : [];
  const filter = String(domainFilter || "").trim().toLowerCase();
  for (const item of domains) {
    const domain = String(item.domain || "");
    if (filter && domain.toLowerCase() !== filter) continue;
    const rawServices = item.services || {};
    if (Array.isArray(rawServices)) {
      for (const service of rawServices) services.push({ domain, service: String(service), name: String(service), description: "", fields: {}, target: {} });
      continue;
    }
    for (const [service, definition] of Object.entries(rawServices)) {
      const d = definition || {};
      services.push({
        domain,
        service,
        name: d.name || service,
        description: d.description || "",
        fields: d.fields || {},
        target: d.target || {}
      });
    }
  }
  return services;
}

async function homeAssistantRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const baseUrl = normalizeBaseUrl(credentials.baseUrl);
  const accessToken = credentials.accessToken;
  if (!baseUrl) return { ok: false, error: "URL Home Assistant manquante." };
  if (!accessToken) return { ok: false, error: "Jeton d'accès Home Assistant manquant." };

  const url = new URL(`${baseUrl}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null || value === "" || value === false) continue;
      if (value === true) url.searchParams.append(key, "");
      else url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  let res;
  try {
    res = await fetch(url, { method: options.method || "GET", headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (options.rawResponse) {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: text || `HTTP ${res.status}`, status: res.status, details: text };
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      ok: true,
      status: res.status,
      data: buffer.toString("base64"),
      contentType: res.headers.get("content-type") || "",
      size: buffer.length
    };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    return {
      ok: false,
      error: data?.message || data?.error || (typeof data === "string" && data) || `HTTP ${res.status}`,
      status: res.status,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

module.exports = {
  utils: {
    homeAssistantRequest,
    parseJsonInput,
    toPositiveInt,
    mapState,
    flattenHistory,
    flattenServices
  }
};
