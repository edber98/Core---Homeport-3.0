const { utils } = require("./utils");

module.exports = {
  async wc_category_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.categoryId) return { ok: false, error: "Missing categoryId." };
    const body = {};
    if (d.name) body.name = d.name;
    if (d.slug) body.slug = d.slug;
    if (d.description) body.description = d.description;
    const res = await utils.wcRequest(opts, `/products/categories/${d.categoryId}`, { method: "PUT", body });
    if (!res.ok) return res;
    const c = res.data || {};
    return { ok: true, id: String(c.id), name: c.name || "", slug: c.slug || "", count: c.count || 0 };
  }
};
