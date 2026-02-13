const { utils } = require("./utils");

module.exports = {
  async shopify_fulfillment_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.orderId) return { ok: false, error: "Missing orderId." };
    const fulfillment = {};
    if (d.tracking_number) fulfillment.tracking_number = d.tracking_number;
    if (d.tracking_url) fulfillment.tracking_url = d.tracking_url;
    if (d.tracking_company) fulfillment.tracking_company = d.tracking_company;
    log('Création en cours...');
    const res = await utils.shopifyRequest(opts, `/orders/${d.orderId}/fulfillments.json`, { method: "POST", body: { fulfillment } });
    if (!res.ok) return res;
    const f = res.data.fulfillment || {};
    return { ok: true, id: String(f.id), order_id: String(f.order_id || ""), status: f.status || "", tracking_number: f.tracking_number || "", tracking_url: f.tracking_url || "", created_at: f.created_at || "" };
  }
};
