function parseJson(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function cleanString(value) {
  return String(value || "").trim();
}

function quoteIdentifier(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function tableName(keyspace, table) {
  if (keyspace) return `${quoteIdentifier(keyspace)}.${quoteIdentifier(table)}`;
  return quoteIdentifier(table);
}

async function withClient(opts, worker) {
  const credentials = (opts && opts.credentials) || {};
  if (credentials.contactPoints === "test") {
    return worker({
      client: {
        execute: async () => ({ rows: [], columns: [], rowLength: 0, info: {} }),
        batch: async () => ({})
      },
      isMock: true
    });
  }

  const contactPointsRaw = cleanString(credentials.contactPoints);
  const localDataCenter = cleanString(credentials.localDataCenter || "datacenter1");
  if (!contactPointsRaw) return { ok: false, error: "Identifiants Cassandra requis: contactPoints." };

  let cassandra;
  try {
    cassandra = require("cassandra-driver");
  } catch {
    return { ok: false, error: "Le package 'cassandra-driver' n'est pas installé. Exécuter: npm install cassandra-driver dans API/." };
  }

  const authProvider = credentials.username
    ? new cassandra.auth.PlainTextAuthProvider(cleanString(credentials.username), String(credentials.password || ""))
    : undefined;

  const client = new cassandra.Client({
    contactPoints: contactPointsRaw.split(",").map((x) => x.trim()).filter(Boolean),
    localDataCenter,
    keyspace: cleanString(credentials.keyspace || "") || undefined,
    authProvider
  });

  try {
    await client.connect();
    const result = await worker({ client, cassandra, isMock: false });
    await client.shutdown();
    return result;
  } catch (e) {
    try { await client.shutdown(); } catch {}
    return { ok: false, error: e.message };
  }
}

function mapRows(result) {
  const rows = (result.rows || []).map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) out[k] = v;
    return out;
  });
  const fields = (result.columns || []).map((c) => c.name);
  return { ok: true, rowCount: rows.length, fields, rows, raw: result };
}

function actionResult(message, raw, status = 200) {
  return { ok: true, status, message, raw };
}

function listResult(items, raw) {
  return { ok: true, totalCount: items.length, items, raw: raw || items };
}

