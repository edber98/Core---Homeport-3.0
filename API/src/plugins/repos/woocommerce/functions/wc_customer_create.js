const { utils } = require("./utils");

module.exports = {
  async wc_customer_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.email) return { ok: false, error: "Missing email." };
    const body = { email: d.email };
    if (d.first_name) body.first_name = d.first_name;
    if (d.last_name) body.last_name = d.last_name;
    if (d.username) body.username = d.username;
    const res = await utils.wcRequest(opts, "/customers", { method: "POST", body });
    if (!res.ok) return res;
    const c = res.data || {};
    return { ok: true, id: String(c.id), email: c.email || "", first_name: c.first_name || "", last_name: c.last_name || "", username: c.username || "", date_created: c.date_created || "" };
  }
};
