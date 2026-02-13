const { utils } = require("./utils");

module.exports = {
  async zd_user_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const userId = parseInt(d.userId, 10);
    if (isNaN(userId)) return { ok: false, error: "Missing userId." };

    const user = {};
    if (d.name) user.name = d.name;
    if (d.email) user.email = d.email;
    if (d.phone) user.phone = d.phone;

    log('Mise à jour en cours...');
    const res = await utils.zendeskRequest(opts, `/users/${userId}.json`, { method: "PUT", body: { user } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.user) || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", email: r.email || "", role: r.role || "", phone: r.phone || "", createdAt: r.created_at || "" };
  }
};
