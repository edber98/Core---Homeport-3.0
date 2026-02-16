const { utils } = require("./utils");

module.exports = {
  async dbx_move_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.fromPath || !d.toPath) return { ok: false, error: "Chemins source et destination requis." };

    log('Mise à jour en cours...');
    const res = await utils.dbxRequest(opts, "/files/move_v2", {
      from_path: d.fromPath, to_path: d.toPath, autorename: false
    });
    if (!res.ok) return res;
    return { ok: true, ...utils.mapEntry(res.data.metadata || res.data) };
  }
};
