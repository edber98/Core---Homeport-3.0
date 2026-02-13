const { utils } = require("./utils");

module.exports = {
  async pl_customer_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const name = (d.name || "").trim();
    if (!name) return { ok: false, error: "Missing name." };

    const customer = { name };
    if (d.email) customer.emails = [{ email: d.email }];
    if (d.phone) customer.phone = d.phone;
    if (d.address) customer.address = d.address;
    if (d.country) customer.country_alpha2 = d.country;
    if (d.registration_number) customer.registration_number = d.registration_number;
    if (d.vat_number) customer.vat_number = d.vat_number;

    log('Création en cours...');
    const res = await utils.plRequest(opts, "/customers", { method: "POST", body: { customer } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.customer) || res.data || {};
    return { ok: true, id: String(r.source_id || r.id || ""), name: r.name || "", email: (r.emails && r.emails[0] && r.emails[0].email) || "", phone: r.phone || "", address: r.address || "", country: r.country_alpha2 || "", registration_number: r.registration_number || "", vat_number: r.vat_number || "" };
  }
};
