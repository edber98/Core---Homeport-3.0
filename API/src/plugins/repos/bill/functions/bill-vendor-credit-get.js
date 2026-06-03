const { utils } = require("./utils");

module.exports = {
  async bill_vendor_credit_get(node, msg, inputs, opts) {
    const vendorCreditId = String((inputs && inputs.vendorCreditId) || "").trim();
    if (!vendorCreditId) return { ok: false, error: "ID vendor credit requis." };

    const res = await utils.billRequest(opts, "GET", `/v3/vendor-credits/${encodeURIComponent(vendorCreditId)}`);
    if (!res.ok) return res;
    const r = res.data || {};
    return { ok: true, id: r.id || vendorCreditId, status: r.status || "", details: r };
  }
};
