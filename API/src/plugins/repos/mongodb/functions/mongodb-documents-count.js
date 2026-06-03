const { utils } = require("./utils");

module.exports = {
  async mongodb_documents_count(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.collection) return { ok: false, error: "Collection requise." };
    let filter;
    try { filter = utils.parseJson(d.filter, "filtre", {}); } catch (e) { return { ok: false, error: e.message }; }
    return utils.withDb(opts?.credentials, async (db) => {
      const total = await db.collection(d.collection).countDocuments(filter);
      return { ok: true, totalCount: total, documents: [], raw: { totalCount: total } };
    });
  }
};
