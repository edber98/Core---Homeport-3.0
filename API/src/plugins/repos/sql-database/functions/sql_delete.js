const { utils } = require("./utils");

module.exports = {
  async sql_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.table || !d.where) return { ok: false, error: "Table et condition WHERE requis." };

    const credentials = (opts && opts.credentials) || {};
    const dbType = credentials.dbType || "mysql";
    const quote = dbType === "postgresql" || dbType === "postgres" ? '"' : '`';

    const query = `DELETE FROM ${quote}${d.table}${quote} WHERE ${d.where}`;
    const res = await utils.executeQuery(credentials, query);
    if (!res.ok) return res;

    return {
      ok: true, status: "success", message: "Enregistrement(s) supprimé(s).",
      affectedRows: res.rowCount || res.affectedRows || 0, insertId: 0
    };
  }
};
