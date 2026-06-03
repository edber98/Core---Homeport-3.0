const { utils } = require("./utils");

module.exports = {
  async mysql_tables_list(node, msg, inputs, opts) {
    const res = await utils.executeQuery(opts?.credentials, "SHOW TABLES");
    if (!res.ok) return res;
    const tables = (res.rows || []).map((row) => ({ name: Object.values(row)[0] }));
    return { ok: true, tables, totalCount: tables.length, raw: res };
  }
};
