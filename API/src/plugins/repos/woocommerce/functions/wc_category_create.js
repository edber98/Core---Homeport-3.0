const { utils } = require("./utils");

module.exports = {
  async wc_category_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };
    const body = { name: d.name };
    if (d.slug) body.slug = d.slug;
    if (d.description) body.description = d.description;
    const res = await utils.wcRequest(opts, "/products/categories", { method: "POST", body });
    if (!res.ok) return res;
    const c = res.data || {};
    return { ok: true, id: String(c.id), name: c.name || "", slug: c.slug || "", count: c.count || 0 };
  }
};
