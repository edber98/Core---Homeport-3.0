const { utils } = require("./utils");

module.exports = {
  async mongodb_aggregate_run(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.collection) return { ok: false, error: "Collection requise." };
    let pipeline;
    try { pipeline = utils.parseJson(d.pipeline, "pipeline", []); } catch (e) { return { ok: false, error: e.message }; }
    if (!Array.isArray(pipeline)) return { ok: false, error: "Pipeline tableau requis." };
    return utils.withDb(opts?.credentials, async (db) => {
      const documents = await db.collection(d.collection).aggregate(pipeline).toArray();
      return utils.documentsResult(documents, documents);
    });
  }
};
