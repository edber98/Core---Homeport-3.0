const { utils } = require("./utils");

module.exports = {
  async dbx_watch_folder(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.path && d.path !== "") return { ok: false, error: "Chemin du dossier requis." };

    log('Appel API en cours...');
    const res = await utils.dbxRequest(opts, "/files/list_folder/get_latest_cursor", {
      path: d.path || "", recursive: true
    });
    if (!res.ok) return res;

    return {
      ok: true, path: d.path || "/", name: "watch",
      tag: "cursor_created", modified: new Date().toISOString()
    };
  }
};
