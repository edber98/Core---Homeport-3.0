const { utils } = require("./utils");

module.exports = {
  async mysql_query_execute(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Requête SQL requise." };
    let params;
    try { params = utils.parseJson(d.params, "paramètres", []); } catch (e) { return { ok: false, error: e.message }; }
    const res = await utils.executeQuery(opts?.credentials, d.query, params);
    if (!res.ok) return res;
    return utils.rowsResult(res);
  }
};
