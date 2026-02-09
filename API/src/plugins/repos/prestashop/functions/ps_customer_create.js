const { utils } = require("./utils");

module.exports = {
  async ps_customer_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.email) return { ok: false, error: "Missing email." };
    if (!d.firstname) return { ok: false, error: "Missing firstname." };
    if (!d.lastname) return { ok: false, error: "Missing lastname." };
    if (!d.passwd) return { ok: false, error: "Missing passwd." };
    const customer = { email: d.email, firstname: d.firstname, lastname: d.lastname, passwd: d.passwd };
    const body = { customer };
    const res = await utils.psRequest(opts, "/customers", { method: "POST", body });
    if (!res.ok) return res;
    const c = (res.data && res.data.customer) || {};
    return { ok: true, id: String(c.id), email: c.email || "", firstname: c.firstname || "", lastname: c.lastname || "", active: String(c.active || ""), date_add: c.date_add || "" };
  }
};
