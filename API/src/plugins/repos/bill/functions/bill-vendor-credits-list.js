const { utils } = require("./utils");

module.exports = {
  async bill_vendor_credits_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.pageSize) query.pageSize = d.pageSize;
    if (d.start) query.start = d.start;
    if (d.vendorId) query.vendorId = d.vendorId;

    const res = await utils.billRequest(opts, "GET", "/v3/vendor-credits", { query });
    if (!res.ok) return res;
    const items = utils.items(res.data, "vendorCredits");
    return { ok: true, items, totalCount: items.length };
  }
};
