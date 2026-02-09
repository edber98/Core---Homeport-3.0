const { utils } = require("./utils");

module.exports = {
  async pl_customer_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const customerId = (d.customerId || "").toString().trim();
    if (!customerId) return { ok: false, error: "Missing customerId." };

    const res = await utils.plRequest(opts, `/customers/${encodeURIComponent(customerId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.customer) || res.data || {};
    return { ok: true, id: String(r.source_id || r.id || ""), name: r.name || "", email: (r.emails && r.emails[0] && r.emails[0].email) || "", phone: r.phone || "", address: r.address || "", country: r.country_alpha2 || "", registration_number: r.registration_number || "", vat_number: r.vat_number || "" };
  }
};
