const { utils } = require("./utils");

module.exports = {
  async mongodb_documents_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.collection) return { ok: false, error: "Collection requise." };
    let filter;
    try { filter = utils.parseJson(d.filter, "filtre", undefined); } catch (e) { return { ok: false, error: e.message }; }
    if (!filter) return { ok: false, error: "Filtre requis." };
    return utils.withDb(opts?.credentials, async (db) => {
      const raw = await db.collection(d.collection).deleteMany(filter);
      return utils.writeResult(raw, "Documents supprimés.");
    });
  }
};
