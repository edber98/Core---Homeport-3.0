const { utils } = require("./utils");

module.exports = {
  async planetscale_records_select(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.table) return { ok: false, error: "Table requise." };
    let query = `SELECT ${d.columns || "*"} FROM ${utils.quoteIdentifier(d.table)}`;
    if (d.where) query += ` WHERE ${d.where}`;
    if (d.orderBy) query += ` ORDER BY ${d.orderBy}`;
    if (d.limit) query += ` LIMIT ${Number(d.limit) || 100}`;
    if (d.offset) query += ` OFFSET ${Number(d.offset) || 0}`;
    const res = await utils.executeQuery(opts?.credentials, query);
    if (!res.ok) return res;
    return utils.rowsResult(res);
  }
};
