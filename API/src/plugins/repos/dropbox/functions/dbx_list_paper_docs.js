const { utils } = require("./utils");

module.exports = {
  async dbx_list_paper_docs(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};

    log('Récupération de la liste...');
    const res = await utils.dbxRequest(opts, "/files/list_folder", {
      path: "", recursive: false, limit: d.limit || 100
    });
    if (!res.ok) return res;
    const files = (res.data.entries || [])
      .filter(e => e.name && e.name.endsWith(".paper"))
      .map(utils.mapEntry);
    return { ok: true, files };
  }
};
