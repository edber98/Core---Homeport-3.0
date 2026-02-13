const { utils } = require("./utils");

module.exports = {
  async pl_customer_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const customerId = (d.customerId || "").toString().trim();
    if (!customerId) return { ok: false, error: "Missing customerId." };

    const customer = {};
    if (d.name) customer.name = d.name;
    if (d.email) customer.emails = [{ email: d.email }];
    if (d.phone) customer.phone = d.phone;
    if (d.address) customer.address = d.address;

    log('Mise à jour en cours...');
    const res = await utils.plRequest(opts, `/customers/${encodeURIComponent(customerId)}`, { method: "PUT", body: { customer } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.customer) || res.data || {};
    return { ok: true, id: String(r.source_id || r.id || ""), name: r.name || "", email: (r.emails && r.emails[0] && r.emails[0].email) || "", phone: r.phone || "", address: r.address || "", country: r.country_alpha2 || "", registration_number: r.registration_number || "", vat_number: r.vat_number || "" };
  }
};
