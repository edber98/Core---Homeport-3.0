const { utils } = require("./utils");

module.exports = {
  async planetscale_query_execute(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.sqlQuery) return { ok: false, error: "Requête SQL requise." };
    let params;
    try { params = utils.parseJson(d.params, "paramètres", []); } catch (e) { return { ok: false, error: e.message }; }
    const res = await utils.executeQuery(opts?.credentials, d.sqlQuery, params);
    if (!res.ok) return res;
    return utils.rowsResult(res);
  }
};
