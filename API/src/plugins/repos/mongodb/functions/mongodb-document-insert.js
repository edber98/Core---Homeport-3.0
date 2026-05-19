const { utils } = require("./utils");

module.exports = {
  async mongodb_document_insert(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.collection) return { ok: false, error: "Collection requise." };
    let document;
    try { document = utils.parseJson(d.document, "document", undefined); } catch (e) { return { ok: false, error: e.message }; }
    if (!document) return { ok: false, error: "Document requis." };
    return utils.withDb(opts?.credentials, async (db) => {
      const raw = Array.isArray(document)
        ? await db.collection(d.collection).insertMany(document)
        : await db.collection(d.collection).insertOne(document);
      return utils.writeResult(raw, "Document inséré.");
    });
  }
};
