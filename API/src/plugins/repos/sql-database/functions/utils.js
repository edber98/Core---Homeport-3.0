function getClient(credentials) {
  const { dbType, host, port, database, username, password, ssl } = credentials || {};
  if (!host || !database || !username) {
    throw new Error("Missing SQL connection credentials (host, database, username).");
  }

  const useSSL = ssl === "true";

  if (dbType === "postgresql" || dbType === "postgres") {
    let pg;
    try { pg = require("pg"); } catch {
      throw new Error("Le package 'pg' n'est pas installé. Exécuter: npm install pg");
    }
    const client = new pg.Client({
      host, port: port || 5432, database, user: username, password,
      ssl: useSSL ? { rejectUnauthorized: false } : false
    });
    return { type: "pg", client };
  }

  // Default: MySQL
  let mysql;
  try { mysql = require("mysql2/promise"); } catch {
    throw new Error("Le package 'mysql2' n'est pas installé. Exécuter: npm install mysql2");
  }

  return {
    type: "mysql",
    config: { host, port: port || 3306, database, user: username, password, ssl: useSSL ? {} : undefined }
  };
}

async function executeQuery(credentials, query, params) {
  const db = getClient(credentials);

  if (db.type === "pg") {
    try {
      await db.client.connect();
      const result = await db.client.query(query, params || undefined);
      await db.client.end();
      return {
        ok: true,
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        fields: (result.fields || []).map(f => f.name)
      };
    } catch (e) {
      try { await db.client.end(); } catch {}
      return { ok: false, error: e.message };
    }
  }

  // MySQL
  let conn;
  try {
    const mysql = require("mysql2/promise");
    conn = await mysql.createConnection(db.config);
    const [rows, fields] = await conn.execute(query, params || undefined);
    await conn.end();

    if (Array.isArray(rows)) {
      return { ok: true, rows, rowCount: rows.length, fields: (fields || []).map(f => f.name) };
    }
    return {
      ok: true, rows: [],
      affectedRows: rows.affectedRows || 0,
      insertId: rows.insertId || 0,
      rowCount: rows.affectedRows || 0
    };
  } catch (e) {
    if (conn) try { await conn.end(); } catch {}
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { getClient, executeQuery } };
