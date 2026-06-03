const { utils } = require("./utils");

module.exports = {
  async planetscale_records_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.table) return { ok: false, error: "Table requise." };
    if (!d.where) return { ok: false, error: "Clause WHERE requise." };
    const res = await utils.executeQuery(opts?.credentials, `DELETE FROM ${utils.quoteIdentifier(d.table)} WHERE ${d.where}`);
    if (!res.ok) return res;
    return utils.writeResult(res, "Enregistrements supprimés.");
  }
};
