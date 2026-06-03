const { utils } = require("./utils");

module.exports = {
  async mongodb_document_replace(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.collection) return { ok: false, error: "Collection requise." };
    let filter, replacement;
    try {
      filter = utils.parseJson(d.filter, "filtre", undefined);
      replacement = utils.parseJson(d.replacement, "replacement", undefined);
    } catch (e) { return { ok: false, error: e.message }; }
    if (!filter || !replacement) return { ok: false, error: "filter et replacement requis." };

    return utils.withDb(opts?.credentials, async (db) => {
      const raw = await db.collection(d.collection).replaceOne(filter, replacement, { upsert: d.upsert === true || String(d.upsert) === "true" });
      return utils.writeResult(raw, "Document remplacé.");
    });
  }
};
