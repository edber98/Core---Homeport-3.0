const { utils } = require("./utils");

module.exports = {
  async pl_product_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const label = (d.label || "").trim();
    if (!label) return { ok: false, error: "Missing label." };

    const product = { label };
    if (d.description) product.description = d.description;
    if (d.unit) product.unit = d.unit;
    if (d.price !== undefined && d.price !== "") product.price = parseFloat(d.price) || 0;
    if (d.vat_rate) product.vat_rate = d.vat_rate;
    if (d.reference) product.reference = d.reference;

    log('Création en cours...');
    const res = await utils.plRequest(opts, "/products", { method: "POST", body: { product } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.product) || res.data || {};
    return { ok: true, id: String(r.source_id || r.id || ""), label: r.label || "", description: r.description || "", unit: r.unit || "", price: String(r.price || ""), vat_rate: r.vat_rate || "", reference: r.reference || "" };
  }
};
