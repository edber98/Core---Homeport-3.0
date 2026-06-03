const { utils } = require("./utils");

module.exports = {
  async checkout_com_payments_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const reference = String(d.reference || "").trim();
    if (!reference) return { ok: false, error: "Référence requise." };

    log("Recherche des paiements par référence...");
    const res = await utils.checkoutRequest(opts, "/payments", {
      query: { reference, limit: utils.toInt(d.pageSize, 10), skip: utils.toInt(d.skip, 0) }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const raw = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
    const payments = raw.map(utils.compactPayment);
    return { ok: true, payments, totalCount: res.data?.total_count || payments.length, hasMore: Boolean(res.data?.has_more) };
  }
};
