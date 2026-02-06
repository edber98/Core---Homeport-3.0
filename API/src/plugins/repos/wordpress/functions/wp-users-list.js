const { utils } = require("./utils");

module.exports = {
  async wp_users_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.search) query.search = d.search;

    const res = await utils.wpRequest(opts, "/users", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const users = results.map(r => ({ id: String(r.id), username: r.slug || "", name: r.name || "", email: r.email || "" }));
    return { ok: true, users };
  }
};
