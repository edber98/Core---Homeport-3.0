const { utils } = require("./utils");

module.exports = {
  async brevo_senders_list(node, msg, inputs, opts) {
    const res = await utils.brevoRequest(opts, "/senders");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.senders) || [];
    const senders = results.map(r => ({ id: String(r.id || ""), name: r.name || "", email: r.email || "", active: String(r.active || false) }));
    return { ok: true, senders };
  }
};
