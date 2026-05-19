const { utils } = require("./utils");

module.exports = {
  async mongodb_documents_find(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.collection) return { ok: false, error: "Collection requise." };
    let filter, projection, sort;
    try {
      filter = utils.parseJson(d.filter, "filtre", {});
      projection = utils.parseJson(d.projection, "projection", undefined);
      sort = utils.parseJson(d.sort, "tri", {});
    } catch (e) { return { ok: false, error: e.message }; }
    return utils.withDb(opts?.credentials, async (db) => {
      let cursor = db.collection(d.collection).find(filter, projection ? { projection } : undefined).sort(sort);
      cursor = cursor.limit(Number(d.limit) || 100).skip(Number(d.skip) || 0);
      const documents = await cursor.toArray();
      return utils.documentsResult(documents, documents);
    });
  }
};
