const { utils } = require("./utils");

module.exports = {
  async asana_tags_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const workspaceGid = (d.workspaceGid || "").trim();
    if (!workspaceGid) return { ok: false, error: "Missing workspaceGid." };

    const limit = parseInt(d.limit, 10) || 100;
    log('Récupération de la liste...');
    const res = await utils.asanaRequest(opts, "/tags", {
      query: { workspace: workspaceGid, limit }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.data) || [];
    const tags = results.map(r => ({ gid: r.gid || "", name: r.name || "", color: r.color || "" }));
    return { ok: true, tags, totalCount: String(tags.length) };
  }
};
