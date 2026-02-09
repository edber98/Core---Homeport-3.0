const { utils } = require("./utils");
module.exports = {
  async notion_users_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const pageSize = parseInt(d.pageSize, 10) || 100;
    const res = await utils.notionRequest(opts, "/users", { query: { page_size: pageSize } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const results = (res.data && res.data.results) || [];
    const users = results.map(r => ({ id: r.id, name: r.name, type: r.type, email: r.person?.email || "", avatar_url: r.avatar_url || "" }));
    return { ok: true, users };
  }
};
