const { utils } = require("./utils");

module.exports = {
  async sql_execute_parameterized(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Requête SQL requise." };

    let params = [];
    if (d.params) {
      try { params = typeof d.params === "string" ? JSON.parse(d.params) : d.params; }
      catch { return { ok: false, error: "Paramètres JSON invalides." }; }
    }

    const credentials = (opts && opts.credentials) || {};
    const res = await utils.executeQuery(credentials, d.query, params);
    if (!res.ok) return res;

    const rows = (res.rows || []).map(r => ({ data: JSON.stringify(r) }));
    return { ok: true, rows };
  }
};
