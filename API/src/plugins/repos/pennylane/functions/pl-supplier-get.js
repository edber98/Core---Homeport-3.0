const { utils } = require("./utils");

module.exports = {
  async pl_supplier_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const supplierId = (d.supplierId || "").toString().trim();
    if (!supplierId) return { ok: false, error: "Missing supplierId." };

    log('Récupération des données...');
    const res = await utils.plRequest(opts, `/suppliers/${encodeURIComponent(supplierId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.supplier) || res.data || {};
    return { ok: true, id: String(r.source_id || r.id || ""), name: r.name || "", email: (r.emails && r.emails[0] && r.emails[0].email) || "", phone: r.phone || "", address: r.address || "", country: r.country_alpha2 || "", registration_number: r.registration_number || "", vat_number: r.vat_number || "" };
  }
};
