const { utils } = require("./utils");

module.exports = {
  async bill_payments_bulk_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const builtBody = utils.buildRequestBody(d, [
      { key: "vendorId", type: "string" },
      { key: "description", type: "string" },
      { key: "processDate", type: "string" },
      { key: "exchangeRateBatchId", type: "integer" },
      { key: "fundingAccount", type: "object" },
      { key: "payments", type: "array" },
      { key: "processingOptions", type: "object" },
      { key: "transactionNumber", type: "string" },
      { key: "cardFundingPurpose", type: "string" }
    ]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body || {};

    const res = await utils.billRequest(opts, "POST", "/v3/payments/bulk", { body });
    if (!res.ok) return res;
    return { ok: true, id: res.data?.id || "", status: "created", details: res.data || {} };
  }
};
