function isTestCredentials(credentials) {
  return credentials && credentials.host === "test" && credentials.username === "test";
}

function parseJson(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { throw new Error(`JSON invalide dans ${label}.`); }
}

function quoteIdentifier(name) {
  return "`" + String(name).replace(/`/g, "``") + "`";
}

function connectionConfig(credentials) {
  const c = credentials || {};
  if (!c.host || !c.database || !c.username) return { ok: false, error: "Identifiants PlanetScale requis: host, database, username." };
  return {
    ok: true,
    config: {
      host: c.host,
      port: Number(c.port || 3306),
      database: c.database,
      user: c.username,
      password: c.password || "",
      ssl: String(c.ssl || "true") === "true" ? { rejectUnauthorized: false } : undefined
    }
  };
}

async function executeQuery(credentials, query, params) {
  if (isTestCredentials(credentials)) return { ok: true, rows: [], rowCount: 0, fields: [], affectedRows: 0, insertId: 0, mock: true };
  const cfg = connectionConfig(credentials);
  if (!cfg.ok) return cfg;

  let mysql;
  try { mysql = require("mysql2/promise"); } catch {
    return { ok: false, error: "Le package 'mysql2' n'est pas installé. Exécuter: npm install mysql2 dans API/." };
  }

  let conn;
  try {
    conn = await mysql.createConnection(cfg.config);
    const [rows, fields] = await conn.execute(query, params || []);
    await conn.end();
    if (Array.isArray(rows)) return { ok: true, rows, rowCount: rows.length, fields: (fields || []).map((f) => f.name) };
    return { ok: true, rows: [], rowCount: rows.affectedRows || 0, affectedRows: rows.affectedRows || 0, insertId: rows.insertId || 0 };
  } catch (e) {
    if (conn) try { await conn.end(); } catch {}
    return { ok: false, error: e.message };
  }
}

async function executeTransaction(credentials, queries) {
  if (isTestCredentials(credentials)) return { ok: true, rows: [], rowCount: 0, fields: [], affectedRows: 0, insertId: 0, mock: true };
  const cfg = connectionConfig(credentials);
  if (!cfg.ok) return cfg;

  let mysql;
  try { mysql = require("mysql2/promise"); } catch {
    return { ok: false, error: "Le package 'mysql2' n'est pas installé. Exécuter: npm install mysql2 dans API/." };
  }

  let conn;
  try {
    conn = await mysql.createConnection(cfg.config);
    await conn.beginTransaction();

    const results = [];
    for (const item of queries || []) {
      if (!item || !item.query) throw new Error("Chaque requête de transaction doit contenir query.");
      const [rows, fields] = await conn.execute(String(item.query), Array.isArray(item.params) ? item.params : []);
      if (Array.isArray(rows)) results.push({ rows, rowCount: rows.length, fields: (fields || []).map((f) => f.name) });
      else results.push({ rows: [], rowCount: rows.affectedRows || 0, affectedRows: rows.affectedRows || 0, insertId: rows.insertId || 0 });
    }

    await conn.commit();
    await conn.end();
    return { ok: true, rows: results, rowCount: results.length, fields: [], raw: results };
  } catch (e) {
    try { if (conn) await conn.rollback(); } catch {}
    try { if (conn) await conn.end(); } catch {}
    return { ok: false, error: e.message };
  }
}

function rowsResult(res) {
  return { ok: true, rows: res.rows || [], rowCount: res.rowCount || 0, fields: res.fields || [], raw: res };
}

function writeResult(res, message) {
  return { ok: true, message, affectedRows: res.affectedRows || res.rowCount || 0, insertId: res.insertId || 0, raw: res };
}

module.exports = { utils: { parseJson, quoteIdentifier, executeQuery, executeTransaction, rowsResult, writeResult } };
