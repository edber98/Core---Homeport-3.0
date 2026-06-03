const { utils } = require("./utils");

module.exports = {
  async postman_collection_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let collection;
    try {
      collection = utils.parseJson(d.collection, "collection", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!collection) return { ok: false, error: "Collection requise." };
    log("Création de la collection...");
    const res = await utils.postmanRequest(opts, "/collections", {
      method: "POST",
      query: { workspace: d.workspaceId },
      body: { collection }
    });
    if (!res.ok) return res;
    return utils.resourceResult(res.data || {}, "collection");
  }
};
