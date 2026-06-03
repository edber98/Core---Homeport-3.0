function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
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

function maybe(value) {
  if (value === undefined || value === null || value === "") return undefined;
  return value;
}

function cleanObj(obj) {
  const out = {};
  for (const [k, v] of Object.entries(asObject(obj))) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

function authHeader(credentials) {
  const apiKey = clean(credentials.apiKey);
  if (!apiKey) throw new Error("apiKey Fullstory manquante.");
  if (/^Basic\s+/i.test(apiKey)) return apiKey;
  return `Basic ${apiKey}`;
}

async function requestFullstory(opts, path, options = {}) {
  const credentials = asObject(opts && opts.credentials);
  const baseUrl = clean(credentials.baseUrl || "https://api.fullstory.com").replace(/\/+$/, "");
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  const query = cleanObj(options.query);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));

  const headers = {
    Authorization: authHeader(credentials),
    ...(options.headers || {})
  };

  const hasBody = options.body !== undefined;
  if (hasBody) headers["Content-Type"] = options.contentType || "application/json";

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: hasBody
        ? (headers["Content-Type"] === "application/json" && typeof options.body !== "string"
          ? JSON.stringify(options.body)
          : String(options.body))
        : undefined
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
      error: data?.message || data?.error || data?.detail || `HTTP ${res.status}`,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

function ok(res, message, extra = {}) {
  return { ok: true, status: res.status, message, raw: res.data || null, ...extra };
}

function requireField(d, key, label) {
  const value = clean(d[key]);
  if (!value) throw new Error(`${label || key} requis.`);
  return value;
}

function getBody(d, keyLabel) {
  return parseJsonInput(d.body, keyLabel || "body", undefined);
}

