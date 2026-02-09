const { utils } = require("./utils");

module.exports = {
  async zd_user_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };

    const user = { name: d.name };
    if (d.email) user.email = d.email;
    if (d.phone) user.phone = d.phone;
    if (d.role) user.role = d.role;

    const res = await utils.zendeskRequest(opts, "/users.json", { method: "POST", body: { user } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.user) || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", email: r.email || "", role: r.role || "", phone: r.phone || "", createdAt: r.created_at || "" };
  }
};
