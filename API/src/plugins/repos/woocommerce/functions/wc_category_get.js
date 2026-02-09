const { utils } = require("./utils");

module.exports = {
  async wc_category_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.categoryId) return { ok: false, error: "Missing categoryId." };
    const res = await utils.wcRequest(opts, `/products/categories/${d.categoryId}`);
    if (!res.ok) return res;
    const c = res.data || {};
    return { ok: true, id: String(c.id), name: c.name || "", slug: c.slug || "", count: c.count || 0 };
  }
};
