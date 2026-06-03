const { utils } = require("./utils");

module.exports = {
  async postman_collection_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const collectionId = String((inputs || {}).collectionId || "").trim();
    if (!collectionId) return { ok: false, error: "ID de collection requis." };
    log("Suppression de la collection...");
    const res = await utils.postmanRequest(opts, `/collections/${encodeURIComponent(collectionId)}`, { method: "DELETE" });
    if (!res.ok) return res;
    return utils.operationResult(res.data || {});
  }
};
