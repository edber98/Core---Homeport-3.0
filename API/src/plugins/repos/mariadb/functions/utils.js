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
  if (!c.host || !c.database || !c.username) return { ok: false, error: "Identifiants MariaDB requis: host, database, username." };
  return {
    ok: true,
    config: {
      host: c.host,
      port: Number(c.port || 3306),
      database: c.database,
      user: c.username,
      password: c.password || "",
      ssl: String(c.ssl || "false") === "true" ? {} : undefined
    }
  };
}

async function executeQuery(credentials, query, params) {
  if (isTestCredentials(credentials)) return { ok: true, rows: [], rowCount: 0, fields: [], affectedRows: 0, insertId: 0, mock: true };
  const cfg = connectionConfig(credentials);
  if (!cfg.ok) return cfg;

  let mariadb;
  try { mariadb = require("mariadb"); } catch {
    return { ok: false, error: "Le package 'mariadb' n'est pas installé. Exécuter: npm install mariadb dans API/." };
  }

  let conn;
  try {
    conn = await mariadb.createConnection(cfg.config);
    const rows = await conn.query(query, params || []);
    await conn.end();
    if (Array.isArray(rows)) return { ok: true, rows, rowCount: rows.length, fields: rows.meta ? rows.meta.map((f) => f.name()) : [] };
    return { ok: true, rows: [], rowCount: rows.affectedRows || 0, affectedRows: rows.affectedRows || 0, insertId: rows.insertId || 0 };
  } catch (e) {
    if (conn) try { await conn.end(); } catch {}
    return { ok: false, error: e.message };
  }
}

function rowsResult(res) {
  return { ok: true, rows: res.rows || [], rowCount: res.rowCount || 0, fields: res.fields || [], raw: res };
}

function writeResult(res, message) {
  return { ok: true, message, affectedRows: res.affectedRows || res.rowCount || 0, insertId: res.insertId || 0, raw: res };
}

module.exports = { utils: { parseJson, quoteIdentifier, executeQuery, rowsResult, writeResult } };
