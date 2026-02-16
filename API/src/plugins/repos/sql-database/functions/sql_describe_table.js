const { utils } = require("./utils");

module.exports = {
  async sql_describe_table(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.table) return { ok: false, error: "Nom de la table requis." };

    const credentials = (opts && opts.credentials) || {};
    const dbType = credentials.dbType || "mysql";

    let query;
    if (dbType === "postgresql" || dbType === "postgres") {
      const schema = d.schema || "public";
      query = `SELECT column_name as name, data_type as type, is_nullable as nullable, column_default as "defaultValue", '' as key FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${d.table}' ORDER BY ordinal_position`;
    } else {
      query = `SHOW COLUMNS FROM \`${d.table}\``;
    }

    const res = await utils.executeQuery(credentials, query);
    if (!res.ok) return res;

    const columns = (res.rows || []).map(r => {
      if (dbType === "postgresql" || dbType === "postgres") {
        return { name: r.name || "", type: r.type || "", nullable: r.nullable || "", defaultValue: r.defaultValue || "", key: r.key || "" };
      }
      return {
        name: r.Field || "", type: r.Type || "", nullable: r.Null || "",
        defaultValue: r.Default != null ? String(r.Default) : "", key: r.Key || ""
      };
    });
    return { ok: true, columns };
  }
};
