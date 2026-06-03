const { utils } = require("./utils");

module.exports = {
  async checkout_com_payments_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = String(d.query || "").trim();
    if (!query) return { ok: false, error: "Requête de recherche requise." };

    const body = { query, limit: utils.toInt(d.pageSize, 10) };
    utils.addIf(body, "from", d.from);
    utils.addIf(body, "to", d.to);

    log("Recherche des paiements Checkout.com...");
    const res = await utils.checkoutRequest(opts, "/payments/search", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const raw = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data?.results) ? res.data.results : [];
    const payments = raw.map(utils.compactPayment);
    return { ok: true, payments, totalCount: res.data?.total_count || payments.length, hasMore: Boolean(res.data?.has_more) };
  }
};
