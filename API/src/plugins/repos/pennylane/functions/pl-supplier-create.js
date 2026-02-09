const { utils } = require("./utils");

module.exports = {
  async pl_supplier_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const name = (d.name || "").trim();
    if (!name) return { ok: false, error: "Missing name." };

    const supplier = { name };
    if (d.email) supplier.emails = [{ email: d.email }];
    if (d.phone) supplier.phone = d.phone;
    if (d.address) supplier.address = d.address;
    if (d.country) supplier.country_alpha2 = d.country;

    const res = await utils.plRequest(opts, "/suppliers", { method: "POST", body: { supplier } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.supplier) || res.data || {};
    return { ok: true, id: String(r.source_id || r.id || ""), name: r.name || "", email: (r.emails && r.emails[0] && r.emails[0].email) || "", phone: r.phone || "", address: r.address || "", country: r.country_alpha2 || "", registration_number: r.registration_number || "", vat_number: r.vat_number || "" };
  }
};
