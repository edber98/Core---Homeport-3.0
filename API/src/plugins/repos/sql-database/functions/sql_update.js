const { utils } = require("./utils");

module.exports = {
  async sql_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.table || !d.where) return { ok: false, error: "Table et condition WHERE requis." };
    if (!d.data) return { ok: false, error: "Données requises." };

    let data;
    try { data = typeof d.data === "string" ? JSON.parse(d.data) : d.data; } catch { return { ok: false, error: "JSON invalide." }; }

    const credentials = (opts && opts.credentials) || {};
    const dbType = credentials.dbType || "mysql";
    const quote = dbType === "postgresql" || dbType === "postgres" ? '"' : '`';
    const keys = Object.keys(data);
    const values = keys.map(k => data[k]);

    let query;
    if (dbType === "postgresql" || dbType === "postgres") {
      const sets = keys.map((k, i) => `${quote}${k}${quote} = $${i + 1}`).join(", ");
      query = `UPDATE ${quote}${d.table}${quote} SET ${sets} WHERE ${d.where}`;
    } else {
      const sets = keys.map(k => `${quote}${k}${quote} = ?`).join(", ");
      query = `UPDATE ${quote}${d.table}${quote} SET ${sets} WHERE ${d.where}`;
    }

    const res = await utils.executeQuery(credentials, query, values);
    if (!res.ok) return res;

    return {
      ok: true, status: "success", message: "Enregistrement(s) mis à jour.",
      affectedRows: res.rowCount || res.affectedRows || 0, insertId: 0
    };
  }
};
