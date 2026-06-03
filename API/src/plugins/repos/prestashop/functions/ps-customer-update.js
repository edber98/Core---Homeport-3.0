const { utils } = require("./utils");

module.exports = {
  async ps_customer_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.customerId) return { ok: false, error: "Missing customerId." };
    const customer = {};
    if (d.email) customer.email = d.email;
    if (d.firstname) customer.firstname = d.firstname;
    if (d.lastname) customer.lastname = d.lastname;
    if (d.passwd) customer.passwd = d.passwd;
    if (d.active !== undefined) customer.active = d.active;
    if (!Object.keys(customer).length) return { ok: false, error: "Aucun champ à mettre à jour." };

    const res = await utils.psRequest(opts, `/customers/${d.customerId}`, { method: "PUT", body: { customer } });
    if (!res.ok) return res;
    const c = (res.data && res.data.customer) || {};
    return { ok: true, id: String(c.id), email: c.email || "", firstname: c.firstname || "", lastname: c.lastname || "", active: String(c.active || ""), date_add: c.date_add || "" };
  }
};
