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

function cleanObj(obj) {
  const out = {};
  for (const [k, v] of Object.entries(asObject(obj))) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

async function requestSnowflake(opts, path, options = {}) {
  const credentials = asObject(opts && opts.credentials);
  const baseUrl = clean(credentials.baseUrl || credentials.accountUrl || "").replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, error: "baseUrl (URL du compte Snowflake) requis." };

  const token = clean(credentials.token || credentials.apiKey || credentials.jwt);
  if (!token) return { ok: false, error: "token Snowflake requis." };

  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(cleanObj(options.query))) url.searchParams.set(k, String(v));

  const headers = {
    Authorization: /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`,
    Accept: "application/json",
    ...(options.headers || {})
  };

  const tokenType = clean(credentials.tokenType || "KEYPAIR_JWT");
  if (tokenType) headers["X-Snowflake-Authorization-Token-Type"] = tokenType;

  let body = undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
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
      error: data?.message || data?.error || data?.code || `HTTP ${res.status}`,
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

async function run(key, inputs, opts) {
  const d = asObject(inputs);

  try {
    if (key === "snowflake_statement_execute") {
      const statement = requireField(d, "statement");
      const body = cleanObj({
        statement,
        timeout: maybe(d.timeout),
        database: maybe(d.database),
        schema: maybe(d.schema),
        warehouse: maybe(d.warehouse),
        role: maybe(d.role),
        bindings: parseJsonInput(d.bindings, "bindings", undefined),
        parameters: parseJsonInput(d.parameters, "parameters", undefined)
      });
      const query = cleanObj({ async: d.async === true || d.async === "true" ? "true" : undefined });
      const res = await requestSnowflake(opts, "/api/v2/statements", { method: "POST", query, body });
      if (!res.ok) return res;
      return ok(res, "Requête SQL envoyée.", {
        statementHandle: res.data?.statementHandle || res.data?.statement_handle || "",
        statusText: res.data?.status || res.data?.message || ""
      });
    }

    if (key === "snowflake_statement_status") {
      const handle = requireField(d, "statement_handle");
      const query = cleanObj({ partition: maybe(d.partition) });
      const res = await requestSnowflake(opts, `/api/v2/statements/${encodeURIComponent(handle)}`, { method: "GET", query });
      if (!res.ok) return res;
      return ok(res, "Statut de requête récupéré.", {
        statementHandle: handle,
        statusText: res.data?.status || res.data?.statementStatusUrl || ""
      });
    }

    if (key === "snowflake_statement_result_partition") {
      const handle = requireField(d, "statement_handle");
      const query = cleanObj({ partition: maybe(d.partition) });
      const res = await requestSnowflake(opts, `/api/v2/statements/${encodeURIComponent(handle)}`, { method: "GET", query });
      if (!res.ok) return res;
      return ok(res, "Partition de résultat récupérée.", { statementHandle: handle });
    }

    if (key === "snowflake_statement_cancel") {
      const handle = requireField(d, "statement_handle");
      const res = await requestSnowflake(opts, `/api/v2/statements/${encodeURIComponent(handle)}/cancel`, { method: "POST" });
      if (!res.ok) return res;
      return ok(res, "Requête annulée.", { statementHandle: handle });
    }

    if (key === "snowflake_database_list") {
      const res = await requestSnowflake(opts, "/api/v2/databases", { method: "GET", query: cleanObj({ limit: maybe(d.limit) }) });
      if (!res.ok) return res;
      const items = Array.isArray(res.data && res.data.data) ? res.data.data : [];
      return ok(res, "Bases récupérées.", { items, totalCount: items.length });
    }

    if (key === "snowflake_database_get") {
      const name = requireField(d, "name");
      const res = await requestSnowflake(opts, "/api/v2/databases/" + encodeURIComponent(name), { method: "GET" });
      if (!res.ok) return res;
      return ok(res, "Base récupérée.", { id: name, name });
    }

    if (key === "snowflake_database_create") {
      const name = requireField(d, "name");
      const body = parseJsonInput(d.cancelRequest, "body", {});
      body.name = name;
      const res = await requestSnowflake(opts, "/api/v2/databases", { method: "POST", body });
      if (!res.ok) return res;
      return ok(res, "Base créée.", { id: name, name });
    }

    if (key === "snowflake_database_delete") {
      const name = requireField(d, "name");
      const res = await requestSnowflake(opts, "/api/v2/databases/" + encodeURIComponent(name), { method: "DELETE" });
      if (!res.ok) return res;
      return ok(res, "Base supprimée.", { id: name, name });
    }

    if (key === "snowflake_schema_list") {
      const database = requireField(d, "database");
      const res = await requestSnowflake(opts, "/api/v2/databases/" + encodeURIComponent(database) + "/schemas", { method: "GET", query: cleanObj({ limit: maybe(d.limit) }) });
      if (!res.ok) return res;
      const items = Array.isArray(res.data && res.data.data) ? res.data.data : [];
      return ok(res, "Schémas récupérés.", { items, totalCount: items.length });
    }

    if (key === "snowflake_schema_get") {
      const database = requireField(d, "database");
      const name = requireField(d, "name");
      const res = await requestSnowflake(opts, "/api/v2/databases/" + encodeURIComponent(database) + "/schemas/" + encodeURIComponent(name), { method: "GET" });
      if (!res.ok) return res;
      return ok(res, "Schéma récupéré.", { id: name, name });
    }

    if (key === "snowflake_schema_create") {
      const database = requireField(d, "database");
      const name = requireField(d, "name");
      const body = parseJsonInput(d.cancelRequest, "body", {});
      body.name = name;
      const res = await requestSnowflake(opts, "/api/v2/databases/" + encodeURIComponent(database) + "/schemas", { method: "POST", body });
      if (!res.ok) return res;
      return ok(res, "Schéma créé.", { id: name, name });
    }

    if (key === "snowflake_schema_delete") {
      const database = requireField(d, "database");
      const name = requireField(d, "name");
      const res = await requestSnowflake(opts, "/api/v2/databases/" + encodeURIComponent(database) + "/schemas/" + encodeURIComponent(name), { method: "DELETE" });
      if (!res.ok) return res;
      return ok(res, "Schéma supprimé.", { id: name, name });
    }

    if (key === "snowflake_table_list") {
      const database = requireField(d, "database");
      const schema = requireField(d, "schema");
      const res = await requestSnowflake(opts, "/api/v2/databases/" + encodeURIComponent(database) + "/schemas/" + encodeURIComponent(schema) + "/tables", { method: "GET", query: cleanObj({ limit: maybe(d.limit) }) });
      if (!res.ok) return res;
      const items = Array.isArray(res.data && res.data.data) ? res.data.data : [];
      return ok(res, "Tables récupérées.", { items, totalCount: items.length });
    }

    if (key === "snowflake_table_get") {
      const database = requireField(d, "database");
      const schema = requireField(d, "schema");
      const name = requireField(d, "name");
      const res = await requestSnowflake(opts, "/api/v2/databases/" + encodeURIComponent(database) + "/schemas/" + encodeURIComponent(schema) + "/tables/" + encodeURIComponent(name), { method: "GET" });
      if (!res.ok) return res;
      return ok(res, "Table récupérée.", { id: name, name });
    }

    if (key === "snowflake_table_create") {
      const database = requireField(d, "database");
      const schema = requireField(d, "schema");
      const name = requireField(d, "name");
      const body = parseJsonInput(d.cancelRequest, "body", {});
      body.name = name;
      const res = await requestSnowflake(opts, "/api/v2/databases/" + encodeURIComponent(database) + "/schemas/" + encodeURIComponent(schema) + "/tables", { method: "POST", body });
      if (!res.ok) return res;
      return ok(res, "Table créée.", { id: name, name });
    }

    if (key === "snowflake_table_delete") {
      const database = requireField(d, "database");
      const schema = requireField(d, "schema");
      const name = requireField(d, "name");
      const res = await requestSnowflake(opts, "/api/v2/databases/" + encodeURIComponent(database) + "/schemas/" + encodeURIComponent(schema) + "/tables/" + encodeURIComponent(name), { method: "DELETE" });
      if (!res.ok) return res;
      return ok(res, "Table supprimée.", { id: name, name });
    }

    if (key === "snowflake_warehouse_list") {
      const res = await requestSnowflake(opts, "/api/v2/warehouses", { method: "GET", query: cleanObj({ limit: maybe(d.limit) }) });
      if (!res.ok) return res;
      const items = Array.isArray(res.data && res.data.data) ? res.data.data : [];
      return ok(res, "Warehouses récupérés.", { items, totalCount: items.length });
    }

    if (key === "snowflake_warehouse_get") {
      const name = requireField(d, "name");
      const res = await requestSnowflake(opts, "/api/v2/warehouses/" + encodeURIComponent(name), { method: "GET" });
      if (!res.ok) return res;
      return ok(res, "Warehouse récupéré.", { id: name, name });
    }

    if (key === "snowflake_warehouse_create") {
      const name = requireField(d, "name");
      const body = parseJsonInput(d.cancelRequest, "body", {});
      body.name = name;
      const res = await requestSnowflake(opts, "/api/v2/warehouses", { method: "POST", body });
      if (!res.ok) return res;
      return ok(res, "Warehouse créé.", { id: name, name });
    }

    if (key === "snowflake_warehouse_update") {
      const name = requireField(d, "name");
      const body = parseJsonInput(d.cancelRequest, "body", {});
      const res = await requestSnowflake(opts, "/api/v2/warehouses/" + encodeURIComponent(name), { method: "PATCH", body });
      if (!res.ok) return res;
      return ok(res, "Warehouse mis à jour.", { id: name, name });
    }

    if (key === "snowflake_warehouse_delete") {
      const name = requireField(d, "name");
      const res = await requestSnowflake(opts, "/api/v2/warehouses/" + encodeURIComponent(name), { method: "DELETE" });
      if (!res.ok) return res;
      return ok(res, "Warehouse supprimé.", { id: name, name });
    }

    if (key === "snowflake_warehouse_suspend") {
      const name = requireField(d, "name");
      const res = await requestSnowflake(opts, "/api/v2/warehouses/" + encodeURIComponent(name) + ":suspend", { method: "POST" });
      if (!res.ok) return res;
      return ok(res, "Warehouse suspendu.", { id: name, name });
    }

    if (key === "snowflake_warehouse_resume") {
      const name = requireField(d, "name");
      const res = await requestSnowflake(opts, "/api/v2/warehouses/" + encodeURIComponent(name) + ":resume", { method: "POST" });
      if (!res.ok) return res;
      return ok(res, "Warehouse relancé.", { id: name, name });
    }

    if (key === "snowflake_api_request") {
      const method = clean(d.method || "GET").toUpperCase();
      const reqPath = clean(d.path);
      if (!reqPath) return { ok: false, error: "path requis." };
      const query = parseJsonInput(d.queryParameters, "queryParameters", {});
      const headers = parseJsonInput(d.requestHeaders, "requestHeaders", {});
      const body = d.cancelRequestText ? String(d.cancelRequestText) : parseJsonInput(d.requestBody, "requestBody", undefined);
      const res = await requestSnowflake(opts, reqPath, { method, query, headers, body });
      if (!res.ok) return res;
      return ok(res, "Appel API exécuté.");
    }

    return { ok: false, error: "Action inconnue." };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run } };
