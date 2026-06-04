const { utils } = require("./utils");

module.exports = {
  async bill_vendor_credit_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const vendorCreditId = String(d.vendorCreditId || "").trim();
    if (!vendorCreditId) return { ok: false, error: "ID vendor credit requis." };
    const builtBody = utils.buildRequestBody(d, [
      { key: "vendorId", type: "string" },
      { key: "referenceNumber", type: "string" },
      { key: "creditDate", type: "string" },
      { key: "description", type: "string" },
      { key: "applyToChartOfAccountId", type: "string" },
      { key: "applyToBankAccountId", type: "string" },
      { key: "vendorCreditLineItems", type: "array" }
    ]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body || {};

    const res = await utils.billRequest(opts, "PATCH", `/v3/vendor-credits/${encodeURIComponent(vendorCreditId)}`, { body });
    if (!res.ok) return res;
    return { ok: true, id: vendorCreditId, status: "updated", details: res.data || {} };
  }
};
