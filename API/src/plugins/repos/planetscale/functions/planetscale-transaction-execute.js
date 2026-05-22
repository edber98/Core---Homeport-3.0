const { utils } = require("./utils");

module.exports = {
  async planetscale_transaction_execute(node, msg, inputs, opts) {
    const d = inputs || {};
    let queries;
    try { queries = utils.parseJson(d.queries, "queries", undefined); } catch (e) { return { ok: false, error: e.message }; }
    if (!Array.isArray(queries) || !queries.length) return { ok: false, error: "queries (tableau) requis." };

    const res = await utils.executeTransaction(opts?.credentials, queries);
    if (!res.ok) return res;
    return { ok: true, rowCount: res.rowCount || 0, fields: [], rows: res.rows || [], raw: res.raw || res };
  }
};
