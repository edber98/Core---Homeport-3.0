const { utils } = require("./utils");

module.exports = {
  async postman_monitors_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Liste des monitors...");
    const res = await utils.postmanRequest(opts, "/monitors");
    if (!res.ok) return res;
    return utils.listResult(res.data || {}, "monitors");
  }
};
