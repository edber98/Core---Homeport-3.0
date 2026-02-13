const { utils } = require("./utils");

module.exports = {
  async asana_users_list_workspace(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const workspaceGid = (d.workspaceGid || "").trim();
    if (!workspaceGid) return { ok: false, error: "Missing workspaceGid." };

    const limit = parseInt(d.limit, 10) || 100;
    log('Récupération de la liste...');
    const res = await utils.asanaRequest(opts, `/workspaces/${encodeURIComponent(workspaceGid)}/users`, {
      query: { limit, opt_fields: "name,email" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.data) || [];
    const users = results.map(r => ({ gid: r.gid || "", name: r.name || "", email: r.email || "" }));
    return { ok: true, users, totalCount: String(users.length) };
  }
};
