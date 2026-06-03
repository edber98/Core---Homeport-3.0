const { utils } = require("./utils");

module.exports = {
  async postman_environments_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Liste des environnements...");
    const res = await utils.postmanRequest(opts, "/environments");
    if (!res.ok) return res;
    return utils.listResult(res.data || {}, "environments");
  }
};
