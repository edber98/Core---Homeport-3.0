const { utils } = require("./utils");

module.exports = {
  async shopify_orders_count(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.status) query.status = d.status;
    log('Appel API en cours...');
    const res = await utils.shopifyRequest(opts, "/orders/count.json", { query });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: String((res.data && res.data.count) || 0) };
  }
};
