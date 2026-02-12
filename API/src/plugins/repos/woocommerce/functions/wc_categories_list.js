const { utils } = require("./utils");

module.exports = {
  async wc_categories_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.page) query.page = d.page;
    const res = await utils.wcRequest(opts, "/products/categories", { query });
    if (!res.ok) return res;
    const items = Array.isArray(res.data) ? res.data : [];
    const categories = items.map(c => ({ id: String(c.id), name: c.name || "", slug: c.slug || "", count: c.count || 0 }));
    return { ok: true, categories, totalCount: res.totalCount || 0, totalPages: res.totalPages || 0 };
  }
};
