const { utils } = require("./utils");

module.exports = {
  async postman_collection_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const collectionId = String(d.collectionId || "").trim();
    if (!collectionId) return { ok: false, error: "ID de collection requis." };
    let collection;
    try {
      collection = utils.parseJson(d.collection, "collection", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!collection) return { ok: false, error: "Collection requise." };
    log("Mise à jour de la collection...");
    const res = await utils.postmanRequest(opts, `/collections/${encodeURIComponent(collectionId)}`, {
      method: "PUT",
      body: { collection }
    });
    if (!res.ok) return res;
    return utils.resourceResult(res.data || {}, "collection");
  }
};
