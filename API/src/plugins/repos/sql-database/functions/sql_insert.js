const { utils } = require("./utils");

module.exports = {
  async sql_insert(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.table) return { ok: false, error: "Table requise." };
    if (!d.data) return { ok: false, error: "Données requises." };

    let data;
    try { data = typeof d.data === "string" ? JSON.parse(d.data) : d.data; } catch { return { ok: false, error: "JSON invalide." }; }

    const credentials = (opts && opts.credentials) || {};
    const dbType = credentials.dbType || "mysql";
    const quote = dbType === "postgresql" || dbType === "postgres" ? '"' : '`';
    const keys = Object.keys(data);
    const cols = keys.map(k => `${quote}${k}${quote}`).join(", ");
    const values = keys.map(k => data[k]);

    let query;
    if (dbType === "postgresql" || dbType === "postgres") {
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
      query = `INSERT INTO ${quote}${d.table}${quote} (${cols}) VALUES (${placeholders}) RETURNING *`;
    } else {
      const placeholders = keys.map(() => "?").join(", ");
      query = `INSERT INTO ${quote}${d.table}${quote} (${cols}) VALUES (${placeholders})`;
    }

    const res = await utils.executeQuery(credentials, query, values);
    if (!res.ok) return res;

    return {
      ok: true, status: "success", message: "Enregistrement inséré.",
      affectedRows: res.rowCount || res.affectedRows || 1,
      insertId: res.insertId || 0
    };
  }
};
