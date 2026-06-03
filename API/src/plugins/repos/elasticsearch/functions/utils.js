function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function maybe(value) {
  return value === undefined || value === null || value === "" ? undefined : value;
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

function authHeader(credentials) {
  const apiKey = clean(credentials.apiKey);
  if (apiKey) return /^ApiKey\s+/i.test(apiKey) ? apiKey : `ApiKey ${apiKey}`;

  const bearer = clean(credentials.bearerToken || credentials.token);
  if (bearer) return /^Bearer\s+/i.test(bearer) ? bearer : `Bearer ${bearer}`;

  const user = clean(credentials.username || credentials.user);
  if (user) {
    const token = Buffer.from(`${user}:${clean(credentials.password)}`).toString("base64");
    return `Basic ${token}`;
  }

  return "";
}

async function requestElastic(opts, path, options = {}) {
  const credentials = asObject(opts && opts.credentials);
  const baseUrl = clean(credentials.baseUrl || "http://localhost:9200").replace(/\/+$/, "");
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

  const query = asObject(options.query);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const headers = {
    Accept: "application/json",
    ...(options.headers || {})
  };
  const authorization = authHeader(credentials);
  if (authorization) headers.Authorization = authorization;

  let body = undefined;
  if (options.body !== undefined) {
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    if (headers["Content-Type"] === "application/json" && typeof options.body !== "string") body = JSON.stringify(options.body);
    else body = String(options.body);
  }

  let res;
  try {
    res = await fetch(url, { method: options.method || "GET", headers, body });
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
      error: data?.error?.reason || data?.message || data?.error || `HTTP ${res.status}`,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

function ok(res, message, extra = {}) {
  return { ok: true, status: res.status, message, raw: res.data || null, ...extra };
}

function requireField(d, key) {
  const v = clean(d[key]);
  if (!v) throw new Error(`${key} requis.`);
  return v;
}

function bodyFromInputs(d) {
  const raw = parseJsonInput(d.body, "body", undefined);
  return raw !== undefined ? raw : undefined;
}

async function run(key, inputs, opts) {
  const d = asObject(inputs);

  try {
    if (key.startsWith("elasticsearch_index_")) {
      const index = requireField(d, "index");

      if (key === "elasticsearch_index_create") {
        const body = bodyFromInputs(d) || {};
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}`, { method: "PUT", body });
        if (!res.ok) return res;
        return ok(res, "Index créé.", { id: index, name: index });
      }

      if (key === "elasticsearch_index_get") {
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}`, { method: "GET" });
        if (!res.ok) return res;
        return ok(res, "Index récupéré.", { id: index, name: index });
      }

      if (key === "elasticsearch_index_delete") {
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}`, { method: "DELETE" });
        if (!res.ok) return res;
        return ok(res, "Index supprimé.", { id: index, name: index });
      }

      if (key === "elasticsearch_index_get_mapping") {
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}/_mapping`, { method: "GET" });
        if (!res.ok) return res;
        return ok(res, "Mapping récupéré.", { id: index, name: index });
      }

      if (key === "elasticsearch_index_update_mapping") {
        const body = bodyFromInputs(d) || {};
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}/_mapping`, { method: "PUT", body });
        if (!res.ok) return res;
        return ok(res, "Mapping mis à jour.", { id: index, name: index });
      }
    }

    if (key.startsWith("elasticsearch_document_")) {
      const index = requireField(d, "index");

      if (key === "elasticsearch_document_index") {
        const body = bodyFromInputs(d);
        if (!body || typeof body !== "object") return { ok: false, error: "body JSON requis." };
        const query = { refresh: maybe(d.refresh), routing: maybe(d.routing), pipeline: maybe(d.pipeline) };
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}/_doc`, { method: "POST", query, body });
        if (!res.ok) return res;
        return ok(res, "Document indexé.", { id: res.data?._id || "", name: index });
      }

      if (key === "elasticsearch_document_upsert") {
        const id = requireField(d, "id");
        const body = bodyFromInputs(d);
        if (!body || typeof body !== "object") return { ok: false, error: "body JSON requis." };
        const query = { refresh: maybe(d.refresh), routing: maybe(d.routing), pipeline: maybe(d.pipeline) };
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}/_doc/${encodeURIComponent(id)}`, { method: "PUT", query, body });
        if (!res.ok) return res;
        return ok(res, "Document créé/mis à jour.", { id, name: index });
      }

      if (key === "elasticsearch_document_get") {
        const id = requireField(d, "id");
        const query = { routing: maybe(d.routing) };
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}/_doc/${encodeURIComponent(id)}`, { method: "GET", query });
        if (!res.ok) return res;
        return ok(res, "Document récupéré.", { id, name: index });
      }

      if (key === "elasticsearch_document_update") {
        const id = requireField(d, "id");
        const body = bodyFromInputs(d);
        if (!body || typeof body !== "object") return { ok: false, error: "body JSON requis." };
        const query = { refresh: maybe(d.refresh), routing: maybe(d.routing) };
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}/_update/${encodeURIComponent(id)}`, { method: "POST", query, body });
        if (!res.ok) return res;
        return ok(res, "Document mis à jour.", { id, name: index });
      }

      if (key === "elasticsearch_document_delete") {
        const id = requireField(d, "id");
        const query = { refresh: maybe(d.refresh), routing: maybe(d.routing) };
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}/_doc/${encodeURIComponent(id)}`, { method: "DELETE", query });
        if (!res.ok) return res;
        return ok(res, "Document supprimé.", { id, name: index });
      }
    }

    if (key.startsWith("elasticsearch_search_")) {
      const index = key === "elasticsearch_search_bulk" ? clean(d.index) : requireField(d, "index");

      if (key === "elasticsearch_search_query") {
        const body = bodyFromInputs(d) || {};
        const query = { size: maybe(d.pageSize), from: maybe(d.from), q: maybe(d.search) };
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}/_search`, { method: "POST", query, body });
        if (!res.ok) return res;
        const hits = Array.isArray(res.data?.hits?.hits) ? res.data.hits.hits : [];
        const items = hits.map((h) => ({ id: h._id || "", name: h._index || index, raw: h }));
        return ok(res, "Recherche exécutée.", { items, totalCount: Number(res.data?.hits?.total?.value || hits.length) });
      }

      if (key === "elasticsearch_search_count") {
        const body = bodyFromInputs(d);
        const query = { q: maybe(d.search) };
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}/_count`, { method: body ? "POST" : "GET", query, body });
        if (!res.ok) return res;
        return ok(res, "Comptage exécuté.", { count: Number(res.data?.count || 0) });
      }

      if (key === "elasticsearch_search_delete_by_query") {
        const body = bodyFromInputs(d);
        if (!body || typeof body !== "object") return { ok: false, error: "body JSON requis." };
        const query = { refresh: maybe(d.refresh), conflicts: maybe(d.conflicts) };
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}/_delete_by_query`, { method: "POST", query, body });
        if (!res.ok) return res;
        return ok(res, "Suppression par requête exécutée.", { affectedRows: Number(res.data?.deleted || 0) });
      }

      if (key === "elasticsearch_search_msearch") {
        const ndjson = clean(d.ndjson);
        if (!ndjson) return { ok: false, error: "ndjson requis." };
        const res = await requestElastic(opts, `/${encodeURIComponent(index)}/_msearch`, {
          method: "POST",
          headers: { "Content-Type": "application/x-ndjson" },
          body: ndjson.endsWith("\n") ? ndjson : `${ndjson}\n`
        });
        if (!res.ok) return res;
        const items = Array.isArray(res.data?.responses) ? res.data.responses : [];
        return ok(res, "Multi-search exécutée.", { items, totalCount: items.length });
      }

      if (key === "elasticsearch_search_bulk") {
        const ndjson = clean(d.ndjson);
        if (!ndjson) return { ok: false, error: "ndjson requis." };
        const res = await requestElastic(opts, "/_bulk", {
          method: "POST",
          headers: { "Content-Type": "application/x-ndjson" },
          body: ndjson.endsWith("\n") ? ndjson : `${ndjson}\n`
        });
        if (!res.ok) return res;
        return ok(res, "Bulk exécuté.", { sent_count: Array.isArray(res.data?.items) ? res.data.items.length : 0 });
      }
    }

    if (key === "elasticsearch_alias_get") {
      const name = clean(d.name);
      const reqPath = name ? "/_alias/" + encodeURIComponent(name) : "/_aliases";
      const res = await requestElastic(opts, reqPath, { method: "GET" });
      if (!res.ok) return res;
      return ok(res, "Aliases récupérés.");
    }

    if (key === "elasticsearch_alias_update") {
      const body = bodyFromInputs(d);
      if (!body || typeof body !== "object") return { ok: false, error: "body JSON requis." };
      const res = await requestElastic(opts, "/_aliases", { method: "POST", body });
      if (!res.ok) return res;
      return ok(res, "Aliases mis à jour.");
    }

    if (key === "elasticsearch_index_get_settings") {
      const index = requireField(d, "index");
      const res = await requestElastic(opts, "/" + encodeURIComponent(index) + "/_settings", { method: "GET" });
      if (!res.ok) return res;
      return ok(res, "Settings index récupérés.");
    }

    if (key === "elasticsearch_index_update_settings") {
      const index = requireField(d, "index");
      const body = bodyFromInputs(d);
      if (!body || typeof body !== "object") return { ok: false, error: "body JSON requis." };
      const res = await requestElastic(opts, "/" + encodeURIComponent(index) + "/_settings", { method: "PUT", body });
      if (!res.ok) return res;
      return ok(res, "Settings index mis à jour.");
    }

    if (key === "elasticsearch_search_update_by_query") {
      const index = requireField(d, "index");
      const body = bodyFromInputs(d);
      if (!body || typeof body !== "object") return { ok: false, error: "body JSON requis." };
      const query = { refresh: maybe(d.refresh), conflicts: maybe(d.conflicts) };
      const res = await requestElastic(opts, "/" + encodeURIComponent(index) + "/_update_by_query", { method: "POST", query, body });
      if (!res.ok) return res;
      return ok(res, "Update by query exécuté.", { affectedRows: Number(res.data && res.data.updated || 0) });
    }

    if (key === "elasticsearch_search_reindex") {
      const body = bodyFromInputs(d);
      if (!body || typeof body !== "object") return { ok: false, error: "body JSON requis." };
      const res = await requestElastic(opts, "/_reindex", { method: "POST", body });
      if (!res.ok) return res;
      return ok(res, "Reindex exécuté.");
    }

    if (key === "elasticsearch_api_request") {
      const method = clean(d.method || "GET").toUpperCase();
      const reqPath = clean(d.path);
      if (!reqPath) return { ok: false, error: "path requis." };
      const query = parseJsonInput(d.query, "query", {});
      const headers = parseJsonInput(d.headers, "headers", {});
      const body = d.body_text ? String(d.body_text) : parseJsonInput(d.body, "body", undefined);
      const res = await requestElastic(opts, reqPath, { method, query, headers, body });
      if (!res.ok) return res;
      return ok(res, "Appel API exécuté.");
    }

    return { ok: false, error: "Action inconnue." };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run } };
