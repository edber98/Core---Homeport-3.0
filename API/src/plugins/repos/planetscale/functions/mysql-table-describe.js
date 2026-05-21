const { utils } = require("./utils");

module.exports = {
  async planetscale_table_describe(node, msg, inputs, opts) {
    const table = String((inputs || {}).table || "").trim();
    if (!table) return { ok: false, error: "Table requise." };
    const res = await utils.executeQuery(opts?.credentials, `DESCRIBE ${utils.quoteIdentifier(table)}`);
    if (!res.ok) return res;
    return { ok: true, columns: res.rows || [], totalCount: (res.rows || []).length, raw: res };
  }
};
