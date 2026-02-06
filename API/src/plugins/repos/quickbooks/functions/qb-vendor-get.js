const { utils } = require("./utils");

module.exports = {
  async qb_vendor_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const vendorId = (d.vendorId || "").toString().trim();
    if (!vendorId) return { ok: false, error: "Missing vendorId." };

    const res = await utils.qbRequest(opts, `/vendor/${encodeURIComponent(vendorId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Vendor) || res.data || {};
    return { ok: true, id: String(r.Id || ""), displayName: r.DisplayName || "", companyName: r.CompanyName || "", primaryEmailAddr: (r.PrimaryEmailAddr && r.PrimaryEmailAddr.Address) || "", primaryPhone: (r.PrimaryPhone && r.PrimaryPhone.FreeFormNumber) || "", balance: String(r.Balance != null ? r.Balance : ""), active: String(r.Active != null ? r.Active : "") };
  }
};
