const { utils } = require("./utils");

module.exports = {
  async ps_customer_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.customerId) return { ok: false, error: "Missing customerId." };
    const res = await utils.psRequest(opts, `/customers/${d.customerId}`);
    if (!res.ok) return res;
    const c = (res.data && res.data.customer) || {};
    return { ok: true, id: String(c.id), email: c.email || "", firstname: c.firstname || "", lastname: c.lastname || "", active: String(c.active || ""), date_add: c.date_add || "" };
  }
};
