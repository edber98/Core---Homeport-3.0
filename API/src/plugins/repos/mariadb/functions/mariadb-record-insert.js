const { utils } = require("./utils");

module.exports = {
  async mariadb_record_insert(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.table) return { ok: false, error: "Table requise." };
    let data;
    try { data = utils.parseJson(d.data, "données", undefined); } catch (e) { return { ok: false, error: e.message }; }
    if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "Données objet requises." };
    const keys = Object.keys(data);
    const query = `INSERT INTO ${utils.quoteIdentifier(d.table)} (${keys.map(utils.quoteIdentifier).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
    const res = await utils.executeQuery(opts?.credentials, query, keys.map((k) => data[k]));
    if (!res.ok) return res;
    return utils.writeResult(res, "Enregistrement inséré.");
  }
};
