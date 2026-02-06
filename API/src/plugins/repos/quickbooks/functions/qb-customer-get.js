const { utils } = require("./utils");

module.exports = {
  async qb_customer_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const customerId = (d.customerId || "").toString().trim();
    if (!customerId) return { ok: false, error: "Missing customerId." };

    const res = await utils.qbRequest(opts, `/customer/${encodeURIComponent(customerId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Customer) || res.data || {};
    return { ok: true, id: String(r.Id || ""), displayName: r.DisplayName || "", companyName: r.CompanyName || "", primaryEmailAddr: (r.PrimaryEmailAddr && r.PrimaryEmailAddr.Address) || "", primaryPhone: (r.PrimaryPhone && r.PrimaryPhone.FreeFormNumber) || "", balance: String(r.Balance != null ? r.Balance : ""), active: String(r.Active != null ? r.Active : ""), createTime: r.MetaData?.CreateTime || "" };
  }
};
