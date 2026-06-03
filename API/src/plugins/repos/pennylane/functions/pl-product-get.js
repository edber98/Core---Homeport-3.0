const { utils } = require("./utils");

module.exports = {
  async pl_product_get(node, msg, inputs, opts) {
    const id = String(inputs?.product_id || "").trim();
    if (!id) return { ok: false, error: "Missing product_id." };

    const res = await utils.plRequest(opts, `/products/${encodeURIComponent(id)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const p = (res.data && (res.data.product || res.data)) || {};
    return { ok: true, id: String(p.source_id || p.id || ""), label: p.label || "", price: String(p.price || ""), unit: p.unit || "", reference: p.reference || "" };
  }
};
