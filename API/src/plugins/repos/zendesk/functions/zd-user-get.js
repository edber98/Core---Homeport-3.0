const { utils } = require("./utils");

module.exports = {
  async zd_user_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const userId = parseInt(d.userId, 10);
    if (isNaN(userId)) return { ok: false, error: "Missing userId." };

    const res = await utils.zendeskRequest(opts, `/users/${userId}.json`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.user) || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", email: r.email || "", role: r.role || "", phone: r.phone || "", createdAt: r.created_at || "" };
  }
};
