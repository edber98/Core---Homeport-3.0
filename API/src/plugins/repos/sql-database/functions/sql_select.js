const { utils } = require("./utils");

module.exports = {
  async sql_select(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.table) return { ok: false, error: "Table requise." };

    const credentials = (opts && opts.credentials) || {};
    const dbType = credentials.dbType || "mysql";
    const cols = d.columns || "*";
    const quote = dbType === "postgresql" || dbType === "postgres" ? '"' : '`';

    let query = `SELECT ${cols} FROM ${quote}${d.table}${quote}`;
    if (d.where) query += ` WHERE ${d.where}`;
    if (d.orderBy) query += ` ORDER BY ${d.orderBy}`;
    if (d.limit) query += ` LIMIT ${d.limit}`;
    if (d.offset) query += ` OFFSET ${d.offset}`;

    const res = await utils.executeQuery(credentials, query);
    if (!res.ok) return res;

    const rows = (res.rows || []).map(r => ({ data: JSON.stringify(r) }));
    return { ok: true, rows };
  }
};
