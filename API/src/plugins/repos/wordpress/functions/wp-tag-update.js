const { utils } = require("./utils");
module.exports = {
  async wp_tag_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const tagId = String(d.tagId || "").trim();
    if (!tagId) return { ok: false, error: "Missing tagId." };
    const body = {};
    if (d.name) body.name = d.name;
    if (d.description) body.description = d.description;
    const res = await utils.wpRequest(opts, `/tags/${encodeURIComponent(tagId)}`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", slug: r.slug || "", description: r.description || "", count: String(r.count || 0) };
  }
};
