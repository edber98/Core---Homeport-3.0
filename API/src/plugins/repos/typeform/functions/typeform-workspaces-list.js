const { utils } = require("./utils");

module.exports = {
  async typeform_workspaces_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.pageSize) query.page_size = d.pageSize;
    if (d.page) query.page = d.page;
    if (d.search) query.search = d.search;

    const res = await utils.typeformRequest(opts, "/workspaces", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.items) || [];
    const workspaces = items.map(r => ({ id: r.id, name: r.name, shared: String(r.shared || false), default: String(r.default || false) }));
    return { ok: true, workspaces };
  }
};
