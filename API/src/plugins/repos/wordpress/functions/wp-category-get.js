const { utils } = require("./utils");

module.exports = {
  async wp_category_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const categoryId = (d.categoryId || "").toString().trim();
    if (!categoryId) return { ok: false, error: "Missing categoryId." };

    const res = await utils.wpRequest(opts, `/categories/${encodeURIComponent(categoryId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id), name: r.name || "", slug: r.slug || "", description: r.description || "", count: String(r.count || 0), parent: String(r.parent || "") };
  }
};
