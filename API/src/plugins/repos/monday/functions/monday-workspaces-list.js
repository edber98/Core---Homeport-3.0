const { utils } = require("./utils");
module.exports = {
  async monday_workspaces_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 25;
    const query = `{ workspaces (limit: ${limit}) { id name kind description } }`;
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const workspaces = (res.data.workspaces || []).map(r => ({ id: r.id, name: r.name, kind: r.kind, description: r.description }));
    return { ok: true, workspaces, totalCount: String(workspaces.length) };
  }
};
