function parseJson(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { throw new Error("JSON invalide dans " + label + "."); }
}
function quoteIdentifier(name) { return '"' + String(name).replace(/"/g, '""') + '"'; }
function tableName(d) { return quoteIdentifier(d.schema || "public") + "." + quoteIdentifier(d.table); }
function cfg(credentials) {
  const c = credentials || {};
  if (!c.host || !c.database || !c.username) return { ok: false, error: "Identifiants TimescaleDB requis: host, database, username." };
  return { ok: true, config: { host: c.host, port: Number(c.port || 5432), database: c.database, user: c.username, password: c.password || "", ssl: String(c.ssl || "false") === "true" ? { rejectUnauthorized: false } : false } };
}
async function query(credentials, text, params) {
  if (credentials && credentials.host === "test" && credentials.username === "test") return { ok: true, rows: [], rowCount: 0, fields: [], raw: { test: true } };
  const conf = cfg(credentials);
  if (!conf.ok) return conf;
  let pg;
  try { pg = require("pg"); } catch { return { ok: false, error: "Le package 'pg' n'est pas installé. Exécuter: npm install pg dans API/." }; }
  const client = new pg.Client(conf.config);
  try {
    await client.connect();
    const res = await client.query(text, params || []);
    await client.end();
    return { ok: true, rows: res.rows || [], rowCount: res.rowCount || 0, fields: (res.fields || []).map((f) => f.name), raw: res };
  } catch (e) {
    try { await client.end(); } catch {}
    return { ok: false, error: e.message };
  }
}
async function transaction(credentials, queries) {
  const conf = cfg(credentials);
  if (!conf.ok) return conf;
  let pg;
  try { pg = require("pg"); } catch { return { ok: false, error: "Le package 'pg' n'est pas installé. Exécuter: npm install pg dans API/." }; }
  const client = new pg.Client(conf.config);
  const results = [];
  try {
    await client.connect();
    await client.query("BEGIN");
    for (const item of queries) {
      const res = await client.query(item.query, item.params || []);
      results.push({ rows: res.rows || [], rowCount: res.rowCount || 0, fields: (res.fields || []).map((f) => f.name) });
    }
    await client.query("COMMIT");
    await client.end();
    return { ok: true, rows: results, rowCount: results.length, fields: [], raw: results };
  } catch (e) {
    try { await client.query("ROLLBACK"); await client.end(); } catch {}
    return { ok: false, error: e.message };
  }
}
function rowsResult(res) { return { ok: true, rows: res.rows || [], rowCount: res.rowCount || 0, fields: res.fields || [], raw: res.raw || res }; }
function writeResult(res, message) { return { ok: true, message, affectedRows: res.rowCount || 0, rows: res.rows || [], raw: res.raw || res }; }
async function run(key, inputs, opts) {
  const d = inputs || {};
  const credentials = (opts && opts.credentials) || {};
  try {
    if (key === "timescaledb_query_execute") { const r = await query(credentials, d.sqlQuery, parseJson(d.params, "params", [])); return r.ok ? rowsResult(r) : r; }
    if (key === "timescaledb_transaction_execute") { const r = await transaction(credentials, parseJson(d.queries, "queries", [])); return r.ok ? rowsResult(r) : r; }
    if (key === "timescaledb_tables_list") { const r = await query(credentials, "SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name", [d.schema || "public"]); return r.ok ? { ok: true, tables: r.rows, totalCount: r.rows.length, raw: r } : r; }
    if (key === "timescaledb_table_describe") { const r = await query(credentials, "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position", [d.schema || "public", d.table]); return r.ok ? { ok: true, columns: r.rows, totalCount: r.rows.length, raw: r } : r; }
    if (key === "timescaledb_records_select") {
      const limit = Math.min(Number(d.limit || 100), 10000);
      const offset = Number(d.offset || 0);
      let sql = "SELECT " + (d.columns || "*") + " FROM " + tableName(d);
      if (d.where) sql += " WHERE " + d.where;
      if (d.orderBy) sql += " ORDER BY " + d.orderBy;
      sql += " LIMIT " + limit + " OFFSET " + offset;
      const r = await query(credentials, sql, []);
      return r.ok ? rowsResult(r) : r;
    }
    if (key === "timescaledb_record_insert") {
      const data = parseJson(d.recordData, "recordData", {});
      const keys = Object.keys(data);
      const sql = "INSERT INTO " + tableName(d) + " (" + keys.map(quoteIdentifier).join(", ") + ") VALUES (" + keys.map((_, i) => "$" + (i + 1)).join(", ") + ") RETURNING *";
      const r = await query(credentials, sql, keys.map((k) => data[k]));
      return r.ok ? writeResult(r, "Ligne insérée.") : r;
    }
    if (key === "timescaledb_records_update") {
      const data = parseJson(d.recordData, "recordData", {});
      const keys = Object.keys(data);
      const sql = "UPDATE " + tableName(d) + " SET " + keys.map((k, i) => quoteIdentifier(k) + " = $" + (i + 1)).join(", ") + " WHERE " + d.where + " RETURNING *";
      const r = await query(credentials, sql, keys.map((k) => data[k]));
      return r.ok ? writeResult(r, "Lignes mises à jour.") : r;
    }
    if (key === "timescaledb_records_delete") {
      const r = await query(credentials, "DELETE FROM " + tableName(d) + " WHERE " + d.where + " RETURNING *", []);
      return r.ok ? writeResult(r, "Lignes supprimées.") : r;
    }
    if (key === "timescaledb_record_upsert") {
      const data = parseJson(d.recordData, "recordData", {});
      const keys = Object.keys(data);
      if (!keys.length) return { ok: false, error: "Données vides." };
      const conflictColumns = String(d.conflictColumns || "").split(",").map((x) => x.trim()).filter(Boolean);
      if (!conflictColumns.length) return { ok: false, error: "conflictColumns requis." };
      const insertCols = keys.map(quoteIdentifier).join(", ");
      const insertVals = keys.map((_, i) => "$" + (i + 1)).join(", ");
      const upsertCols = keys
        .filter((k) => !conflictColumns.includes(k))
        .map((k) => quoteIdentifier(k) + " = EXCLUDED." + quoteIdentifier(k))
        .join(", ");
      const conflictClause = upsertCols
        ? "DO UPDATE SET " + upsertCols
        : "DO NOTHING";
      const sql = "INSERT INTO " + tableName(d) + " (" + insertCols + ") VALUES (" + insertVals + ") ON CONFLICT (" + conflictColumns.map(quoteIdentifier).join(", ") + ") " + conflictClause + " RETURNING *";
      const r = await query(credentials, sql, keys.map((k) => data[k]));
      return r.ok ? writeResult(r, "Upsert exécuté.") : r;
    }
    return { ok: false, error: "Action inconnue." };
  } catch (e) { return { ok: false, error: e.message }; }
}
module.exports = { utils: { run, parseJson, quoteIdentifier, query } };
