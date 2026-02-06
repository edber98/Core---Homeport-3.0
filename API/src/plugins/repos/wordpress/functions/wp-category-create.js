const { utils } = require("./utils");

module.exports = {
  async wp_category_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const name = (d.name || "").trim();
    if (!name) return { ok: false, error: "Missing name." };

    const body = { name };
    if (d.description) body.description = d.description;
    if (d.parent) body.parent = parseInt(d.parent, 10) || 0;

    const res = await utils.wpRequest(opts, "/categories", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id), name: r.name || "", slug: r.slug || "", description: r.description || "", count: String(r.count || 0), parent: String(r.parent || "") };
  }
};
