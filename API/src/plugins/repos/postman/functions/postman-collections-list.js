const { utils } = require("./utils");

module.exports = {
  async postman_collections_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Liste des collections...");
    const res = await utils.postmanRequest(opts, "/collections");
    if (!res.ok) return res;
    return utils.listResult(res.data || {}, "collections");
  }
};
