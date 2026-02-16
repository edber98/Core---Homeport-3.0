const { utils } = require("./utils");

module.exports = {
  async sql_call_procedure(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Nom de la procédure requis." };

    let params = [];
    if (d.params) {
      try { params = typeof d.params === "string" ? JSON.parse(d.params) : d.params; }
      catch { return { ok: false, error: "Paramètres JSON invalides." }; }
    }

    const credentials = (opts && opts.credentials) || {};
    const dbType = credentials.dbType || "mysql";

    let query;
    if (dbType === "postgresql" || dbType === "postgres") {
      const placeholders = params.map((_, i) => `$${i + 1}`).join(", ");
      query = `SELECT * FROM ${d.name}(${placeholders})`;
    } else {
      const placeholders = params.map(() => "?").join(", ");
      query = `CALL ${d.name}(${placeholders})`;
    }

    const res = await utils.executeQuery(credentials, query, params);
    if (!res.ok) return res;

    const rows = (res.rows || []).map(r => ({ data: JSON.stringify(r) }));
    return { ok: true, rows };
  }
};
