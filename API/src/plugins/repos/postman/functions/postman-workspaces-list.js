const { utils } = require("./utils");

module.exports = {
  async postman_workspaces_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Liste des workspaces...");
    const res = await utils.postmanRequest(opts, "/workspaces");
    if (!res.ok) return res;
    return utils.listResult(res.data || {}, "workspaces");
  }
};
