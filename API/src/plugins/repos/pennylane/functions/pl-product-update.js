const { utils } = require("./utils");

module.exports = {
  async pl_product_update(node, msg, inputs, opts) {
    const id = String(inputs?.product_id || "").trim();
    if (!id) return { ok: false, error: "Missing product_id." };

    const body = {};
    if (inputs?.label !== undefined && inputs?.label !== "") body.label = String(inputs.label);
    if (inputs?.price !== undefined && inputs?.price !== "") body.price = Number(inputs.price);
    if (inputs?.unit !== undefined && inputs?.unit !== "") body.unit = String(inputs.unit);
    if (inputs?.reference !== undefined && inputs?.reference !== "") body.reference = String(inputs.reference);

    if (Object.keys(body).length === 0) return { ok: false, error: "No fields to update." };

    const res = await utils.plRequest(opts, `/products/${encodeURIComponent(id)}`, { method: "PUT", body: { product: body } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const p = (res.data && (res.data.product || res.data)) || {};
    return { ok: true, id: String(p.source_id || p.id || id), label: p.label || body.label || "", price: String(p.price || body.price || ""), unit: p.unit || body.unit || "", reference: p.reference || body.reference || "" };
  }
};
