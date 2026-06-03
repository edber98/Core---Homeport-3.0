const { utils } = require("./utils");

module.exports = {
  async bill_vendors_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const res = await utils.billRequest(opts, "GET", "/v3/vendors", { query: { max: d.pageSize || d.max, start: d.start, name: d.name } });
    if (!res.ok) return res;
    const vendors = utils.items(res.data, "vendors").map((vendor) => ({
      id: vendor.id || "",
      name: vendor.name || vendor.companyName || "",
      email: vendor.email || "",
      status: vendor.status || "",
      archived: String(!!vendor.archived)
    }));
    return { ok: true, totalCount: String(vendors.length), vendors };
  }
};
