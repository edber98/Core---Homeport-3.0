const { utils } = require("./utils");

module.exports = {
  async sql_list_tables(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const credentials = (opts && opts.credentials) || {};
    const dbType = credentials.dbType || "mysql";

    let query;
    if (dbType === "postgresql" || dbType === "postgres") {
      const schema = d.schema || "public";
      query = `SELECT table_name as name, table_type as type, table_schema as schema FROM information_schema.tables WHERE table_schema = '${schema}' ORDER BY table_name`;
    } else {
      query = `SELECT TABLE_NAME as name, TABLE_TYPE as type, TABLE_SCHEMA as \`schema\` FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME`;
    }

    const res = await utils.executeQuery(credentials, query);
    if (!res.ok) return res;

    const tables = (res.rows || []).map(r => ({
      name: r.name || r.TABLE_NAME || "",
      type: r.type || r.TABLE_TYPE || "",
      schema: r.schema || r.TABLE_SCHEMA || ""
    }));
    return { ok: true, tables };
  }
};
