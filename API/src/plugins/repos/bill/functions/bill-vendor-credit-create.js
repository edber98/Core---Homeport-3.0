const { utils } = require("./utils");

module.exports = {
  async bill_vendor_credit_create(node, msg, inputs, opts) {
    const d = inputs || {};
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
    const res = await utils.billRequest(opts, "POST", "/v3/vendor-credits", { body });
    if (!res.ok) return res;
    const r = res.data || {};
    return { ok: true, id: r.id || "", status: "created", details: r };
  }
};
