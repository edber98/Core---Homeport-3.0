const { utils } = require("./utils");

module.exports = {
  async bill_vendor_credit_archive(node, msg, inputs, opts) {
    const vendorCreditId = String((inputs && inputs.vendorCreditId) || "").trim();
    if (!vendorCreditId) return { ok: false, error: "ID vendor credit requis." };

    const res = await utils.billRequest(opts, "POST", `/v3/vendor-credits/${encodeURIComponent(vendorCreditId)}/archive`);
    if (!res.ok) return res;
    return { ok: true, id: vendorCreditId, status: "archived", details: res.data || {} };
  }
};
