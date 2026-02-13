const { utils } = require("./utils");

module.exports = {
  async sql_execute_query(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Requête SQL requise." };

    const credentials = (opts && opts.credentials) || {};
    const res = await utils.executeQuery(credentials, d.query);
    if (!res.ok) return res;

    const rows = (res.rows || []).map(r => ({ data: JSON.stringify(r) }));
    return { ok: true, rows };
  }
};
