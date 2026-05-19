const { utils } = require("./utils");

module.exports = {
  async mongodb_documents_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.collection) return { ok: false, error: "Collection requise." };
    let filter, update;
    try {
      filter = utils.parseJson(d.filter, "filtre", undefined);
      update = utils.parseJson(d.update, "mise à jour", undefined);
    } catch (e) { return { ok: false, error: e.message }; }
    if (!filter || !update) return { ok: false, error: "Filtre et mise à jour requis." };
    return utils.withDb(opts?.credentials, async (db) => {
      const raw = await db.collection(d.collection).updateMany(filter, update);
      return utils.writeResult(raw, "Documents mis à jour.");
    });
  }
};
