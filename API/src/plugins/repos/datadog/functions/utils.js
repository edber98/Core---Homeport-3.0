function credentials(opts) {
  const c = (opts && opts.credentials) || {};
  const apiKey = String(c.apiKey || "").trim();
  const appKey = String(c.appKey || "").trim();
  if (!apiKey) return { ok: false, error: "Clé API Datadog requise." };
  const siteUrl = String(c.siteUrl || "https://api.datadoghq.com").replace(/\/+$/, "");
  return { ok: true, apiKey, appKey, siteUrl };
}

async function datadogRequest(opts, path, options = {}) {
  const auth = credentials(opts);
  if (!auth.ok) return auth;
  if (options.requireAppKey !== false && !auth.appKey) {
    return { ok: false, error: "Clé d'application Datadog requise." };
  }

  const url = new URL(`${auth.siteUrl}${path}`);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers = {
    "DD-API-KEY": auth.apiKey,
    "Accept": "application/json",
    "Content-Type": "application/json"
  };
  if (auth.appKey) headers["DD-APPLICATION-KEY"] = auth.appKey;

  const fetchOptions = { method: options.method || "GET", headers };
  if (options.body !== undefined) fetchOptions.body = JSON.stringify(options.body);

  let res;
  try {
    res = await fetch(url, fetchOptions);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text().catch(() => "");
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data?.errors?.join(", ") || data?.error || data?.message || `Erreur Datadog ${res.status}`,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

function parseJson(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function compact(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (value !== undefined && value !== null && value !== "") out[key] = value;
  }
  return out;
}

function splitCsv(value) {
  if (Array.isArray(value)) return value;
  if (!value) return undefined;
  return String(value).split(",").map((v) => v.trim()).filter(Boolean);
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function boolValue(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

function monitorSummary(monitor) {
  return {
    id: monitor?.id,
    name: monitor?.name,
    type: monitor?.type,
    query: monitor?.query,
    message: monitor?.message,
    overall_state: monitor?.overall_state,
    tags: monitor?.tags || [],
    raw: monitor
  };
}

function monitorResult(data) {
  const monitor = data?.monitor || data || {};
  return { ok: true, ...monitorSummary(monitor), raw: data };
}

function monitorsResult(data) {
  const raw = Array.isArray(data) ? data : Array.isArray(data?.monitors) ? data.monitors : [];
  const monitors = raw.map(monitorSummary);
  return { ok: true, totalCount: monitors.length, monitors, raw: data };
}

function dashboardSummary(dashboard) {
  return {
    id: dashboard?.id,
    title: dashboard?.title,
    description: dashboard?.description,
    layout_type: dashboard?.layout_type,
    url: dashboard?.url,
    raw: dashboard
  };
}

module.exports = {
  utils: {
    datadogRequest,
    parseJson,
    compact,
    splitCsv,
    toNumber,
    boolValue,
    monitorResult,
    monitorsResult,
    dashboardSummary
  }
};
