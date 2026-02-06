const { utils } = require("./utils");

module.exports = {
  async wp_user_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const userId = (d.userId || "").toString().trim();
    if (!userId) return { ok: false, error: "Missing userId." };

    const res = await utils.wpRequest(opts, `/users/${encodeURIComponent(userId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id), username: r.slug || "", name: r.name || "", email: r.email || "", roles: String(r.roles || []), url: r.url || "" };
  }
};
