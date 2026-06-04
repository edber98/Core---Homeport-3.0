function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function parseJsonInput(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function cleanObj(obj) {
  const out = {};
  for (const [k, v] of Object.entries(asObject(obj))) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

async function requestHeap(opts, path, options = {}) {
  const credentials = asObject(opts && opts.credentials);
  const baseUrl = clean(credentials.baseUrl || "https://heapanalytics.com").replace(/\/+$/, "");
  const apiKey = clean(credentials.apiKey);

  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(cleanObj(options.query))) url.searchParams.set(k, String(v));

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "POST",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
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
    return {
      ok: false,
      status: res.status,
      error: data?.message || data?.error || `HTTP ${res.status}`,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

function result(res, message, extra = {}) {
  return {
    ok: true,
    status: res.status,
    message,
    raw: res.data || null,
    ...extra
  };
}

async function run(key, inputs, opts) {
  const d = asObject(inputs);
  const credentials = asObject(opts && opts.credentials);
  const appId = clean(credentials.appId);
  if (!appId) return { ok: false, error: "appId requis dans les identifiants Heap." };

  try {
    if (key === "heap_event_track") {
      const event = clean(d.event);
      if (!event) return { ok: false, error: "event requis." };
      const payload = {
        app_id: appId,
        event,
        identity: clean(d.identity) || undefined,
        user_id: clean(d.user_id) || undefined,
        session_id: clean(d.session_id) || undefined,
        timestamp: clean(d.timestamp) || undefined,
        idempotency_key: clean(d.idempotency_key) || undefined,
        properties: parseJsonInput(d.properties, "properties", undefined)
      };
      if (!payload.identity && !payload.user_id) return { ok: false, error: "identity ou user_id requis." };
      if (payload.identity && payload.user_id) return { ok: false, error: "identity et user_id ne peuvent pas être fournis ensemble." };
      const res = await requestHeap(opts, "/api/track", { method: "POST", body: cleanObj(payload) });
      if (!res.ok) return res;
      return result(res, "Événement envoyé.", { event, distinct_id: payload.identity || payload.user_id || "" });
    }

    if (key === "heap_event_bulk_track") {
      const events = parseJsonInput(d.events, "events", null);
      if (!Array.isArray(events) || !events.length) return { ok: false, error: "events doit être un tableau non vide." };
      const res = await requestHeap(opts, "/api/track", { method: "POST", body: { app_id: appId, events } });
      if (!res.ok) return res;
      return result(res, "Lot d’événements envoyé.", { sent_count: events.length });
    }

    if (key === "heap_user_add_properties") {
      const identity = clean(d.identity);
      if (!identity) return { ok: false, error: "identity requis." };
      const properties = parseJsonInput(d.properties, "properties", null);
      if (!properties || typeof properties !== "object" || Array.isArray(properties)) return { ok: false, error: "properties doit être un objet JSON." };
      const payload = cleanObj({ app_id: appId, identity, timestamp: clean(d.timestamp) || undefined, properties });
      const res = await requestHeap(opts, "/api/add_user_properties", { method: "POST", body: payload });
      if (!res.ok) return res;
      return result(res, "Propriétés utilisateur mises à jour.", { distinct_id: identity });
    }

    if (key === "heap_account_add_properties") {
      const identity = clean(d.identity);
      if (!identity) return { ok: false, error: "identity requis." };
      const properties = parseJsonInput(d.properties, "properties", null);
      if (!properties || typeof properties !== "object" || Array.isArray(properties)) return { ok: false, error: "properties doit être un objet JSON." };
      const payload = cleanObj({ app_id: appId, identity, timestamp: clean(d.timestamp) || undefined, properties });
      const res = await requestHeap(opts, "/api/add_account_properties", { method: "POST", body: payload });
      if (!res.ok) return res;
      return result(res, "Propriétés compte mises à jour.", { group_id: identity });
    }

    if (key === "heap_identity_identify") {
      const identity = clean(d.identity);
      const userId = clean(d.user_id);
      if (!identity || !userId) return { ok: false, error: "identity et user_id requis." };
      const payload = cleanObj({ app_id: appId, identity, user_id: userId, timestamp: clean(d.timestamp) || undefined });
      const res = await requestHeap(opts, "/api/v1/identify", { method: "POST", body: payload });
      if (!res.ok) return res;
      return result(res, "Identité associée.", { distinct_id: identity });
    }

    if (key === "heap_api_request") {
      const method = clean(d.method || "GET").toUpperCase();
      const reqPath = clean(d.path);
      if (!reqPath) return { ok: false, error: "path requis." };
      const query = parseJsonInput(d.queryParameters, "queryParameters", {});
      const headers = parseJsonInput(d.requestHeaders, "requestHeaders", {});
      const body = d.bodyText ? String(d.bodyText) : parseJsonInput(d.requestBody, "requestBody", undefined);
      const res = await requestHeap(opts, reqPath, { method, query, headers, body });
      if (!res.ok) return res;
      return result(res, "Appel API exécuté.");
    }

    return { ok: false, error: "Action inconnue." };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run } };