async function run(key, inputs, opts) {
  const d = inputs || {};

  try {
    if (key === "cassandra_query_execute") {
      const query = cleanString(d.query);
      if (!query) return { ok: false, error: "Requête CQL requise." };
      const params = parseJson(d.params, "params", []);
      const prepare = d.prepare === false ? false : true;
      const pageSize = Math.max(1, Math.min(Number(d.pageSize || 5000), 10000));
      return withClient(opts, async ({ client }) => {
        const res = await client.execute(query, params, { prepare, fetchSize: pageSize });
        return mapRows(res);
      });
    }

    if (key === "cassandra_query_prepare_execute") {
      const query = cleanString(d.query);
      if (!query) return { ok: false, error: "Requête CQL requise." };
      const params = parseJson(d.params, "params", []);
      const pageSize = Math.max(1, Math.min(Number(d.pageSize || 5000), 10000));
      return withClient(opts, async ({ client }) => {
        const res = await client.execute(query, params, { prepare: true, fetchSize: pageSize });
        return mapRows(res);
      });
    }

    if (key === "cassandra_batch_execute") {
      const queries = parseJson(d.queries, "queries", []);
      if (!Array.isArray(queries) || queries.length === 0) return { ok: false, error: "queries doit être un tableau non vide." };
      const prepare = d.prepare === false ? false : true;
      const logged = d.logged === false ? false : true;
      return withClient(opts, async ({ client }) => {
        const normalized = queries.map((q) => {
          if (!q || !q.query) throw new Error("Chaque élément de queries doit contenir query.");
          return { query: String(q.query), params: Array.isArray(q.params) ? q.params : [] };
        });
        await client.batch(normalized, { prepare, logged });
        return actionResult(`${normalized.length} requête(s) exécutée(s) en batch.`, { count: normalized.length });
      });
    }

    if (key === "cassandra_keyspaces_list") {
      return withClient(opts, async ({ client }) => {
        const res = await client.execute("SELECT keyspace_name, durable_writes FROM system_schema.keyspaces");
        const items = (res.rows || []).map((r) => ({ id: r.keyspace_name, name: r.keyspace_name, status: String(r.durable_writes), properties: r, raw: r }));
        return listResult(items, res.rows || []);
      });
    }

    if (key === "cassandra_tables_list") {
      const keyspace = cleanString(d.keyspace || (opts && opts.credentials && opts.credentials.keyspace) || "");
      if (!keyspace) return { ok: false, error: "keyspace requis." };
      return withClient(opts, async ({ client }) => {
        const res = await client.execute("SELECT table_name, bloom_filter_fp_chance, comment FROM system_schema.tables WHERE keyspace_name = ?", [keyspace], { prepare: true });
        const items = (res.rows || []).map((r) => ({ id: `${keyspace}.${r.table_name}`, name: r.table_name, status: "ok", properties: r, raw: r }));
        return listResult(items, res.rows || []);
      });
    }

    if (key === "cassandra_table_describe") {
      const keyspace = cleanString(d.keyspace || (opts && opts.credentials && opts.credentials.keyspace) || "");
      const table = cleanString(d.table);
      if (!keyspace || !table) return { ok: false, error: "keyspace et table requis." };
      return withClient(opts, async ({ client }) => {
        const res = await client.execute(
          "SELECT column_name, kind, position, type FROM system_schema.columns WHERE keyspace_name = ? AND table_name = ?",
          [keyspace, table],
          { prepare: true }
        );
        const items = (res.rows || []).map((r) => ({ id: r.column_name, name: r.column_name, status: r.type, properties: r, raw: r }));
        return listResult(items, res.rows || []);
      });
    }

    if (key === "cassandra_rows_select") {
      const keyspace = cleanString(d.keyspace || (opts && opts.credentials && opts.credentials.keyspace) || "");
      const table = cleanString(d.table);
      if (!table) return { ok: false, error: "table requise." };
      const columns = cleanString(d.columns || "*");
      const where = cleanString(d.where);
      const params = parseJson(d.params, "params", []);
      const limit = Math.max(1, Math.min(Number(d.limit || 100), 10000));
      let query = `SELECT ${columns} FROM ${tableName(keyspace, table)}`;
      if (where) query += ` WHERE ${where}`;
      query += " LIMIT ?";
      return withClient(opts, async ({ client }) => {
        const res = await client.execute(query, [...params, limit], { prepare: true });
        return mapRows(res);
      });
    }

    if (key === "cassandra_row_insert") {
      const keyspace = cleanString(d.keyspace || (opts && opts.credentials && opts.credentials.keyspace) || "");
      const table = cleanString(d.table);
      if (!table) return { ok: false, error: "table requise." };
      const data = parseJson(d.data, "data", null);
      if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "data doit être un objet JSON." };
      const keys = Object.keys(data);
      if (!keys.length) return { ok: false, error: "data ne peut pas être vide." };
      const query = `INSERT INTO ${tableName(keyspace, table)} (${keys.map(quoteIdentifier).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
      const values = keys.map((k) => data[k]);
      return withClient(opts, async ({ client }) => {
        await client.execute(query, values, { prepare: true });
        return actionResult("Ligne insérée.", { table, keys });
      });
    }

    if (key === "cassandra_rows_update") {
      const keyspace = cleanString(d.keyspace || (opts && opts.credentials && opts.credentials.keyspace) || "");
      const table = cleanString(d.table);
      const where = cleanString(d.where);
      if (!table || !where) return { ok: false, error: "table et where requis." };
      const data = parseJson(d.data, "data", null);
      const params = parseJson(d.params, "params", []);
      if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "data doit être un objet JSON." };
      const keys = Object.keys(data);
      if (!keys.length) return { ok: false, error: "data ne peut pas être vide." };
      const setClause = keys.map((k) => `${quoteIdentifier(k)} = ?`).join(", ");
      const query = `UPDATE ${tableName(keyspace, table)} SET ${setClause} WHERE ${where}`;
      const values = [...keys.map((k) => data[k]), ...params];
      return withClient(opts, async ({ client }) => {
        await client.execute(query, values, { prepare: true });
        return actionResult("Lignes mises à jour.", { table, updatedKeys: keys });
      });
    }

    if (key === "cassandra_rows_delete") {
      const keyspace = cleanString(d.keyspace || (opts && opts.credentials && opts.credentials.keyspace) || "");
      const table = cleanString(d.table);
      const where = cleanString(d.where);
      if (!table || !where) return { ok: false, error: "table et where requis." };
      const params = parseJson(d.params, "params", []);
      const query = `DELETE FROM ${tableName(keyspace, table)} WHERE ${where}`;
      return withClient(opts, async ({ client }) => {
        await client.execute(query, params, { prepare: true });
        return actionResult("Lignes supprimées.", { table });
      });
    }

    return { ok: false, error: "Action inconnue." };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run, parseJson } };
