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

async function requestClickHouse(opts, path, options = {}) {
  const credentials = asObject(opts && opts.credentials);
  const baseUrl = clean(credentials.baseUrl || "http://localhost:8123").replace(/\/+$/, "");
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

  const query = asObject(options.query);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const headers = {
    ...(options.headers || {})
  };

  const username = clean(credentials.username || credentials.user);
  const password = clean(credentials.password);
  if (username) {
    const token = Buffer.from(`${username}:${password}`).toString("base64");
    headers.Authorization = `Basic ${token}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method: options.method || "POST",
      headers,
      body: options.body
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
      error: data?.message || data?.error || (typeof data === "string" ? data : `HTTP ${res.status}`),
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

function ok(res, message, extra = {}) {
  return { ok: true, status: res.status, message, raw: res.data || null, ...extra };
}

function parseRowsFromJson(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.rows)) return data.rows;
  return [];
}

async function executeSql(opts, sql, database, format) {
  const query = {
    query: sql
  };
  if (database) query.database = database;
  if (format) query.default_format = format;
  return requestClickHouse(opts, "/", { method: "POST", query });
}

async function run(key, inputs, opts) {
  const d = asObject(inputs);

  try {
    if (key === "clickhouse_query_ping") {
      const res = await requestClickHouse(opts, "/ping", { method: "GET" });
      if (!res.ok) return res;
      return ok(res, "Connexion ClickHouse OK.", { message: typeof res.data === "string" ? res.data : "Ok." });
    }

    if (key === "clickhouse_query_select") {
      const sql = clean(d.query);
      if (!sql) return { ok: false, error: "query SQL requise." };
      const res = await executeSql(opts, sql, clean(d.database), clean(d.default_format || "JSON"));
      if (!res.ok) return res;
      const rows = parseRowsFromJson(res.data);
      return ok(res, "SELECT exécuté.", { rows, rowCount: rows.length });
    }

    if (key === "clickhouse_query_command") {
      const sql = clean(d.query);
      if (!sql) return { ok: false, error: "query SQL requise." };
      const res = await executeSql(opts, sql, clean(d.database), clean(d.default_format || "JSON"));
      if (!res.ok) return res;
      return ok(res, "Commande SQL exécutée.");
    }

    if (key === "clickhouse_query_insert_json_each_row") {
      const table = clean(d.table);
      if (!table) return { ok: false, error: "table requise." };
      const rows = parseJsonInput(d.rows, "rows", null);
      if (!Array.isArray(rows) || !rows.length) return { ok: false, error: "rows doit être un tableau non vide." };
      const payload = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
      const sql = `INSERT INTO ${table} FORMAT JSONEachRow`;
      const query = { query: sql };
      const database = clean(d.database);
      if (database) query.database = database;
      const res = await requestClickHouse(opts, "/", {
        method: "POST",
        query,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: payload
      });
      if (!res.ok) return res;
      return ok(res, "Lignes insérées.", { affectedRows: rows.length });
    }

    if (key === "clickhouse_query_list_tables") {
      const database = clean(d.database || "default");
      const sql = `SHOW TABLES FROM ${database}`;
      const res = await executeSql(opts, sql, database, "JSON");
      if (!res.ok) return res;
      const rows = parseRowsFromJson(res.data);
      const items = rows.map((r) => ({ id: r.name || r.table || Object.values(r)[0] || "", name: r.name || r.table || Object.values(r)[0] || "", raw: r }));
      return ok(res, "Tables récupérées.", { items, totalCount: items.length });
    }

    if (key === "clickhouse_query_list_databases") {
      const sql = "SHOW DATABASES";
      const res = await executeSql(opts, sql, "", "JSON");
      if (!res.ok) return res;
      const rows = parseRowsFromJson(res.data);
      const items = rows.map((r) => ({ id: r.name || r.database || Object.values(r)[0] || "", name: r.name || r.database || Object.values(r)[0] || "", raw: r }));
      return ok(res, "Bases récupérées.", { items, totalCount: items.length });
    }

    if (key === "clickhouse_query_describe_table") {
      const table = clean(d.table);
      if (!table) return { ok: false, error: "table requise." };
      const database = clean(d.database || "default");
      const sql = `DESCRIBE TABLE ${table}`;
      const res = await executeSql(opts, sql, database, "JSON");
      if (!res.ok) return res;
      const rows = parseRowsFromJson(res.data);
      return ok(res, "Description de table récupérée.", { columns: rows, totalCount: rows.length });
    }

    if (key === "clickhouse_api_request") {
      const method = clean(d.method || "GET").toUpperCase();
      const reqPath = clean(d.path);
      if (!reqPath) return { ok: false, error: "path requis." };
      const query = buildObjectFromFields(d.queryFields) || {};
      const headers = buildObjectFromFields(d.headerFields) || {};
      const builtBody = buildObjectFromFields(d.requestFields);
      const body = d.body_text ? String(d.body_text) : (builtBody === undefined ? undefined : JSON.stringify(builtBody));
      const res = await requestClickHouse(opts, reqPath, { method, query, headers, body });
      if (!res.ok) return res;
      return ok(res, "Appel API exécuté.");
    }

    return { ok: false, error: "Action inconnue." };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run } };
