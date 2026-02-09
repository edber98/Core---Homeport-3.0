const { utils } = require("./utils");

module.exports = {
  async wp_categories_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.search) query.search = d.search;

    const res = await utils.wpRequest(opts, "/categories", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const categories = results.map(r => ({ id: String(r.id), name: r.name || "", slug: r.slug || "", count: String(r.count || 0) }));
    return { ok: true, categories };
  }
};
