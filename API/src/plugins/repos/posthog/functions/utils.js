function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function parseJsonInput(value, label, options = {}) {
  const { defaultValue = undefined, allowArray = true, allowObject = true } = options;
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      if (!allowArray) throw new Error(`JSON invalide dans ${label}: tableau non autorise.`);
      return value;
    }
    if (!allowObject) throw new Error(`JSON invalide dans ${label}: objet non autorise.`);
    return value;
  }
  try {
    const parsed = JSON.parse(String(value));
    if (Array.isArray(parsed) && !allowArray) throw new Error(`JSON invalide dans ${label}: tableau non autorise.`);
    if (!Array.isArray(parsed) && (!parsed || typeof parsed !== "object") && allowObject) throw new Error(`JSON invalide dans ${label}: objet attendu.`);
    return parsed;
  } catch (e) {
    if (/JSON invalide/.test(String(e && e.message))) throw e;
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return !!fallback;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "oui", "on"].includes(s)) return true;
  if (["0", "false", "no", "non", "off"].includes(s)) return false;
  return !!fallback;
}

function normalizeBase(url, fallback) {
  const raw = String(url || fallback || "").trim();
  return raw.replace(/\/+$/, "");
}

function collectQuery(query) {
  const out = {};
  for (const [k, v] of Object.entries(asObject(query))) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

async function requestJson(url, options = {}) {
  const method = options.method || "GET";
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const body = options.body !== undefined ? JSON.stringify(options.body) : undefined;

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
    const err = data?.detail || data?.message || data?.error || (Array.isArray(data?.errors) ? data.errors[0] : null) || `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: String(err), details: data };
  }

  return { ok: true, status: res.status, data };
}

async function posthogPublicRequest(opts, path, options = {}) {
  const credentials = asObject(opts && opts.credentials);
  const host = normalizeBase(credentials.ingestHost, "https://us.i.posthog.com");
  const url = new URL(`${host}${path.startsWith("/") ? path : `/${path}`}`);
  const query = collectQuery(options.query);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  return requestJson(url, { method: options.method || "POST", body: options.body, headers: options.headers });
}

async function posthogPrivateRequest(opts, path, options = {}) {
  const credentials = asObject(opts && opts.credentials);
  const personalApiKey = String(credentials.personalApiKey || "").trim();
  if (!personalApiKey) return { ok: false, error: "Clé API personnelle PostHog manquante." };

  const host = normalizeBase(credentials.appHost, "https://us.posthog.com");
  const url = new URL(`${host}${path.startsWith("/") ? path : `/${path}`}`);
  const query = collectQuery(options.query);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));

  return requestJson(url, {
    method: options.method || "GET",
    body: options.body,
    headers: {
      "Authorization": `Bearer ${personalApiKey}`,
      ...(options.headers || {})
    }
  });
}

function getProjectToken(opts) {
  const credentials = asObject(opts && opts.credentials);
  const token = String(credentials.projectToken || "").trim();
  if (!token) throw new Error("Token projet PostHog manquant.");
  return token;
}

function getProjectId(input) {
  const projectId = String((input && input.projectId) || "").trim();
  if (!projectId) throw new Error("projectId requis.");
  return projectId;
}

function mapFeatureFlag(r) {
  const x = asObject(r);
  return {
    id: x.id,
    key: x.key || "",
    name: x.name || "",
    active: !!x.active,
    deleted: !!x.deleted,
    rollout_percentage: x.rollout_percentage ?? null,
    created_at: x.created_at || "",
    updated_at: x.updated_at || "",
    raw: x
  };
}

function mapCohort(r) {
  const x = asObject(r);
  return {
    id: x.id,
    name: x.name || "",
    description: x.description || "",
    deleted: !!x.deleted,
    is_static: !!x.is_static,
    count: Number(x.count || 0),
    created_at: x.created_at || "",
    raw: x
  };
}

function mapPerson(r) {
  const x = asObject(r);
  const props = asObject(x.properties);
  const distinctIds = Array.isArray(x.distinct_ids) ? x.distinct_ids : [];
  return {
    id: x.id,
    distinct_id: x.distinct_id || distinctIds[0] || "",
    name: props.name || `${props.first_name || ""} ${props.last_name || ""}`.trim(),
    email: props.email || "",
    created_at: x.created_at || "",
    raw: x
  };
}

module.exports = {
  utils: {
    asObject,
    parseJsonInput,
    parseBoolean,
    posthogPublicRequest,
    posthogPrivateRequest,
    getProjectToken,
    getProjectId,
    mapFeatureFlag,
    mapCohort,
    mapPerson
  }
};
