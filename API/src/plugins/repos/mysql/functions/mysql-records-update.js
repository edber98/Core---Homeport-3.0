const { utils } = require("./utils");

module.exports = {
  async mysql_records_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.table) return { ok: false, error: "Table requise." };
    if (!d.where) return { ok: false, error: "Clause WHERE requise." };
    let data;
    try { data = utils.parseJson(d.recordData, "recordData", undefined); } catch (e) { return { ok: false, error: e.message }; }
    if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "Données objet requises." };
    const keys = Object.keys(data);
    const query = `UPDATE ${utils.quoteIdentifier(d.table)} SET ${keys.map((k) => `${utils.quoteIdentifier(k)} = ?`).join(", ")} WHERE ${d.where}`;
    const res = await utils.executeQuery(opts?.credentials, query, keys.map((k) => data[k]));
    if (!res.ok) return res;
    return utils.writeResult(res, "Enregistrements mis à jour.");
  }
};
