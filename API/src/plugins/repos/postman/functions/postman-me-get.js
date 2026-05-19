const { utils } = require("./utils");

module.exports = {
  async postman_me_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Récupération du compte Postman...");
    const res = await utils.postmanRequest(opts, "/me");
    if (!res.ok) return res;
    return utils.resourceResult(res.data || {}, "user");
  }
};
