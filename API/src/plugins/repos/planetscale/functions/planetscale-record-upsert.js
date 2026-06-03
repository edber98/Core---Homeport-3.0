const { utils } = require("./utils");

module.exports = {
  async planetscale_record_upsert(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.table) return { ok: false, error: "Table requise." };

    let data;
    try { data = utils.parseJson(d.data, "données", undefined); } catch (e) { return { ok: false, error: e.message }; }
    if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "Données objet requises." };

    const keys = Object.keys(data);
    if (!keys.length) return { ok: false, error: "Données vides." };

    const updateKeys = String(d.updateColumns || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const effectiveUpdateKeys = updateKeys.length ? updateKeys : keys;

    const query = `INSERT INTO ${utils.quoteIdentifier(d.table)} (${keys.map(utils.quoteIdentifier).join(", ")}) VALUES (${keys.map(() => "?").join(", ")}) ON DUPLICATE KEY UPDATE ${effectiveUpdateKeys.map((k) => `${utils.quoteIdentifier(k)} = VALUES(${utils.quoteIdentifier(k)})`).join(", ")}`;
    const res = await utils.executeQuery(opts?.credentials, query, keys.map((k) => data[k]));
    if (!res.ok) return res;
    return utils.writeResult(res, "Upsert exécuté.");
  }
};