async function run(key, inputs, opts) {
  const d = asObject(inputs);

  try {
    if (key === "fullstory_user_list") {
      const query = cleanObj({
        limit: maybe(d.limit || d.pageSize),
        page_token: maybe(d.pageToken),
        uid: maybe(d.uid),
        email: maybe(d.email),
        q: maybe(d.search)
      });
      const res = await requestFullstory(opts, "/v2/users", { method: "GET", query });
      if (!res.ok) return res;
      const items = Array.isArray(res.data?.users) ? res.data.users : (Array.isArray(res.data) ? res.data : []);
      return ok(res, "Utilisateurs récupérés.", { items, totalCount: items.length, nextCursor: res.data?.next_page_token || null });
    }

    if (key === "fullstory_user_get") {
      const id = requireField(d, "id", "id");
      const res = await requestFullstory(opts, `/v2/users/${encodeURIComponent(id)}`, { method: "GET" });
      if (!res.ok) return res;
      const user = asObject(res.data);
      return ok(res, "Utilisateur récupéré.", { id: user.id || id, name: user.display_name || user.name || "", raw: user });
    }

    if (key === "fullstory_user_create") {
      const body = getBody(d, "body") || cleanObj({
        uid: maybe(d.uid),
        email: maybe(d.email),
        display_name: maybe(d.display_name),
        properties: parseJsonInput(d.properties, "properties", undefined),
        schema: parseJsonInput(d.schema, "schema", undefined)
      });
      const res = await requestFullstory(opts, "/v2/users", { method: "POST", body });
      if (!res.ok) return res;
      return ok(res, "Utilisateur créé ou mis à jour.");
    }

    if (key === "fullstory_user_update") {
      const id = requireField(d, "id", "id");
      const body = getBody(d, "body") || cleanObj({
        email: maybe(d.email),
        display_name: maybe(d.display_name),
        properties: parseJsonInput(d.properties, "properties", undefined),
        schema: parseJsonInput(d.schema, "schema", undefined)
      });
      const res = await requestFullstory(opts, `/v2/users/${encodeURIComponent(id)}`, { method: "PATCH", body });
      if (!res.ok) return res;
      return ok(res, "Utilisateur mis à jour.");
    }

    if (key === "fullstory_user_delete") {
      const id = requireField(d, "id", "id");
      const res = await requestFullstory(opts, `/v2/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) return res;
      return ok(res, "Utilisateur supprimé.", { id });
    }

    if (key === "fullstory_user_delete_by_uid") {
      const uid = requireField(d, "uid", "uid");
      const res = await requestFullstory(opts, "/v2/users", { method: "DELETE", query: { uid } });
      if (!res.ok) return res;
      return ok(res, "Utilisateur supprimé par UID.", { distinct_id: uid });
    }

    if (key === "fullstory_user_batch_create") {
      const requests = parseJsonInput(d.requests, "requests", null);
      if (!Array.isArray(requests) || !requests.length) return { ok: false, error: "requests doit être un tableau non vide." };
      const res = await requestFullstory(opts, "/v2/users/batch", { method: "POST", body: { requests } });
      if (!res.ok) return res;
      return ok(res, "Import utilisateurs lancé.", { sent_count: requests.length });
    }

    if (key === "fullstory_user_batch_status") {
      const jobId = requireField(d, "job_id", "job_id");
      const res = await requestFullstory(opts, `/v2/users/batch/${encodeURIComponent(jobId)}`, { method: "GET" });
      if (!res.ok) return res;
      return ok(res, "Statut lot utilisateurs récupéré.");
    }

    if (key === "fullstory_user_batch_imports") {
      const jobId = requireField(d, "job_id", "job_id");
      const res = await requestFullstory(opts, `/v2/users/batch/${encodeURIComponent(jobId)}/imports`, { method: "GET" });
      if (!res.ok) return res;
      const items = Array.isArray(res.data?.imports) ? res.data.imports : (Array.isArray(res.data) ? res.data : []);
      return ok(res, "Imports utilisateurs récupérés.", { items, totalCount: items.length });
    }

    if (key === "fullstory_user_batch_errors") {
      const jobId = requireField(d, "job_id", "job_id");
      const res = await requestFullstory(opts, `/v2/users/batch/${encodeURIComponent(jobId)}/errors`, { method: "GET" });
      if (!res.ok) return res;
      const items = Array.isArray(res.data?.errors) ? res.data.errors : (Array.isArray(res.data) ? res.data : []);
      return ok(res, "Erreurs utilisateurs récupérées.", { items, totalCount: items.length });
    }

    if (key === "fullstory_user_stream_create") {
      const body = cleanObj({
        uid: maybe(d.uid),
        display_name: maybe(d.display_name),
        email: maybe(d.email),
        properties: parseJsonInput(d.properties, "properties", undefined),
        schema: parseJsonInput(d.schema, "schema", undefined)
      });
      const res = await requestFullstory(opts, "/v2/users/stream", { method: "POST", body });
      if (!res.ok) return res;
      return ok(res, "Import stream utilisateur lancé.");
    }

    if (key === "fullstory_event_create") {
      const event = parseJsonInput(d.event, "event", undefined);
      const body = event || getBody(d, "body");
      if (!body || typeof body !== "object") return { ok: false, error: "event ou body JSON requis." };
      const res = await requestFullstory(opts, "/v2/events", { method: "POST", body });
      if (!res.ok) return res;
      return ok(res, "Événement créé.");
    }

    if (key === "fullstory_event_batch_create") {
      const requests = parseJsonInput(d.requests, "requests", null);
      if (!Array.isArray(requests) || !requests.length) return { ok: false, error: "requests doit être un tableau non vide." };
      const res = await requestFullstory(opts, "/v2/events/batch", { method: "POST", body: { requests } });
      if (!res.ok) return res;
      return ok(res, "Import événements lancé.", { sent_count: requests.length });
    }

    if (key === "fullstory_event_batch_status") {
      const jobId = requireField(d, "job_id", "job_id");
      const res = await requestFullstory(opts, `/v2/events/batch/${encodeURIComponent(jobId)}`, { method: "GET" });
      if (!res.ok) return res;
      return ok(res, "Statut lot événements récupéré.");
    }

    if (key === "fullstory_event_batch_imports") {
      const jobId = requireField(d, "job_id", "job_id");
      const res = await requestFullstory(opts, `/v2/events/batch/${encodeURIComponent(jobId)}/imports`, { method: "GET" });
      if (!res.ok) return res;
      const items = Array.isArray(res.data?.imports) ? res.data.imports : (Array.isArray(res.data) ? res.data : []);
      return ok(res, "Imports événements récupérés.", { items, totalCount: items.length });
    }

    if (key === "fullstory_event_batch_errors") {
      const jobId = requireField(d, "job_id", "job_id");
      const res = await requestFullstory(opts, `/v2/events/batch/${encodeURIComponent(jobId)}/errors`, { method: "GET" });
      if (!res.ok) return res;
      const items = Array.isArray(res.data?.errors) ? res.data.errors : (Array.isArray(res.data) ? res.data : []);
      return ok(res, "Erreurs événements récupérées.", { items, totalCount: items.length });
    }

    if (key === "fullstory_session_list") {
      const query = cleanObj({ uid: maybe(d.uid), email: maybe(d.email), limit: maybe(d.limit || d.pageSize) });
      const res = await requestFullstory(opts, "/v2/sessions", { method: "GET", query });
      if (!res.ok) return res;
      const items = Array.isArray(res.data?.sessions) ? res.data.sessions : (Array.isArray(res.data) ? res.data : []);
      return ok(res, "Sessions récupérées.", { items, totalCount: items.length });
    }

    if (key === "fullstory_session_get_events") {
      const sessionId = requireField(d, "session_id", "session_id");
      const query = cleanObj({ enable_event_cache: maybe(d.enable_event_cache) });
      const res = await requestFullstory(opts, `/v2/sessions/${encodeURIComponent(sessionId)}/events`, { method: "GET", query });
      if (!res.ok) return res;
      return ok(res, "Événements de session récupérés.");
    }

    if (key === "fullstory_session_generate_context") {
      const sessionId = requireField(d, "session_id", "session_id");
      const body = getBody(d, "body") || cleanObj({
        slice: parseJsonInput(d.slice, "slice", undefined),
        event_limit: maybe(d.event_limit),
        duration_limit_ms: maybe(d.duration_limit_ms),
        start_timestamp: maybe(d.start_timestamp)
      });
      const res = await requestFullstory(opts, `/v2/sessions/${encodeURIComponent(sessionId)}/context`, { method: "POST", body });
      if (!res.ok) return res;
      return ok(res, "Contexte de session généré.");
    }

    if (key === "fullstory_session_generate_summary") {
      const sessionId = requireField(d, "session_id", "session_id");
      const body = getBody(d, "body") || cleanObj({
        profile_id: maybe(d.profile_id),
        profile: parseJsonInput(d.profile, "profile", undefined),
        override: parseJsonInput(d.override, "override", undefined)
      });
      const res = await requestFullstory(opts, `/v2/sessions/${encodeURIComponent(sessionId)}/summary`, { method: "POST", body });
      if (!res.ok) return res;
      return ok(res, "Résumé de session généré.");
    }

    if (key === "fullstory_user_events_export") {
      const uid = requireField(d, "uid", "uid");
      const res = await requestFullstory(opts, "/api/v1/export/userEvents", { method: "GET", query: { uid } });
      if (!res.ok) return res;
      return ok(res, "Export user events récupéré.");
    }

    if (key === "fullstory_user_pages_export") {
      const uid = requireField(d, "uid", "uid");
      const res = await requestFullstory(opts, "/api/v1/export/userPages", { method: "GET", query: { uid } });
      if (!res.ok) return res;
      return ok(res, "Export user pages récupéré.");
    }

    if (key === "fullstory_api_request") {
      const method = clean(d.method || "GET").toUpperCase();
      const reqPath = clean(d.path);
      if (!reqPath) return { ok: false, error: "path requis." };
      const query = parseJsonInput(d.query, "query", {});
      const headers = parseJsonInput(d.headers, "headers", {});
      const body = d.body_text ? String(d.body_text) : parseJsonInput(d.body, "body", undefined);
      const contentType = d.body_text ? "text/plain" : undefined;
      const res = await requestFullstory(opts, reqPath, { method, query, headers, body, contentType });
      if (!res.ok) return res;
      return ok(res, "Appel API exécuté.");
    }

    return { ok: false, error: "Action inconnue." };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run } };
