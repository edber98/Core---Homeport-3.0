const { utils } = require("./utils");

module.exports = {
  async mongodb_collections_list(node, msg, inputs, opts) {
    return utils.withDb(opts?.credentials, async (db) => {
      const collections = await db.listCollections().toArray();
      return { ok: true, collections, totalCount: collections.length, raw: collections };
    });
  }
};
