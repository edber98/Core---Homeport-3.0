const { utils } = require("./utils");

module.exports = {
  async wc_customer_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.customerId) return { ok: false, error: "Missing customerId." };
    const body = {};
    if (d.email) body.email = d.email;
    if (d.first_name) body.first_name = d.first_name;
    if (d.last_name) body.last_name = d.last_name;
    const res = await utils.wcRequest(opts, `/customers/${d.customerId}`, { method: "PUT", body });
    if (!res.ok) return res;
    const c = res.data || {};
    return { ok: true, id: String(c.id), email: c.email || "", first_name: c.first_name || "", last_name: c.last_name || "", username: c.username || "", date_created: c.date_created || "" };
  }
};
