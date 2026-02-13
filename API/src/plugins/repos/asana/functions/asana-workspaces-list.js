const { utils } = require("./utils");

module.exports = {
  async asana_workspaces_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.asanaRequest(opts, "/workspaces");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.data) || [];
    const workspaces = results.map(r => ({ gid: r.gid || "", name: r.name || "" }));
    return { ok: true, workspaces, totalCount: String(workspaces.length) };
  }
};
