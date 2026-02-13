const { utils } = require("./utils");

module.exports = {
  async dbx_list_folder(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};

    log('Récupération de la liste...');
    const res = await utils.dbxRequest(opts, "/files/list_folder", {
      path: d.path || "",
      recursive: d.recursive === "true",
      limit: d.limit || 100
    });
    if (!res.ok) return res;
    const files = (res.data.entries || []).map(utils.mapEntry);
    return { ok: true, files };
  }
};
